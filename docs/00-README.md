# PreQL Presents Drishti

> See what really worked.

**Document set version:** 1.2 · **Date:** 20 Oct 2026 · **Status:** Ready for build · **Owner:** PreQL, AI & Analytics Club

Drishti is a free, self-hosted marketing intelligence workspace for Indian D2C brands that sell across their own site, Amazon, Flipkart, Nykaa and quick commerce (Blinkit, Zepto, Instamart). It answers three questions every week:

1. **Which rupee really worked?** Ad platforms each claim credit for the same sale, so their totals add up to more than the brand sold. Drishti measures the real (incremental) return of each channel with holdout tests, natural experiments and a light media-mix model, and shows it beside what each platform claims.
2. **What changed around us?** Rival prices, ratings and reviews on the marketplaces, our share of search, stockouts, and what customers say in reviews.
3. **What should we do now, and did it pay off?** Every screen ends in suggested actions with buttons that do something: run a change through an API, prepare a ready-to-upload file, start a test, set a rule, or assign a task. Every action is logged, measured against its expected impact, and reported on the Actions screen.

It is built entirely on free tiers with no credit card anywhere: Cloudflare Workers (app, API, D1, KV, Workers AI), GitHub (code, CI, scheduled sync jobs) and Google (Sheets, Drive, Sign-In). The brand's data stays in the brand's own Google and Cloudflare accounts.

---

## 1. How to use this document set with Claude Code

1. Put this whole pack in an empty folder: `docs/` (this set), `sample-data/`, `design/` and `brand/`, or put the single combined file `PreQL-Drishti-SPEC.md` at the repo root together with `sample-data/` and `design/`.
2. Open Claude Code in that folder.
3. Paste the **First prompt** from `14-SETUP-RUNBOOK.md` §9. It creates the GitHub repo, scaffolds the monorepo, builds milestone M0 and deploys the demo.
4. Work one milestone per session (M0 → M10). Each milestone has a "done when" test in `14-SETUP-RUNBOOK.md` §8. Claude Code runs the tests and the end-to-end suite before calling a milestone done.
5. When a decision in these docs conflicts with something Claude Code discovers (a changed limit, an API change, a library problem), Claude Code stops, explains, and proposes an edit to the relevant doc before changing code. The docs stay the source of truth.

**Rules for Claude Code that apply to every file in this set**

- **Free only.** Never add a payment method, never upgrade a plan, never use a paid API or a paid tier. If a step would require a card, stop and say so.
- **Allowed services:** GitHub (repo, Actions), Cloudflare (Workers, Static Assets, D1, KV, Workers AI, Cron Triggers), Google Cloud with no billing account (Sheets API, Drive API, Calendar API, Google Identity Services), Shopify Partners development store, and optionally Meta for Developers (development mode) and a Slack incoming webhook. Vercel Hobby (free, no card) is allowed only as a mirror of the public static pages (decided 20 Oct 2026, `05-SYSTEM-DESIGN.md` §14). npm packages bundled into the code are fine. Nothing else.
- **No automated visits to marketplaces.** Amazon, Flipkart, Nykaa and quick-commerce pages are only read when a person opens them and clicks Capture in the extension. Rival brands' own websites may be read on a schedule only when their `robots.txt` allows it (`11-CONNECTORS.md` §6).
- **Numbers come from code, not from the AI.** All counting, metrics, models and expected impacts are plain TypeScript in `packages/engine`. Workers AI only classifies review text and drafts words (briefs, replies, narrative polish).
- **Every user-facing string** comes from the copy deck in `09-FRONTEND.md` §10 so it can be edited in one place.
- **Every action button must do something real** (`10-ACTIONS.md`). No button may only change its own colour.
- **Match the designs.** `design/screens/*.png` and `design/static-html/*.html` are the visual truth for layout, spacing, type and colour in both light and dark mode. Visual regression tests compare against them (`12-QA-AND-METRICS.md` §5).

---

## 2. Document map

| File | What it covers |
| --- | --- |
| `00-README.md` | This file: product in one page, how to build with Claude Code, map, glossary, name |
| `01-PRD.md` | Problem, market, personas, goals, scope, functional and non-functional requirements, metrics, risks |
| `02-USER-JOURNEYS.md` | Persona journeys and step-by-step happy flows, including the recruiter demo journey |
| `03-EXCEPTIONS.md` | Unhappy paths, issue flows, error code catalog and recovery |
| `04-ADMIN.md` | Roles, permissions, approvals, settings, audit, secrets, data deletion, club handover |
| `05-SYSTEM-DESIGN.md` | Architecture, free-tier budget, components, sync pipeline, refresh model, action engine, security |
| `06-DATA-MODEL.md` | Canonical fact tables, Google Sheet tab contracts, D1 schema, KV keys, snapshot JSON schema |
| `07-API.md` | Protocols (auth, sessions, idempotency, internal HMAC) and every endpoint |
| `08-METHODS.md` | KPI formulas, incrementality, sales bridge, market analytics, k-means, review analysis, recommendations, AI prompts |
| `09-FRONTEND.md` | Design system (light and dark tokens), layout, components, all eight screens, states, accessibility, copy deck |
| `10-ACTIONS.md` | The action engine: every button, its executor, inputs, outputs, approval, undo and measurement |
| `11-CONNECTORS.md` | Every data source: how it is obtained, file detection, mapping, freshness, the extension, rival sites, sample data |
| `12-QA-AND-METRICS.md` | Test strategy, golden numbers, visual regression, event catalog, metric definitions, release checklist |
| `13-STRATEGY-AND-KRAS.md` | Phased plan, key result areas with targets, team roles, showcase and pilot plan |
| `14-SETUP-RUNBOOK.md` | Accounts with no card, who logs in where, repo to deploy step by step, milestones, first prompt |

**Other folders in the pack**

| Folder | Contents |
| --- | --- |
| `sample-data/demo/` | Canonical fact tables for the fictional brand Lumora Skin, 1 Apr 2025 to 16 Oct 2026. Drives demo mode and tests |
| `sample-data/inbox/` | Raw-format files as they land in the Drive Inbox, one per source, for parser tests |
| `sample-data/workspace/` and `Drishti-Workspace-Template.xlsx` | The Google Sheet template: every tab with sample rows. Import the xlsx into Google Sheets |
| `sample-data/expected/expected_metrics.json` | Golden numbers computed with plain pandas, plus test tolerances and the effects planted in the data |
| `design/screens/` | 16 PNGs: eight screens in light and dark at 1440×900 |
| `design/static-html/` | The same 16 screens as static HTML with exact inline styles |
| `design/prototype-source/` | The interactive prototype source (`.dc.html`) for reference on behaviour |
| `brand/` | Logo mark SVGs (navy and white grounds), app icon, favicon, logo boards |

Live design canvases (private to the owner until shared): the dashboard prototype "Drishti Dashboard" and the "Drishti Logo" canvas.

---

## 3. The product in one picture

```
           Your accounts (free)                      Drishti (free, your deployment)
 ┌───────────────────────────────┐        ┌────────────────────────────────────────────┐
 │ Google Sheet "Drishti         │◄──────►│ Sync job (GitHub Actions, every 6 h + on   │
 │ Workspace": settings, watch-  │        │ demand): read Sheet + Drive Inbox + APIs,  │
 │ list, creators, actions log   │        │ parse, normalise, run models, write        │
 │ Drive "Drishti Inbox": CSVs   │───────►│ facts + snapshot to KV, status to D1       │
 │ Shopify (read-only key)       │───────►│                                            │
 │ Meta / Google Ads (read)      │───────►│ Worker (Cloudflare): web app, sign-in,     │
 └───────────────────────────────┘        │ API, action engine, cron reminders, AI     │
 ┌───────────────────────────────┐        │                                            │
 │ Chrome extension: Capture on  │───────►│ D1: users, actions, rules, tests, audit    │
 │ marketplace pages you open    │        │ KV: snapshots, facts, caches               │
 └───────────────────────────────┘        └────────────────────────────────────────────┘
                                                        │ actions
                                                        ▼
                     Shopify API · Meta API · Drive Outbox files · Calendar · Slack · Sheet log
```

---

## 4. Glossary

| Term | Meaning in Drishti |
| --- | --- |
| Claimed revenue / claimed ROAS | What an ad platform reports its ads drove, using its own attribution window |
| Real (incremental) revenue | Sales that would not have happened without the ad, measured by experiments and models |
| True ROAS | Real revenue per rupee of spend. Shown as "₹ per ₹100" on screens |
| Holdout / geo test | Switching a channel off (or down) in some cities and comparing with similar cities that kept it |
| Synthetic control | A weighted blend of untouched cities that tracked the test cities before the test; the "what would have happened" line |
| Natural experiment | An unplanned change that works like a test: a billing lapse, a stockout, a sudden burst of spend |
| Sales bridge | The chart that splits this week's revenue change into its causes |
| Price per 10 ml | Price normalised by pack size so different pack sizes compare fairly |
| Search share | Our share of purchases (or clicks) for a search term on Amazon, from Brand Analytics |
| Customer type (segment) | A k-means cluster of own-site buyers by how they buy |
| Preferred / problem type | The segment with the best value-to-cost / the one with the worst discount, cash-on-delivery and return mix |
| LTV, 12-month value | Net revenue (or margin, where costs are known) from a buyer in their first 12 months |
| CAC | Cost to acquire a new buyer (see `08-METHODS.md` §2 for the exact formula) |
| RTO | Return to origin: a cash-on-delivery order refused or undeliverable |
| Action | Something Drishti does when a person presses a button: execute, prepare, test, rule, task, draft |
| Readout | The scheduled moment when Drishti measures an action or test against its expected impact |
| Hit rate | Share of measured actions that delivered at least half their expected impact |
| Snapshot | One versioned JSON document with everything the screens show, computed by the sync job |
| Drive Inbox | A Google Drive folder where platform exports are dropped; the sync job reads and archives them |
| Workspace Sheet | The Google Sheet that holds settings and inputs people edit, and the logs Drishti writes |
| Demo mode | The public `/demo` route with fictional Lumora Skin data and simulated actions |
| Lumora Skin | The fictional brand used in all designs, sample data and tests |

---

## 5. Name

The full name is **PreQL Presents Drishti**. Drishti (दृष्टि) means sight, vision, or a focused gaze. In yoga it is the point the eyes rest on to keep balance, which matches the product: one clear point of focus in a noisy marketing week. It reads easily across India, is short, and carries the PreQL red full stop as `drishti.`

The logo is the **lift eye**: an eye whose lower lid turns into a rising line, with a red pupil. Sight and growth in one stroke; the red pupil is the rupee that really worked. Files are in `brand/`. Wordmark rules: always lowercase, Archivo weight 900, full stop always red (`#FF2E2E` on navy, `#E0101A` on white).

---

## 6. What "done" looks like

- A public home page at `https://drishti.<your-subdomain>.workers.dev/` that explains what Drishti is and offers three ways in: open the demo, try it with your own files (sandbox, no login), or set up a workspace (guided onboarding with a downloadable template and sample files).
- A public demo at `https://drishti.<your-subdomain>.workers.dev/demo` that a recruiter can open with no login and click through all eight screens in light and dark mode, with every action button producing a visible, logged result.
- A private workspace at `/` that signs in with Google, syncs a real Google Sheet and Drive Inbox (seeded from the sample data), shows the same screens on synced data, and runs real actions against a Shopify development store, Google Drive, Google Calendar and Slack.
- Green CI: unit, contract, golden, API, end-to-end, accessibility and visual regression suites.
- Zero spend, zero payment methods on file.
