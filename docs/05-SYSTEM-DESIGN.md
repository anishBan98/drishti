# 05 · System Design

## 1. Architecture at a glance

```
                     ┌──────────────────────────── Cloudflare (free) ───────────────────────────┐
 Browser (React SPA) │  Worker "drishti"                                                         │
  /demo  ───────────►│   • Static assets: SPA, demo/snapshot.json, fonts, brand                  │
  /      ◄──────────►│   • /api/*: auth, snapshot, actions, approvals, rules, tests, capture,    │
                     │     uploads, sync dispatch, settings                                      │
 Chrome extension ──►│   • /internal/*: HMAC endpoints used by the sync job                      │
                     │   • Cron (every 30 min): reminders, approval expiry, readout dispatch     │
                     │   • Executors: Shopify, Meta, Google (Drive, Sheets, Calendar), Slack     │
                     │   D1 "drishti": users, sessions, actions, events, rules, tests, captures, │
                     │                 sources, sync runs, audit, usage counters                 │
                     │   KV "DRISHTI_KV": snapshots, fact blobs, token and JWKS caches           │
                     │   Workers AI: review tagging, drafts (budget-governed)                    │
                     └───────────────▲───────────────────────────────▲───────────────────────────┘
                                     │ HMAC                          │ workflow_dispatch
                     ┌───────────────┴───────────── GitHub (free) ───┴───────────────────────────┐
                     │ Actions: ci.yml · deploy.yml · sync.yml (hourly cron + dispatch) ·        │
                     │          action-runner.yml (dispatch) · nightly-e2e.yml · keepalive.yml   │
                     │ apps/sync (Node 22): read Google + Shopify + rival sites, parse,          │
                     │   normalise, run engine, write facts + snapshot, report status            │
                     └───────────────▲───────────────────────────────────────────────────────────┘
                                     │ service account (Sheets, Drive), Shopify token, Meta token
                     ┌───────────────┴──────────── Brand's own accounts (free) ──────────────────┐
                     │ Google Sheet "Drishti Workspace" · Drive "Drishti Inbox", "Outbox",       │
                     │ "Archive" · Google Calendar (optional) · Shopify · Meta/Google Ads exports │
                     └───────────────────────────────────────────────────────────────────────────┘
```

### 1.1 Why this split

Cloudflare's free plan gives each Worker invocation **10 ms of CPU time**, including cron runs. That is plenty for serving files, checking sessions, writing rows and calling APIs (waiting on the network does not count as CPU), but not for parsing a month of exports or fitting models. So:

- **Heavy compute runs in GitHub Actions** (free and unmetered for public repositories on standard runners; private repositories get a monthly free allowance). The sync job and the action runner are Node 22 scripts with no CPU limit and up to several hours per job.
- **The Worker stays thin:** auth, routing, storing and serving precomputed JSON, light action executors, cron reminders.
- **The brand's data lives in the brand's Google account** (Sheet, Drive) and the deployment's Cloudflare account (KV and D1). No third party sees it.

## 2. Components

| Component | Path | Runs on | Responsibilities |
| --- | --- | --- | --- |
| Web app | `apps/web` | Browser | React 18 + TypeScript + Vite SPA. Screens, theming, charts (hand-built SVG), action UX, demo mode, polling for new snapshots |
| Worker | `apps/worker` | Cloudflare Workers | Static assets, API, sessions, RBAC, action engine (light executors), approvals, rules CRUD, capture intake, uploads to Drive, sync dispatch, cron, internal HMAC endpoints |
| Sync job | `apps/sync` (`drishti-sync` CLI) | GitHub Actions | Pull Sheet tabs, Drive Inbox files, Shopify orders, rival site product data, D1 captures; parse and normalise; merge facts; run engine; write facts and snapshot to KV via Worker; mirror logs to the Sheet; evaluate rules; run readouts |
| Action runner | `apps/sync` (`drishti-run-action`) | GitHub Actions | Heavy actions (audience exports, large reply drafts, budget sheets, test plans with matching) |
| Engine | `packages/engine` | Node and browser | Parsers, column mapping, canonical facts, KPIs, incrementality models, bridge, market analytics, k-means, review aspects (lexicon), recommendation rules, expected-impact formulas, snapshot builder |
| Shared | `packages/shared` | All | Types, zod schemas (snapshot, API), constants, copy deck, design tokens |
| Extension | `apps/extension` | Chrome MV3 | Watchlist awareness, Capture button, site adapters, posting captures |
| Demo data | `sample-data/` | Build time | Demo snapshot built by the engine during `pnpm build`; template and sample files copied to `/samples/` for the data guide |
| Sandbox | `apps/web` (`/try`) + `packages/engine` | Browser (Web Worker) | Parses dropped files and builds a snapshot locally with the same engine; no network writes |

## 3. Free-tier budget and governors

All limits live in `packages/shared/src/limits.ts` with the source and date checked, and a weekly CI job (`limits-check`) fails if docs and constants disagree.

| Resource | Free limit (checked Oct 2026) | Drishti expected use | Governor |
| --- | --- | --- | --- |
| Worker requests | 100,000 per day | under 5,000 | Usage counter in D1; above 60,000 the UI polling interval rises to 5 minutes |
| Worker CPU | 10 ms per request and per cron run | 1–4 ms typical | No parsing in the Worker; snapshot served as stored gzip bytes; JWT verify and RS256 signing only |
| Cron triggers | 5 per account | 2 (every 30 min; daily 02:00 IST housekeeping) | n/a |
| Subrequests | 50 per invocation | under 10 | Executors batch calls; heavy work goes to the action runner |
| KV | 100,000 reads per day, 1,000 writes per day, 1 GB, 25 MiB per value | about 60 writes per day | Counter; sync refuses to write more than 40 keys per run; snapshot under 5 MiB, facts split per table |
| D1 | 5 million rows read and 100,000 rows written per day; 500 MB per database; 50 queries per invocation | under 5,000 writes per day | Counter; captures capped at 2,000 per day; batch inserts |
| Workers AI | 10,000 neurons per day | 500–2,000 | Neuron estimate per call; stop at 8,000 and fall back to the lexicon or queue for tomorrow |
| GitHub Actions | Free for public repos on standard runners; private repos have a monthly allowance | hourly cron that exits early unless due (about 20 s) plus 4 syncs a day (about 3 min each) | Sync writes `next_due_at`; early-exit costs seconds |
| Google Sheets API | 300 requests per minute per project, 60 per user | under 50 per sync | Batch reads (`values.batchGet`) and one batch write per sync; client throttle 30 per minute |
| Google Drive API | Generous default quota | under 100 per sync | List with fields mask; download only new files |

**Public vs private repo.** The code repo is public for the showcase (unlimited free Actions minutes). A brand's production deployment can be a private fork; at about 4 syncs a day of 3 minutes plus hourly early exits it fits the free private allowance. Secrets are never printed; the sync job logs counts, not values.

**60-day rule.** GitHub disables scheduled workflows in public repositories after 60 days without repository activity. `keepalive.yml` runs monthly and commits a heartbeat file; the Data sources screen warns if the last scheduled sync is over 26 hours old.

## 4. Data flow: the sync pipeline

Triggered by: hourly cron (runs only if `now ≥ next_due_at`), `workflow_dispatch` from the Worker ("Sync now", file upload, readout due), or a push to `main` that changes the engine (rebuild snapshot only).

```
1  lock      POST /internal/sync/start  → D1 sync_runs row (status running); refuse if another run < 20 min old
2  config    GET  /internal/config      → settings, encrypted tokens (decrypted in the job with DATA_KEY)
3  sheet     Sheets values.batchGet: Settings, Products, Channels, Watchlist, Creators, Targets, Calendar, Rules, Users, Mappings
4  inbox     Drive files.list in Inbox (not trashed, modifiedTime > last cursor)
             for each file: download → detect source by header signature (11-CONNECTORS §3) → parse → validate → canonical rows
             unrecognised → move to Inbox/Unrecognised, status warning; recognised → move to Archive/YYYY-MM
5  apis      Shopify Admin GraphQL: orders updated since cursor (paginated, 250 per page), customers, discount codes
             Meta Marketing API insights (if token): yesterday and last 7 days restated
6  sites     Rival brand sites on the watchlist with capture_method=site_json: robots.txt check, then product JSON
7  captures  GET /internal/captures?since=cursor (extension captures from D1)
8  facts     GET /internal/blob/facts:* (gzip JSON per table) → merge by natural keys (date, city, channel, sku…) → validate → PUT back changed tables
9  engine    build snapshot: KPIs, bridge, incrementality, market, segments, voice, recommendations, rule evaluation, readouts
10 ai        new reviews since cursor → Workers AI aspect tagging (budget-governed) → merged into review facts
11 publish   PUT /internal/blob/snap:{ws}:{version} (gzip); POST /internal/sync/finish with source status, rule events,
             readout results, suggested actions, usage
12 mirror    Sheets values.batchUpdate: Source status, Sync log, Actions, Tests tabs
13 notify    Worker sends Slack summary and rule alerts (from step 11 payload)
```

Typical duration: 2–4 minutes. Timeout 20 minutes. On failure, step 11 is skipped: the previous snapshot keeps serving, `sync_runs.status = failed` with error code, Data sources shows the failure, Slack alert to Owners and Analysts.

**Idempotency.** Every canonical row has a natural key; merges are upserts. Re-running a sync with the same files produces byte-identical facts and snapshot (snapshot `version` = SHA-256 of its content). Files are identified by Drive `md5Checksum`; a file with a known checksum is archived without re-parsing.

**Restatements.** Platforms restate recent days (ad conversions, returns). Parsers replace the last 14 days per source when a newer file covers them.

## 5. Refresh model

| Mode | How | Latency | Who |
| --- | --- | --- | --- |
| Scheduled | GitHub Actions hourly cron; runs when due (default every 6 h: about 01:10, 07:10, 13:10, 19:10 IST) | as scheduled | System |
| Manual | "Sync now" (Data sources header, This week freshness chip) → `POST /api/sync` → GitHub `workflow_dispatch` | 2–4 min | Owner, Analyst |
| On upload | Upload a file → Drive Inbox → dispatch | 2–4 min | Editor and above |
| Live captures | Extension → `/api/capture` → D1; Market screen merges captures newer than the snapshot | seconds | Editor and above |
| UI auto-refresh | SPA polls `GET /api/snapshot/meta` every 60 s while visible (5 min when hidden or above the usage governor); new version → fetch and swap with a notice "Updated just now" | ≤ 60 s after publish | All |
| Readouts | Worker cron finds due readouts → dispatches a sync with `--readouts-only` (fast path, about 1 min) | ≤ 30 min after due | System |

## 6. Action engine

Full catalogue in `10-ACTIONS.md`. Architecture:

```
UI Run ─► POST /api/actions {type, params, source_screen, suggestion_id}  (Idempotency-Key)
          │
          ├─ validate params (zod) and role
          ├─ needs approval? (role or threshold) → status awaiting_approval → notify approvers → stop
          ├─ executor kind:
          │    inline  (Worker, I/O only): shopify_*, meta_*, slack_notify, sheet_log, calendar_event,
          │                                drive_file (small), rule_create, task_assign, reminder_set
          │    job     (GitHub action-runner): audience_export, reply_drafts, budget_sheet, test_plan,
          │                                     listing_copy, brief_doc
          │    handoff (prepare + human confirms): amazon_coupon, flipkart_*, nykaa_*, qc_ads_pause,
          │                                     google_ads_exclusions (Phase 1–2)
          ├─ write action + events (D1), mirror to Sheet (queued for next minute via cron or done inline)
          └─ return {action_id, status, steps[], outputs[]}

Lifecycle: suggested → (awaiting_approval) → running → waiting_on_user (handoff) → done → measuring → result
           ↘ failed (retryable)   ↘ declined / expired   ↘ undone
```

State machine rules:

- Only `running` and `waiting_on_user` can move to `done`; `done` moves to `measuring` when a readout is scheduled, else to `result` with `result = not_measured`.
- `undo` is allowed from `done` or `measuring` when the executor implements it (Shopify discount, Meta budget, rule, reminder). Undo restores saved `before` values and logs `undone`.
- Retries: inline executors retry once with backoff on network errors; job executors are retried by re-dispatch up to 2 times.
- Every transition writes an `action_events` row and an `audit_log` row.

## 7. Authentication and sessions

- Google Identity Services "Sign in with Google" button on `/` returns an ID token (JWT) to the SPA.
- `POST /api/auth/google {credential}`: Worker fetches Google JWKS (cached in KV for 6 h), verifies RS256 signature, `iss`, `aud == GOOGLE_CLIENT_ID`, `exp`, `email_verified`. Looks up `users` (synced from the Users tab; the `OWNER_EMAIL` secret is always Owner).
- Session: random 32-byte ID stored hashed in D1 with user, role, expiry (7 days, sliding); cookie `__Host-drishti` HttpOnly, Secure, SameSite=Lax, Path=/.
- CSRF: double-submit token (`drishti-csrf` cookie, non-HttpOnly, plus `X-CSRF-Token` header) on every non-GET.
- Extension: after sign-in, `/api/extension/token` issues a capture-only token (scope `capture`, 30 days, revocable on Admin).
- Demo: no session; demo routes never call write APIs.

## 8. Internal endpoints (sync job ↔ Worker)

- Header `X-Drishti-Sig: t=<unix>,v1=<hex HMAC-SHA256(SYNC_SECRET, t + "." + method + path + "." + sha256(body))>`; reject if older than 300 s or replayed (nonce cache 10 min in memory and D1).
- Blob endpoints stream bodies to and from KV without parsing (CPU-safe).
- `/internal/config` returns encrypted secrets; the job decrypts with `DATA_KEY` (GitHub secret). Tokens never travel in plaintext.

## 9. Secrets

| Secret | Where | Purpose |
| --- | --- | --- |
| `GOOGLE_CLIENT_ID` | Worker var (not secret) | Sign-In audience |
| `GOOGLE_SA_JSON` | Worker secret and GitHub secret | Service account for Sheets, Drive, Calendar |
| `OWNER_EMAIL` | Worker secret | Bootstrap Owner |
| `SESSION_SECRET` | Worker secret | Cookie and CSRF signing |
| `SYNC_SECRET` | Worker secret and GitHub secret | Internal HMAC |
| `DATA_KEY` | Worker secret and GitHub secret | AES-GCM for tokens stored in D1 |
| `GITHUB_DISPATCH_TOKEN` | Worker secret | Fine-grained PAT with Actions: read and write on this repo only |
| `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` | GitHub secrets | Deploy, and Workers AI REST calls from the sync job |
| Shopify Admin token, Meta token, Slack webhook | D1 (encrypted) via Admin UI | Connectors and executors |

Rotation steps are in `04-ADMIN.md` §6.

## 10. Security and privacy

- Personal data: own-site customer IDs are hashed (`sha256(DATA_KEY || customer_id)`) in facts and snapshots. Names, emails and phones are never stored in KV, D1 or snapshots. Audience exports read Shopify directly in the action runner, hash emails and phones with SHA-256 (Meta's required normalisation), write to Drive Outbox, and keep nothing.
- Privacy mode (default on) additionally hides any free text that may contain a name (review author names are never collected).
- RBAC on every API route (`04-ADMIN.md` §2). Approvals enforce separation for budget actions above the threshold.
- Content Security Policy: `default-src 'self'; script-src 'self' https://accounts.google.com/gsi/client; frame-src https://accounts.google.com; connect-src 'self' https://accounts.google.com; img-src 'self' data:; style-src 'self' 'unsafe-inline'` (inline styles needed for computed chart geometry).
- Rate limits: 60 write requests per minute per user; 300 captures per hour per token.
- Audit log is append-only (no update or delete statements in code; enforced by a test that greps SQL).
- Data deletion: `04-ADMIN.md` §7.

## 11. Snapshot serving

- `GET /api/snapshot` → Worker reads pointer `snap:{ws}:latest` (value: version), then streams `snap:{ws}:{version}` with `Content-Encoding: gzip`, `Content-Type: application/json`, `ETag: version`, `Cache-Control: private, max-age=0, must-revalidate`. 304 on matching `If-None-Match`.
- `GET /api/snapshot/meta` → `{version, generated_at, data_through, sources_ok, sources_late}` from D1 (cheap).
- The SPA validates the snapshot with the zod schema in `packages/shared`; on schema mismatch it shows the last good cached snapshot from IndexedDB and reports `SNAPSHOT_SCHEMA_MISMATCH`.
- Demo: `GET /demo/snapshot.json` static asset built at deploy from `sample-data/demo`.
- Sandbox: no server snapshot. The SPA builds one in a Web Worker from dropped files (§14).

## 12. Observability

- `sync_runs`, `action_events`, `usage_daily` and `audit_log` tables are the system's logs; Data sources shows the last 10 sync runs on hover of the freshness chip.
- Worker uses `console.log` JSON lines (visible in `wrangler tail`), never logging personal data or tokens.
- Weekly usage digest to Owners (Slack): requests, KV writes, D1 writes, AI neurons, Actions minutes estimate vs limits.

## 13. Environments

| Env | URL | Data | Deployed by |
| --- | --- | --- | --- |
| local | `http://localhost:8787` (wrangler dev) and Vite on 5173 | sample-data, local D1 and KV | developer |
| staging | `https://drishti-staging.<subdomain>.workers.dev` | a copy of the template Sheet with sample data; Shopify development store | `deploy.yml` on every push to `main` |
| production | `https://drishti.<subdomain>.workers.dev` | the brand's Sheet and Drive | `deploy.yml` on a tag `v*` |

Both workers share the code; each has its own D1 database, KV namespace and secrets.

## 14. Deployment model and sandbox

**One deployment per brand** (decided 19 Oct 2026, `01-PRD.md` §4.3). Each brand runs its own copy of this stack on its own free accounts; there is no shared multi-tenant service. This keeps every brand inside its own free limits, keeps its data in its own accounts, and keeps cost at ₹0 however many brands use Drishti. The PreQL showcase deployment serves only public pages (home, demo, data guide, sandbox) and holds no brand data.

**Sandbox (`/try`).** The plug-and-play way to try Drishti:

- Files dropped on the page (the filled template `.xlsx`, export CSVs, or a ZIP of them) are read in a Web Worker by `packages/engine`: the same header detection, parsers and models as the sync job (`11-CONNECTORS.md` §3), and the same snapshot builder.
- Nothing is uploaded and no API is called. The parsed facts and snapshot live in memory (and IndexedDB, wrapped in try/catch, so a reload keeps them); "Clear my data" deletes them.
- **Linked Google Sheets (added 20 Oct 2026):** besides dropping files, a visitor can paste Google Sheets links shared as "Anyone with the link can view". The browser asks the Worker's `GET /api/sheet` (`07-API.md` §2) for the workbook, reads every tab with the same detection as files, and keeps the link. **Refresh** fetches every linked sheet again and rebuilds the snapshot; opening a company refreshes it too. This is the only sandbox call to the server, and it keeps nothing. Private sheets need the signed-in setup (M4), which reads them with the service account.
- **Vercel mirror (added 20 Oct 2026):** the same static build of the public pages (home, demo, sandbox) can also be served from Vercel Hobby (`vercel.json`). Vercel only serves files; its `/api/*` is rewritten to the Cloudflare Worker, so linked sheets work the same, and signed-in workspaces stay on Cloudflare. Hobby is for non-commercial use: the mirror is for showing Drishti, and moves off Hobby (or is dropped) before any paid use.
- Several companies can be kept at once, each under its own id with its files' parsed rows by source. Updating a company replaces only the sources in the new files and rebuilds its snapshot.
- Screens render exactly as in the demo, with `workspace.demo = true` and a "Your files, this browser only" chip. Actions are simulated as in demo mode (`10-ACTIONS.md` §7).
- Limits: up to 50 MB of files in total; screens without enough data show the EmptyState with what to add.
- Cost: zero server work (static assets only).
