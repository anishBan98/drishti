# 01 · Product Requirements

## 1. Problem

### 1.1 The level-3 problem

Indian D2C brands in beauty, personal care, eyewear, audio and home (Nykaa's own brands, boAt, SUGAR, Lenskart, Wakefit, Mamaearth, Purplle and hundreds of smaller ones) spend 25 to 40 percent of revenue on marketing across Meta, Google, Amazon Ads, Flipkart Ads, quick-commerce ads and creators. Three problems sit underneath the visible "we need better dashboards" complaint:

1. **Everyone claims the same sale.** Meta, Google and Amazon each count a sale if their ad was seen or clicked within their window. In the fictional Lumora data, platforms claim ₹22.0 Cr of revenue in a month where the brand sold ₹18.1 Cr in total. Budgets get moved on claimed ROAS, so money flows to channels that are good at claiming (retargeting, brand search) rather than at creating demand. Creators are the opposite: under-credited because links catch a fraction of their effect.
2. **The market moves faster than the weekly report.** A rival cuts price 18 percent on Amazon, search share drops a point in a week, a pump defect drags the rating, 38 dark stores in Mumbai run out of stock. Each is visible somewhere (Seller Central, Brand Analytics, reviews, a partner portal) but nobody stitches them into "revenue fell 6.5 percent, and here is why". Category managers spend hours a week copying rival prices and ratings into sheets.
3. **Actions disappear.** A team decides to match a price, cap discounts or shift budget. Nobody records the expected impact, so nobody checks whether it worked. The next debate starts from opinion again.

### 1.2 Why existing tools leave a gap

| Need | What brands use today | Gap |
| --- | --- | --- |
| Real channel ROI | Platform dashboards; global attribution and incrementality tools (for example Northbeam, Triple Whale, Haus, Recast, Measured; Lifesight is Indian-founded) | Priced for large budgets, built around Shopify-first US brands, weak on Amazon, Flipkart and quick commerce, and rarely run continuous geo tests for mid-size Indian brands |
| Marketplace intelligence | Manual sheets; digital-shelf tools (for example DataWeave, 1DigitalStack) | Paid, enterprise sales cycles, not connected to ad spend or own-site customers |
| Customer types | Shopify reports, CRM tools | Descriptive only; not tied to acquisition cost or channel |
| Review insight | Reading reviews, generic social listening | Not split by aspect, not tied to batches or listings |
| Action follow-through | Slack threads, slides | No expected impact, no readout, no hit rate |

(Tool names are for positioning only; their pricing and features were not verified for this document.)

### 1.3 Who feels it, in their words

- **CMO:** "Platforms say we made 4x. Finance says we lost money. I need one number I can defend."
- **Performance marketer:** "I know retargeting is inflated. I can't prove it without a test, and setting up a test takes a week of spreadsheet work."
- **Category manager (marketplaces):** "Every Monday I open 40 product pages and copy prices into a sheet."
- **Marketing analyst:** "I spend Thursday and Friday stitching exports. By the time the deck is ready the week has moved."

## 2. Product vision and value proposition

**For** marketing and category teams at Indian D2C brands selling on their own site, marketplaces and quick commerce,
**who** need to know which rupee worked and what to do next,
**Drishti** is a free, self-hosted marketing intelligence workspace
**that** measures real channel returns, tracks the market around each product, groups customers by how they buy, reads reviews by aspect, and turns each finding into a one-click action that is logged and measured.
**Unlike** platform dashboards and paid attribution tools, it is built for India's channel mix (Amazon, Flipkart, Nykaa, Blinkit, Zepto, Instamart), runs at zero cost on the brand's own accounts, and closes the loop from insight to action to measured result.

**Showcase goal (for PreQL):** a working product that a recruiter or brand leader can open, understand in two minutes, and see enterprise-level depth: causal measurement, market intelligence, segmentation, text analytics and an action engine.

## 3. Personas

| Persona | Role | Goals | Pain today | Screens they live on |
| --- | --- | --- | --- | --- |
| Aditi, CMO (Owner, Approver) | Owns the ₹5–7 Cr monthly budget | Defensible ROI, fast weekly decisions | Conflicting numbers from platforms and finance | This week, Impact and ROI, Actions |
| Kabir, performance marketer (Editor) | Runs Meta, Google, Amazon Ads | Move budget to what really works; prove it | No easy way to run and read tests | Impact and ROI, Performance, Actions |
| Priya, category manager (Editor) | Owns marketplace P&L for serums | React to rivals, protect search share and rating | Manual price tracking; slow to spot rival moves | Market, Customer voice, This week |
| You, marketing analyst (Analyst) | Builds the weekly view | Trusted numbers in minutes, not days | Stitching exports | Data sources, every screen |
| Arjun, CRM lead (Editor) | Retention, discounts, campaigns | Grow loyal buyers, stop margin leakage | Segments are descriptive | Customers |
| Rahul, QA and product (Viewer) | Product quality | Spot defects early | Learns from complaints weeks late | Customer voice |
| Recruiter or brand visitor (demo, no login) | Evaluating PreQL members | Understand the product quickly | n/a | Demo of all screens |

## 4. Goals and non-goals

### 4.1 Goals (v1)

- G1. Show real versus claimed return for every paid channel with a confidence label and evidence.
- G2. Explain the week: split revenue change into drivers that together explain at least 80 percent of it.
- G3. Track a watchlist of rival products across Amazon, Flipkart, Nykaa and rival brand sites with price per 10 ml, rating, reviews and changes.
- G4. Group own-site customers into five types and flag the preferred and the problem type with value-to-cost.
- G5. Read reviews by aspect, compare with the category, and surface new and growing complaints with dates.
- G6. Every suggested action executes, prepares, schedules or assigns something real; every action is logged with expected impact and measured at readout.
- G7. Data arrives from Google Sheets, a Google Drive Inbox, Shopify, the extension and rival brand sites, with scheduled and manual refresh.
- G8. Zero cost, no payment method, data in the brand's own accounts.

### 4.2 Non-goals (v1)

- Automated scraping of marketplaces or logged-in portals.
- Paid APIs or paid data providers.
- Writing to Amazon, Flipkart, Nykaa or quick-commerce platforms directly (no free public write APIs; Drishti prepares files and links instead).
- A full Bayesian media-mix model (v1 uses a constrained ridge model calibrated by experiments; Bayesian MMM is Phase 4).
- Mobile-first layout (v1 is desktop 1280–1920 px; phones get a read-only summary in Phase 3).
- Multi-brand agency workspaces (schema is ready; UI in Phase 4).

## 5. Scope by screen

| # | Screen | Question it answers | Core visual | Suggested actions (examples) |
| --- | --- | --- | --- | --- |
| 1 | This week | What moved sales and what do we do? | Sales bridge (drivers in ₹ lakh) | Coupon to match a rival, QA hold, restock, budget shift, discount caps |
| 2 | Actions | What did we do and did it pay off? | Action log with lifecycle and measured vs expected | Approve, undo, open output file |
| 3 | Performance | How are revenue, orders, order value and buyers moving by channel? | Stacked weekly bars by channel, channel table | Channel-specific moves |
| 4 | Impact and ROI | Which rupee really worked? | Claimed vs real sales per ₹100 by channel; CAC and payback by source | Budget shift, brand-search pause test, holdout extension |
| 5 | Market | What did rivals change and where do we sit? | Positioning map (price per 10 ml vs rating) and perception map; similar products table | Coupon, alerts, listing copy, competitor targeting |
| 6 | Customers | Who buys and who costs us? | Customer map by orders a year vs order value; segment table | Lookalike export, discount caps, COD OTP, refill nudge |
| 7 | Customer voice | What do reviews say and what is new? | Net sentiment by aspect, us vs category; growing complaints | QA hold, review replies, listing update, R&D brief |
| 8 | Data sources | Where does every number come from and what is late? | Source table with method, cadence and status | Upload, request file, reminders, privacy mode |

Every analytical screen follows one pattern, top to bottom: **summary strip** (verdict plus six KPIs with colour-coded change) → **visualisation** → **analysis table** → **inference** ("What this means") → **suggested actions** with execute buttons. No page scrolls at 1440×900.

## 6. Functional requirements

IDs are referenced by tests in `12-QA-AND-METRICS.md`.

### 6.1 Global

- FR-G1. Sign in with Google; access only for emails listed in the Users tab of the Workspace Sheet (roles in `04-ADMIN.md`).
- FR-G2. Public demo at `/demo` with fictional data, no sign-in, actions simulated and logged in the browser only. A banner says "Demo, fictional data".
- FR-G3. Sidebar navigation to all eight screens; workspace name; light and dark mode switch that persists per viewer; footer with last sync time.
- FR-G4. Every screen shows data freshness ("Synced today, 7:10 am") and a "Sync now" control for Owners and Analysts.
- FR-G5. The UI checks for a new snapshot every 60 seconds while visible and updates in place with a short notice.
- FR-G6. Every number shows its definition on hover or focus (title or tooltip) and every insight lists its evidence.
- FR-G7. Good and bad are colour-coded by meaning, not by sign: a rise in CAC or returns is red; a fall is green.
- FR-G8. All money in rupees with Indian grouping (lakh, crore); "₹4.30 Cr", "₹29 L", "₹1,050".

### 6.2 This week

- FR-W1. Summary: verdict (Down week / Up week / Flat) with a one-sentence reason; KPIs: net revenue, orders, order value, ad spend, true ROAS (with claimed beside it), CAC for new buyers; each with change vs prior week and an 8-week sparkline.
- FR-W2. Sales bridge: prior week → drivers → this week, in ₹ lakh, each driver tagged with its channel and colour-coded lost or added; caption "Explains N% of the change".
- FR-W3. Working and Needs attention panels, three items each, generated from the snapshot.
- FR-W4. Inference card: one to two sentences from the top drivers.
- FR-W5. Suggested actions: up to five, ranked by priority (`08-METHODS.md` §9), each expandable to show evidence, with Run, Assign and Evidence controls.

### 6.3 Actions

- FR-A1. Action log for the selected period with title, source screen, owner, status, expected and measured impact.
- FR-A2. Detail: executor type, lifecycle (Suggested → Approved → Running → Measuring → Result), what Drishti did step by step with timestamps, measured against expected with readout date, buttons Approve and run (if waiting and the viewer is an Approver), Undo (if the executor supports it), Open output.
- FR-A3. Summary: waiting count with reason, actions run, expected monthly impact, confirmed so far, hit rate vs 60 percent target, being measured with next readout, overdue.
- FR-A4. The same log is mirrored to the Actions tab of the Workspace Sheet within one minute.

### 6.4 Performance

- FR-P1. Summary: net revenue, orders, order value, customers, orders per buyer, 90-day repeat (28 days vs prior 28).
- FR-P2. Weekly chart with metric tabs (Revenue, Orders, Order value, Buyers); revenue shows stacked bars by channel; last four weeks emphasised.
- FR-P3. Channel table (revenue, growth, orders, AOV, buyers where known, returns) that selects a channel; inference and two actions update to the channel; footer shows share of revenue.

### 6.5 Impact and ROI

- FR-I1. Summary: ad spend, claimed ROAS, true ROAS, real sales from ads, new-buyer CAC, value-to-CAC with target.
- FR-I2. Claimed vs real revenue per ₹100 for each paid channel, selectable, colour of real value by threshold.
- FR-I3. New-buyer cost, 12-month value, value-to-cost and payback by acquisition source.
- FR-I4. Inference per channel with confidence and evidence (which tests or natural experiments), spend, claimed and real totals.
- FR-I5. Running test progress with readout date.

### 6.6 Market

- FR-M1. Summary: our price per 10 ml vs median, rating vs category, reviews and monthly change, search purchase share and change, average discount vs rivals, out-of-stock days.
- FR-M2. Map toggle: price and rating (bubble size = reviews) and "What reviews say" (gentle↔clinical, value↔premium) with the open space shaded.
- FR-M3. Similar products table across platforms with price, 14-day change, price per 10 ml, rating, reviews; selecting a row or bubble updates inference and actions.
- FR-M4. Price changes this week list.
- FR-M5. Capture prices now: opens the extension's capture queue (user-driven) and triggers a rival-site check.

### 6.7 Customers

- FR-C1. Summary: buyers, bought again, 12-month value, preferred-type share, problem-type share, undelivered (RTO) rate.
- FR-C2. Customer map (orders a year vs average order) with sampled dots by type and labelled centroids; preferred blue, problem orange, others grey.
- FR-C3. Type table: share of buyers, share of revenue, AOV, orders a year, repeat, CAC, LTV:CAC; selectable.
- FR-C4. Method note: k-means, five groups, signals used; marketplace buyers excluded.
- FR-C5. Re-run grouping (Analyst): recompute on the latest data with a stability check.

### 6.8 Customer voice

- FR-V1. Summary: rating (90 days) and change, reviews read, positive, negative, top-issue mentions, reply rate vs target.
- FR-V2. Net sentiment by aspect, us vs category, diverging bars, selectable; selected aspect shows two sample quotes with platform and stars.
- FR-V3. New and growing complaints (30 days vs prior 30) with mentions, change, platforms and first-seen date.

### 6.9 Data sources

- FR-D1. Summary: sources up to date (n of N), revenue covered, history, rows stored, third parties (none), cost (₹0).
- FR-D2. Source table: method, cadence, status (up to date, received, n days late); selecting shows how it works, what it feeds, last received, rule, and actions (upload, refresh, remind).
- FR-D3. Privacy mode switch: hides customer names, emails and phones everywhere (on by default).
- FR-D4. Upload a file: drag a CSV or XLSX; it is copied to the Drive Inbox and a sync is queued.

## 7. Non-functional requirements

| ID | Requirement | Target |
| --- | --- | --- |
| NFR-1 Cost | Total spend | ₹0, no payment method on any account |
| NFR-2 Performance | First screen interactive on a mid-range laptop | under 2.0 s on demo; snapshot download under 1.5 MB gzip |
| NFR-3 Performance | Screen switch | under 150 ms (client-side, data already loaded) |
| NFR-4 Freshness | Scheduled sync | every 6 hours by default (3, 6, 12 or 24 configurable); manual sync completes in under 5 minutes |
| NFR-5 Reliability | Sync failure | the last good snapshot keeps serving; failures are shown on Data sources and notified |
| NFR-6 Privacy | Customer personal data | never leaves the brand's Google and Cloudflare accounts; names, emails and phones are not stored in snapshots; hashed IDs only |
| NFR-7 Security | Sessions | HttpOnly Secure cookies, CSRF protection, role checks on every write, HMAC on internal endpoints, secrets only in Cloudflare and GitHub secret stores |
| NFR-8 Accessibility | WCAG 2.2 AA | keyboard reachable, visible focus, 4.5:1 text contrast in both themes, charts with text equivalents |
| NFR-9 Free-tier safety | Usage | daily budget governors keep KV writes under 800, D1 writes under 50,000, Workers AI under 8,000 neurons, Worker requests under 60,000 |
| NFR-10 Explainability | Every model output | shows method, window, evidence and confidence |
| NFR-11 Legality | Data collection | no automated marketplace visits; robots.txt respected; platform terms noted per source |
| NFR-12 Browser support | Desktop | latest Chrome, Edge, Firefox, Safari; 1280 px minimum width (scaled), designed at 1440×900 |

## 8. Success metrics

Product metrics (definitions in `12-QA-AND-METRICS.md` §7; targets and phases in `13-STRATEGY-AND-KRAS.md`):

- Weekly active users per workspace; share of weeks with at least one action run.
- Time from sync to first action (median).
- Action hit rate (measured at least 50 percent of expected): target 60 percent.
- Confirmed impact (₹ per month) from measured actions.
- Data freshness: share of sources within their SLA.
- Analyst hours saved per week (self-reported in pilot, baseline vs after).
- Demo: visitors who reach three or more screens; median time on demo.

## 9. Releases

| Release | Phase | Contents |
| --- | --- | --- |
| R0 Demo | Phase 0 | All eight screens on sample data, light and dark, simulated actions, public `/demo` |
| R1 Measure | Phase 1 | Sign-in, Workspace Sheet, Drive Inbox, Shopify, sync (scheduled and manual), real snapshot, actions: prepare, task, rule, data, Shopify execute |
| R2 Act | Phase 2 | Geo test planner and automated readouts, Meta execute, Workers AI review tagging and drafts, extension, rival site watcher, approvals |
| R3 Pilot | Phase 3 | Hardening, onboarding wizard, phone summary view, two pilot brands, case study |
| R4 Scale | Phase 4 | Multi-workspace, Amazon SP-API and Ads API, Google Ads API, Bayesian MMM |

## 10. Assumptions, risks and mitigations

| Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| Free-tier limits change | Medium | High | Budget governors, limits in one config file, weekly check job, docs list fallbacks (`05-SYSTEM-DESIGN.md` §3) |
| Marketplace terms on data collection | Medium | High | User-initiated capture only; official exports and reports; rival brand sites only where robots.txt allows |
| Incrementality estimates are noisy | High | Medium | Confidence labels, intervals, experiment-first evidence hierarchy, never show a point estimate without its range on hover |
| Brands won't share data with students | Medium | High | Self-hosted on their accounts; demo-first showcase; pilot with smaller brands and alumni contacts |
| Platform export columns change | High | Medium | Header-signature detection plus the Mappings tab for overrides; contract tests; clear SCHEMA_MISMATCH errors |
| Meta app permissions | Medium | Low | Read via CSV exports in Phase 1; API execution only in development mode on own ad account |
| GitHub disables scheduled workflows in inactive public repos after 60 days | Medium | Medium | Keepalive workflow commits a heartbeat monthly; Data sources warns when the last scheduled sync is older than 26 hours |
| Google Sheets API quota overage billing (announced for later in 2026) | Low | Medium | Usage is tiny (under 50 requests per sync); throttle to 30 requests per minute; no billing account means no charges can apply |
