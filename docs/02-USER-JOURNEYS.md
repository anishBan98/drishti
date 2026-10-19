# 02 · User Journeys and Happy Flows

Each journey lists the trigger, the steps (who does what, what the system does), the end state, and the tests that cover it (IDs from `12-QA-AND-METRICS.md`). Unhappy paths are in `03-EXCEPTIONS.md`.

## J0. Recruiter opens the demo (showcase journey)

**Persona:** recruiter or brand leader with the link. **Goal:** understand Drishti in two minutes.

| # | Who | Step | System |
| --- | --- | --- | --- |
| 1 | Visitor | Opens `/demo` (or `/` and clicks "Open the demo with fictional data") | Loads `demo/snapshot.json` from static assets; renders This week in the viewer's system theme |
| 2 | Visitor | Reads the verdict "Revenue fell 6.5% to ₹4.30 Cr. ₹29 L of the drop is fixable." | Summary strip with colour-coded KPIs and sparklines |
| 3 | Visitor | Hovers a bridge bar ("Rival B price cut −16") | Tooltip with method and evidence |
| 4 | Visitor | Clicks Create coupon on the first action | Card expands into a confirm step listing what will happen; visitor clicks Run; steps tick; card shows "✓ Coupon file ready · View in Actions"; the coupon CSV downloads |
| 5 | Visitor | Clicks Action log | Actions screen shows the new action at the top with status Running and the steps it performed (simulated in demo, stored in browser memory) |
| 6 | Visitor | Visits Impact and ROI, clicks Creators | Inference changes: "Under-credited by three times…" |
| 7 | Visitor | Switches to Dark | Every screen re-themes; choice remembered in this browser |
| 8 | Visitor | Opens Data sources | Sees exactly how each number is obtained, and "Cost ₹0, no paid APIs" |

**End state:** visitor has seen measurement, market, customers, voice, actions and data provenance. Covered by E2E-01 to E2E-08.

## J1. First-time setup (Owner, about 45 minutes, once)

**Persona:** Aditi (or the club member deploying for a brand). Detailed console steps are in `14-SETUP-RUNBOOK.md`.

| # | Who | Step | System |
| --- | --- | --- | --- |
| 1 | Owner | Deploys Drishti (Claude Code does this from the runbook) | Worker live at `https://drishti.<subdomain>.workers.dev` |
| 2 | Owner | Imports `Drishti-Workspace-Template.xlsx` into Google Sheets; creates Drive folders "Drishti Inbox" and "Drishti Outbox" | n/a |
| 3 | Owner | Shares the Sheet and both folders with the service account email (Editor) | n/a |
| 4 | Owner | Opens Drishti, signs in with Google | First user whose email equals `OWNER_EMAIL` secret becomes Owner; onboarding checklist appears on Data sources |
| 5 | Owner | Pastes the Sheet URL and the two folder URLs into the checklist | Worker validates access with the service account; shows green ticks or the exact sharing fix |
| 6 | Owner | Enters the Shopify store domain; pastes the Admin API token (or skips) | Token stored encrypted in D1 (AES-GCM with `DATA_KEY` secret); test call lists shop name |
| 7 | Owner | Fills Users tab with teammates and roles | Next sync loads users; teammates can sign in |
| 8 | Owner | Drops the first exports into the Drive Inbox (or uses sample-data/inbox) and clicks Sync now | Sync job runs (2–4 min), files parsed and archived, snapshot built; status per source turns green |
| 9 | Owner | Opens This week | Real numbers |

**End state:** workspace live, users invited, first snapshot built. Covered by E2E-20 (staging), API-01..05, SYNC-01..06.

## J2. Monday review (CMO, 10 minutes)

**Trigger:** Monday 7:10 am sync finishes; Slack message "Drishti: week of 5–11 Oct ready. Revenue −6.5%. 5 suggested actions."

| # | Who | Step | System |
| --- | --- | --- | --- |
| 1 | Aditi | Opens This week | Verdict, KPIs, bridge, working and attention items, inference |
| 2 | Aditi | Expands "Match Rival B on Amazon, 30 ml only" | Evidence: Rival B now ₹150 per 10 ml vs ₹183; Amazon units for the product fell 14% since 3 Oct; confidence medium |
| 3 | Aditi | Clicks Assign, picks Priya | Action created with status Suggested → Assigned; Priya gets Slack and calendar notice |
| 4 | Aditi | Clicks Apply budget shift on "Move ₹30 L to stronger channels" | Over threshold: status Waiting for approval; since Aditi is Approver she is asked to confirm in the same card |
| 5 | Aditi | Confirms | Budget sheet generated in Drive Outbox (new split by channel and city), Meta budget changes executed if Meta is connected (Phase 2) or prepared as a checklist; readout booked for 4 weeks later |
| 6 | Aditi | Opens Actions | Sees both actions, owners and readout dates |

**End state:** two actions live with expected impact and readout dates. Covered by E2E-09..12, ACT-01..08.

## J3. Responding to a rival price cut (Category manager)

**Trigger:** Rule R02 fires at the 6 am sync: "Rival B cut price 18% on Amazon (₹549 → ₹449)". Slack and in-app notice.

| # | Who | Step | System |
| --- | --- | --- | --- |
| 1 | Priya | Opens Market from the notice | Rival B selected; map shows Rival B moved left; table shows ▼18% |
| 2 | Priya | Reads inference: "High threat: took 1.2 points of your search share; rating also higher" | Evidence from Brand Analytics weekly search share and captures |
| 3 | Priya | Clicks Create coupon (12% Amazon coupon) | Confirm lists: build coupon file for the 30 ml ASIN, open Seller Central Coupons, log, book readout in 21 days |
| 4 | Priya | Clicks Run | Coupon CSV saved to Drive Outbox and downloaded; Seller Central coupons page opens in a new tab; action status Waiting for you |
| 5 | Priya | Creates the coupon in Seller Central, returns, clicks "I've done it" | Status Running → Measuring; readout uses forecast vs actual units for the ASIN on Amazon with other channels as control |
| 6 | System | Day 21 readout | Measured impact written; hit or miss; Slack summary |

**End state:** price response executed and measured. Covered by E2E-13, ACT-10, MET-05.

## J4. Launching a geo test and reading it out (Analyst or performance marketer)

**Trigger:** Impact screen shows Google brand search "confidence medium"; suggested action "Pause brand search in 4 test cities".

| # | Who | Step | System |
| --- | --- | --- | --- |
| 1 | Kabir | Clicks Launch test | Confirm shows the plan: test cities (Jaipur, Lucknow, Indore, Kochi) chosen by matching, control by synthetic control, 14 days, minimum detectable effect, expected cost of the test |
| 2 | Kabir | Adjusts duration to 21 days (optional) and runs | Test row created (D1 and Tests tab); exclusion list CSV for Google Ads saved and downloaded; checklist "Add these cities as excluded locations in campaign Brand \| Lumora" |
| 3 | Kabir | Applies exclusions in Google Ads, clicks "I've done it" | Status Running; daily progress bar on Impact screen |
| 4 | System | Each sync | Checks spend in test cities actually dropped (guard: if not, warns "Test not applied") |
| 5 | System | Readout date | Synthetic control estimate with interval; Impact screen updates Google's real return and confidence to high; action result posted |

**End state:** evidence upgraded; future budget suggestions use it. Covered by MOD-03, MOD-04, E2E-14.

## J5. Review crisis (Customer voice)

**Trigger:** Rule R03: pump mentions above 5% of new reviews for 7 days.

| # | Who | Step | System |
| --- | --- | --- | --- |
| 1 | Priya or Rahul | Opens Customer voice | Pump and packaging selected: −38 vs category +5; quotes; "first seen 21 Sep" |
| 2 | Rahul | Clicks Raise QA hold | QA hold note (Google Doc) in Drive Outbox with complaint count, dates, platforms, sample quotes, batch inference; task assigned to Rahul with due date; Slack |
| 3 | Priya | Clicks Draft replies | Workers AI drafts replies for the 380 pump reviews using the reply guide (offer free replacement, no admission language beyond policy); saved as a sheet in Outbox for review and copy-paste into each platform |
| 4 | System | Daily | Tracks pump share in new reviews; action measured on rating and pump share at 6 weeks |

Covered by AI-01..04, ACT-14, E2E-15.

## J6. Segment campaign (CRM lead)

| # | Who | Step | System |
| --- | --- | --- | --- |
| 1 | Arjun | Opens Customers, selects Deal Hunters | Inference: 31% of buyers, 17% of revenue, discount 61%, COD 72%, 18% RTO |
| 2 | Arjun | Clicks Apply caps | Confirm: lists the Shopify discount codes used by this group above 15% (GLOW20, FEST25, MEGA30) and the change to 15%; saves old values for undo |
| 3 | Arjun | Runs | Shopify Admin API updates the codes (development store in demo deployments); action Measuring with readout in 3 weeks |
| 4 | Arjun | Selects Routine Loyalists, clicks Export audience | Action runner builds a hashed (SHA-256 normalised email and phone) audience CSV for Meta Custom Audiences, saved to Outbox; no raw personal data leaves Shopify or Drive |

Covered by ACT-20..23, E2E-16.

## J7. Late file (Analyst)

| # | Who | Step | System |
| --- | --- | --- | --- |
| 1 | System | 6 am sync | Flipkart Ads last received 11 Oct; SLA daily; status "5 days late"; Data sources summary "Two gaps"; Flipkart figures marked low confidence on Impact |
| 2 | Analyst | Opens Data sources, selects Flipkart Ads, clicks Set reminder | Daily 9 am Slack reminder to the Ads team until a file arrives |
| 3 | Ads team | Drops five files in the Drive Inbox | Next sync detects them by header signature, parses, archives; status Received |

Covered by SYNC-07, CON-06.

## J8. Uploading an export directly (any Editor)

1. On Data sources, click Upload a file and pick `amazon_business_report_daily.csv`.
2. Worker streams it to the Drive Inbox (Drive API resumable upload via the service account) and dispatches a sync.
3. Banner "Received. Sync running, about 3 minutes."
4. When the snapshot updates, the banner changes to "Updated with 1 file".

## J9. Extension capture (Category manager)

1. Priya installs the extension (load unpacked, see `11-CONNECTORS.md` §7) and signs in once (it opens Drishti and receives a capture token).
2. She opens Rival C's Amazon page. The extension icon shows a dot: this URL is on the watchlist.
3. She clicks Capture. The extension reads price, MRP, rating, review count, stock and the visible top reviews from the page she is viewing, and posts them to `/api/capture`.
4. The Market screen shows the new capture immediately (merged from D1 until the next snapshot).
5. "Capture all 7" opens the watchlist pages one by one in her browser; she clicks Capture on each. Nothing is fetched without her.

## J10. Approver flow

1. Kabir (Editor) runs a ₹18 L budget action. Threshold ₹10 L, so status becomes Waiting for approval.
2. Aditi gets a Slack message and sees "1 waiting on you" on Actions.
3. She opens it, reads expected impact and evidence, clicks Approve and run, or Decline with a reason.
4. Approved actions run immediately; declined actions close with the reason logged.
5. Approvals expire after 7 days (status Expired; notify the requester).
