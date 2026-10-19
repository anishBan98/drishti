# 10 · The Action Engine

**Principle:** every button does something real, visible and logged. In the prototype the buttons only turned green; in the product each one creates an action record, performs its executor's steps, produces an output the user can open, and is measured against its expected impact at a readout date.

## 1. Executor kinds

| Kind | What "doing it" means | Where it runs | Examples |
| --- | --- | --- | --- |
| **execute** (inline API) | Drishti calls an API that changes something, saving the previous value for undo | Worker | Shopify discount caps, Shopify segment discounts, Meta ad set budget or pause (Phase 2), Slack post, Calendar event, Sheet log |
| **prepare** (handoff) | Drishti builds a ready-to-use file or text, saves it to Drive Outbox, downloads it, opens the exact platform page, and waits for the person to confirm "I've done it" | Worker (small) or action runner (large) | Amazon coupon file, Amazon Ads bulk sheet (bids, competitor targeting), listing copy for each platform, Google Ads location exclusions, Flipkart claim list, quick-commerce pause list |
| **test** | Drishti designs a geo test (cities, duration, minimum detectable effect), exports the settings, tracks it daily, and reads it out automatically | Action runner + sync | Brand-search pause, Meta holdout, creator boost |
| **rule** | Drishti adds a monitoring rule that is evaluated every sync and notifies or prepares an action when it fires | Worker (create), sync (evaluate) | Price alerts, stockout ad pause list, source late reminders |
| **task** | Drishti assigns an owner and due date, notifies them (Slack, Calendar, in-app) and tracks completion | Worker | QA hold, restock request, ask the team to update a sheet |
| **draft** | Drishti writes a document with numbers filled by code and words drafted by Workers AI, saves it to Drive Outbox, and assigns review | Action runner | R&D brief, creator brief, review replies, Diwali campaign brief, QA hold note |
| **data** | Drishti moves data: uploads to the Inbox, triggers a sync, exports hashed audiences | Worker or action runner | Upload a file, Request missing files, Export audience |

Platform write access in v1 (free, no approval): **Shopify** (custom app on the brand's store or a development store), **Google** (Drive, Sheets, Calendar via the service account), **Slack** (incoming webhook). Phase 2 adds **Meta** (development-mode app on the brand's own ad account). Amazon, Flipkart, Nykaa and quick-commerce platforms have no free self-serve write APIs for this use, so their actions are **prepare** actions with exact files and links.

## 2. Common contract

Every action type is a module in `apps/worker/src/actions/types/<type>.ts` (and, for job executors, `apps/sync/src/actions/<type>.ts`) exporting:

```ts
export const def: ActionDef = {
  type: 'amazon_coupon',
  kind: 'prepare',
  executor: 'inline',                 // inline | job | handoff (handoff = prepare + confirm)
  phase: 1,
  roles: ['Owner', 'Approver', 'Analyst', 'Editor'],
  params: z.object({ asin: z.string(), sku: z.string(), discount_pct: z.number().min(5).max(40), weeks: z.number().int().min(1).max(8) }),
  needsApproval: (p, ws) => false,     // budget and price actions compare against ws.settings.approval_threshold_inr
  steps: (p) => [ /* human-readable steps shown in the confirm view */ ],
  run: async (ctx, p) => { /* do the work, emit ctx.step(...), ctx.output(...) */ return { status: 'waiting_on_user' } },
  undo: undefined,                     // or async (ctx, before) => {...}
  measure: { metric: 'units_sku_platform', windowDays: 21, method: 'did_vs_other_platforms' },
};
```

`ctx` gives: `step(text)`, `output({kind, label, url | bytes})`, `drive.saveFile(name, mime, bytes)`, `sheet.appendAction(row)`, `notify(user, text, link)`, `calendar.event(...)`, `shopify.graphql(...)`, `meta.post(...)`, `kv`, `db`, `now()`. All calls are mocked in tests.

Universal steps added by the engine (not repeated per type): log to D1 and the Actions tab, notify the owner, schedule the readout (calendar event "Readout: {title}" when Calendar is connected), audit.

## 3. Catalogue (every button in the designs)

| Type | Button label(s) | Screen(s) | Kind / executor | Phase | Output | Undo | Measured by |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `amazon_coupon` | Create coupon | This week, Performance, Market, Voice | prepare / handoff | 1 | Coupon CSV (ASIN, discount %, dates, budget) in Outbox + download; link to Seller Central Coupons; checklist | n/a (platform) | units of ASIN on Amazon vs forecast, other platforms as control, 21 days |
| `qa_hold` | Raise QA hold, Put batch on hold | This week, Voice | task + draft / inline | 1 | QA hold note (Google Doc) with complaints, dates, quotes, batch; task to QA owner | n/a | pump aspect share and rating, 6 weeks |
| `reply_drafts` | Draft replies | Voice | draft / job | 2 | Sheet in Outbox: review id, platform, link, draft reply; AI-drafted, human-sent | n/a | reply rate; updated ratings |
| `restock_request` | Restock Mumbai, Send restock request | This week, Performance | task / inline | 1 | Restock request (store list, units, days of cover) as CSV + Slack to supply owner | n/a | stockout store-days |
| `qc_ads_pause` | Pause ads in 21 stores, Turn on (auto-pause) | This week, Impact | rule + prepare / inline | 1 | Pause list per platform (store IDs, campaign names) each time stock < 1 day; posted to Slack; checklist | turn off rule | ad spend in stock-out store-days |
| `budget_shift` | Apply budget shift, Apply shift | This week, Impact | prepare (+ execute Meta in Phase 2) / job | 1 | Budget sheet: current vs new spend by medium and city with expected impact; Meta budgets changed via API when connected; other platforms checklist | Meta: restore budgets | revenue vs MMM counterfactual, 4 weeks |
| `budget_change` | Apply cut, Approve budget, Reduce budget | Impact, Performance | prepare / execute (Meta) | 1 / 2 | As above for one medium | Meta: restore | as above |
| `shopify_discount_cap` | Apply caps, Rein in discounts | This week, Customers | execute / inline | 1 | Shopify discount codes updated (e.g. SAVE20, FEST25, MEGA30 → 15%); change log | restore previous values | margin per order and repeat for the segment, 3 weeks |
| `shopify_segment_offer` | Launch plan, Send offer, Create list | Customers | execute / inline | 1 | Shopify customer segment (by hashed IDs → Shopify customer IDs) + discount code limited to that segment | deactivate code | segment orders vs forecast |
| `audience_export` | Export audience | Customers | data / job | 1 | Meta Custom Audience CSV with SHA-256 hashed emails and phones (normalised), saved to Outbox; checklist to upload in Ads Manager | delete file | CAC of lookalike campaigns |
| `refill_nudge` | Turn on nudge, Start reminders | Customers, Performance | execute + prepare / inline | 1 | Shopify segment "Serum day 21" + message draft; checklist to schedule in Shopify Email or Flow | deactivate segment | repeat rate at day 45 |
| `cod_otp` | Turn on (OTP on cash orders) | Customers | prepare / handoff | 1 | Settings checklist for the brand's checkout or shipping partner; expected impact | n/a | RTO rate |
| `prepaid_nudge` | Turn on offer | Performance | execute + prepare / inline | 1 | Shopify discount code PREPAID20 + checkout banner copy; checklist for payment-method restriction | deactivate | COD share and RTO |
| `listing_update` | Update listing(s), Lead listings with "gentle" | Market, Voice, Performance | draft + prepare / job | 1 | New title, bullets and image text per platform (code fills facts, AI drafts words) in a Doc; links to each listing editor | n/a | conversion and search share |
| `amazon_ads_bulk` | Apply bids, Create campaign (competitor pages, Rival D pages) | Impact, Market, Voice | prepare / job | 1 | Amazon Ads bulk sheet (XLSX) with the bid changes or new product-targeting campaign; link to bulk operations | n/a | Amazon Ads claimed and real return |
| `geo_test` | Launch test, Create test, Extend test, Run a 3-week geo test | Impact, Market | test / job | 2 (plan in 1) | Test plan (cities, duration, power), exclusion list CSV per platform, calendar readout, daily progress | stop test | synthetic control at end date |
| `price_alert` | Set alert, Alert me if…, Track, Watch | Market | rule / inline | 1 | Rule in D1 and Rules tab | turn off | n/a |
| `price_rule` | Apply rule (exclude from price matching), Lock price | Market | rule / inline | 1 | Rule that suppresses price-match suggestions for a rival or platform for N weeks | turn off | n/a |
| `watchlist_add` | Add to watchlist | Market | data / inline | 1 | Rows appended to the Watchlist tab | remove rows | n/a |
| `brief` | Send brief (R&D, creator, routine card, trial pack, results claim) | Market, Impact, Voice, Customers | draft / job | 1 | Google Doc in Outbox; task to owner | n/a | depends on brief (not measured by default) |
| `campaign_schedule` | Schedule (Diwali gift sets) | Customers | prepare + task / job | 1 | Audience file, brief, calendar event on send date | cancel event | segment revenue in window |
| `creator_budget` | Approve budget (creators) | Impact | prepare / job | 1 | Creator plan sheet (cities, budget, briefs) + rows in Creators tab marked planned | n/a | regional lift (synthetic control by creator region) |
| `flipkart_claim` | File claim | Voice | prepare / handoff | 1 | Claim list (order IDs, dates, reason) and steps | n/a | ₹ reimbursed (entered on confirm) |
| `packaging_request` | Raise request (sealed sleeve) | Voice | task / inline | 1 | Task to ops owner with evidence | n/a | delivery complaints |
| `nykaa_request` | Request slot, Create bundles | Performance | prepare / inline | 1 | Email draft to the key account manager; bundle listing file | n/a | Nykaa revenue in sale window |
| `source_reminder` | Set reminder, Remind the ads team daily, Ask the team to update it | Data | task / inline | 1 | Daily 9 am Slack and in-app reminder until the file arrives | stop | lag days |
| `request_files` | Request missing files | Data | task / inline | 1 | One reminder per late source | stop | lag days |
| `upload_file` | Upload a file, Upload files | Data | data / inline | 1 | File in Drive Inbox; sync dispatched | delete from Inbox (before sync) | n/a |
| `sync_now` | Sync now, Re-run grouping, Capture prices now | Data, Customers, Market | data / job | 1 | Sync run; for capture, opens the extension queue | n/a | n/a |
| `assign` | Assign | all action cards | task / inline | 1 | Owner + due date; notifications | reassign | n/a |
| `approve`, `decline`, `undo`, `confirm` | Approve and run, Decline, Undo, I've done it | Actions, cards | control / inline | 1 | State change and executor run | — | — |

## 4. Specifications for the most important types

### 4.1 `amazon_coupon` (prepare)
- **Params:** asin, sku, discount_pct (default: smallest of 5%-steps that brings our price per 10 ml within 5% of the rival), weeks (default 3), budget_inr (default = expected redemptions × discount, capped at ₹3 L).
- **Steps:** (1) Build coupon CSV with columns `ASIN, Discount type, Discount, Start date, End date, Budget (INR), Coupon title` (Seller Central's own upload template varies; the file also includes a plain checklist sheet; if the brand's template differs, the Mappings tab can rename columns). (2) Save to Drive Outbox `/Actions/{action_id}/` and offer download. (3) Open `https://sellercentral.amazon.in/coupons/` in a new tab. (4) Wait for "I've done it" (optional note or screenshot link).
- **Expected:** from §9.1 of `08-METHODS.md`. **Readout:** 21 days after confirm.
- **Demo:** CSV generated in the browser and downloaded; status moves to Measuring after a simulated confirm.

### 4.2 `shopify_discount_cap` (execute)
- **Params:** segment_id, cap_pct (default 15), codes (computed: codes used by the segment in 90 days with value > cap).
- **Run:** for each code: `discountCodeBasicUpdate` (or `discountAutomaticBasicUpdate`) setting `customerGets.value.percentage = cap_pct/100`. Save previous values in `before_json`. Steps logged per code.
- **Approval:** if the forecast revenue at risk > threshold.
- **Undo:** restore each code's previous percentage.
- **Errors:** `SHOPIFY_TOKEN_INVALID`, `SHOPIFY_SCOPE_MISSING` (needs `write_discounts`), `SHOPIFY_CODE_NOT_FOUND` (skip and warn). Partial success keeps successes, marks the action `done` with a warning and lists failures.

### 4.3 `budget_shift` (prepare; execute for Meta in Phase 2)
- **Params:** amount_inr (default ₹30 L per month), from[] and to[] media with amounts (from the optimiser), cities split.
- **Approval:** always if amount > threshold (default ₹10 L).
- **Run (job):** build the budget sheet (current daily budgets by medium and city from the last 7 days; new budgets; expected impact per row; totals) as a Google Sheet in Outbox; for Meta (if connected) update ad set `daily_budget` values via the Marketing API (store old values); for other platforms produce a checklist with the exact new daily budgets.
- **Undo (Meta part):** restore budgets. **Readout:** 28 days, MMM counterfactual with the experiment-calibrated betas.

### 4.4 `geo_test` (test)
- **Plan:** candidate test cities = cities with ≥ 1% of spend and stable pre-period fit; choose 2–4 test cities that minimise pre-period RMSPE of the synthetic control while keeping lost revenue under the test budget (default ₹5 L); duration from a power calculation using placebo noise (minimum detectable effect 25% of claimed return, 80% power) between 14 and 28 days.
- **Outputs:** test plan Doc; CSV of location exclusions (Google Ads: city names and criteria IDs from `geo.ts`; Meta: city keys); calendar events for start, mid-check and readout.
- **Tracking:** each sync checks spend in test cities fell ≥ 60% of plan by day 3, else `TEST_NOT_APPLIED` alert. Day N of M shown on Impact.
- **Readout:** `08-METHODS.md` §3.2; result updates the medium's evidence and confidence; action result = "done" with the estimate (not hit/miss).

### 4.5 `qa_hold` (task + draft)
- **Run:** create a Google Doc "QA hold: {product} batch {batch}" from a template: summary numbers (mentions, first seen, platforms, share of new reviews), 5 quotes, suspected batch and units in stock (if provided), requested decision. Assign to the QA owner (Settings `qa_owner` or chosen), due in 2 days; Slack and in-app notification.
- **Confirm:** owner clicks "Hold confirmed" and enters units held (optional).
- **Readout:** 6 weeks: rating and pump share.

### 4.6 `reply_drafts` (draft, job)
- **Run:** select negative reviews for the aspect without brand reply (≤ 500 per run); batch to Workers AI with prompt 11.2; validate; write a Google Sheet (review link, platform, rating, text, draft) to Outbox. Respect the AI budget; continue next day if capped ("120 of 380 drafted today; the rest tomorrow").
- **Human step:** replies are posted by people on each platform (no posting automation).

### 4.7 `audience_export` (data, job)
- **Run:** fetch the segment's customers from Shopify (emails, phones) inside the action runner, normalise (lowercase, trim; phones to E.164 with +91 default) and hash with SHA-256; write CSV with headers `email, phone` (hashed) to Outbox; delete local copies. Nothing is stored in KV or D1 except counts.
- **Checklist:** upload in Meta Ads Manager → Audiences → Custom audience → Customer list; create a 1% lookalike in India.

### 4.8 `price_alert` and other rules
Create a rule (`06-DATA-MODEL.md` §5) with the condition prefilled (e.g. `rival_price_change_pct(watch_id="W05") <= -0.05`), owner, channel. Fires at the next sync after the condition is true; notification links to the Market screen with the rival selected.

### 4.9 `qc_ads_pause` (rule + prepare)
Quick-commerce ad consoles have no free public write API, so "auto-pause" means: every sync, for stores with `closing_stock / avg daily units < 1`, Drishti posts the list of store IDs and campaign names to Slack (and the action detail) with a one-line instruction per platform, and logs estimated spend saved. When stock returns, it posts the resume list. If a platform later offers an API, the executor switches to execute without UI change.

### 4.10 `upload_file` and `sync_now`
Upload streams to Drive (resumable upload) and dispatches a sync; the action's steps show "Uploaded", "Sync started", "Parsed as Amazon business report (180 rows)", "Snapshot updated". Sync now dispatches and polls `/api/sync/runs`.

## 5. Approvals

- Budget and price actions whose absolute monthly money effect (spend moved, discount cost or revenue at risk) exceeds `approval_threshold_inr` require an Approver or Owner who is not the requester.
- Viewers cannot run actions; Editors can run actions in their screens but not approve; Analysts can sync and run data actions; Approvers can approve; Owners can do everything.
- Approval requests expire after 7 days.

## 6. Notifications

| Event | Channel |
| --- | --- |
| Action assigned to you, approval requested, decided | Slack (if webhook), in-app, calendar event for due dates (if connected) |
| Readout result | Slack summary to owner and requester; in-app |
| Rule fired | Slack to rule owner; in-app |
| Weekly summary (Monday after the 7 am sync) | Slack to Owners and Approvers: verdict, top 3 drivers, suggested actions |

## 7. Demo behaviour

In `/demo` every action runs a client-side simulation with the same steps, outputs that can be downloaded (generated from the demo snapshot: coupon CSV, budget sheet CSV, brief as Markdown, audience file with fake hashes), and timing of 600 ms per step. Actions are kept in memory (and sessionStorage when available) and appear on the Actions screen with "Demo" tags. No network writes.
