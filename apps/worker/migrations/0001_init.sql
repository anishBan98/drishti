-- 0001_init: D1 schema from docs/06-DATA-MODEL.md §3 (copied verbatim; the doc is the source of truth).
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
