# Changelog

All notable changes to Drishti. Milestones follow `docs/14-SETUP-RUNBOOK.md` §8.

## [Unreleased]

### M1 · Worker skeleton and deploy (2026-10-19)

- Cloudflare Worker (Hono) at `apps/worker`: `GET /api/health` (version = git sha), JSON error envelope with messages from the copy deck, SPA fallback through Static Assets (`run_worker_first` for `/api/*` and `/internal/*`).
- `wrangler.toml` per runbook §5 with production and staging: D1 `drishti` / `drishti-staging`, KV, Workers AI binding, crons (4 of 5 free).
- D1 migration `0001_init.sql` (all 19 tables from docs/06 §3) applied to both remote databases.
- Daily housekeeping cron applies the retention rules (sessions, captures, events); the 30-minute cron is in place for later reminders.
- Deployed: https://drishti.preql.workers.dev and https://drishti-staging.preql.workers.dev.
- `deploy.yml`: push to `main` deploys staging, tag `v*` deploys production; migrations, deploy, smoke test of health and the SPA shell.
- Tests: Worker API tests with `@cloudflare/vitest-plugin` (health, 404 envelope, schema, role check, housekeeping); repo tests (SPEC in sync with docs, API-08 append-only audit log).
- Copy deck: error messages from docs/03 §3.

### Docs 1.1 (2026-10-19)

- Deployment model decided: one free deployment per brand; the PreQL showcase serves public pages only (01 §4.3, 05 §14).
- New entry pages: Home (`/` when signed out), onboarding wizard (`/onboarding`), data guide with sample downloads and Check my file (`/guide`), sandbox to try your own files in the browser with no login (`/try`) (09 §6.0, §6.10–6.12; 02 J1, J1b; tests E2E-21..24; milestones M3–M5).
- Worker test library renamed to `@cloudflare/vitest-plugin` (12 §1).
- `PreQL-Drishti-SPEC.md` is now generated from `docs/` by `pnpm spec:build`; a test fails if it is out of date.

### M0 · Repo and scaffold (2026-10-19)

- Public GitHub repo `drishti` with the specification pack committed: `docs/`, `sample-data/`, `design/`, `brand/`, `PreQL-Drishti-SPEC.md`.
- pnpm 9 monorepo per runbook §4: `apps/web` (React 18 + Vite shell), `apps/worker` (Hono stub), `apps/sync` (CLI stubs), `apps/extension` (stub), `packages/engine`, `packages/shared` (copy deck from docs/09 §10 with `t()`), `e2e/`, `scripts/`.
- Tooling: TypeScript 6 (strict), ESLint 10 flat config with typescript-eslint, Prettier, Vitest 4 projects.
- Pre-commit hook (`simple-git-hooks`) and CI file check block files over 10 MB and names matching `*.secret*`, `*.pem`, `*sa*.json`.
- `ci.yml`: install, file check, lint, typecheck, tests, build; gitleaks job.
