# PreQL Presents Drishti

> See what really worked.

A free, self-hosted marketing intelligence workspace for Indian D2C brands that sell on their own site, Amazon, Flipkart, Nykaa and quick commerce. Built entirely on free tiers (Cloudflare Workers, GitHub Actions, Google APIs with no billing account). Nothing in this stack needs a credit card.

**Status:** under construction, milestone by milestone (see [CHANGELOG.md](CHANGELOG.md)).

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
