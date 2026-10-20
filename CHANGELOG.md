# Changelog

All notable changes to Drishti. Milestones follow `docs/14-SETUP-RUNBOOK.md` §8.

## [Unreleased]

### M4 pages and home page (2026-10-21)

- Sign in with Google (`/signin`), the workspace start page (`/app`), onboarding steps 1–5 (`/onboarding`, live access checks on the Sheet and folders) and Admin (`/admin`: workspace links, users and Reload from Sheet, recent activity, sign everyone out). Signed-out visits go to Sign in; non-Owners go to the start page.
- Home page: a clearer lead and a four-item “What Drishti shows you” list; the card on the right opens on a rotating banner, before Drishti against with Drishti, with the demo brand’s numbers and an animated chart per finding (ad returns, this week, rivals, customers). Pause and per-slide controls; it starts paused for reduced motion and keeps its numbers on phones.
- Line icons replace text arrows across the app; the home links line up on one centre line.

### M6 · Measurement on demo data (2026-10-20)

- Synthetic control (docs 08 §3.2): weights on the simplex by accelerated projected gradient, fit on 7-day sums, fit check by pre-period RMSPE ≤ 8% of the level (replaces R² ≥ 0.6, which rewarded windows that moved the answer away from the truth), 90% range by placebo-in-space or a block bootstrap. Donors exclude cities in other tests and cities with a quick-commerce stockout event. MOD-01, MOD-02, MOD-03: the Meta holdout in Pune and Ahmedabad reads ₹1.36 per ₹1 (planted 1.53).
- Natural experiments (§3.3): spend shocks of a 40%+ drop or an 80%+ rise for 5+ days with national spend steady, 28-day cooldown; finds exactly the planted Kolkata, Hyderabad and Jaipur events (MOD-04) and reads them with synthetic control.
- Evidence hierarchy (§3.1): tests, natural experiments and the regression combined by precision, plus a weak claim-ratio prior for media no experiment has reached. Real returns now sit below every platform claim and above it for creators (MOD-05); Meta reads high confidence on its holdout and natural experiment. The Impact screen says what each estimate rests on.
- Customer types (§7): small-sample shrinkage of the share features; types named and flagged by the share of their customers; new name "COD Returners" for the cash-and-return group (MOD-07). Price changes (MOD-08), the weekly bridge (MOD-06) and emerging review issues (VOICE-01) have tests.
- No suggestion repeats an open action (§9.1): the demo's waiting budget shift means This week no longer suggests a second one.
- Fix (v0.4.1): a Google Sheet holding the template and the exports together read revenue and spend as zero, because the Mappings tab's Drishti field names were treated as renames. Found with a real link-shared sheet; regression test added.
- Docs: 08 §3.1–3.3, §7, §9.1; 12 MOD-03, MOD-07, VOICE-01, E2E-10.

### Sandbox · Analyse your own company (2026-10-20)

- `/try`: keep several companies in this browser. Each one can **link Google Sheets** (shared as "Anyone with the link can view") and **drop files** (the filled template, any of the 13 exports, or a ZIP). Every tab and file is detected by its columns, read in a Web Worker, and turned into the same eight screens as the demo. **Refresh** fetches linked sheets again (also on opening a company); dropping a newer export replaces the older file of the same source. Nothing is stored on a server (docs 05 §14, 09 §6.12).
- `GET /api/sheet`: the Worker fetches a link-shared Google Sheet as XLSX for the sandbox; Google Sheets links only, 20 MB limit, nothing stored or logged, errors with the sharing fix (`SHEET_NOT_PUBLIC`) (docs 07 §2, 03).
- Engine: parsers for all 13 sources with header detection, aliases and per-source Mappings (CON-01..16); an XLSX reader; assembly that maps ASIN, FSN and Nykaa codes to SKUs, turns creator posts into creator spend, and spreads city-less rows by the national city mix (docs 06 §1.2).
- Engine honesty on short or partial data: under 120 days of history, real returns are "not measured yet" (shown as "—") instead of estimated (docs 08 §3.4); any mix of sources builds a valid snapshot with no NaN; screens without their data say what to add. The demo-only "Pump mentions" KPI became "{issue} complaints", following each brand's top complaint.
- Home: **Analyse your company** button. Build order updated: sandbox first, then M6 (docs 14 §8).
- UI polish within the design layouts: hover and press feedback on buttons, hover fades on rows and nav, disabled controls read as unavailable, a loading skeleton for the demo (docs 09 §7, §8).
- Tests: CON-01..16, partial-data builds, API-SHEET, E2E-24 (files), E2E-27 (linked sheet with Refresh and the private-sheet fix), sandbox accessibility. CI runs the sandbox suite as its own step.

### M3 · Home page, eight screens, demo actions (2026-10-20)

- Home page (`/`): one screen with no page scroll on desktop and phone. It explains what Drishti is for in one line, shows a live preview built from the demo snapshot, and offers a four-round game, "Spot the real rupee" (XP, streak bonus, three levels, badges, confetti, a score ring and the best score kept in the browser). All motion stops under reduced motion (docs 09 §6.0 and §8 updated; E2E-25 and E2E-26 added).
- All eight demo screens at `/demo/*` (This week, Actions, Performance, Impact and ROI, Market, Customers, Customer voice, Data sources) in light and dark, on a 1440 × 900 stage scaled to the window. Every string comes from the copy deck and every number from the snapshot.
- Demo actions (docs/10 §7): every action card goes through its real states (preview, approval when money is at stake, running steps, done with an undo window). Outputs are real downloadable files, such as the coupon CSV. State is kept in the browser session.
- Engine changes for the screens: approval is based on money at stake, not expected gain (budget moves capped at ₹3 L); creator spend is left out of the weekly bridge; coupons are Amazon-only; segment naming picks the best match; "first seen" for a price change uses a change point.
- `e2e/fixtures/design-snapshot.json` holds the exact numbers and texts of `design/static-html`, so the visual suite compares layout, not data.
- Tests: Playwright E2E-01..12, 21, 25 and 26; axe WCAG 2.2 AA on every screen in both themes; visual regression for 8 screens × 2 themes against `design/screens/*.png` (all within 3 %); Lighthouse CI on `/demo` and `/` (1.0 for performance, accessibility and best practices locally). The CI `e2e` job runs demo, a11y and visual; the `lighthouse` job runs on push to `main`.
- E2E runs against `vite preview` of the built app, with reduced motion, not `wrangler dev`, because the demo needs no API and `wrangler dev` needs a Cloudflare login for the AI binding (docs/12 §1 updated).
- Accessibility fixes: contrast of muted text on selected rows and in dark insight panels, 24 px target size for market bubbles and customer chips, no `aria-label` on plain divs.
- Bundle: 156 KB JS and 11 KB CSS gzip (limit 250 KB).
- UI audit on the running app (`docs/audits/2026-10-20-m3-ui-audit.md`): 22 findings, 20 fixed, each with a regression test in `e2e/tests/audit.demo.spec.ts`. Fixed: actions resume after a reload; load errors show a message and Retry (demo and home game); home fits sideways and 320 px phones; assignments have their own Assigned status and no longer count as runs; Assign checks the due date and skips Viewers; focus follows action cards; `g` then 1–8 shortcuts (docs/09 §8); seeded action steps and owners; a phone note on `/demo`; game progress shows misses; smaller copy fixes.
- CI: the visual suite runs on `windows-latest`, where the design PNGs were rendered (Linux font smoothing alone differs by about 4 %).

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
