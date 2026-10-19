import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import { housekeeping } from '../src/cron';

const TABLES = [
  'workspaces',
  'users',
  'sessions',
  'connectors',
  'sources',
  'sync_runs',
  'snapshots',
  'suggestions',
  'actions',
  'action_events',
  'approvals',
  'rules',
  'rule_events',
  'tests',
  'captures',
  'notifications',
  'audit_log',
  'usage_daily',
  'events',
];

describe('D1 schema (docs/06 §3)', () => {
  it('has every table from the data model', async () => {
    const { results } = await env.DB.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all<{
      name: string;
    }>();
    const tables = results.map((r) => r.name).filter((n) => !/^(sqlite_|_cf_|d1_migrations$)/.test(n));
    expect(tables.sort()).toEqual([...TABLES].sort());
  });

  it('rejects a user role outside the five roles', async () => {
    await env.DB.prepare(
      "INSERT OR IGNORE INTO workspaces (id, name, created_at) VALUES ('default', 'Lumora', '2026-10-19')",
    ).run();
    await expect(
      env.DB.prepare(
        "INSERT INTO users (id, workspace_id, email, role, created_at) VALUES ('u1', 'default', 'a@x.example', 'Admin', '2026-10-19')",
      ).run(),
    ).rejects.toThrow(/CHECK constraint/);
  });
});

describe('daily housekeeping (docs/06 §3 retention)', () => {
  it('deletes sessions expired over 30 days ago, captures and events over 400 days, and keeps the rest', async () => {
    const now = new Date('2026-10-19T20:40:00Z');
    await env.DB.batch([
      env.DB.prepare(
        "INSERT OR IGNORE INTO workspaces (id, name, created_at) VALUES ('default', 'Lumora', '2026-01-01')",
      ),
      env.DB.prepare(
        "INSERT OR IGNORE INTO users (id, workspace_id, email, role, created_at) VALUES ('u1', 'default', 'a@x.example', 'Owner', '2026-01-01')",
      ),
      env.DB.prepare(
        "INSERT INTO sessions (id_hash, user_id, created_at, expires_at) VALUES ('old', 'u1', '2026-08-01', '2026-08-08T00:00:00Z'), ('recent', 'u1', '2026-10-01', '2026-10-08T00:00:00Z')",
      ),
      env.DB.prepare(
        "INSERT INTO captures (id, workspace_id, user_id, url, platform, payload_json, captured_at) VALUES ('c-old', 'default', 'u1', 'https://x.example', 'Amazon', '{}', '2025-09-01T00:00:00Z'), ('c-new', 'default', 'u1', 'https://x.example', 'Amazon', '{}', '2026-10-01T00:00:00Z')",
      ),
      env.DB.prepare(
        "INSERT INTO events (id, at, name) VALUES ('e-old', '2025-09-01T00:00:00Z', 'screen_view'), ('e-new', '2026-10-18T00:00:00Z', 'screen_view')",
      ),
    ]);

    expect(await housekeeping(env, now)).toEqual({ sessions: 1, captures: 1, events: 1 });

    const ids = async (sql: string) => (await env.DB.prepare(sql).all<{ id: string }>()).results.map((r) => r.id);
    expect(await ids('SELECT id_hash AS id FROM sessions')).toEqual(['recent']);
    expect(await ids('SELECT id FROM captures')).toEqual(['c-new']);
    expect(await ids('SELECT id FROM events')).toEqual(['e-new']);
  });
});
