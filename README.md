# PreQL Presents Drishti

> See what really worked.

A free, self-hosted marketing intelligence workspace for Indian D2C brands that sell on their own site, Amazon, Flipkart, Nykaa and quick commerce. Built entirely on free tiers (Cloudflare Workers, GitHub Actions, Google APIs with no billing account). Nothing in this stack needs a credit card.

**Status:** v1.0, a full working pitch build for one brand and its team of 10 to 20 people. Every feature in the docs is built in its compact form (see [CHANGELOG.md](CHANGELOG.md)).

## Try it

| Link | What it is |
| --- | --- |
| [drishti.preql.workers.dev](https://drishti.preql.workers.dev) | Home page, with a before-and-after banner of what Drishti finds |
| [/demo](https://drishti.preql.workers.dev/demo) | All eight screens on a fictional brand (Lumora Skin) |
| [/try](https://drishti.preql.workers.dev/try) | Sandbox: add your own company from files or a link-shared Google Sheet, in your browser only |
| [/signin](https://drishti.preql.workers.dev/signin) | Your team's workspace: Google sign-in, setup, Sync now, real actions, Admin |

## How it works

1. **Connect.** Copy the Workspace Sheet template, make Inbox, Outbox and Archive folders in Drive, and share them with the service account. Then paste the links in onboarding.
2. **Sync.** Sync now reads the Sheet and every Inbox file. Your browser runs the engine (`packages/engine`, where all numbers come from code), and the snapshot is saved for the whole team.
3. **Act.** Every suggestion runs as a real action. It is saved for the team, written to the Actions tab, and its files go to the Drive Outbox. Draft documents get a Workers AI summary that keeps every number. Slack posts are optional.
4. **Watch.** The Drishti Capture extension (`apps/extension/chrome`, load unpacked) captures the product page you are viewing. A daily watcher reads rival brand sites where robots.txt allows. Marketplaces and quick commerce are never visited automatically.

Architecture: Cloudflare Worker (Hono) with D1, KV, Workers AI and Cron, serving a React SPA. Google Sheets and Drive are accessed through a service account. Everything runs on free tiers ([docs/05](docs/05-SYSTEM-DESIGN.md), §15 for the compact design).

## Specification

The docs are the source of truth. Start with [`docs/00-README.md`](docs/00-README.md) (or the single combined file [`PreQL-Drishti-SPEC.md`](PreQL-Drishti-SPEC.md)).

| Folder | Contents |
| --- | --- |
| `docs/` | 15 specification documents (PRD to runbook) |
| `sample-data/` | Fictional Lumora Skin data: canonical facts, raw inbox files, Google Sheet template, golden metrics |
| `design/` | Eight screens in light and dark: PNG, static HTML, prototype source |
| `brand/` | Lift-eye logo mark, app icon, favicon, logo boards |

All data is fictional.

## Repository layout

```
apps/web         React SPA (Vite)
apps/worker      Cloudflare Worker (Hono), migrations/
apps/sync        Node CLI: drishti-sync, drishti-run-action
apps/extension   Chrome MV3 extension
packages/engine  parsers, facts, metrics, models, recommendations, snapshot builder
packages/shared  types, zod schemas, limits, copy deck, tokens, geo, ai config
e2e/             Playwright specs and fixtures
scripts/         repo scripts (file check, Shopify seeding, limits check)
```

## Develop

Requires Node.js 22+ and pnpm 9 (`corepack enable` or `npm i -g pnpm@9`).

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```
