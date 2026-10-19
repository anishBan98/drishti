# 12 · QA, Tests and Metrics

## 1. Test pyramid

| Layer | Tool | Where | Runs |
| --- | --- | --- | --- |
| Unit (engine, formatting, rules grammar) | Vitest | `packages/engine`, `packages/shared`, `apps/web/src/lib` | every push |
| Golden (KPIs vs `expected_metrics.json`) | Vitest | `packages/engine/test/golden.test.ts` | every push |
| Model property tests (incrementality, k-means, voice) | Vitest | `packages/engine/test/models/*` | every push |
| Parser contract tests (every `sample-data/inbox` file) | Vitest | `packages/engine/test/parsers/*` | every push |
| Worker API tests | Vitest with `@cloudflare/vitest-pool-workers` (local D1 and KV) | `apps/worker/test/*` | every push |
| Sync job integration (mock Google, Shopify, rival sites) | Vitest + msw | `apps/sync/test/*` | every push |
| Extension adapters (fixture HTML) | Vitest + happy-dom | `apps/extension/test/*` | every push |
| End-to-end | Playwright (Chromium) | `e2e/*` against local (`wrangler dev`) in CI, staging nightly, production after deploy | push (demo suite), nightly (full) |
| Visual regression | Playwright `toHaveScreenshot` vs `design/screens/*.png` | `e2e/visual.spec.ts` | push |
| Accessibility | `@axe-core/playwright` | `e2e/a11y.spec.ts` | push |
| Performance | Lighthouse CI on `/demo` | `ci.yml` | push to main |

CI must be green before any milestone is marked done.

## 2. Test catalog (IDs used across the docs)

### Golden and models
- **GOLD-01** Last 28 days revenue, orders, units, AOV, return rate equal `expected_metrics.json.last_28_days` (sums exact, ratios ±0.001).
- **GOLD-02** Same for prior 28 days, this week, prior week.
- **GOLD-03** By channel (`last_28_days_by_channel`) and by medium spend and claimed ROAS (`last_28_days_media`).
- **GOLD-04** Own-site sample counts, repeat share, COD share, RTO share of COD; reviews count, average rating, pump negatives last 30 days, reply rate.
- **MOD-01** Synthetic control weights are non-negative and sum to 1 (property test on random inputs).
- **MOD-02** On a simulated series with a known effect, the estimate is within 10% (no noise) and the 90% interval covers the truth in ≥ 85% of 100 noisy simulations.
- **MOD-03** Meta holdout on demo data: estimate in [0.6, 2.4]; interval contains the estimate; fit R² ≥ 0.6.
- **MOD-04** Natural-experiment detector finds Kolkata (Mar 2026), Hyderabad (Dec 2025), Jaipur (Aug 2026) events and no event for a city without planted changes over the same windows.
- **MOD-05** Every medium's true ROAS estimate < claimed ROAS except creators (> claimed).
- **MOD-06** Bridge explains ≥ 80% of the demo week change; Rival B and Mumbai stockout drivers are negative and among the top four.
- **MOD-07** k-means is deterministic for a seed; preferred cluster mean orders ≥ 2.5 and AOV ≥ ₹850; problem cluster discount ≥ 0.6 and COD ≥ 0.6.
- **MOD-08** Price-change detector flags Rival B (−18%, 2 Oct), Rival F (−10%, 9 Oct), Rival D (+5%, 11 Oct) and not the 1-day flash deals.
- **MET-05** Readout calculator: hit, partial, miss and inconclusive boundaries on fixtures.

### AI and voice
- **AI-01** Lexicon tagging agrees with keyword truth on `reviews.csv` for ≥ 85% of reviews.
- **AI-02** AI tagging client validates JSON with zod; invalid output triggers one retry then lexicon fallback (mocked model).
- **AI-03** Budget governor blocks calls past 8,000 estimated neurons and records usage.
- **AI-04** Drafts keep every number from the facts (number-preservation check rejects altered numbers).
- **VOICE-01** Emerging issues: "pump" flagged as growing with first seen 21 Sep; "smaller than shown" flagged as new on Flipkart.

### Parsers and connectors
- **CON-01..13** Each `sample-data/inbox/*.csv` is detected as the right source, parsed with zero errors, and its totals match the corresponding demo facts for the overlapping dates (where the inbox file is derived from them).
- **CON-14** Unknown headers → `FILE_UNRECOGNISED` with headers listed.
- **CON-15** Mappings tab override renames a column and the file parses.
- **CON-16** Indian number formats, `₹`, commas, percentages, Excel serial dates parse.
- **CON-06** Late source: Flipkart Ads status "5 days late" on 17 Oct with demo data.
- **SITE-01** Robots disallow → skipped with `ROBOTS_DISALLOWED`; allowed Shopify `.js` JSON parsed; JSON-LD Product parsed.
- **EXT-01..06** Each adapter extracts price, MRP, rating, count, stock and pack size from its fixture page; failure path returns manual entry.

### Worker API
- **API-01** Google ID token verification (valid, wrong audience, expired, unverified email).
- **API-02** Session cookie flags and CSRF enforcement on non-GET.
- **API-03** RBAC: every route × role matrix from `04-ADMIN.md` §2 (table-driven test).
- **API-04** Snapshot streaming with ETag/304, gzip headers, 404 before first sync.
- **API-05** Internal HMAC: valid, stale (> 300 s), replayed, wrong body hash.
- **API-06** Idempotency: same key same body returns same action; different body 409.
- **API-07** Rate limits return 429 with Retry-After.
- **API-08** Audit log has no UPDATE or DELETE statements in code (static grep test).

### Sync
- **SYNC-01** Full sync on fixtures produces a snapshot that validates against the zod schema.
- **SYNC-02** Re-running with the same inputs gives the same snapshot version (deterministic).
- **SYNC-03** Files move Inbox → Archive; unrecognised → Inbox/Unrecognised; duplicates skipped.
- **SYNC-04** Restated last 14 days replace earlier rows.
- **SYNC-05** A failing module does not block publish; failing Sheets access fails the run without publishing.
- **SYNC-06** Early exit when not due costs < 30 s.
- **SYNC-07** Late-source status and rule R04 fire.

### Actions
- **ACT-01..08** Lifecycle transitions for each executor kind, including approval, decline, expiry, retry and undo.
- **ACT-10** `amazon_coupon` builds the CSV with the right ASIN, discount and dates; outputs saved; handoff confirm moves to measuring with a 21-day readout.
- **ACT-14** `qa_hold` creates the doc (mock Docs API) with counts and quotes; task assigned.
- **ACT-20..23** Shopify executors: cap codes (mock GraphQL), partial success, undo restores, scope missing error.
- **ACT-30** Every button label in the copy deck maps to an action type in `10-ACTIONS.md` §3 (no orphan buttons).

### End-to-end (Playwright)
- **E2E-01** `/demo` loads This week in under 2 s; verdict, six KPIs, bridge, panels, inference and five actions visible.
- **E2E-02** Each nav link opens its screen; no page scrolls at 1440 × 900 (document scrollHeight = 900).
- **E2E-03** Dark mode toggles every screen and persists across reload.
- **E2E-04** Performance tabs and channel selection update the chart, inference and actions.
- **E2E-05** Impact: selecting Creators shows the under-credited headline.
- **E2E-06** Market: map toggle shows the open-space shading; selecting Rival B shows High threat.
- **E2E-07** Customers: selecting Routine Loyalists highlights its dots and changes actions.
- **E2E-08** Data sources: selecting Flipkart Ads shows "5 days late" and its actions; privacy switch toggles.
- **E2E-09** Demo action: Create coupon → confirm → steps tick → CSV downloads → "View in Actions" → the action is on top of the Actions log.
- **E2E-10** Demo approval: budget shift shows Waiting for approval; Approve and run on Actions moves it to Running.
- **E2E-11** Demo undo on a done action shows Undone and the restore step.
- **E2E-12** Assign opens owner picker and logs the assignment.
- **E2E-13..16** Staging (signed-in test user via a test-only Google token mock in staging): coupon handoff, geo test plan, QA hold, discount cap on the Shopify development store.
- **E2E-20** Staging onboarding: workspace links validated, first sync completes and screens render real data.

## 3. Fixtures

- `sample-data/demo/*` and `sample-data/expected/expected_metrics.json` (committed).
- `fixtures/google/` recorded Sheets and Drive responses for the template sheet; `fixtures/shopify/` GraphQL responses; `fixtures/sites/` synthetic rival pages and `.js` product JSON; `fixtures/extension/` synthetic marketplace-like pages.
- No real brand data in the repo, ever. A pre-commit hook blocks files larger than 10 MB and files matching `*.secret*`, `*.pem`, `*sa*.json`.

## 4. Free-tier tests

- **FREE-01** Limits file matches the table in `05-SYSTEM-DESIGN.md` §3 (doc parse test).
- **FREE-02** A simulated day of normal use stays under 50% of every governor.
- **FREE-03** Worker CPU: microbenchmarks for session check, snapshot streaming, action create (each < 3 ms CPU locally with `wrangler dev --test-scheduled` timing).

## 5. Visual regression

- For each of the 8 screens × 2 themes, render the demo at 1440 × 900 with fonts loaded and compare with `design/screens/<nn>-<screen>-<theme>.png` using `maxDiffPixelRatio: 0.03`.
- Expected differences: the demo snapshot's numbers differ slightly from the illustrative design numbers. To compare layout fairly, the visual suite runs with `?fixture=design`, which loads `e2e/fixtures/design-snapshot.json`: a snapshot hand-built to contain exactly the design's numbers and texts (generate it once from the static HTML text content; check it in).
- Update baselines only with an explicit `pnpm test:visual --update` and a reviewed PR.

## 6. Product analytics (first-party, D1 `events`)

| Event | Props |
| --- | --- |
| `screen_view` | screen, theme, demo |
| `select_item` | screen, kind (channel, rival, segment, aspect, source, action), id |
| `action_open_confirm` | type, screen |
| `action_run` | type, screen, executor, needs_approval |
| `action_result` | type, status, result |
| `approval_decision` | decision |
| `sync_manual` | trigger |
| `upload` | source_detected |
| `capture` | platform, adapter, manual |
| `theme_change` | theme |
| `demo_depth` | screens_seen (sent on unload) |

No third-party analytics or tracking scripts.

## 7. Metric definitions (for KRAs)

| Metric | Definition | Source |
| --- | --- | --- |
| Weekly active users (WAU) | distinct users with ≥ 1 `screen_view` in 7 days (excluding demo) | events |
| Action weeks | share of weeks with ≥ 1 `action_run` | events |
| Time to first action | median minutes from the Monday 7 am snapshot to the first `action_run` that week | events, snapshots |
| Hit rate | hits ÷ (hits + partial + miss) over actions with readouts in the period | actions |
| Confirmed impact | Σ measured_inr (monthly normalised) of hit and partial actions | actions |
| Freshness | share of source-days within SLA | sources history (sync_runs) |
| Sync success | ok runs ÷ all runs | sync_runs |
| Demo depth | share of demo sessions with ≥ 3 screens | events (demo) |
| Demo time | median seconds per demo session | events (demo) |
| Analyst hours saved | pilot survey: hours per week on reporting before vs after | pilot form |

## 8. UAT checklist (before showing to a brand)

- [ ] Demo works logged out in Chrome, Edge, Firefox, Safari at 1440 × 900 and 1280 × 800.
- [ ] Every button on every screen produces a visible result and an entry on Actions (demo).
- [ ] Dark mode has no unreadable text (axe passes; manual skim).
- [ ] Data sources explains every source honestly, including what is manual.
- [ ] Staging: a full sync from the template Sheet and inbox samples completes under 5 minutes.
- [ ] Staging: Shopify discount cap and undo work on the development store.
- [ ] No secrets in the repo (`gitleaks` passes in CI).
- [ ] Usage page shows all governors well under limits.

## 9. Release checklist

1. All CI suites green on `main`.
2. Staging nightly E2E green for 2 nights.
3. Tag `vX.Y.Z`; `deploy.yml` deploys production; post-deploy smoke E2E (E2E-01, 02, 03) against production.
4. Release notes in `CHANGELOG.md`; update `13-STRATEGY-AND-KRAS.md` progress table.
