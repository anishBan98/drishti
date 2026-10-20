# 14 · Setup Runbook: From Empty Folder to Deployed and Tested

This runbook is written for Claude Code to follow, with the human (you) logging in where a login is needed. Nothing here needs a credit card. If any screen asks for one, stop: it is the wrong plan or product.

## 1. Accounts (all free, no card)

| Account | Needed for | Plan | Who creates |
| --- | --- | --- | --- |
| GitHub | Code, CI, scheduled sync jobs | Free | You (likely exists) |
| Cloudflare | Worker, D1, KV, Workers AI, cron | Workers Free (default on sign-up) | You (email sign-up) |
| Google account (Gmail) | Google Cloud project (no billing), Sheets, Drive, Sign-In, Calendar | Free; **do not create a billing account** | You |
| Shopify Partners | Free development store for staging and the showcase | Free | You (Phase 1, M7) |
| Slack (optional) | Notifications via incoming webhook | Free workspace | You |
| Vercel (optional mirror) | A second address for the public pages (home, demo, sandbox) | Hobby (free, no card; non-commercial use only) | You (sign up with GitHub) |
| Meta for Developers (optional, Phase 2) | Ads API in development mode | Free | You |

Use a club email (for example `preql.drishti@…`) for Cloudflare and Google so the club owns the deployment (`04-ADMIN.md` §9).

## 2. Who logs in where

| Step | Where | Who does it | What Claude Code does |
| --- | --- | --- | --- |
| GitHub CLI auth | Terminal → browser device code | You approve | Runs `gh auth login --web`, waits |
| Cloudflare auth | Terminal → browser | You approve | Runs `pnpm wrangler login`, waits |
| Cloudflare API token | dash.cloudflare.com → My Profile → API Tokens | You (or Claude in your browser while you are signed in) | Tells you the exact permissions; stores the token with `gh secret set` |
| Google Cloud project, APIs, service account, OAuth client | console.cloud.google.com | You sign in; Claude in your browser can click through the steps | Gives step-by-step clicks; takes the downloaded JSON key path, stores it as secrets, deletes the file |
| Google Sheet and Drive folders | drive.google.com | You (import the template, create folders, share with the service account) | Prints the service account email to share with |
| GitHub fine-grained PAT for sync dispatch | github.com → Settings → Developer settings | You | Stores it with `wrangler secret put GITHUB_DISPATCH_TOKEN` |
| Shopify development store and custom app | partners.shopify.com | You | Seeds the store; you paste the token in Drishti Admin |
| Slack webhook | api.slack.com/apps | You | You paste the URL in Drishti Admin |
| Vercel login (optional mirror) | Terminal → browser | You approve | Runs `npx vercel login`, then `npx vercel deploy --prod` |

## 3. Local prerequisites

- Node.js 22 LTS, pnpm 9 (`corepack enable`), git, GitHub CLI (`gh`), Chrome (for the extension and Playwright).
- `pnpm dlx playwright install chromium` (skip if a Chromium is already provided by the environment).

## 4. Repository layout

```
drishti/
  apps/
    web/            React SPA (Vite)
    worker/         Cloudflare Worker (Hono), migrations/
    sync/           Node CLI: drishti-sync, drishti-run-action
    extension/      Chrome MV3 extension
  packages/
    engine/         parsers, facts, metrics, models, recommendations, snapshot builder
    shared/         types, zod schemas, limits, copy deck, tokens, geo, ai config
  e2e/              Playwright specs and fixtures (design-snapshot.json)
  docs/             this document set
  sample-data/      demo/, inbox/, workspace/, expected/, Drishti-Workspace-Template.xlsx
  design/           screens/, static-html/, prototype-source/
  brand/            logo SVGs and boards
  scripts/          seed-shopify.ts, rotate-data-key.ts, check-limits.ts
  .github/workflows/ ci.yml deploy.yml sync.yml action-runner.yml nightly-e2e.yml keepalive.yml limits-check.yml
  wrangler.toml  package.json  pnpm-workspace.yaml  tsconfig.base.json  .gitleaks.toml  README.md  CHANGELOG.md
```

Root `package.json` scripts: `dev` (Vite + wrangler dev), `build` (engine → demo snapshot → web → worker), `test` (all Vitest), `test:e2e`, `test:visual`, `lint` (eslint + prettier check), `typecheck`, `deploy:staging`, `deploy:prod`, `db:migrate:staging`, `db:migrate:prod`, `seed:shopify`.

## 5. Cloudflare configuration

```toml
# wrangler.toml (production is the top level; staging is an env)
name = "drishti"
main = "apps/worker/src/index.ts"
compatibility_date = "2026-10-01"
compatibility_flags = ["nodejs_compat"]

[assets]
directory = "apps/web/dist"
binding = "ASSETS"
not_found_handling = "single-page-application"
run_worker_first = ["/api/*", "/internal/*"]

[[d1_databases]]
binding = "DB"
database_name = "drishti"
database_id = "<filled by setup>"
migrations_dir = "apps/worker/migrations"

[[kv_namespaces]]
binding = "KV"
id = "<filled by setup>"

[ai]
binding = "AI"

[triggers]
crons = ["*/30 * * * *", "40 20 * * *"]   # every 30 min; 02:10 IST daily housekeeping

[vars]
ENVIRONMENT = "production"
WORKSPACE_ID = "default"
GITHUB_REPO = "<owner>/drishti"
GOOGLE_CLIENT_ID = "<filled by setup>"
DEMO_ENABLED = "true"

[env.staging]
name = "drishti-staging"
[[env.staging.d1_databases]]
binding = "DB"
database_name = "drishti-staging"
database_id = "<filled by setup>"
migrations_dir = "apps/worker/migrations"
[[env.staging.kv_namespaces]]
binding = "KV"
id = "<filled by setup>"
[env.staging.ai]
binding = "AI"
[env.staging.triggers]
crons = ["*/30 * * * *", "45 20 * * *"]
[env.staging.vars]
ENVIRONMENT = "staging"
WORKSPACE_ID = "default"
GITHUB_REPO = "<owner>/drishti"
GOOGLE_CLIENT_ID = "<filled by setup>"
DEMO_ENABLED = "true"
```

Cron count: 2 production + 2 staging = 4 of the 5 allowed per account. Check the current wrangler docs for the exact `assets` keys at build time; if a key changed, keep the behaviour (SPA fallback; Worker first for `/api` and `/internal`).

Commands (Claude Code runs them; IDs are written back into `wrangler.toml`):

```bash
pnpm wrangler d1 create drishti
pnpm wrangler d1 create drishti-staging
pnpm wrangler kv namespace create KV
pnpm wrangler kv namespace create KV --env staging
pnpm wrangler d1 migrations apply drishti --remote
pnpm wrangler d1 migrations apply drishti-staging --remote --env staging
# secrets (each prompts for the value; never echo values into logs)
for s in GOOGLE_SA_JSON OWNER_EMAIL SESSION_SECRET SYNC_SECRET DATA_KEY GITHUB_DISPATCH_TOKEN; do pnpm wrangler secret put $s; done
for s in GOOGLE_SA_JSON OWNER_EMAIL SESSION_SECRET SYNC_SECRET DATA_KEY GITHUB_DISPATCH_TOKEN E2E_SECRET; do pnpm wrangler secret put $s --env staging; done
```

`SESSION_SECRET`, `SYNC_SECRET`, `DATA_KEY`, `E2E_SECRET`: generate with `openssl rand -base64 32` (separate values for staging and production).

## 6. GitHub configuration

```bash
gh repo create <owner>/drishti --public --source . --remote origin --push
gh api -X PUT repos/<owner>/drishti/environments/production
gh api -X PUT repos/<owner>/drishti/environments/staging
# per environment secrets and variables
gh secret set SYNC_SECRET --env production      # same value as the Worker's
gh secret set DATA_KEY --env production
gh secret set GOOGLE_SA_JSON --env production < path/to/key.json
gh variable set DRISHTI_URL --env production --body "https://drishti.<subdomain>.workers.dev"
# repeat for staging (plus E2E_SECRET)
gh secret set CLOUDFLARE_API_TOKEN               # repo-level: Workers Scripts edit, D1 edit, KV edit, Workers AI read
gh secret set CLOUDFLARE_ACCOUNT_ID
```

**Workflows**

| File | Trigger | Does |
| --- | --- | --- |
| `ci.yml` | push, pull_request | install, lint, typecheck, unit + golden + contract + API tests, build (incl. demo snapshot), Playwright demo E2E + visual + a11y against `wrangler dev`, Lighthouse CI, gitleaks |
| `deploy.yml` | push to `main` → staging; tag `v*` → production | build, apply D1 migrations, `wrangler deploy [--env staging]`, post-deploy smoke E2E against the deployed URL |
| `sync.yml` | `schedule: "10 * * * *"` (both envs via matrix) and `workflow_dispatch` (inputs: env, trigger, run_id, readouts_only) | runs `drishti-sync`; exits early if not due |
| `action-runner.yml` | `workflow_dispatch` (inputs: env, action_id) | runs `drishti-run-action` |
| `nightly-e2e.yml` | `schedule: "30 21 * * *"` (03:00 IST) | full E2E against staging including signed-in flows |
| `keepalive.yml` | monthly | commits `.github/heartbeat` (keeps scheduled workflows enabled in a public repo) |
| `limits-check.yml` | weekly | `scripts/check-limits.ts`: compares `limits.ts` with the docs table |

`sync.yml` sketch:

```yaml
name: sync
on:
  schedule: [{ cron: "10 * * * *" }]
  workflow_dispatch:
    inputs:
      env: { type: choice, options: [production, staging], default: production }
      trigger: { type: string, default: manual }
      run_id: { type: string, required: false }
      readouts_only: { type: boolean, default: false }
jobs:
  sync:
    strategy:
      matrix:
        env: ${{ github.event_name == 'schedule' && fromJSON('["production","staging"]') || fromJSON(format('["{0}"]', inputs.env)) }}
    concurrency: { group: "sync-${{ matrix.env }}", cancel-in-progress: false }
    runs-on: ubuntu-latest
    timeout-minutes: 20
    environment: ${{ matrix.env }}
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @drishti/sync start -- --trigger "${{ inputs.trigger || 'scheduled' }}" --run-id "${{ inputs.run_id }}" ${{ inputs.readouts_only && '--readouts-only' || '' }}
        env:
          DRISHTI_URL: ${{ vars.DRISHTI_URL }}
          SYNC_SECRET: ${{ secrets.SYNC_SECRET }}
          DATA_KEY: ${{ secrets.DATA_KEY }}
          GOOGLE_SA_JSON: ${{ secrets.GOOGLE_SA_JSON }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

The Worker dispatches with `POST https://api.github.com/repos/{GITHUB_REPO}/actions/workflows/sync.yml/dispatches` and body `{ "ref": "main", "inputs": { "env": "<ENVIRONMENT>", "trigger": "manual", "run_id": "<id>" } }` using `GITHUB_DISPATCH_TOKEN` (fine-grained PAT, this repo only, Actions: read and write).

**Staging test login (for signed-in E2E only):** when `ENVIRONMENT = "staging"`, the Worker exposes `POST /api/test/login` that accepts `X-E2E-Secret: <E2E_SECRET>` and an email from the Users tab, and returns a normal session. The route does not exist in production builds (compile-time flag; API-03 checks it returns 404 in production).

## 7. Google and data setup (once per environment)

Follow `11-CONNECTORS.md` §2. For staging use a copy of the template Sheet and upload all files from `sample-data/inbox/` into the staging Inbox. Then in Drishti staging: sign in as `OWNER_EMAIL` → Data sources onboarding → paste the Sheet and folder URLs → Sync now.

For production (a real brand), the brand's owner does the same with their own Sheet and folders; Claude Code only needs the URLs.

## 8. Milestones and "done when"

| # | Milestone | Done when |
| --- | --- | --- |
| M0 | Repo and scaffold | Repo exists; monorepo builds; CI runs lint, typecheck and an empty test suite green; docs, sample-data, design and brand folders committed |
| M1 | Worker skeleton and deploy | `wrangler deploy` (staging and production) serves the SPA shell and `/api/health`; D1 migrations applied; KV bound; crons registered; `deploy.yml` deploys staging on push |
| M2 | Engine core and demo snapshot | Parsers for demo facts; KPI module; GOLD-01..04 pass; `build:demo` produces `demo/snapshot.json` validating against the zod schema (bridge, market, customers and voice may use v1 methods) |
| M3 | Home page, eight screens, light and dark, demo actions | Home page (E2E-21); all screens match the designs (visual suite within tolerance using `design-snapshot.json`); E2E-01..12, a11y and Lighthouse pass; `/demo` live on production |
| M4 | Auth, roles, admin, onboarding wizard | Google Sign-In works on staging; API-01..03 pass; Admin screen (workspace links with access checks, connectors, users, usage, audit); onboarding wizard steps 1–5 |
| M5 | Sync pipeline | Sheet and Drive Inbox ingestion for all 13 sources (CON tests); scheduled and manual sync; Data sources live with statuses; SYNC-01..07 pass; staging shows real-format data; data guide with sample downloads and Check my file (E2E-23); sandbox (E2E-24); wizard step 6 (E2E-22) |
| M6 | Models on synced data | Incrementality (natural experiments, synthetic control, MMM-lite), bridge, market analytics, k-means, voice lexicon; MOD-01..08, VOICE-01 pass |
| M7 | Action engine v1 | All prepare, task, rule and data executors; Shopify execute with undo on the development store; Actions screen on D1; Sheet mirror; ACT-01..08, 10, 14, 20..23, 30 pass; E2E-13, 16 on staging |
| M8 | Tests and AI | Geo test planner, tracking, readouts; Workers AI tagging and drafts with governor; MOD-03, AI-01..04, MET-05 pass; E2E-14, 15 on staging |
| M9 | Extension, rival sites, approvals, notifications | Extension adapters (EXT tests), rival site watcher (SITE-01), approvals and expiry, Slack and Calendar notifications, Monday summary |
| M10 | Hardening and release | FREE-01..03; gitleaks; nightly E2E green twice; tag `v1.0.0`; production smoke E2E; README with demo link, screenshots and architecture |

**Order of work (decided 20 Oct 2026, `01-PRD.md` §11.7; updated the same day):** M0 → M1 → M2 → **M3** (This week, Impact and ROI, Market and Actions polished first, then the other four screens) → **Sandbox** (`/try`: the file parsers and Check my file from M5, several companies, update by dropping files again, plus a UI polish pass that keeps the eight screens' layouts; E2E-24) → **M6 on demo data** (synthetic control, natural experiments, MMM calibration; MOD-01..08 and VOICE-01 on `sample-data`) → M4 → M5 (M6's checks re-run on synced data to complete M6) → M7 → M8 → M9 → M10. Measurement credibility comes before breadth because it is the core of the investor and design-partner story.

## 9. Prompts for Claude Code

### 9.1 First prompt (full build, one session if possible)

```
You are building "PreQL Presents Drishti" from the specification in this folder: docs/ (00 to 14), sample-data/,
design/ and brand/. The docs are the source of truth. Read docs/00-README.md, then 05, 06, 07, 09, 10, 11, 14
before writing code, and skim the rest.

Rules: free tiers only, never add a payment method or upgrade any plan. Allowed services: GitHub, Cloudflare
Workers/D1/KV/Workers AI, Google APIs with no billing account, Shopify development store, optional Slack webhook,
and Vercel Hobby as a mirror of the public pages only.
No automated visits to marketplaces. All numbers from code; AI only for review tagging and drafts.
Every user-facing string comes from the copy deck. Every button must do something real (docs/10-ACTIONS.md).
Match design/screens/*.png and design/static-html/*.html in light and dark.

Work through milestones M0 to M10 in docs/14-SETUP-RUNBOOK.md §8 in order. For each milestone: plan briefly,
implement, write the tests named in docs/12-QA-AND-METRICS.md, run them until green, commit with a clear message,
push, and confirm the "done when" check before moving on. When you need me to log in or click something in a
console (GitHub, Cloudflare, Google Cloud, Shopify, Slack), stop and give me exact steps, then continue when I
say done. If you find a conflict between the docs and reality (a limit, an API, a library), stop, explain, and
propose a doc edit before changing code.

Start with M0: create the GitHub repo "drishti" (public) under my account, scaffold the monorepo per §4, copy
docs/, sample-data/, design/, brand/ into it, set up CI, and push. Then continue to M1.
```

### 9.2 Resume prompt (new session)

```
Continue building Drishti from docs/. Read docs/14-SETUP-RUNBOOK.md §8 and CHANGELOG.md to see which milestones
are done (git log too). Run the full test suite first; fix anything red. Then continue with the next milestone,
following the same rules as the first prompt.
```

### 9.3 Milestone prompts (if working one milestone per session)

- **M3:** "Build all eight screens per docs/09-FRONTEND.md using the demo snapshot. First create e2e/fixtures/design-snapshot.json containing exactly the numbers and texts in design/static-html (light), so the visual suite can compare layouts. Implement the ActionCard states and demo simulation from docs/10-ACTIONS.md §7. Run E2E-01..12, visual and a11y until green, then deploy and give me the /demo URL."
- **M5:** "Implement the sync job per docs/05-SYSTEM-DESIGN.md §4 and docs/11-CONNECTORS.md. Use msw mocks for Google and Shopify in tests. Then walk me through the Google setup in docs/11-CONNECTORS.md §2 for staging, upload sample-data/inbox to the staging Inbox, and run a manual sync."
- **M7:** "Implement the action engine per docs/10-ACTIONS.md. Start with amazon_coupon, shopify_discount_cap, qa_hold, budget_shift, price_alert, upload_file, assign, approve/undo. Help me create the Shopify development store and custom app, run pnpm seed:shopify, then run E2E-13 and E2E-16 on staging."

## 10. Deploy and test end to end

```bash
pnpm install
pnpm build                      # builds engine, demo snapshot, web, worker
pnpm test                       # unit, golden, contract, API, sync
pnpm test:e2e                   # demo E2E against wrangler dev
pnpm test:visual                # visual regression
pnpm deploy:staging && pnpm exec playwright test --project=staging-smoke
git tag v1.0.0 && git push --tags     # deploy.yml deploys production and runs smoke E2E
```

Smoke E2E on production: E2E-01, 02, 03 against `https://drishti.<subdomain>.workers.dev/demo`.

## 11. Troubleshooting

| Symptom | Fix |
| --- | --- |
| `wrangler deploy` asks to choose a plan or add payment | Do not proceed. Check you are on the Workers Free plan and not using a paid-only feature (for example Durable Objects with certain storage, R2, Queues). Drishti needs none of them |
| Error 1027 (daily request limit) | Check usage page; raise polling interval; investigate a loop |
| Google API 403 "API not enabled" | Enable the API in the project; wait 2 minutes |
| Google 403 on the Sheet | Share with the service account email as Editor |
| Sign-In button shows "origin not allowed" | Add the exact Worker origin to the OAuth client's authorised JavaScript origins |
| Sync never runs on schedule | Actions → sync → check it is enabled; keepalive; repo activity in the last 60 days |
| Workers AI errors after many drafts | Daily neuron budget reached; drafts resume tomorrow |
| Visual tests fail only on fonts | Ensure `@fontsource/archivo` is loaded and `document.fonts.ready` awaited before screenshots |

## 12. Free-tier guardrails checklist (before every release)

- [ ] No payment method on GitHub, Cloudflare or Google; Google project has no billing account linked.
- [ ] `limits.ts` matches `05-SYSTEM-DESIGN.md` §3; limits-check green.
- [ ] Usage page: all resources below 50% of their daily limit over the last 14 days.
- [ ] No new external service added without a doc change approved by the product lead.
