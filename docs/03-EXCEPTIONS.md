# 03 · Exceptions, Unhappy Paths and Error Codes

## 1. Principles

1. **Never show a wrong number confidently.** If an input is late, partial or failed, the number is still shown when it is safe, but its confidence drops and a note says why ("Flipkart figures are less certain: ads file 5 days late").
2. **The last good snapshot keeps serving.** A failed sync never blanks a screen.
3. **Every error has a next step** for the person who sees it, in plain words, from the copy deck.
4. **Partial success is reported as such.** An action that changed 2 of 3 discount codes says so and lists the third.
5. **Free-tier limits degrade gracefully**: slower polling, deferred AI, queued work, never a crash.

## 2. Issue flows

### 2.1 Sync problems

| Situation | Detection | What the user sees | System behaviour | Recovery |
| --- | --- | --- | --- | --- |
| Sheet not shared with the service account | Sheets API 403/404 at step 3 | Data sources: red banner "Drishti can't open your Workspace Sheet. Share it with {sa_email} as Editor." | Sync fails `SHEET_NOT_SHARED`; previous snapshot stays | Share; Sync now |
| Inbox folder not shared | Drive 404 | Same pattern for the folder | Other sources still sync; Inbox skipped | Share |
| File not recognised | No signature match | Source row "1 file not recognised" + headers found + "Map columns" | File moved to Inbox/Unrecognised | Add mapping rows; drag file back to Inbox |
| Required column missing after detection | Validation | "Amazon business report is missing 'Units Ordered'" | File skipped, kept in Inbox | Re-export with the column or map |
| Bad values (text in numbers, future dates) | Row validation | Warning with count: "12 rows skipped" | Rows skipped; file archived | Fix source if large |
| Duplicate file | Same md5 | Nothing (info in sync log) | Archived without parsing | — |
| Overlapping restated data | Coverage overlap | Nothing | Last 14 days replaced by the newer file | — |
| Source late beyond SLA | Each sync | Status "n days late"; Data sources verdict "Two gaps"; affected KPIs show a note; confidence lowered | Rule R04 notifies | Upload or set reminder |
| Shopify token invalid or scope missing | 401/403 | Data sources: "Shopify connection needs attention" | Shopify step skipped; others continue | Owner re-enters token |
| GitHub dispatch fails (PAT expired) | Worker gets 401/404 | Toast "Couldn't start a sync. An owner needs to renew the GitHub token." | `GITHUB_DISPATCH_FAILED`; scheduled syncs still run | Owner rotates PAT (`04-ADMIN.md` §6) |
| Scheduled workflow disabled (60-day rule) | No scheduled run for > 26 h | Footer amber; Data sources banner "Scheduled sync paused by GitHub" with a link | — | Re-enable workflow; keepalive prevents recurrence |
| Sync timeout (> 20 min) | Job timeout | "Last sync didn't finish" | Lock released after 20 min; snapshot unchanged | Automatic retry next hour; investigate logs |
| Concurrent sync request | Lock held | "A sync is already running (started 2 min ago)" | 409 with current run | Wait |
| Engine error on a model (e.g. singular matrix) | Exception caught per module | That module's panel shows "Couldn't update this today" with the previous values greyed and dated | Other modules publish | Fix in code; next sync |
| Not enough history (< 120 days) | Engine check | Impact shows claimed vs "Not enough history yet. Run a test." | MMM skipped; tests and natural experiments still used | Wait or run a geo test |
| KV daily write limit near | Usage counter ≥ 800 | Data sources note "Saving fewer updates today (free-tier limit)" | Sync writes snapshot only, skips non-changed facts; further manual syncs refused with `FREE_TIER_LIMIT` | Next day |
| D1 write limit near | Counter ≥ 50,000 | Same pattern | Captures and events throttled first | Next day |
| Workers AI budget reached | Counter ≥ 8,000 neurons | Voice: "Reading new reviews with the basic method today" | Lexicon fallback; drafts queued | Next day |

### 2.2 Action problems

| Situation | User sees | System |
| --- | --- | --- |
| Executor fails (network, 5xx) | Card: "Couldn't finish: Shopify didn't respond. Retry" | Auto-retry once; then `failed` with `EXECUTOR_FAILED`; Retry reuses params |
| Partial success | "Changed 2 of 3 codes. MEGA30 wasn't found." | `done` with warning event; undo covers the 2 |
| Connector missing (e.g. Shopify not connected) | Confirm view shows "Shopify isn't connected. Drishti will prepare a checklist instead." | Falls back to prepare where defined; else `CONNECTOR_MISSING` with link to Admin |
| Needs approval | "Waiting for approval from Aditi" | `awaiting_approval`; notify approvers |
| Approval expired (7 days) | Card and Actions: "Expired" | Requester notified |
| Declined | "Declined by Aditi: {reason}" | Closed |
| Undo unavailable (platform action, or data already changed) | Undo button absent; tooltip says why | — |
| Undo conflict (code changed since) | "The code was edited in Shopify after Drishti changed it. Undo skipped for GLOW15." | Partial undo logged |
| Handoff never confirmed | Day 3 reminder; day 7 status "Not confirmed" | No readout scheduled |
| Duplicate click | Same action returned (idempotency) | — |
| Test not applied (spend didn't drop) | Impact: "Test cities still have spend. Check the exclusions." | Alert to owner day 3; test invalid if not fixed by day 5 |
| Readout inconclusive | "Inconclusive: the range includes zero." | Result `inconclusive`; not counted in hit rate denominator |
| Action references stale suggestion (new snapshot changed it) | Confirm view shows "Numbers updated since you opened this" with new values | Uses latest suggestion params |

### 2.3 Auth and access

| Situation | User sees | Code |
| --- | --- | --- |
| Google token invalid or expired | "Sign-in didn't work. Try again." | `AUTH_TOKEN_INVALID` |
| Email not in Users tab | "You're not on this workspace yet. Ask {owner_name} to add {email} to the Users tab." | `AUTH_NOT_INVITED` |
| Session expired | Redirect to sign-in, return to the same screen | `AUTH_SESSION_EXPIRED` |
| Role too low for an action | Button hidden or disabled with tooltip "Editors and above can run this" | `ROLE_FORBIDDEN` |
| CSRF mismatch | "Please refresh the page" | `CSRF_INVALID` |
| Extension token revoked | Extension popup: "Reconnect to Drishti" | `CAPTURE_TOKEN_INVALID` |

### 2.4 Market capture

| Situation | Behaviour |
| --- | --- |
| Page layout changed, adapter can't find price | Popup: "Couldn't read the price on this page. You can type it." Manual fields; capture flagged `manual`; adapter failure counted (`ADAPTER_PARSE_FAILED`) and shown on Data sources if > 20% in 7 days |
| Price outside plausible range | Rejected with message; nothing stored |
| Not on watchlist | Ask "Add to watchlist?" (Editor+) or capture as unlisted |
| Rival site disallows robots | `ROBOTS_DISALLOWED` on that watchlist row; suggest switching to extension capture |
| Rival site blocks or times out | Skipped this sync; after 3 failures status "check URL" |

### 2.5 Demo

- Demo never calls write APIs; if a demo page somehow calls one, the Worker returns 403 `DEMO_READ_ONLY`.
- If `demo/snapshot.json` fails to load (e.g. corporate proxy), show a static fallback image strip of the screens with a note.

## 3. Error code catalog

| Code | HTTP | Message (copy deck `error.<code>`) |
| --- | --- | --- |
| VALIDATION_FAILED | 400 | Some details are missing or invalid: {fields}. |
| AUTH_TOKEN_INVALID | 401 | Sign-in didn't work. Try again. |
| AUTH_SESSION_EXPIRED | 401 | You were signed out. Sign in to continue. |
| AUTH_NOT_INVITED | 403 | You're not on this workspace yet. Ask an owner to add {email} to the Users tab. |
| AUTH_EMAIL_UNVERIFIED | 403 | Your Google email isn't verified. |
| CSRF_INVALID | 403 | Please refresh the page and try again. |
| ROLE_FORBIDDEN | 403 | Your role can't do this. {role_needed} and above can. |
| DEMO_READ_ONLY | 403 | This is the demo. Changes aren't saved. |
| NOT_FOUND | 404 | We couldn't find that. |
| SNAPSHOT_NONE | 404 | No data yet. Connect your Sheet and run the first sync. |
| SYNC_ALREADY_RUNNING | 409 | A sync is already running (started {ago}). |
| IDEMPOTENCY_MISMATCH | 409 | This request was already sent with different details. Refresh and try again. |
| UPLOAD_TOO_LARGE | 413 | Files up to 20 MB, please. Split larger exports by month. |
| UPLOAD_TYPE_UNSUPPORTED | 415 | Use CSV, XLSX or ZIP files. |
| APPROVAL_REQUIRED | 202 | This is over ₹{threshold}, so it needs an approver. Sent to {approvers}. |
| CONNECTOR_MISSING | 422 | {connector} isn't connected. {fallback_text} |
| UNDO_UNAVAILABLE | 422 | This can't be undone from Drishti: {reason}. |
| CAPTURE_NOT_ON_WATCHLIST | 422 | This page isn't on your watchlist. |
| DRIVE_NOT_SHARED | 422 | Drishti can't open {folder}. Share it with {sa_email} as Editor. |
| SHEET_NOT_SHARED | 422 | Drishti can't open your Workspace Sheet. Share it with {sa_email} as Editor. |
| SCHEMA_MISMATCH | 422 | {file} is missing {columns}. Re-export with these columns or map them in the Mappings tab. |
| FILE_UNRECOGNISED | 422 | We couldn't tell what {file} is. Map its columns in the Mappings tab. |
| ROBOTS_DISALLOWED | 422 | {host} asks bots not to read this page. Use the extension instead. |
| TEST_NOT_APPLIED | 422 | Test cities still have spend. Check the exclusions in {platform}. |
| RATE_LIMITED | 429 | Too many requests. Try again in {seconds} seconds. |
| EXECUTOR_FAILED | 502 | Couldn't finish: {platform} didn't respond. |
| SHOPIFY_TOKEN_INVALID | 502 | The Shopify connection needs attention. An owner can reconnect it in Admin. |
| SHOPIFY_SCOPE_MISSING | 502 | The Shopify app needs the {scope} permission. |
| META_PERMISSION | 502 | The Meta connection can't change this ad set. Check the app's access. |
| GITHUB_DISPATCH_FAILED | 502 | Couldn't start a sync. An owner needs to renew the GitHub token. |
| AI_UNAVAILABLE | 503 | Drafting is unavailable right now. We'll try again later. |
| FREE_TIER_LIMIT | 503 | Daily free limit nearly reached. This will run tomorrow. |
| SANDBOX_FULL | client | This browser keeps up to 50 MB per company. Remove a file or split it by month. |
| SHEET_LINK_INVALID | 400 | That isn't a Google Sheets link. Copy it from the Share button. |
| SHEET_NOT_PUBLIC | 403 | Drishti can't open this sheet. In Google Sheets choose Share → General access → Anyone with the link → Viewer, then try again. |
| SHEET_TOO_LARGE | 413 | This sheet is over 20 MB. Split older months into another sheet. |
| SHEET_FETCH_FAILED | 502 | Google didn't send the sheet. Try Refresh in a minute. |
| SNAPSHOT_SCHEMA_MISMATCH | client | Showing the last saved data while we update. |
| ADAPTER_PARSE_FAILED | client (extension) | Couldn't read the {field} on this page. You can type it. |
| INTERNAL | 500 | Something went wrong on our side. Try again; if it repeats, tell your analyst (ref {request_id}). |

## 4. Edge cases checked by tests

- Week boundaries across month and year ends; the IST day boundary for timestamps near midnight.
- Channels with zero revenue in the prior period (growth shown as "New").
- Divide by zero in ROAS (spend 0) → "—".
- A city with all rows allocated (no ship city) → excluded from geo donors.
- A segment with fewer than 30 customers → merged into the nearest segment with a note.
- Reviews in Hinglish and with emojis; very long reviews truncated to 1,000 characters for AI.
- A price capture with MRP < price (marketplace glitch) → MRP ignored.
- Sheet with extra columns, hidden rows, or a renamed tab → renamed tab is `SHEET_TAB_MISSING` with the expected name.
- Two people approving the same action at once → second gets "Already approved by {name}".
