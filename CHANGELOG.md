# Changelog

All notable changes to Drishti. Milestones follow `docs/14-SETUP-RUNBOOK.md` §8.

## [Unreleased]

### Docs 1.2 · Founder framing (2026-10-20)

- Business model and go-to-market (01 §11): open core. Community stays free and self-hosted; Drishti Cloud and measurement studies earn revenue after funding (prices marked as hypotheses to test with design partners). Company goal added to 01 §2; release R5 Cloud; new risks (revenue model, cannibalisation, ownership and IP, measurement credibility).
- Strategy (13): objectives O6 (fundraise-ready) and O7 (willingness to pay); KRA 8 Fundraise readiness; investor narrative; design-partner letters of intent in Phase 3; progress table updated.
- Build order (14 §8): M3 polishes This week, Impact and ROI, Market and Actions first; M6 methods run on demo data straight after M3, then M4, M5 and the rest.
- Open founder decisions recorded (01 §11.8): ownership and IP with PreQL, code licence, entity. `package.json` licence changed from MIT to UNLICENSED, since the repo has no LICENSE file and the licence is not yet chosen.

### M2 · Engine core and demo snapshot (2026-10-19)

- `packages/engine`: CSV reading with Indian number formats, ₹, %, and DD/MM/YYYY, DD-Mon-YYYY and Excel-serial dates; demo fact loaders (customer IDs hashed on read); Workspace Sheet tab loaders; analysis windows; KPI module.
- Golden tests GOLD-01..04 pass against `expected_metrics.json` (sums exact, ratios within 0.001).
- v1 models: MMM-lite regression on city-weeks (two-way fixed effects, non-negative ridge, bootstrap range), k-means customer types (seeded, k-means++, 10 restarts), review lexicon tagging with negation and star prior, price-change detector, threat rules, greedy budget optimiser with diminishing returns.
- Snapshot builder for all eight screens, validated by the zod schema in `packages/shared`; deterministic version (SHA-256 of content, sync time excluded). `pnpm --filter @drishti/engine build:demo` writes `apps/web/public/demo/snapshot.json` (about 53 KB); the root `pnpm build` runs it before the web and Worker builds.
- `packages/shared`: snapshot schema, formatting (₹ L/Cr, percentages, points, dates), good/bad metric directions, channel and media labels and colours, free-tier limits, action catalogue (docs/10 §3); copy deck extended with every snapshot string and action label.
- Known v1 limits, to be replaced in M6: the regression cannot separate Amazon Ads and Flipkart Ads yet (shown capped at the platform claim with low confidence) and over-reads quick-commerce ads; the bridge has no rating or seasonality driver; the k-means problem type misses MOD-07's discount threshold by a point and keeps the name "Type 5".
- The demo own-site files are a buyer cohort with almost no first orders after 11 Sep 2026, so new-buyer CAC widens to 90 or 365 days when a window has fewer than 30 sampled new buyers.
- Golden key `reviews.pump_negative_last_30_days` (142) counts every review naming the pump or dispenser in the last 30 days, including 9 positive ones; the engine reports both 142 (mentions) and 133 (rated 3★ or below). A doc edit for docs/12 GOLD-04 is proposed.

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
