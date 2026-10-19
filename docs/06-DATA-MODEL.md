# 06 · Data Model

Four stores, each with one job:

| Store | Holds | Written by | Read by |
| --- | --- | --- | --- |
| Google Sheet "Drishti Workspace" | Settings and inputs people edit; logs people read | People (green tabs); sync job (grey tabs) | Sync job |
| Google Drive | Raw exports (Inbox → Archive), generated files (Outbox) | People, Worker uploads, action runner | Sync job, people |
| Cloudflare KV | Canonical facts (gzip JSON per table), snapshots, caches | Worker (on behalf of the sync job) | Worker, sync job |
| Cloudflare D1 | Operational records: users, sessions, actions, rules, tests, captures, sources, sync runs, audit, usage | Worker | Worker, sync job (via internal API) |

All money is integer rupees in storage (`*_inr`), rounded to the rupee. Dates are `YYYY-MM-DD` in Asia/Kolkata; timestamps are ISO 8601 with offset. IDs are ULIDs unless stated.

## 1. Canonical fact tables (KV blobs `facts:{ws}:{table}`)

Each table is stored as gzip JSON `{ "schema": "<table>@1", "rows": [...] }` with rows as arrays in column order (compact). The demo CSVs in `sample-data/demo/` have exactly these columns. Natural keys are used for upserts.

### 1.1 `sales_city_daily` (demo: `fact_sales_city_daily.csv`)

| Column | Type | Notes |
| --- | --- | --- |
| date | date | key |
| city | text | key; canonical city list in `packages/shared/src/geo.ts`; unknown cities map to "Other" |
| state | text | |
| channel | enum | key; `own_site`, `amazon`, `quick_commerce`, `nykaa`, `flipkart` |
| orders | int | |
| units | int | |
| net_revenue_inr | int | after discounts, before returns; GST-inclusive selling price as reported |
| returned_orders | int | returns and RTO |

Built from: Shopify orders (own_site), Amazon order and business reports (amazon, city from ship-city where present, else allocated by the state's share of the last 28 days), quick-commerce store files (quick_commerce), Nykaa and Flipkart files (city when present, else allocated by state or national share). Allocation is flagged in `sales_alloc_log` so models can down-weight allocated rows.

### 1.2 `sales_sku_daily` (demo: `fact_sales_sku_daily.csv`)

`date, channel, sku, units, net_revenue_inr, returned_units` (key: date, channel, sku).

### 1.3 `spend_city_daily` (demo: `fact_spend_city_daily.csv`)

| Column | Type | Notes |
| --- | --- | --- |
| date, city | | key |
| media | enum | key; `meta`, `google`, `amazon_ads`, `flipkart_ads`, `qc_ads`, `creators` |
| platform | text | display name |
| spend_inr | int | |
| platform_claimed_revenue_inr | int | the platform's own attributed revenue (Meta purchase value, Google conversion value, Amazon 14-day sales, Flipkart direct + indirect, QC platform-reported, creators: code redemptions) |

Optional finer table `spend_campaign_daily` (`date, media, campaign, campaign_type, targeting, city, spend_inr, claimed_inr, clicks, impressions`) feeds the brand-search and retargeting splits.

### 1.4 `orders_own_site` and `order_lines_own_site` (demo: `own_site_orders_sample.csv`, `own_site_order_lines_sample.csv`)

Orders: `order_id, created_at, customer_key, city, state, payment_method (COD|Prepaid), discount_code, discount_inr, gross_inr, net_inr, status (Delivered|RTO|Returned|Cancelled), first_order (yes|no)`.
Lines: `order_id, sku, qty, unit_price_inr`.
`customer_key` = hashed customer ID (the demo files use plain `customer_id` like `C200123`; the parser hashes it).

### 1.5 `customers_own_site` (demo: `own_site_customers_sample.csv`)

`customer_key, first_order_date, city, state, acquisition_source (meta|google|creators|referral|organic|unknown)`.
Acquisition source comes from Shopify's first-order UTM / referrer / discount code mapping (`11-CONNECTORS.md` §4.1). The demo file has an extra column `true_segment_do_not_use_in_model` used only by tests.

### 1.6 `qc_store_daily` (demo: `quick_commerce_store_daily.csv`)

`date, platform, city, store_id, sku, units, gmv_inr, closing_stock, stockout (yes|no), ad_spend_inr` (key: date, platform, store_id, sku).

### 1.7 `reviews` (demo: `reviews.csv`)

`review_id, platform, sku, review_date, rating (1-5), text, verified_purchase, brand_replied` plus engine-added `aspects` (array of `{aspect, sentiment: -1|0|1, source: "ai"|"lexicon"}`).
Review IDs from platforms are kept; when missing, `sha256(platform|sku|date|text)`.

### 1.8 `market_captures` (demo: `market_captures.csv`)

`captured_at, platform (Amazon|Flipkart|Nykaa|Blinkit|Zepto|Instamart|Brand site), label, brand, product_name, pack_ml, price_inr, mrp_inr, rating, review_count, in_stock, capture_method (extension|site_json), url` plus optional `top_reviews` (array of strings, extension only). Key: `url, captured_at` truncated to the hour.

### 1.9 `search_share_weekly` (demo: `search_share_weekly.csv`)

`week_ending, search_query, search_volume, impression_share, click_share, purchases_total, purchase_share` (from Amazon Brand Analytics, Search Query Performance).

### 1.10 Others

- `trends_weekly`: `week, term, region, interest` (Google Trends CSV).
- `creator_posts`: from the Creators tab (see §2).
- `products`, `channels`: from the Sheet each sync (not stored as facts).

## 2. Workspace Sheet contracts

The template is `sample-data/Drishti-Workspace-Template.xlsx` (and one CSV per tab in `sample-data/workspace/`). Headers are exact; extra columns to the right are ignored.

| Tab | Who writes | Columns | Validation |
| --- | --- | --- | --- |
| README | People | free text | ignored |
| Settings | People | `key, value, notes` | keys in `settingsSchema` (zod): brand_name, currency, timezone, week_starts_on, fiscal_year_start_month, approval_threshold_inr, sync_every_hours (3,6,12,24), target_cac_inr, target_ltv_to_cac, target_reply_rate, category_label, privacy_mode_default, notify_slack_webhook (ignored in Sheet; must be set in Admin), team_calendar_id |
| Products | People | `sku, name, category, pack_ml, mrp_inr, unit_cost_inr, launch_date, hero, asin, fsn, nykaa_id` | sku unique; pack_ml > 0 |
| Channels | People | `channel, label, commission_pct, payment_fee_pct, shipping_per_order_inr, other_pct, notes` | channel in enum |
| Watchlist | People | `watch_id, label, brand, platform, url, pack_ml, is_us, capture_method` | url https; capture_method `extension` or `site_json` (site_json only for `Brand site`) |
| Creators | People | `post_date, creator, handle, platform, followers, audience_cities, cost_inr, product_sku, post_url, discount_code` | post_date ≤ today |
| Targets | People | `kpi, period, target` | kpi in enum |
| Calendar | People | `start_date, end_date, event, channel, type (sale|festival|launch|other)` | |
| Rules | People and Drishti | `rule_id, name, condition, action, status (on|off), owner` | condition parsed by the rule DSL (§5) |
| Users | People | `email, role (Owner|Approver|Analyst|Editor|Viewer), name` | email unique |
| Mappings | People | `source, file_column, drishti_field` | overrides header detection |
| Actions | Drishti | `action_id, created_at, screen, type, title, owner, status, expected_inr, expected_per, measured_inr, readout_date, output_file, notes` | mirror of D1 |
| Tests | Drishti | `test_id, name, design, media, test_regions, control_regions, start_date, end_date, status` | mirror of D1 |
| Source status | Drishti | `source, method, last_received_at, status, rows_last_sync` | |
| Sync log | Drishti | `finished_at, trigger, result, seconds, sources_ok, sources_late, error` | last 200 rows kept |

## 3. D1 schema (`apps/worker/migrations/0001_init.sql`)

```sql
PRAGMA foreign_keys = ON;

CREATE TABLE workspaces (
  id TEXT PRIMARY KEY,                -- 'default' in v1
  name TEXT NOT NULL,
  sheet_id TEXT, inbox_folder_id TEXT, outbox_folder_id TEXT, archive_folder_id TEXT,
  settings_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE TABLE users (
  id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  email TEXT NOT NULL, name TEXT, role TEXT NOT NULL CHECK (role IN ('Owner','Approver','Analyst','Editor','Viewer')),
  active INTEGER NOT NULL DEFAULT 1, last_seen_at TEXT, created_at TEXT NOT NULL,
  UNIQUE (workspace_id, email)
);

CREATE TABLE sessions (
  id_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
  scope TEXT NOT NULL DEFAULT 'app',  -- 'app' | 'capture'
  created_at TEXT NOT NULL, expires_at TEXT NOT NULL, revoked_at TEXT
);
CREATE INDEX sessions_user ON sessions(user_id);

CREATE TABLE connectors (
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  kind TEXT NOT NULL,                 -- 'shopify' | 'meta' | 'slack' | 'google_calendar'
  config_json TEXT NOT NULL,          -- non-secret config (shop domain, ad account id)
  secret_enc TEXT,                    -- AES-GCM ciphertext (base64) of the token
  status TEXT NOT NULL DEFAULT 'unknown', checked_at TEXT,
  PRIMARY KEY (workspace_id, kind)
);

CREATE TABLE sources (
  workspace_id TEXT NOT NULL, source TEXT NOT NULL,   -- e.g. 'amazon_business_report'
  method TEXT NOT NULL, cadence TEXT NOT NULL, sla_hours INTEGER NOT NULL,
  last_received_at TEXT, last_file TEXT, rows_last_sync INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'never',               -- ok | received | late | never | error
  late_days INTEGER DEFAULT 0, note TEXT,
  PRIMARY KEY (workspace_id, source)
);

CREATE TABLE sync_runs (
  id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL, trigger TEXT NOT NULL,   -- scheduled | manual | upload | readout | deploy
  requested_by TEXT, github_run_id TEXT,
  status TEXT NOT NULL,               -- queued | running | ok | failed | skipped
  started_at TEXT, finished_at TEXT, snapshot_version TEXT, files_parsed INTEGER DEFAULT 0,
  error_code TEXT, error_detail TEXT
);
CREATE INDEX sync_runs_ws_time ON sync_runs(workspace_id, started_at DESC);

CREATE TABLE snapshots (
  workspace_id TEXT NOT NULL, version TEXT NOT NULL, generated_at TEXT NOT NULL, data_through TEXT NOT NULL,
  bytes INTEGER NOT NULL, is_latest INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (workspace_id, version)
);

CREATE TABLE suggestions (            -- suggested actions from the latest snapshot
  id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL, snapshot_version TEXT NOT NULL,
  screen TEXT NOT NULL, context_key TEXT,   -- e.g. channel=amazon, rival=Rival B, segment=Deal Hunters
  type TEXT NOT NULL, title TEXT NOT NULL, why TEXT NOT NULL, evidence_json TEXT NOT NULL,
  params_json TEXT NOT NULL, expected_inr INTEGER, expected_per TEXT, expected_label TEXT,
  confidence TEXT NOT NULL, priority REAL NOT NULL, created_at TEXT NOT NULL
);

CREATE TABLE actions (
  id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL, suggestion_id TEXT,
  type TEXT NOT NULL, executor TEXT NOT NULL,       -- inline | job | handoff
  screen TEXT NOT NULL, title TEXT NOT NULL, params_json TEXT NOT NULL,
  owner_user_id TEXT, created_by TEXT NOT NULL,
  status TEXT NOT NULL,   -- suggested | awaiting_approval | running | waiting_on_user | done | measuring | result | failed | declined | expired | undone
  result TEXT,            -- hit | partial | miss | inconclusive | not_measured
  expected_inr INTEGER, expected_per TEXT, expected_label TEXT,
  measured_inr INTEGER, measured_label TEXT, measured_progress REAL,
  metric TEXT, readout_date TEXT, baseline_json TEXT, before_json TEXT,
  outputs_json TEXT NOT NULL DEFAULT '[]',          -- [{kind:'drive_file'|'download'|'link', label, url}]
  idempotency_key TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  UNIQUE (workspace_id, idempotency_key)
);
CREATE INDEX actions_ws_status ON actions(workspace_id, status);
CREATE INDEX actions_readout ON actions(readout_date) WHERE status = 'measuring';

CREATE TABLE action_events (
  id TEXT PRIMARY KEY, action_id TEXT NOT NULL REFERENCES actions(id),
  at TEXT NOT NULL, kind TEXT NOT NULL,             -- status | step | output | note | error
  from_status TEXT, to_status TEXT, text TEXT NOT NULL, data_json TEXT
);
CREATE INDEX action_events_action ON action_events(action_id, at);

CREATE TABLE approvals (
  action_id TEXT PRIMARY KEY REFERENCES actions(id),
  requested_by TEXT NOT NULL, requested_at TEXT NOT NULL, expires_at TEXT NOT NULL,
  decided_by TEXT, decided_at TEXT, decision TEXT, reason TEXT    -- approved | declined | expired
);

CREATE TABLE rules (
  id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL, name TEXT NOT NULL,
  condition TEXT NOT NULL, action TEXT NOT NULL, params_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL CHECK (status IN ('on','off')), owner TEXT,
  source TEXT NOT NULL DEFAULT 'sheet',             -- sheet | action
  last_fired_at TEXT, created_at TEXT NOT NULL
);
CREATE TABLE rule_events (
  id TEXT PRIMARY KEY, rule_id TEXT NOT NULL REFERENCES rules(id), at TEXT NOT NULL,
  fired INTEGER NOT NULL, detail_json TEXT NOT NULL
);

CREATE TABLE tests (
  id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL, action_id TEXT REFERENCES actions(id),
  name TEXT NOT NULL, design TEXT NOT NULL,         -- geo_holdout | geo_boost | pre_post
  media TEXT NOT NULL, test_cities TEXT NOT NULL, control TEXT NOT NULL,
  start_date TEXT NOT NULL, end_date TEXT NOT NULL, status TEXT NOT NULL,   -- planned | running | reading | done | invalid
  plan_json TEXT NOT NULL, result_json TEXT
);

CREATE TABLE captures (
  id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL, user_id TEXT NOT NULL,
  url TEXT NOT NULL, platform TEXT NOT NULL, watch_id TEXT, payload_json TEXT NOT NULL,
  captured_at TEXT NOT NULL, ingested_snapshot TEXT
);
CREATE INDEX captures_ws_time ON captures(workspace_id, captured_at);

CREATE TABLE notifications (
  id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL, user_id TEXT, channel TEXT NOT NULL,  -- in_app | slack | calendar
  kind TEXT NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL, link TEXT,
  due_at TEXT, sent_at TEXT, read_at TEXT, created_at TEXT NOT NULL
);
CREATE INDEX notifications_due ON notifications(due_at) WHERE sent_at IS NULL;

CREATE TABLE audit_log (
  id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL, at TEXT NOT NULL,
  actor TEXT NOT NULL, verb TEXT NOT NULL, object TEXT NOT NULL, detail_json TEXT
);
CREATE INDEX audit_ws_time ON audit_log(workspace_id, at DESC);

CREATE TABLE usage_daily (
  day TEXT NOT NULL, metric TEXT NOT NULL, value INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, metric)            -- metrics: worker_requests, kv_writes, d1_writes, ai_neurons, sheets_calls
);

CREATE TABLE events (                  -- product analytics, first-party only
  id TEXT PRIMARY KEY, at TEXT NOT NULL, user_hash TEXT, demo INTEGER NOT NULL DEFAULT 0,
  name TEXT NOT NULL, props_json TEXT
);
```

Retention: `sessions` expired > 30 days deleted daily; `captures` > 400 days deleted; `events` > 400 days deleted; `audit_log`, `actions`, `action_events` kept until workspace deletion.

## 4. KV keys (`DRISHTI_KV`)

| Key | Value | TTL | Notes |
| --- | --- | --- | --- |
| `snap:{ws}:latest` | version string | none | pointer |
| `snap:{ws}:{version}` | gzip JSON snapshot | 45 days | last 30 kept; older deleted by the sync job |
| `facts:{ws}:{table}` | gzip JSON fact table | none | one per table in §1 |
| `facts:{ws}:_manifest` | JSON {table: {rows, sha256, updated_at}} | none | lets the job skip unchanged tables |
| `jwks:google` | JSON | 6 h | |
| `tok:google_sa` | access token | 50 min | avoids re-signing on every call |
| `lock:sync:{ws}` | run id | 20 min | |

## 5. Rule DSL

Conditions are small expressions over snapshot metrics, evaluated by the engine at the end of each sync (never in the Worker). Grammar (PEG in `packages/engine/src/rules/grammar.ts`):

```
expr      := term (("and" | "or") term)*
term      := metric op number | "(" expr ")"
metric    := name | name "(" args ")"
op        := "<" | "<=" | ">" | ">=" | "==" | "!="
```

Available metrics: `qc_stock_days` (per store), `rival_price_change_pct` (per watched product, since last capture), `aspect_share(aspect, window)`, `source_lag_days` (per source), `true_roas(media, window)`, `search_share(query)`, `cac_new_buyer(window)`, `rating(platform)`. A rule over a per-entity metric fires once per entity per day.

Actions: `notify` (Slack + in-app to owner), `pause_store_ads` (prepares the pause list and notifies; see `10-ACTIONS.md` §4.9), `create_suggestion` (adds a suggested action).

## 6. Snapshot schema (`packages/shared/src/snapshot.ts`)

One JSON document per sync. TypeScript shape (zod schema mirrors it); every screen reads only its own section.

```ts
type Money = number;                       // rupees
type Delta = { value: number; unit: 'pct' | 'pts' | 'inr' | 'x'; direction: 'up' | 'down' | 'flat'; good: boolean | null };
type Kpi = { id: string; label: string; value: number; display: string; delta?: Delta; note?: string; spark?: number[]; tone?: 'good'|'bad'|'warn'|'neutral' };
type Verdict = { tone: 'good' | 'bad' | 'warn'; chip: string; text: string };
type Evidence = { label: string; detail?: string };
type Suggestion = {
  id: string; type: string; title: string; why: string; impactLabel: string; expectedInr?: Money; expectedPer?: 'week'|'month'|'once';
  confidence: 'high'|'medium'|'low'; priority: number; evidence: Evidence[]; params: Record<string, unknown>;
  runLabel: string; doneLabel: string; needsApproval: boolean; executor: 'inline'|'job'|'handoff'; steps: string[];
};

interface Snapshot {
  schema: 'drishti.snapshot@1';
  version: string;                         // sha256 of content
  generated_at: string; data_through: string; workspace: { name: string; demo: boolean };
  windows: { week: [string, string]; prior_week: [string, string]; d28: [string, string]; prior_d28: [string, string] };
  sources: { id: string; label: string; method: string; cadence: string; status: 'ok'|'received'|'late'|'never'|'error'; late_days: number;
             last_received_at?: string; feeds: string; how: string; rule: string }[];
  week: {
    verdict: Verdict; kpis: Kpi[];         // 6
    bridge: { prior: Money; current: Money; axis: [Money, Money]; explained_pct: number;
              drivers: { id: string; label: string; channel: string; value_lakh: number; method: string; evidence: Evidence[] }[] };
    working: { title: string; detail: string }[]; attention: { title: string; detail: string }[];
    inference: string; suggestions: Suggestion[];
  };
  performance: {
    verdict: Verdict; kpis: Kpi[];
    weekly: { weeks: string[]; revenue_by_channel: Record<string, number[]>; orders: number[]; aov: number[]; buyers: number[] };
    channels: { id: string; label: string; color: string; revenue: Money; growth_pct: number; orders: number; aov: Money;
                buyers?: number; return_pct: number; share_pct: number; headline: string; notes: string[]; suggestions: Suggestion[] }[];
  };
  impact: {
    verdict: Verdict; kpis: Kpi[];
    channels: { id: string; label: string; spend: Money; claimed: Money; real: Money; real_low: Money; real_high: Money;
                claimed_per100: number; real_per100: number; confidence: 'high'|'medium'|'low'; evidence: string;
                headline: string; suggestions: Suggestion[] }[];
    acquisition: { source: string; cac: Money; value_12m: Money; ltv_cac: number; payback_months: number }[];
    tests: { id: string; name: string; day: number; days: number; readout: string; note: string }[];
  };
  market: {
    verdict: Verdict; kpis: Kpi[]; category_label: string; median_per10: number; category_rating: number;
    products: { id: string; label: string; brand: string; platforms: string; is_us: boolean; price: Money; per10: number;
                change_14d_pct: number | null; rating: number; reviews: number; perception: { gentle_clinical: number; value_premium: number };
                says: string; threat: 'You'|'High threat'|'Medium threat'|'Low threat'|'Opportunity'|'Different buyer';
                headline: string; suggestions: Suggestion[] }[];
    price_changes: { label: string; platform: string; pct: number; date: string }[];
    open_space?: { quadrant: 'gentle_premium'|'gentle_value'|'clinical_premium'|'clinical_value'; label: string };
  };
  customers: {
    verdict: Verdict; kpis: Kpi[]; method: string;
    segments: { id: string; name: string; kind: 'preferred'|'problem'|'other'; buyers_pct: number; revenue_pct: number; aov: Money;
                orders_per_year: number; repeat_pct: number; cac: Money; ltv_12m: Money; ltv_cac: number; discount_pct: number;
                cod_pct: number; rto_pct: number; centroid: { orders: number; aov: Money }; sample: [number, number][];
                tag: string; headline: string; suggestions: Suggestion[] }[];
    stability: { ari_vs_last: number | null; k: number; silhouette: number };
  };
  voice: {
    verdict: Verdict; kpis: Kpi[];
    aspects: { id: string; name: string; mentions: number; us: number; category: number; tag: string; headline: string;
               quotes: { text: string; src: string }[]; suggestions: Suggestion[] }[];
    issues: { title: string; mentions: number; change_pct: number | null; is_new: boolean; platforms: string; first_seen: string }[];
  };
  data: { verdict: Verdict; kpis: Kpi[] };
  rules_fired: { rule_id: string; entity?: string; text: string }[];
}
```

`sample-data/expected/expected_metrics.json` holds golden values for the KPI windows. The demo snapshot is generated by `pnpm --filter engine build:demo` and committed only as a build artifact (not in git).
