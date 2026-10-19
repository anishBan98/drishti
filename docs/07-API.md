# 07 · API and Protocols

Base URL: the Worker origin. JSON in and out (`Content-Type: application/json; charset=utf-8`) unless stated. Implemented with Hono on Cloudflare Workers; request and response bodies validated with zod schemas from `packages/shared/src/api.ts`.

## 1. Protocols

### 1.1 Auth

| Caller | Credential | Routes |
| --- | --- | --- |
| Browser (app) | `__Host-drishti` session cookie + `X-CSRF-Token` on non-GET | `/api/*` |
| Extension | `Authorization: Bearer <capture token>` | `/api/watchlist`, `/api/capture` |
| Sync job and action runner | `X-Drishti-Sig` HMAC (`05-SYSTEM-DESIGN.md` §8) | `/internal/*` |
| Anyone | none | `/`, `/demo`, `/demo/*`, static assets, `/api/health` |

### 1.2 Errors

```json
{ "error": { "code": "APPROVAL_REQUIRED", "message": "This change is over ₹10 L, so it needs an approver.", "detail": { "threshold_inr": 1000000 }, "request_id": "01JA…" } }
```

HTTP status follows meaning (400 validation, 401 no session, 403 role, 404, 409 conflict or idempotency replay with different body, 422 business rule, 429 rate limit, 502 upstream, 503 free-tier governor). Every `code` is in `03-EXCEPTIONS.md` §3 with its user message.

### 1.3 Idempotency

`POST /api/actions`, `POST /api/actions/:id/*`, `POST /api/uploads` and `POST /api/sync` accept `Idempotency-Key` (UUID). Same key and same body within 24 h returns the original response; same key with a different body returns 409 `IDEMPOTENCY_MISMATCH`. The SPA generates one key per click.

### 1.4 Pagination

Cursor-based: `?limit=50&cursor=<opaque>` → `{ items: [...], next_cursor: string | null }`.

### 1.5 Rate limits

Per user: 60 writes per minute, 600 reads per minute. Per capture token: 300 per hour. Exceeding returns 429 with `Retry-After`.

## 2. Public

| Method | Path | Response |
| --- | --- | --- |
| GET | `/api/health` | `{ ok: true, version: "<git sha>", time }` |
| GET | `/demo/snapshot.json` | Demo snapshot (static) |
| GET | `/samples/*` | Template sheet (`Drishti-Workspace-Template.xlsx`), one CSV per Sheet tab, and one sample export per source (static, copied from `sample-data/` at build) |

## 3. Auth and session

### POST `/api/auth/google`
Request `{ credential: string }` (Google ID token). Response 200 `{ user: { email, name, role }, csrf: string }` and sets cookies. Errors: `AUTH_TOKEN_INVALID` 401, `AUTH_NOT_INVITED` 403, `AUTH_EMAIL_UNVERIFIED` 403.

### POST `/api/auth/logout`
Revokes the session. 204.

### GET `/api/me`
`{ user: { email, name, role }, workspace: { name, configured: boolean, onboarding: { sheet: bool, inbox: bool, outbox: bool, shopify: bool, first_sync: bool } }, theme_hint: null }`

### POST `/api/extension/token`
Editor and above. Response `{ token, expires_at }` (scope `capture`, 30 days).

## 4. Snapshot and sync

### GET `/api/snapshot`
Streams the latest snapshot (gzip). Headers `ETag`, `X-Snapshot-Generated-At`. 304 on `If-None-Match`. 404 `SNAPSHOT_NONE` before the first sync.

### GET `/api/snapshot/meta`
`{ version, generated_at, data_through, sources_ok, sources_late, sync: { status, started_at, trigger } | null }`

### POST `/api/sync`
Owner or Analyst. Request `{ reason?: string }`. Dispatches the GitHub workflow. Response 202 `{ run_id, status: "queued" }`. Errors: `SYNC_ALREADY_RUNNING` 409 (returns current run), `GITHUB_DISPATCH_FAILED` 502.

### GET `/api/sync/runs?limit=10`
`{ items: [{ id, trigger, status, started_at, finished_at, files_parsed, error_code }] }`

## 5. Actions

### GET `/api/suggestions?screen=market&context=rival:Rival%20B`
Suggestions from the latest snapshot joined with any action already started from them: `{ items: [{ ...Suggestion, action?: { id, status } }] }`.

### POST `/api/actions`
Create and run an action.

```json
{
  "type": "amazon_coupon",
  "suggestion_id": "sg_01JA…",           // optional (manual actions have none)
  "screen": "market",
  "params": { "asin": "B0LUMVC301", "sku": "LUM-VC30", "discount_pct": 12, "weeks": 3 },
  "owner_email": "priya@lumora.example",  // optional; default = caller
  "note": "Match Rival B"
}
```

Response 201:

```json
{
  "action": {
    "id": "ac_01JA…", "status": "waiting_on_user", "executor": "handoff",
    "title": "Match Rival B with a 12% Amazon coupon",
    "steps": [
      { "text": "Built the coupon file: 30 ml serum, 12% off, 3 weeks", "done": true, "at": "2026-10-17T10:02:11+05:30" },
      { "text": "Open Seller Central Coupons and upload the file", "done": false }
    ],
    "outputs": [
      { "kind": "drive_file", "label": "Coupon file", "url": "https://drive.google.com/file/d/…" },
      { "kind": "download", "label": "Coupon file (CSV)", "url": "/api/actions/ac_01JA…/outputs/0" },
      { "kind": "link", "label": "Open Seller Central Coupons", "url": "https://sellercentral.amazon.in/coupons/" }
    ],
    "expected": { "inr": 900000, "per": "week", "label": "+₹9 L/wk" },
    "readout_date": "2026-11-07"
  }
}
```

Status after create depends on executor: inline → `done` or `measuring` (or `failed`); job → `running` (poll); handoff → `waiting_on_user`; over threshold → `awaiting_approval`.
Errors: `VALIDATION_FAILED` 400, `ROLE_FORBIDDEN` 403, `APPROVAL_REQUIRED` 202 with `status: awaiting_approval` (not an error for the UI), `CONNECTOR_MISSING` 422 (e.g. Shopify not connected; response includes a handoff fallback when one exists), `EXECUTOR_FAILED` 502.

### GET `/api/actions?status=&period=month&cursor=`
List with summary block:

```json
{ "summary": { "waiting": 2, "run": 5, "expected_month_inr": 11000000, "confirmed_inr": 3800000, "hit_rate": 0.64, "measuring": 4,
               "next_readout": "2026-10-31", "overdue": 1 },
  "items": [ { "id", "title", "how", "screen", "owner", "status", "expected_label", "measured_label", "measured_progress", "readout_date" } ],
  "next_cursor": null }
```

### GET `/api/actions/:id`
Full action with `events[]`, `steps[]`, `outputs[]`, `approval`, `stage` (0–4 for the lifecycle bar), `can: { approve, decline, undo, confirm, retry }`.

### POST `/api/actions/:id/confirm`
Handoff done ("I've done it"). Body `{ note?: string, evidence_url?: string }`. Moves to `done` → `measuring` when a readout exists.

### POST `/api/actions/:id/approve` · `/decline`
Approver or Owner, and not the requester for budget actions above the threshold. Body for decline `{ reason }`. Approve runs the executor immediately.

### POST `/api/actions/:id/undo`
Allowed when `can.undo`. Restores `before_json`. Response has the new status `undone`. Error `UNDO_UNAVAILABLE` 422.

### POST `/api/actions/:id/retry`
For `failed`. Re-runs the executor with the same params and a new attempt number.

### POST `/api/actions/:id/assign`
Body `{ owner_email, due_date? }`. Notifies the owner (Slack, calendar event when connected, in-app).

### GET `/api/actions/:id/outputs/:n`
Streams a generated file (small outputs are kept in KV for 30 days under `out:{action_id}:{n}`; large ones redirect to the Drive file).

## 6. Rules, tests, notifications

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/rules` | Rules with last fired time |
| POST | `/api/rules` | Create (Editor+). Body `{ name, condition, action, params, owner_email }`. Condition is validated by the engine grammar compiled into the Worker (parse only, no evaluation) |
| PATCH | `/api/rules/:id` | `{ status: "on" | "off" }` or edits |
| GET | `/api/tests` | Tests with day N of M, readout date, result when done |
| GET | `/api/notifications` | In-app notifications for the caller |
| POST | `/api/notifications/:id/read` | 204 |

## 7. Market capture (extension)

### GET `/api/watchlist`
Bearer capture token. `{ items: [{ watch_id, label, brand, platform, url, url_pattern, pack_ml }] }`. `url_pattern` is a normalised pattern (host + path without tracking parameters) the extension matches against the active tab.

### POST `/api/capture`
```json
{ "url": "https://www.amazon.in/dp/…", "watch_id": "W05", "platform": "Amazon",
  "captured_at": "2026-10-17T10:41:00+05:30",
  "fields": { "title": "…", "price_inr": 449, "mrp_inr": 690, "rating": 4.2, "review_count": 26112, "in_stock": true,
              "pack_ml": 30, "top_reviews": ["…", "…"] },
  "adapter": "amazon_in@3", "extension_version": "1.0.0" }
```
Response 201 `{ id, merged: true }`. Validation: price between ₹10 and ₹100,000; rating 1–5; at most 10 reviews of 1,000 characters each. Errors `CAPTURE_NOT_ON_WATCHLIST` 422 (still stored as unlisted if the user confirms), `RATE_LIMITED` 429.

### GET `/api/captures?since=<iso>`
Captures newer than the snapshot, for the Market screen to merge live.

## 8. Data

### GET `/api/sources`
Source rows plus onboarding hints.

### POST `/api/uploads`
Editor+. `multipart/form-data` with one file (CSV, XLSX, up to 20 MB). The Worker streams it to the Drive Inbox with a resumable upload (no parsing), then dispatches a sync. Response 202 `{ drive_file_id, sync_run_id }`. Errors `UPLOAD_TYPE_UNSUPPORTED` 415, `UPLOAD_TOO_LARGE` 413, `DRIVE_NOT_SHARED` 422.

### POST `/api/sources/:id/remind`
Body `{ owner_email, time: "09:00" }`. Creates a daily reminder notification until the source is received.

## 9. Admin

| Method | Path | Role | Notes |
| --- | --- | --- | --- |
| GET | `/api/admin/workspace` | Owner | Sheet and folder IDs, settings snapshot, connector status |
| PUT | `/api/admin/workspace` | Owner | `{ sheet_url, inbox_url, outbox_url, archive_url? }` → validates access with the service account, extracts IDs |
| PUT | `/api/admin/connectors/:kind` | Owner | `kind` in `shopify`, `meta`, `slack`, `google_calendar`. Body has config and token; token encrypted before storage |
| POST | `/api/admin/connectors/:kind/test` | Owner | Live check (Shopify `shop { name }`, Meta `me`, Slack test message, Calendar insert-and-delete) |
| GET | `/api/admin/audit?cursor=` | Owner | Audit log |
| POST | `/api/admin/sessions/revoke` | Owner | `{ user_email }` or `{ all: true }` |
| GET | `/api/admin/usage?days=14` | Owner, Analyst | `usage_daily` rows with limits |
| POST | `/api/admin/export` | Owner | Starts a job that writes all facts and logs to Drive Outbox as CSV |
| DELETE | `/api/admin/workspace` | Owner | Requires body `{ confirm: "DELETE <workspace name>" }`; see `04-ADMIN.md` §7 |

### POST `/api/test/login` (staging only)
Exists only when `ENVIRONMENT = "staging"` (compile-time flag). Header `X-E2E-Secret` must equal `E2E_SECRET`; body `{ email }` must be in the Users tab. Returns a normal session. Production returns 404 (tested by API-03).

## 10. Product analytics

### POST `/api/events`
`{ name, props }` batched (up to 20). Demo events carry `demo: true` and no user hash. Names and props in `12-QA-AND-METRICS.md` §6.

## 11. Internal (sync job and action runner)

| Method | Path | Body or response |
| --- | --- | --- |
| POST | `/internal/sync/start` | `{ trigger, github_run_id }` → `{ run_id, workspace, cursors, next_due_at }` or 409 if locked |
| GET | `/internal/config` | Workspace IDs, settings, users, connector configs with `secret_enc`, cursors |
| GET | `/internal/blob/:key` | Raw stored bytes (gzip) or 404 |
| PUT | `/internal/blob/:key` | Raw body stored as is; `X-Content-Sha256` header verified; only `facts:*`, `snap:*`, `out:*` prefixes allowed |
| GET | `/internal/captures?since=` | Captures not yet ingested |
| POST | `/internal/sync/finish` | `{ run_id, snapshot: { version, generated_at, data_through, bytes }, sources: [...], suggestions: [...], rules_fired: [...], readouts: [{ action_id, measured_inr, measured_label, progress, result }], test_updates: [...], usage: {...}, cursors: {...} }` → sets latest pointer, upserts rows, queues notifications |
| POST | `/internal/sync/fail` | `{ run_id, code, detail }` |
| POST | `/internal/actions/:id/report` | From the action runner: `{ status, steps: [...], outputs: [...], error? }` |
| GET | `/internal/actions/:id` | Params for the action runner |
