# PreQL Presents Drishti — Complete Specification

> One file containing every document in `docs/`, in order. Sample data, designs and brand files are in the build pack folders.

## Contents

- `00-README.md` — PreQL Presents Drishti
- `01-PRD.md` — 01 · Product Requirements
- `02-USER-JOURNEYS.md` — 02 · User Journeys and Happy Flows
- `03-EXCEPTIONS.md` — 03 · Exceptions, Unhappy Paths and Error Codes
- `04-ADMIN.md` — 04 · Admin: Roles, Approvals, Settings, Audit and Handover
- `05-SYSTEM-DESIGN.md` — 05 · System Design
- `06-DATA-MODEL.md` — 06 · Data Model
- `07-API.md` — 07 · API and Protocols
- `08-METHODS.md` — 08 · Methods: Metrics, Models and AI
- `09-FRONTEND.md` — 09 · Frontend: Design System, Screens and Copy
- `10-ACTIONS.md` — 10 · The Action Engine
- `11-CONNECTORS.md` — 11 · Connectors and Data Sources
- `12-QA-AND-METRICS.md` — 12 · QA, Tests and Metrics
- `13-STRATEGY-AND-KRAS.md` — 13 · Phased Strategy Plan and Key Result Areas
- `14-SETUP-RUNBOOK.md` — 14 · Setup Runbook: From Empty Folder to Deployed and Tested



---

<!-- file: docs/00-README.md -->

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



---

<!-- file: docs/01-PRD.md -->

# 01 · Product Requirements

## 1. Problem

### 1.1 The level-3 problem

Indian D2C brands in beauty, personal care, eyewear, audio and home (Nykaa's own brands, boAt, SUGAR, Lenskart, Wakefit, Mamaearth, Purplle and hundreds of smaller ones) spend 25 to 40 percent of revenue on marketing across Meta, Google, Amazon Ads, Flipkart Ads, quick-commerce ads and creators. Three problems sit underneath the visible "we need better dashboards" complaint:

1. **Everyone claims the same sale.** Meta, Google and Amazon each count a sale if their ad was seen or clicked within their window. In the fictional Lumora data, platforms claim ₹22.0 Cr of revenue in a month where the brand sold ₹18.1 Cr in total. Budgets get moved on claimed ROAS, so money flows to channels that are good at claiming (retargeting, brand search) rather than at creating demand. Creators are the opposite: under-credited because links catch a fraction of their effect.
2. **The market moves faster than the weekly report.** A rival cuts price 18 percent on Amazon, search share drops a point in a week, a pump defect drags the rating, 38 dark stores in Mumbai run out of stock. Each is visible somewhere (Seller Central, Brand Analytics, reviews, a partner portal) but nobody stitches them into "revenue fell 6.5 percent, and here is why". Category managers spend hours a week copying rival prices and ratings into sheets.
3. **Actions disappear.** A team decides to match a price, cap discounts or shift budget. Nobody records the expected impact, so nobody checks whether it worked. The next debate starts from opinion again.

### 1.2 Why existing tools leave a gap

| Need | What brands use today | Gap |
| --- | --- | --- |
| Real channel ROI | Platform dashboards; global attribution and incrementality tools (for example Northbeam, Triple Whale, Haus, Recast, Measured; Lifesight is Indian-founded) | Priced for large budgets, built around Shopify-first US brands, weak on Amazon, Flipkart and quick commerce, and rarely run continuous geo tests for mid-size Indian brands |
| Marketplace intelligence | Manual sheets; digital-shelf tools (for example DataWeave, 1DigitalStack) | Paid, enterprise sales cycles, not connected to ad spend or own-site customers |
| Customer types | Shopify reports, CRM tools | Descriptive only; not tied to acquisition cost or channel |
| Review insight | Reading reviews, generic social listening | Not split by aspect, not tied to batches or listings |
| Action follow-through | Slack threads, slides | No expected impact, no readout, no hit rate |

(Tool names are for positioning only; their pricing and features were not verified for this document.)

### 1.3 Who feels it, in their words

- **CMO:** "Platforms say we made 4x. Finance says we lost money. I need one number I can defend."
- **Performance marketer:** "I know retargeting is inflated. I can't prove it without a test, and setting up a test takes a week of spreadsheet work."
- **Category manager (marketplaces):** "Every Monday I open 40 product pages and copy prices into a sheet."
- **Marketing analyst:** "I spend Thursday and Friday stitching exports. By the time the deck is ready the week has moved."

## 2. Product vision and value proposition

**For** marketing and category teams at Indian D2C brands selling on their own site, marketplaces and quick commerce,
**who** need to know which rupee worked and what to do next,
**Drishti** is a free, self-hosted marketing intelligence workspace
**that** measures real channel returns, tracks the market around each product, groups customers by how they buy, reads reviews by aspect, and turns each finding into a one-click action that is logged and measured.
**Unlike** platform dashboards and paid attribution tools, it is built for India's channel mix (Amazon, Flipkart, Nykaa, Blinkit, Zepto, Instamart), runs at zero cost on the brand's own accounts, and closes the loop from insight to action to measured result.

**Showcase goal (for PreQL):** a working product that a recruiter or brand leader can open, understand in two minutes, and see enterprise-level depth: causal measurement, market intelligence, segmentation, text analytics and an action engine.

**Company goal (added 20 Oct 2026):** become the measurement and action layer for India's multichannel D2C brands. The free, self-hosted product is the distribution and trust engine; revenue comes from a hosted Drishti Cloud and from measurement studies (§11). The showcase goal stays: the same demo serves recruiters, brands and investors.

## 3. Personas

| Persona | Role | Goals | Pain today | Screens they live on |
| --- | --- | --- | --- | --- |
| Aditi, CMO (Owner, Approver) | Owns the ₹5–7 Cr monthly budget | Defensible ROI, fast weekly decisions | Conflicting numbers from platforms and finance | This week, Impact and ROI, Actions |
| Kabir, performance marketer (Editor) | Runs Meta, Google, Amazon Ads | Move budget to what really works; prove it | No easy way to run and read tests | Impact and ROI, Performance, Actions |
| Priya, category manager (Editor) | Owns marketplace P&L for serums | React to rivals, protect search share and rating | Manual price tracking; slow to spot rival moves | Market, Customer voice, This week |
| You, marketing analyst (Analyst) | Builds the weekly view | Trusted numbers in minutes, not days | Stitching exports | Data sources, every screen |
| Arjun, CRM lead (Editor) | Retention, discounts, campaigns | Grow loyal buyers, stop margin leakage | Segments are descriptive | Customers |
| Rahul, QA and product (Viewer) | Product quality | Spot defects early | Learns from complaints weeks late | Customer voice |
| Recruiter or brand visitor (demo, no login) | Evaluating PreQL members | Understand the product quickly | n/a | Demo of all screens |

## 4. Goals and non-goals

### 4.1 Goals (v1)

- G1. Show real versus claimed return for every paid channel with a confidence label and evidence.
- G2. Explain the week: split revenue change into drivers that together explain at least 80 percent of it.
- G3. Track a watchlist of rival products across Amazon, Flipkart, Nykaa and rival brand sites with price per 10 ml, rating, reviews and changes.
- G4. Group own-site customers into five types and flag the preferred and the problem type with value-to-cost.
- G5. Read reviews by aspect, compare with the category, and surface new and growing complaints with dates.
- G6. Every suggested action executes, prepares, schedules or assigns something real; every action is logged with expected impact and measured at readout.
- G7. Data arrives from Google Sheets, a Google Drive Inbox, Shopify, the extension and rival brand sites, with scheduled and manual refresh.
- G8. Zero cost, no payment method, data in the brand's own accounts.
- G9. Plug and play. A new brand goes from nothing to a working workspace through a guided onboarding with a downloadable template, sample files for every source and live checks. Anyone can try their own files in the browser sandbox with no login and see every screen change immediately.

### 4.2 Non-goals (v1)

- Automated scraping of marketplaces or logged-in portals.
- Paid APIs or paid data providers.
- Writing to Amazon, Flipkart, Nykaa or quick-commerce platforms directly (no free public write APIs; Drishti prepares files and links instead).
- A full Bayesian media-mix model (v1 uses a constrained ridge model calibrated by experiments; Bayesian MMM is Phase 4).
- Mobile-first layout (v1 is desktop 1280–1920 px; phones get a read-only summary in Phase 3).
- Multi-brand agency workspaces (schema is ready; UI in Phase 4).
- A shared multi-tenant hosted service. Drishti scales as **one free deployment per brand** (see §4.3).

### 4.3 Deployment model (decided 19 Oct 2026)

- **One deployment per brand.** Each brand runs its own Drishti on its own free Cloudflare, GitHub and Google accounts, so every brand gets its own free limits, its data never leaves its accounts, and the cost stays ₹0 at any number of brands. Setup is a guided, repeatable path (runbook plus the in-app onboarding wizard), not custom work.
- **The PreQL showcase deployment** serves the home page, the demo, the data guide and the sandbox to anyone, with no login. It holds no brand data.
- **The sandbox** is the plug-and-play path for trying Drishti: files are read and modelled in the visitor's browser by the same engine, so changes show immediately with no sync, no account and no server cost.
- The schema keeps `workspace_id` on every table, so a hosted multi-workspace mode stays possible later without a rewrite.

## 5. Scope by screen

| # | Screen | Question it answers | Core visual | Suggested actions (examples) |
| --- | --- | --- | --- | --- |
| 1 | This week | What moved sales and what do we do? | Sales bridge (drivers in ₹ lakh) | Coupon to match a rival, QA hold, restock, budget shift, discount caps |
| 2 | Actions | What did we do and did it pay off? | Action log with lifecycle and measured vs expected | Approve, undo, open output file |
| 3 | Performance | How are revenue, orders, order value and buyers moving by channel? | Stacked weekly bars by channel, channel table | Channel-specific moves |
| 4 | Impact and ROI | Which rupee really worked? | Claimed vs real sales per ₹100 by channel; CAC and payback by source | Budget shift, brand-search pause test, holdout extension |
| 5 | Market | What did rivals change and where do we sit? | Positioning map (price per 10 ml vs rating) and perception map; similar products table | Coupon, alerts, listing copy, competitor targeting |
| 6 | Customers | Who buys and who costs us? | Customer map by orders a year vs order value; segment table | Lookalike export, discount caps, COD OTP, refill nudge |
| 7 | Customer voice | What do reviews say and what is new? | Net sentiment by aspect, us vs category; growing complaints | QA hold, review replies, listing update, R&D brief |
| 8 | Data sources | Where does every number come from and what is late? | Source table with method, cadence and status | Upload, request file, reminders, privacy mode |

**Entry pages** (outside the eight-screen pattern): Home (`/` when signed out), Onboarding wizard (`/onboarding`), Data guide (`/guide`) and Sandbox (`/try`). See `09-FRONTEND.md` §6.0 and §6.10–6.12.

Every analytical screen follows one pattern, top to bottom: **summary strip** (verdict plus six KPIs with colour-coded change) → **visualisation** → **analysis table** → **inference** ("What this means") → **suggested actions** with execute buttons. No page scrolls at 1440×900.

## 6. Functional requirements

IDs are referenced by tests in `12-QA-AND-METRICS.md`.

### 6.1 Global

- FR-G1. Sign in with Google; access only for emails listed in the Users tab of the Workspace Sheet (roles in `04-ADMIN.md`).
- FR-G2. Public demo at `/demo` with fictional data, no sign-in, actions simulated and logged in the browser only. A banner says "Demo, fictional data".
- FR-G3. Sidebar navigation to all eight screens; workspace name; light and dark mode switch that persists per viewer; footer with last sync time.
- FR-G4. Every screen shows data freshness ("Synced today, 7:10 am") and a "Sync now" control for Owners and Analysts.
- FR-G5. The UI checks for a new snapshot every 60 seconds while visible and updates in place with a short notice.
- FR-G6. Every number shows its definition on hover or focus (title or tooltip) and every insight lists its evidence.
- FR-G7. Good and bad are colour-coded by meaning, not by sign: a rise in CAC or returns is red; a fall is green.
- FR-G8. All money in rupees with Indian grouping (lakh, crore); "₹4.30 Cr", "₹29 L", "₹1,050".

### 6.2 This week

- FR-W1. Summary: verdict (Down week / Up week / Flat) with a one-sentence reason; KPIs: net revenue, orders, order value, ad spend, true ROAS (with claimed beside it), CAC for new buyers; each with change vs prior week and an 8-week sparkline.
- FR-W2. Sales bridge: prior week → drivers → this week, in ₹ lakh, each driver tagged with its channel and colour-coded lost or added; caption "Explains N% of the change".
- FR-W3. Working and Needs attention panels, three items each, generated from the snapshot.
- FR-W4. Inference card: one to two sentences from the top drivers.
- FR-W5. Suggested actions: up to five, ranked by priority (`08-METHODS.md` §9), each expandable to show evidence, with Run, Assign and Evidence controls.

### 6.3 Actions

- FR-A1. Action log for the selected period with title, source screen, owner, status, expected and measured impact.
- FR-A2. Detail: executor type, lifecycle (Suggested → Approved → Running → Measuring → Result), what Drishti did step by step with timestamps, measured against expected with readout date, buttons Approve and run (if waiting and the viewer is an Approver), Undo (if the executor supports it), Open output.
- FR-A3. Summary: waiting count with reason, actions run, expected monthly impact, confirmed so far, hit rate vs 60 percent target, being measured with next readout, overdue.
- FR-A4. The same log is mirrored to the Actions tab of the Workspace Sheet within one minute.

### 6.4 Performance

- FR-P1. Summary: net revenue, orders, order value, customers, orders per buyer, 90-day repeat (28 days vs prior 28).
- FR-P2. Weekly chart with metric tabs (Revenue, Orders, Order value, Buyers); revenue shows stacked bars by channel; last four weeks emphasised.
- FR-P3. Channel table (revenue, growth, orders, AOV, buyers where known, returns) that selects a channel; inference and two actions update to the channel; footer shows share of revenue.

### 6.5 Impact and ROI

- FR-I1. Summary: ad spend, claimed ROAS, true ROAS, real sales from ads, new-buyer CAC, value-to-CAC with target.
- FR-I2. Claimed vs real revenue per ₹100 for each paid channel, selectable, colour of real value by threshold.
- FR-I3. New-buyer cost, 12-month value, value-to-cost and payback by acquisition source.
- FR-I4. Inference per channel with confidence and evidence (which tests or natural experiments), spend, claimed and real totals.
- FR-I5. Running test progress with readout date.

### 6.6 Market

- FR-M1. Summary: our price per 10 ml vs median, rating vs category, reviews and monthly change, search purchase share and change, average discount vs rivals, out-of-stock days.
- FR-M2. Map toggle: price and rating (bubble size = reviews) and "What reviews say" (gentle↔clinical, value↔premium) with the open space shaded.
- FR-M3. Similar products table across platforms with price, 14-day change, price per 10 ml, rating, reviews; selecting a row or bubble updates inference and actions.
- FR-M4. Price changes this week list.
- FR-M5. Capture prices now: opens the extension's capture queue (user-driven) and triggers a rival-site check.

### 6.7 Customers

- FR-C1. Summary: buyers, bought again, 12-month value, preferred-type share, problem-type share, undelivered (RTO) rate.
- FR-C2. Customer map (orders a year vs average order) with sampled dots by type and labelled centroids; preferred blue, problem orange, others grey.
- FR-C3. Type table: share of buyers, share of revenue, AOV, orders a year, repeat, CAC, LTV:CAC; selectable.
- FR-C4. Method note: k-means, five groups, signals used; marketplace buyers excluded.
- FR-C5. Re-run grouping (Analyst): recompute on the latest data with a stability check.

### 6.8 Customer voice

- FR-V1. Summary: rating (90 days) and change, reviews read, positive, negative, top-issue mentions, reply rate vs target.
- FR-V2. Net sentiment by aspect, us vs category, diverging bars, selectable; selected aspect shows two sample quotes with platform and stars.
- FR-V3. New and growing complaints (30 days vs prior 30) with mentions, change, platforms and first-seen date.

### 6.9 Data sources

- FR-D1. Summary: sources up to date (n of N), revenue covered, history, rows stored, third parties (none), cost (₹0).
- FR-D2. Source table: method, cadence, status (up to date, received, n days late); selecting shows how it works, what it feeds, last received, rule, and actions (upload, refresh, remind).
- FR-D3. Privacy mode switch: hides customer names, emails and phones everywhere (on by default).
- FR-D4. Upload a file: drag a CSV or XLSX; it is copied to the Drive Inbox and a sync is queued.

## 7. Non-functional requirements

| ID | Requirement | Target |
| --- | --- | --- |
| NFR-1 Cost | Total spend | ₹0, no payment method on any account |
| NFR-2 Performance | First screen interactive on a mid-range laptop | under 2.0 s on demo; snapshot download under 1.5 MB gzip |
| NFR-3 Performance | Screen switch | under 150 ms (client-side, data already loaded) |
| NFR-4 Freshness | Scheduled sync | every 6 hours by default (3, 6, 12 or 24 configurable); manual sync completes in under 5 minutes |
| NFR-5 Reliability | Sync failure | the last good snapshot keeps serving; failures are shown on Data sources and notified |
| NFR-6 Privacy | Customer personal data | never leaves the brand's Google and Cloudflare accounts; names, emails and phones are not stored in snapshots; hashed IDs only |
| NFR-7 Security | Sessions | HttpOnly Secure cookies, CSRF protection, role checks on every write, HMAC on internal endpoints, secrets only in Cloudflare and GitHub secret stores |
| NFR-8 Accessibility | WCAG 2.2 AA | keyboard reachable, visible focus, 4.5:1 text contrast in both themes, charts with text equivalents |
| NFR-9 Free-tier safety | Usage | daily budget governors keep KV writes under 800, D1 writes under 50,000, Workers AI under 8,000 neurons, Worker requests under 60,000 |
| NFR-10 Explainability | Every model output | shows method, window, evidence and confidence |
| NFR-11 Legality | Data collection | no automated marketplace visits; robots.txt respected; platform terms noted per source |
| NFR-12 Browser support | Desktop | latest Chrome, Edge, Firefox, Safari; 1280 px minimum width (scaled), designed at 1440×900 |

## 8. Success metrics

Product metrics (definitions in `12-QA-AND-METRICS.md` §7; targets and phases in `13-STRATEGY-AND-KRAS.md`):

- Weekly active users per workspace; share of weeks with at least one action run.
- Time from sync to first action (median).
- Action hit rate (measured at least 50 percent of expected): target 60 percent.
- Confirmed impact (₹ per month) from measured actions.
- Data freshness: share of sources within their SLA.
- Analyst hours saved per week (self-reported in pilot, baseline vs after).
- Demo: visitors who reach three or more screens; median time on demo.

## 9. Releases

| Release | Phase | Contents |
| --- | --- | --- |
| R0 Demo | Phase 0 | Home page; all eight screens on sample data, light and dark, simulated actions, public `/demo` |
| R1 Measure | Phase 1 | Sign-in, Workspace Sheet, Drive Inbox, Shopify, sync (scheduled and manual), real snapshot, actions: prepare, task, rule, data, Shopify execute; onboarding wizard, data guide with sample files and file checker, sandbox |
| R2 Act | Phase 2 | Geo test planner and automated readouts, Meta execute, Workers AI review tagging and drafts, extension, rival site watcher, approvals |
| R3 Pilot | Phase 3 | Hardening, phone summary view, two pilot brands, case study |
| R4 Scale | Phase 4 | Multi-workspace, Amazon SP-API and Ads API, Google Ads API, Bayesian MMM |
| R5 Cloud | After funding | Hosted Drishti Cloud (paid tiers in §11) on paid infrastructure; until then every build stays on free tiers |

## 10. Assumptions, risks and mitigations

| Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| Free-tier limits change | Medium | High | Budget governors, limits in one config file, weekly check job, docs list fallbacks (`05-SYSTEM-DESIGN.md` §3) |
| Marketplace terms on data collection | Medium | High | User-initiated capture only; official exports and reports; rival brand sites only where robots.txt allows |
| Incrementality estimates are noisy | High | Medium | Confidence labels, intervals, experiment-first evidence hierarchy, never show a point estimate without its range on hover |
| Brands won't share data with students | Medium | High | Self-hosted on their accounts; demo-first showcase; pilot with smaller brands and alumni contacts |
| Platform export columns change | High | Medium | Header-signature detection plus the Mappings tab for overrides; contract tests; clear SCHEMA_MISMATCH errors |
| Meta app permissions | Medium | Low | Read via CSV exports in Phase 1; API execution only in development mode on own ad account |
| GitHub disables scheduled workflows in inactive public repos after 60 days | Medium | Medium | Keepalive workflow commits a heartbeat monthly; Data sources warns when the last scheduled sync is older than 26 hours |
| No revenue model an investor accepts | High | High | Open-core model in §11; validate willingness to pay with letters of intent from design partners before raising (`13-STRATEGY-AND-KRAS.md` KRA 8) |
| Free self-hosted version cannibalises Cloud | Medium | Medium | Cloud sells time and certainty (managed official-API connectors, multi-brand, measurement studies, support), not features hidden from the free version |
| Ownership and IP unclear (built as a PreQL club project) | High | High | Founders and the club agree ownership, licence and contributor terms before any investor conversation (§11.8); owner: founders |
| Measurement credibility challenged by an investor or a pilot | Medium | High | Milestone M6 moved forward (`14-SETUP-RUNBOOK.md` §8); every estimate shows its range and evidence; one geo test per design partner |
| Google Sheets API quota overage billing (announced for later in 2026) | Low | Medium | Usage is tiny (under 50 requests per sync); throttle to 30 requests per minute; no billing account means no charges can apply |

## 11. Business model and go-to-market (decided 20 Oct 2026)

Numbers in this section marked *hypothesis* are starting points to test with design partners, not market data.

### 11.1 Customer

- **Design partners (Phase 3):** Indian D2C brands with ₹5–100 Cr annual revenue that sell on their own site and Amazon plus at least one of Nykaa, Flipkart or quick commerce (`13-STRATEGY-AND-KRAS.md` Phase 3).
- **First paying customers (hypothesis):** brands spending ₹25 L or more a month on ads across at least three platforms, where a 10% budget misallocation costs more each month than the subscription.
- **Buyer:** the CMO or founder (persona Aditi). **Daily users:** performance marketer, category manager, analyst.

### 11.2 Offer ladder

| Tier | What the brand gets | Runs on | Price |
| --- | --- | --- | --- |
| **Community** | The full product, self-hosted on the brand's own Cloudflare, GitHub and Google accounts; community support | Brand's free tiers | Free, always |
| **Drishti Cloud** | Hosted and kept up to date by Drishti; managed official-API connectors (Amazon SP-API and Ads API, Google Ads, Meta); multiple brands per login; SSO; support with a response time | Drishti's paid infrastructure (after funding, R5) | *Hypothesis:* ₹25,000 to ₹1,50,000 a month, banded by monthly ad spend |
| **Measurement study** | A designed geo test or natural-experiment readout with a written report and a budget recommendation | Either tier | *Hypothesis:* ₹1.5–3 L per study |
| **Agency** | Cloud for agencies running many brands, with a client view | Drishti Cloud | *Hypothesis:* per brand per month, volume-discounted |

### 11.3 Why open core

- **Trust:** a brand can try Drishti without sending its data anywhere; data stays in its own accounts.
- **Zero marginal cost** for Community, so free users never burn cash.
- **Distribution:** PreQL, alumni and D2C founder communities, and agencies can deploy it without a sales call.
- **Upgrade trigger:** keeping connectors, exports and tests running takes analyst time; Cloud sells that time back, plus certainty from measurement studies.

### 11.4 Go-to-market

1. **Land:** founder-led outreach to design partners; set up in under an hour on a call; first insight readout within 72 hours (Phase 3).
2. **Prove:** one geo test or natural-experiment readout per partner; at least five measured actions; publish the hit rate.
3. **Convert:** offer Cloud and a measurement study to partners with a measured win; ask for a letter of intent at a price point.
4. **Scale:** agencies as resellers; case studies; the public demo and method write-ups as inbound.

### 11.5 Unit economics (hypotheses)

- Community costs Drishti ₹0 to serve.
- Cloud gross margin target 80% or more: per-brand compute is small (the free-tier budget in `05-SYSTEM-DESIGN.md` §3 shows one brand fits in free limits); support and onboarding are the main cost.
- Payback: a measurement study pays for itself if it moves 2–3% of a ₹50 L monthly ad budget to a channel with a measurably higher real return.

### 11.6 Defensibility

- **India channel coverage:** parsers and adapters for Amazon, Flipkart, Nykaa, Blinkit, Zepto and Instamart exports, kept current as columns change.
- **Experiment library:** with each brand's consent and anonymised, test readouts become priors that make every new brand's measurement faster and tighter.
- **Action loop data:** expected versus measured impact per action type, which turns into better suggestions and a published hit rate.

### 11.7 Investor demo scope

The investor and design-partner demo leads with four screens, polished first in milestone M3: **This week**, **Impact and ROI**, **Market** and **Actions**. The other four screens follow in the same milestone.

### 11.8 Open decisions (owner: founders)

| Decision | Options | Needed before |
| --- | --- | --- |
| Ownership and IP between the founding team and PreQL | Spin-out company with a licence or assignment from the club; club keeps a showcase licence | Any investor conversation |
| Code licence for the public repo | MIT; AGPL-3.0 (copyleft keeps hosted forks open); a source-available licence for Cloud-only parts | Next public release (the repo currently has no LICENSE file, so all rights are reserved) |
| Company entity and founders' time commitment | — | Fundraise |



---

<!-- file: docs/02-USER-JOURNEYS.md -->

# 02 · User Journeys and Happy Flows

Each journey lists the trigger, the steps (who does what, what the system does), the end state, and the tests that cover it (IDs from `12-QA-AND-METRICS.md`). Unhappy paths are in `03-EXCEPTIONS.md`.

## J0. Recruiter opens the demo (showcase journey)

**Persona:** recruiter or brand leader with the link. **Goal:** understand Drishti in two minutes.

| # | Who | Step | System |
| --- | --- | --- | --- |
| 1 | Visitor | Opens `/` and reads the home page (what Drishti is, the three questions, how it works), then clicks "Open the demo" (or opens `/demo` directly) | Loads `demo/snapshot.json` from static assets; renders This week in the viewer's system theme |
| 2 | Visitor | Reads the verdict "Revenue fell 6.5% to ₹4.30 Cr. ₹29 L of the drop is fixable." | Summary strip with colour-coded KPIs and sparklines |
| 3 | Visitor | Hovers a bridge bar ("Rival B price cut −16") | Tooltip with method and evidence |
| 4 | Visitor | Clicks Create coupon on the first action | Card expands into a confirm step listing what will happen; visitor clicks Run; steps tick; card shows "✓ Coupon file ready · View in Actions"; the coupon CSV downloads |
| 5 | Visitor | Clicks Action log | Actions screen shows the new action at the top with status Running and the steps it performed (simulated in demo, stored in browser memory) |
| 6 | Visitor | Visits Impact and ROI, clicks Creators | Inference changes: "Under-credited by three times…" |
| 7 | Visitor | Switches to Dark | Every screen re-themes; choice remembered in this browser |
| 8 | Visitor | Opens Data sources | Sees exactly how each number is obtained, and "Cost ₹0, no paid APIs" |

**End state:** visitor has seen measurement, market, customers, voice, actions and data provenance. Covered by E2E-01 to E2E-08.

## J1. First-time setup (Owner, about 45 minutes, once)

**Persona:** Aditi (or the club member deploying for a brand). Detailed console steps are in `14-SETUP-RUNBOOK.md`.

| # | Who | Step | System |
| --- | --- | --- | --- |
| 1 | Owner | Deploys Drishti (Claude Code does this from the runbook) | Worker live at `https://drishti.<subdomain>.workers.dev` |
| 2 | Owner | Opens Drishti, clicks "Set up your workspace" on the home page, signs in with Google | First user whose email equals `OWNER_EMAIL` secret becomes Owner; the onboarding wizard (`/onboarding`) opens at step 1 |
| 3 | Owner | Wizard step 1: downloads the template sheet and imports it into Google Sheets (the step shows how, with the "File → Import" path) | Template served from `/samples/Drishti-Workspace-Template.xlsx` |
| 4 | Owner | Wizard step 2: creates Drive folders "Drishti Inbox", "Drishti Outbox" and "Drishti Archive"; step 3: shares the Sheet and folders with the service account email (Copy button) as Editor | Wizard shows the email and the exact sharing clicks |
| 5 | Owner | Wizard step 4: pastes the Sheet URL and folder URLs | Worker validates access with the service account; green ticks or the exact sharing fix per link |
| 6 | Owner | Enters the Shopify store domain; pastes the Admin API token (or skips) | Token stored encrypted in D1 (AES-GCM with `DATA_KEY` secret); test call lists shop name |
| 7 | Owner | Fills Users tab with teammates and roles | Next sync loads users; teammates can sign in |
| 8 | Owner | Wizard step 6: opens the data guide to see which exports each source needs (sample file per source, "Check my file" before uploading), drops the first exports into the Drive Inbox (or uses the sample files) and clicks Sync now | Sync job runs (2–4 min), files parsed and archived, snapshot built; status per source turns green |
| 9 | Owner | Opens This week | Real numbers |

**End state:** workspace live, users invited, first snapshot built. Covered by E2E-20, E2E-22 (staging), API-01..05, SYNC-01..06.

## J1b. Trying Drishti with your own files (anyone, no login, 5 minutes)

**Persona:** a brand founder or showcase visitor who wants to see their own numbers before setting anything up.

| # | Who | Step | System |
| --- | --- | --- | --- |
| 1 | Visitor | Clicks "Try with your own data" on the home page | Sandbox (`/try`) explains that files stay in this browser |
| 2 | Visitor | Downloads the template sheet or any sample file from the data guide, fills it with their own data (or exports from Shopify, Amazon, Meta…) | Static files from `/samples/` |
| 3 | Visitor | Drops the filled `.xlsx` and/or export CSVs on the sandbox | Engine in a Web Worker detects each file's source, parses it, lists what it found and what is missing |
| 4 | Visitor | Clicks "Show my screens" | Engine builds a snapshot in the browser; all eight screens render with the visitor's numbers; screens without enough data show what to add |
| 5 | Visitor | Edits a file and drops it again | Screens update immediately |
| 6 | Visitor | Clicks "Set up your workspace" to keep it running | Onboarding wizard |

**End state:** the visitor has seen their own data in Drishti without an account. Nothing was uploaded. Covered by E2E-24.

## J2. Monday review (CMO, 10 minutes)

**Trigger:** Monday 7:10 am sync finishes; Slack message "Drishti: week of 5–11 Oct ready. Revenue −6.5%. 5 suggested actions."

| # | Who | Step | System |
| --- | --- | --- | --- |
| 1 | Aditi | Opens This week | Verdict, KPIs, bridge, working and attention items, inference |
| 2 | Aditi | Expands "Match Rival B on Amazon, 30 ml only" | Evidence: Rival B now ₹150 per 10 ml vs ₹183; Amazon units for the product fell 14% since 3 Oct; confidence medium |
| 3 | Aditi | Clicks Assign, picks Priya | Action created with status Suggested → Assigned; Priya gets Slack and calendar notice |
| 4 | Aditi | Clicks Apply budget shift on "Move ₹30 L to stronger channels" | Over threshold: status Waiting for approval; since Aditi is Approver she is asked to confirm in the same card |
| 5 | Aditi | Confirms | Budget sheet generated in Drive Outbox (new split by channel and city), Meta budget changes executed if Meta is connected (Phase 2) or prepared as a checklist; readout booked for 4 weeks later |
| 6 | Aditi | Opens Actions | Sees both actions, owners and readout dates |

**End state:** two actions live with expected impact and readout dates. Covered by E2E-09..12, ACT-01..08.

## J3. Responding to a rival price cut (Category manager)

**Trigger:** Rule R02 fires at the 6 am sync: "Rival B cut price 18% on Amazon (₹549 → ₹449)". Slack and in-app notice.

| # | Who | Step | System |
| --- | --- | --- | --- |
| 1 | Priya | Opens Market from the notice | Rival B selected; map shows Rival B moved left; table shows ▼18% |
| 2 | Priya | Reads inference: "High threat: took 1.2 points of your search share; rating also higher" | Evidence from Brand Analytics weekly search share and captures |
| 3 | Priya | Clicks Create coupon (12% Amazon coupon) | Confirm lists: build coupon file for the 30 ml ASIN, open Seller Central Coupons, log, book readout in 21 days |
| 4 | Priya | Clicks Run | Coupon CSV saved to Drive Outbox and downloaded; Seller Central coupons page opens in a new tab; action status Waiting for you |
| 5 | Priya | Creates the coupon in Seller Central, returns, clicks "I've done it" | Status Running → Measuring; readout uses forecast vs actual units for the ASIN on Amazon with other channels as control |
| 6 | System | Day 21 readout | Measured impact written; hit or miss; Slack summary |

**End state:** price response executed and measured. Covered by E2E-13, ACT-10, MET-05.

## J4. Launching a geo test and reading it out (Analyst or performance marketer)

**Trigger:** Impact screen shows Google brand search "confidence medium"; suggested action "Pause brand search in 4 test cities".

| # | Who | Step | System |
| --- | --- | --- | --- |
| 1 | Kabir | Clicks Launch test | Confirm shows the plan: test cities (Jaipur, Lucknow, Indore, Kochi) chosen by matching, control by synthetic control, 14 days, minimum detectable effect, expected cost of the test |
| 2 | Kabir | Adjusts duration to 21 days (optional) and runs | Test row created (D1 and Tests tab); exclusion list CSV for Google Ads saved and downloaded; checklist "Add these cities as excluded locations in campaign Brand \| Lumora" |
| 3 | Kabir | Applies exclusions in Google Ads, clicks "I've done it" | Status Running; daily progress bar on Impact screen |
| 4 | System | Each sync | Checks spend in test cities actually dropped (guard: if not, warns "Test not applied") |
| 5 | System | Readout date | Synthetic control estimate with interval; Impact screen updates Google's real return and confidence to high; action result posted |

**End state:** evidence upgraded; future budget suggestions use it. Covered by MOD-03, MOD-04, E2E-14.

## J5. Review crisis (Customer voice)

**Trigger:** Rule R03: pump mentions above 5% of new reviews for 7 days.

| # | Who | Step | System |
| --- | --- | --- | --- |
| 1 | Priya or Rahul | Opens Customer voice | Pump and packaging selected: −38 vs category +5; quotes; "first seen 21 Sep" |
| 2 | Rahul | Clicks Raise QA hold | QA hold note (Google Doc) in Drive Outbox with complaint count, dates, platforms, sample quotes, batch inference; task assigned to Rahul with due date; Slack |
| 3 | Priya | Clicks Draft replies | Workers AI drafts replies for the 380 pump reviews using the reply guide (offer free replacement, no admission language beyond policy); saved as a sheet in Outbox for review and copy-paste into each platform |
| 4 | System | Daily | Tracks pump share in new reviews; action measured on rating and pump share at 6 weeks |

Covered by AI-01..04, ACT-14, E2E-15.

## J6. Segment campaign (CRM lead)

| # | Who | Step | System |
| --- | --- | --- | --- |
| 1 | Arjun | Opens Customers, selects Deal Hunters | Inference: 31% of buyers, 17% of revenue, discount 61%, COD 72%, 18% RTO |
| 2 | Arjun | Clicks Apply caps | Confirm: lists the Shopify discount codes used by this group above 15% (GLOW20, FEST25, MEGA30) and the change to 15%; saves old values for undo |
| 3 | Arjun | Runs | Shopify Admin API updates the codes (development store in demo deployments); action Measuring with readout in 3 weeks |
| 4 | Arjun | Selects Routine Loyalists, clicks Export audience | Action runner builds a hashed (SHA-256 normalised email and phone) audience CSV for Meta Custom Audiences, saved to Outbox; no raw personal data leaves Shopify or Drive |

Covered by ACT-20..23, E2E-16.

## J7. Late file (Analyst)

| # | Who | Step | System |
| --- | --- | --- | --- |
| 1 | System | 6 am sync | Flipkart Ads last received 11 Oct; SLA daily; status "5 days late"; Data sources summary "Two gaps"; Flipkart figures marked low confidence on Impact |
| 2 | Analyst | Opens Data sources, selects Flipkart Ads, clicks Set reminder | Daily 9 am Slack reminder to the Ads team until a file arrives |
| 3 | Ads team | Drops five files in the Drive Inbox | Next sync detects them by header signature, parses, archives; status Received |

Covered by SYNC-07, CON-06.

## J8. Uploading an export directly (any Editor)

1. On Data sources, click Upload a file and pick `amazon_business_report_daily.csv`.
2. Worker streams it to the Drive Inbox (Drive API resumable upload via the service account) and dispatches a sync.
3. Banner "Received. Sync running, about 3 minutes."
4. When the snapshot updates, the banner changes to "Updated with 1 file".

## J9. Extension capture (Category manager)

1. Priya installs the extension (load unpacked, see `11-CONNECTORS.md` §7) and signs in once (it opens Drishti and receives a capture token).
2. She opens Rival C's Amazon page. The extension icon shows a dot: this URL is on the watchlist.
3. She clicks Capture. The extension reads price, MRP, rating, review count, stock and the visible top reviews from the page she is viewing, and posts them to `/api/capture`.
4. The Market screen shows the new capture immediately (merged from D1 until the next snapshot).
5. "Capture all 7" opens the watchlist pages one by one in her browser; she clicks Capture on each. Nothing is fetched without her.

## J10. Approver flow

1. Kabir (Editor) runs a ₹18 L budget action. Threshold ₹10 L, so status becomes Waiting for approval.
2. Aditi gets a Slack message and sees "1 waiting on you" on Actions.
3. She opens it, reads expected impact and evidence, clicks Approve and run, or Decline with a reason.
4. Approved actions run immediately; declined actions close with the reason logged.
5. Approvals expire after 7 days (status Expired; notify the requester).



---

<!-- file: docs/03-EXCEPTIONS.md -->

# 03 · Exceptions, Unhappy Paths and Error Codes

## 1. Principles

1. **Never show a wrong number confidently.** If an input is late, partial or failed, the number is still shown when it is safe, but its confidence drops and a note says why ("Flipkart figures are less certain: ads file 5 days late").
2. **The last good snapshot keeps serving.** A failed sync never blanks a screen.
3. **Every error has a next step** for the person who sees it, in plain words, from the copy deck.
4. **Partial success is reported as such.** An action that changed 2 of 3 discount codes says so and lists the third.
5. **Free-tier limits degrade gracefully**: slower polling, deferred AI, queued work, never a crash.

## 2. Issue flows

### 2.1 Sync problems

| Situation | Detection | What the user sees | System behaviour | Recovery |
| --- | --- | --- | --- | --- |
| Sheet not shared with the service account | Sheets API 403/404 at step 3 | Data sources: red banner "Drishti can't open your Workspace Sheet. Share it with {sa_email} as Editor." | Sync fails `SHEET_NOT_SHARED`; previous snapshot stays | Share; Sync now |
| Inbox folder not shared | Drive 404 | Same pattern for the folder | Other sources still sync; Inbox skipped | Share |
| File not recognised | No signature match | Source row "1 file not recognised" + headers found + "Map columns" | File moved to Inbox/Unrecognised | Add mapping rows; drag file back to Inbox |
| Required column missing after detection | Validation | "Amazon business report is missing 'Units Ordered'" | File skipped, kept in Inbox | Re-export with the column or map |
| Bad values (text in numbers, future dates) | Row validation | Warning with count: "12 rows skipped" | Rows skipped; file archived | Fix source if large |
| Duplicate file | Same md5 | Nothing (info in sync log) | Archived without parsing | — |
| Overlapping restated data | Coverage overlap | Nothing | Last 14 days replaced by the newer file | — |
| Source late beyond SLA | Each sync | Status "n days late"; Data sources verdict "Two gaps"; affected KPIs show a note; confidence lowered | Rule R04 notifies | Upload or set reminder |
| Shopify token invalid or scope missing | 401/403 | Data sources: "Shopify connection needs attention" | Shopify step skipped; others continue | Owner re-enters token |
| GitHub dispatch fails (PAT expired) | Worker gets 401/404 | Toast "Couldn't start a sync. An owner needs to renew the GitHub token." | `GITHUB_DISPATCH_FAILED`; scheduled syncs still run | Owner rotates PAT (`04-ADMIN.md` §6) |
| Scheduled workflow disabled (60-day rule) | No scheduled run for > 26 h | Footer amber; Data sources banner "Scheduled sync paused by GitHub" with a link | — | Re-enable workflow; keepalive prevents recurrence |
| Sync timeout (> 20 min) | Job timeout | "Last sync didn't finish" | Lock released after 20 min; snapshot unchanged | Automatic retry next hour; investigate logs |
| Concurrent sync request | Lock held | "A sync is already running (started 2 min ago)" | 409 with current run | Wait |
| Engine error on a model (e.g. singular matrix) | Exception caught per module | That module's panel shows "Couldn't update this today" with the previous values greyed and dated | Other modules publish | Fix in code; next sync |
| Not enough history (< 120 days) | Engine check | Impact shows claimed vs "Not enough history yet. Run a test." | MMM skipped; tests and natural experiments still used | Wait or run a geo test |
| KV daily write limit near | Usage counter ≥ 800 | Data sources note "Saving fewer updates today (free-tier limit)" | Sync writes snapshot only, skips non-changed facts; further manual syncs refused with `FREE_TIER_LIMIT` | Next day |
| D1 write limit near | Counter ≥ 50,000 | Same pattern | Captures and events throttled first | Next day |
| Workers AI budget reached | Counter ≥ 8,000 neurons | Voice: "Reading new reviews with the basic method today" | Lexicon fallback; drafts queued | Next day |

### 2.2 Action problems

| Situation | User sees | System |
| --- | --- | --- |
| Executor fails (network, 5xx) | Card: "Couldn't finish: Shopify didn't respond. Retry" | Auto-retry once; then `failed` with `EXECUTOR_FAILED`; Retry reuses params |
| Partial success | "Changed 2 of 3 codes. MEGA30 wasn't found." | `done` with warning event; undo covers the 2 |
| Connector missing (e.g. Shopify not connected) | Confirm view shows "Shopify isn't connected. Drishti will prepare a checklist instead." | Falls back to prepare where defined; else `CONNECTOR_MISSING` with link to Admin |
| Needs approval | "Waiting for approval from Aditi" | `awaiting_approval`; notify approvers |
| Approval expired (7 days) | Card and Actions: "Expired" | Requester notified |
| Declined | "Declined by Aditi: {reason}" | Closed |
| Undo unavailable (platform action, or data already changed) | Undo button absent; tooltip says why | — |
| Undo conflict (code changed since) | "The code was edited in Shopify after Drishti changed it. Undo skipped for GLOW15." | Partial undo logged |
| Handoff never confirmed | Day 3 reminder; day 7 status "Not confirmed" | No readout scheduled |
| Duplicate click | Same action returned (idempotency) | — |
| Test not applied (spend didn't drop) | Impact: "Test cities still have spend. Check the exclusions." | Alert to owner day 3; test invalid if not fixed by day 5 |
| Readout inconclusive | "Inconclusive: the range includes zero." | Result `inconclusive`; not counted in hit rate denominator |
| Action references stale suggestion (new snapshot changed it) | Confirm view shows "Numbers updated since you opened this" with new values | Uses latest suggestion params |

### 2.3 Auth and access

| Situation | User sees | Code |
| --- | --- | --- |
| Google token invalid or expired | "Sign-in didn't work. Try again." | `AUTH_TOKEN_INVALID` |
| Email not in Users tab | "You're not on this workspace yet. Ask {owner_name} to add {email} to the Users tab." | `AUTH_NOT_INVITED` |
| Session expired | Redirect to sign-in, return to the same screen | `AUTH_SESSION_EXPIRED` |
| Role too low for an action | Button hidden or disabled with tooltip "Editors and above can run this" | `ROLE_FORBIDDEN` |
| CSRF mismatch | "Please refresh the page" | `CSRF_INVALID` |
| Extension token revoked | Extension popup: "Reconnect to Drishti" | `CAPTURE_TOKEN_INVALID` |

### 2.4 Market capture

| Situation | Behaviour |
| --- | --- |
| Page layout changed, adapter can't find price | Popup: "Couldn't read the price on this page. You can type it." Manual fields; capture flagged `manual`; adapter failure counted (`ADAPTER_PARSE_FAILED`) and shown on Data sources if > 20% in 7 days |
| Price outside plausible range | Rejected with message; nothing stored |
| Not on watchlist | Ask "Add to watchlist?" (Editor+) or capture as unlisted |
| Rival site disallows robots | `ROBOTS_DISALLOWED` on that watchlist row; suggest switching to extension capture |
| Rival site blocks or times out | Skipped this sync; after 3 failures status "check URL" |

### 2.5 Demo

- Demo never calls write APIs; if a demo page somehow calls one, the Worker returns 403 `DEMO_READ_ONLY`.
- If `demo/snapshot.json` fails to load (e.g. corporate proxy), show a static fallback image strip of the screens with a note.

## 3. Error code catalog

| Code | HTTP | Message (copy deck `error.<code>`) |
| --- | --- | --- |
| VALIDATION_FAILED | 400 | Some details are missing or invalid: {fields}. |
| AUTH_TOKEN_INVALID | 401 | Sign-in didn't work. Try again. |
| AUTH_SESSION_EXPIRED | 401 | You were signed out. Sign in to continue. |
| AUTH_NOT_INVITED | 403 | You're not on this workspace yet. Ask an owner to add {email} to the Users tab. |
| AUTH_EMAIL_UNVERIFIED | 403 | Your Google email isn't verified. |
| CSRF_INVALID | 403 | Please refresh the page and try again. |
| ROLE_FORBIDDEN | 403 | Your role can't do this. {role_needed} and above can. |
| DEMO_READ_ONLY | 403 | This is the demo. Changes aren't saved. |
| NOT_FOUND | 404 | We couldn't find that. |
| SNAPSHOT_NONE | 404 | No data yet. Connect your Sheet and run the first sync. |
| SYNC_ALREADY_RUNNING | 409 | A sync is already running (started {ago}). |
| IDEMPOTENCY_MISMATCH | 409 | This request was already sent with different details. Refresh and try again. |
| UPLOAD_TOO_LARGE | 413 | Files up to 20 MB, please. Split larger exports by month. |
| UPLOAD_TYPE_UNSUPPORTED | 415 | Use CSV, XLSX or ZIP files. |
| APPROVAL_REQUIRED | 202 | This is over ₹{threshold}, so it needs an approver. Sent to {approvers}. |
| CONNECTOR_MISSING | 422 | {connector} isn't connected. {fallback_text} |
| UNDO_UNAVAILABLE | 422 | This can't be undone from Drishti: {reason}. |
| CAPTURE_NOT_ON_WATCHLIST | 422 | This page isn't on your watchlist. |
| DRIVE_NOT_SHARED | 422 | Drishti can't open {folder}. Share it with {sa_email} as Editor. |
| SHEET_NOT_SHARED | 422 | Drishti can't open your Workspace Sheet. Share it with {sa_email} as Editor. |
| SCHEMA_MISMATCH | 422 | {file} is missing {columns}. Re-export with these columns or map them in the Mappings tab. |
| FILE_UNRECOGNISED | 422 | We couldn't tell what {file} is. Map its columns in the Mappings tab. |
| ROBOTS_DISALLOWED | 422 | {host} asks bots not to read this page. Use the extension instead. |
| TEST_NOT_APPLIED | 422 | Test cities still have spend. Check the exclusions in {platform}. |
| RATE_LIMITED | 429 | Too many requests. Try again in {seconds} seconds. |
| EXECUTOR_FAILED | 502 | Couldn't finish: {platform} didn't respond. |
| SHOPIFY_TOKEN_INVALID | 502 | The Shopify connection needs attention. An owner can reconnect it in Admin. |
| SHOPIFY_SCOPE_MISSING | 502 | The Shopify app needs the {scope} permission. |
| META_PERMISSION | 502 | The Meta connection can't change this ad set. Check the app's access. |
| GITHUB_DISPATCH_FAILED | 502 | Couldn't start a sync. An owner needs to renew the GitHub token. |
| AI_UNAVAILABLE | 503 | Drafting is unavailable right now. We'll try again later. |
| FREE_TIER_LIMIT | 503 | Daily free limit nearly reached. This will run tomorrow. |
| SANDBOX_FULL | client | This browser keeps up to 50 MB per company. Remove a file or split it by month. |
| SHEET_LINK_INVALID | 400 | That isn't a Google Sheets link. Copy it from the Share button. |
| SHEET_NOT_PUBLIC | 403 | Drishti can't open this sheet. In Google Sheets choose Share → General access → Anyone with the link → Viewer, then try again. |
| SHEET_TOO_LARGE | 413 | This sheet is over 20 MB. Split older months into another sheet. |
| SHEET_FETCH_FAILED | 502 | Google didn't send the sheet. Try Refresh in a minute. |
| SNAPSHOT_SCHEMA_MISMATCH | client | Showing the last saved data while we update. |
| ADAPTER_PARSE_FAILED | client (extension) | Couldn't read the {field} on this page. You can type it. |
| INTERNAL | 500 | Something went wrong on our side. Try again; if it repeats, tell your analyst (ref {request_id}). |

## 4. Edge cases checked by tests

- Week boundaries across month and year ends; the IST day boundary for timestamps near midnight.
- Channels with zero revenue in the prior period (growth shown as "New").
- Divide by zero in ROAS (spend 0) → "—".
- A city with all rows allocated (no ship city) → excluded from geo donors.
- A segment with fewer than 30 customers → merged into the nearest segment with a note.
- Reviews in Hinglish and with emojis; very long reviews truncated to 1,000 characters for AI.
- A price capture with MRP < price (marketplace glitch) → MRP ignored.
- Sheet with extra columns, hidden rows, or a renamed tab → renamed tab is `SHEET_TAB_MISSING` with the expected name.
- Two people approving the same action at once → second gets "Already approved by {name}".



---

<!-- file: docs/04-ADMIN.md -->

# 04 · Admin: Roles, Approvals, Settings, Audit and Handover

## 1. Roles

| Role | Who | Summary |
| --- | --- | --- |
| Owner | CMO or the deployer; `OWNER_EMAIL` is always Owner | Everything, including connectors, secrets status, user roles, deletion |
| Approver | Heads who sign off spend and price | Approve or decline; run any action |
| Analyst | Marketing analyst | Sync, upload, re-run models, run data and test actions, all screens |
| Editor | Marketers, category, CRM | Run actions in their areas, assign, create rules, capture |
| Viewer | QA, finance, leadership readers | Read all screens and the Actions log |

Roles come from the Users tab of the Workspace Sheet (loaded at each sync) plus the bootstrap Owner. A role change takes effect at the next sync or immediately when an Owner clicks "Reload users" in Admin.

## 2. Permission matrix

| Capability | Owner | Approver | Analyst | Editor | Viewer |
| --- | --- | --- | --- | --- | --- |
| View all screens, Actions log | ✓ | ✓ | ✓ | ✓ | ✓ |
| Switch theme, privacy mode (own view) | ✓ | ✓ | ✓ | ✓ | ✓ |
| Run prepare / task / draft / rule actions | ✓ | ✓ | ✓ | ✓ | |
| Run execute actions below threshold | ✓ | ✓ | ✓ | ✓ | |
| Run execute actions above threshold | via approval | ✓ (not own request) | via approval | via approval | |
| Approve / decline | ✓ | ✓ | | | |
| Undo | ✓ | ✓ | own actions | own actions | |
| Launch and stop tests | ✓ | ✓ | ✓ | | |
| Sync now, upload, re-run grouping | ✓ | | ✓ | upload only | |
| Create rules | ✓ | ✓ | ✓ | ✓ | |
| Extension capture token | ✓ | ✓ | ✓ | ✓ | |
| Admin: workspace links, connectors, sessions, usage, audit, export | ✓ | usage | usage | | |
| Delete workspace data | ✓ | | | | |

Enforced in the Worker by a `requireRole()` middleware per route and per action type (`roles` in each action definition). UI hides or disables controls with a tooltip naming the role needed.

## 3. Approvals

- Threshold: `approval_threshold_inr` (Settings; default ₹10,00,000 per month of money effect).
- Separation: the requester cannot approve their own above-threshold action; Owners can approve others' but their own above-threshold requests need another Approver or Owner. If the workspace has only one Owner and no Approvers, the Owner may self-approve with a typed reason (logged).
- Expiry: 7 days. Reminder at day 3 and day 6.
- Every decision is in `approvals` and `audit_log`.

## 4. Admin screen (`/admin`, Owner)

Sections, each a simple panel (follows the same design tokens; not in the eight showcase screens):

1. **Workspace:** name, Sheet URL, Inbox, Outbox, Archive folder URLs with live access check (green tick or the sharing fix), service account email with a Copy button.
2. **Connectors:** Shopify (store domain, token, Test, status), Meta (ad account ID, token, Test) Phase 2, Slack (webhook URL, Send test), Google Calendar (calendar ID, Test). Tokens are write-only fields (never displayed again).
3. **Users:** read-only list from the Sheet with roles and last seen; "Reload users"; "Revoke sessions" per user or all.
4. **Usage:** last 14 days of requests, KV writes, D1 writes, AI neurons, Sheets calls vs free limits; estimated Actions minutes.
5. **Audit log:** filterable by actor, verb, object; export CSV to Outbox.
6. **Data:** Export everything (facts and logs as CSV to Outbox); Delete workspace data.
7. **Extension:** active capture tokens with last used; revoke.

## 5. Settings (from the Workspace Sheet)

Settings live in the Settings tab so non-technical owners edit them in a familiar place; the Admin screen shows the effective values and validation errors (invalid values fall back to defaults with a warning on Data sources).

| Key | Default | Effect |
| --- | --- | --- |
| brand_name | — | Sidebar workspace name |
| timezone | Asia/Kolkata | Day boundaries |
| week_starts_on | Monday | This week window |
| approval_threshold_inr | 1000000 | Approvals |
| sync_every_hours | 6 | Scheduled sync frequency (3, 6, 12, 24) |
| target_cac_inr, target_ltv_to_cac, target_reply_rate | 850, 3, 0.6 | Chips and colours |
| category_label | — | Market subtitle |
| privacy_mode_default | on | Privacy mode default |
| team_calendar_id | — | Calendar executor |
| qa_owner, supply_owner, ads_owner | — | Default owners for task actions (emails) |
| segment_names | — | JSON map to rename customer types |
| ai_polish | off | Narrative polish by AI |
| roas_good_per100, roas_bad_per100 | 250, 160 | Colour thresholds on Impact |

## 6. Secrets and rotation

| Secret | Rotate when | How |
| --- | --- | --- |
| `GOOGLE_SA_JSON` | yearly or on leak | Create a new key on the service account; `wrangler secret put GOOGLE_SA_JSON`; update GitHub secret; delete the old key in Google Cloud |
| `SESSION_SECRET` | on leak | `wrangler secret put`; all users signed out |
| `SYNC_SECRET` | yearly | Update Worker and GitHub together (Worker accepts old and new for 1 hour via `SYNC_SECRET_PREV`) |
| `DATA_KEY` | on leak only | Run `pnpm rotate:data-key` (decrypts tokens with the old key, re-encrypts with the new; hashed customer keys are re-derived at the next full sync) |
| `GITHUB_DISPATCH_TOKEN` | before expiry (fine-grained PATs expire; set 1 year) | New PAT with Actions read/write on this repo only; `wrangler secret put` |
| `CLOUDFLARE_API_TOKEN` | yearly | New token with Workers Scripts edit, D1 edit, KV edit, Workers AI read; update GitHub secret |
| Shopify, Meta, Slack tokens | per platform policy | Admin → Connectors |

## 7. Data retention, export and deletion

- Retention defaults in `06-DATA-MODEL.md` §3; facts are kept for 24 months then trimmed by the sync job (oldest months first).
- **Export:** Admin → Export everything writes every fact table, the Actions log, tests, rules and audit as CSV into `Drishti Outbox/Export-YYYYMMDD/`.
- **Delete workspace data:** Owner types `DELETE <workspace name>`. The Worker deletes all KV keys with the workspace prefix, all D1 rows for the workspace except an audit entry "workspace deleted", revokes sessions and tokens, and posts a checklist to remove the service account's access from the Sheet and folders (Drishti never deletes the brand's own Google files).
- A person asking to remove their review or capture data: captures are deleted by ID from Admin; reviews are the brand's own platform data and are removed by re-syncing after the brand removes them at source.

## 8. Demo administration

- Demo snapshot is rebuilt on every deploy from `sample-data/demo`.
- Demo usage events are counted separately (`events.demo = 1`) for the showcase KRA.
- A Settings flag `demo_enabled` (Worker var) can turn `/demo` off for a brand's private deployment.

## 9. Club handover (PreQL)

The showcase deployment belongs to the club, not an individual:

1. GitHub repo under the PreQL organisation (free) with at least two admins from different batches.
2. Cloudflare account on a club email (free, no card) with two members.
3. Google Cloud project owned by the club email; service account keys rotated at handover.
4. Handover checklist each year (April): rotate secrets (§6), update `OWNER_EMAIL`, transfer the Shopify development store, review `13-STRATEGY-AND-KRAS.md` targets, re-run the end-to-end suite on production, and record the handover in the audit log via Admin → "Record handover".



---

<!-- file: docs/05-SYSTEM-DESIGN.md -->

# 05 · System Design

## 1. Architecture at a glance

```
                     ┌──────────────────────────── Cloudflare (free) ───────────────────────────┐
 Browser (React SPA) │  Worker "drishti"                                                         │
  /demo  ───────────►│   • Static assets: SPA, demo/snapshot.json, fonts, brand                  │
  /      ◄──────────►│   • /api/*: auth, snapshot, actions, approvals, rules, tests, capture,    │
                     │     uploads, sync dispatch, settings                                      │
 Chrome extension ──►│   • /internal/*: HMAC endpoints used by the sync job                      │
                     │   • Cron (every 30 min): reminders, approval expiry, readout dispatch     │
                     │   • Executors: Shopify, Meta, Google (Drive, Sheets, Calendar), Slack     │
                     │   D1 "drishti": users, sessions, actions, events, rules, tests, captures, │
                     │                 sources, sync runs, audit, usage counters                 │
                     │   KV "DRISHTI_KV": snapshots, fact blobs, token and JWKS caches           │
                     │   Workers AI: review tagging, drafts (budget-governed)                    │
                     └───────────────▲───────────────────────────────▲───────────────────────────┘
                                     │ HMAC                          │ workflow_dispatch
                     ┌───────────────┴───────────── GitHub (free) ───┴───────────────────────────┐
                     │ Actions: ci.yml · deploy.yml · sync.yml (hourly cron + dispatch) ·        │
                     │          action-runner.yml (dispatch) · nightly-e2e.yml · keepalive.yml   │
                     │ apps/sync (Node 22): read Google + Shopify + rival sites, parse,          │
                     │   normalise, run engine, write facts + snapshot, report status            │
                     └───────────────▲───────────────────────────────────────────────────────────┘
                                     │ service account (Sheets, Drive), Shopify token, Meta token
                     ┌───────────────┴──────────── Brand's own accounts (free) ──────────────────┐
                     │ Google Sheet "Drishti Workspace" · Drive "Drishti Inbox", "Outbox",       │
                     │ "Archive" · Google Calendar (optional) · Shopify · Meta/Google Ads exports │
                     └───────────────────────────────────────────────────────────────────────────┘
```

### 1.1 Why this split

Cloudflare's free plan gives each Worker invocation **10 ms of CPU time**, including cron runs. That is plenty for serving files, checking sessions, writing rows and calling APIs (waiting on the network does not count as CPU), but not for parsing a month of exports or fitting models. So:

- **Heavy compute runs in GitHub Actions** (free and unmetered for public repositories on standard runners; private repositories get a monthly free allowance). The sync job and the action runner are Node 22 scripts with no CPU limit and up to several hours per job.
- **The Worker stays thin:** auth, routing, storing and serving precomputed JSON, light action executors, cron reminders.
- **The brand's data lives in the brand's Google account** (Sheet, Drive) and the deployment's Cloudflare account (KV and D1). No third party sees it.

## 2. Components

| Component | Path | Runs on | Responsibilities |
| --- | --- | --- | --- |
| Web app | `apps/web` | Browser | React 18 + TypeScript + Vite SPA. Screens, theming, charts (hand-built SVG), action UX, demo mode, polling for new snapshots |
| Worker | `apps/worker` | Cloudflare Workers | Static assets, API, sessions, RBAC, action engine (light executors), approvals, rules CRUD, capture intake, uploads to Drive, sync dispatch, cron, internal HMAC endpoints |
| Sync job | `apps/sync` (`drishti-sync` CLI) | GitHub Actions | Pull Sheet tabs, Drive Inbox files, Shopify orders, rival site product data, D1 captures; parse and normalise; merge facts; run engine; write facts and snapshot to KV via Worker; mirror logs to the Sheet; evaluate rules; run readouts |
| Action runner | `apps/sync` (`drishti-run-action`) | GitHub Actions | Heavy actions (audience exports, large reply drafts, budget sheets, test plans with matching) |
| Engine | `packages/engine` | Node and browser | Parsers, column mapping, canonical facts, KPIs, incrementality models, bridge, market analytics, k-means, review aspects (lexicon), recommendation rules, expected-impact formulas, snapshot builder |
| Shared | `packages/shared` | All | Types, zod schemas (snapshot, API), constants, copy deck, design tokens |
| Extension | `apps/extension` | Chrome MV3 | Watchlist awareness, Capture button, site adapters, posting captures |
| Demo data | `sample-data/` | Build time | Demo snapshot built by the engine during `pnpm build`; template and sample files copied to `/samples/` for the data guide |
| Sandbox | `apps/web` (`/try`) + `packages/engine` | Browser (Web Worker) | Parses dropped files and builds a snapshot locally with the same engine; no network writes |

## 3. Free-tier budget and governors

All limits live in `packages/shared/src/limits.ts` with the source and date checked, and a weekly CI job (`limits-check`) fails if docs and constants disagree.

| Resource | Free limit (checked Oct 2026) | Drishti expected use | Governor |
| --- | --- | --- | --- |
| Worker requests | 100,000 per day | under 5,000 | Usage counter in D1; above 60,000 the UI polling interval rises to 5 minutes |
| Worker CPU | 10 ms per request and per cron run | 1–4 ms typical | No parsing in the Worker; snapshot served as stored gzip bytes; JWT verify and RS256 signing only |
| Cron triggers | 5 per account | 2 (every 30 min; daily 02:00 IST housekeeping) | n/a |
| Subrequests | 50 per invocation | under 10 | Executors batch calls; heavy work goes to the action runner |
| KV | 100,000 reads per day, 1,000 writes per day, 1 GB, 25 MiB per value | about 60 writes per day | Counter; sync refuses to write more than 40 keys per run; snapshot under 5 MiB, facts split per table |
| D1 | 5 million rows read and 100,000 rows written per day; 500 MB per database; 50 queries per invocation | under 5,000 writes per day | Counter; captures capped at 2,000 per day; batch inserts |
| Workers AI | 10,000 neurons per day | 500–2,000 | Neuron estimate per call; stop at 8,000 and fall back to the lexicon or queue for tomorrow |
| GitHub Actions | Free for public repos on standard runners; private repos have a monthly allowance | hourly cron that exits early unless due (about 20 s) plus 4 syncs a day (about 3 min each) | Sync writes `next_due_at`; early-exit costs seconds |
| Google Sheets API | 300 requests per minute per project, 60 per user | under 50 per sync | Batch reads (`values.batchGet`) and one batch write per sync; client throttle 30 per minute |
| Google Drive API | Generous default quota | under 100 per sync | List with fields mask; download only new files |

**Public vs private repo.** The code repo is public for the showcase (unlimited free Actions minutes). A brand's production deployment can be a private fork; at about 4 syncs a day of 3 minutes plus hourly early exits it fits the free private allowance. Secrets are never printed; the sync job logs counts, not values.

**60-day rule.** GitHub disables scheduled workflows in public repositories after 60 days without repository activity. `keepalive.yml` runs monthly and commits a heartbeat file; the Data sources screen warns if the last scheduled sync is over 26 hours old.

## 4. Data flow: the sync pipeline

Triggered by: hourly cron (runs only if `now ≥ next_due_at`), `workflow_dispatch` from the Worker ("Sync now", file upload, readout due), or a push to `main` that changes the engine (rebuild snapshot only).

```
1  lock      POST /internal/sync/start  → D1 sync_runs row (status running); refuse if another run < 20 min old
2  config    GET  /internal/config      → settings, encrypted tokens (decrypted in the job with DATA_KEY)
3  sheet     Sheets values.batchGet: Settings, Products, Channels, Watchlist, Creators, Targets, Calendar, Rules, Users, Mappings
4  inbox     Drive files.list in Inbox (not trashed, modifiedTime > last cursor)
             for each file: download → detect source by header signature (11-CONNECTORS §3) → parse → validate → canonical rows
             unrecognised → move to Inbox/Unrecognised, status warning; recognised → move to Archive/YYYY-MM
5  apis      Shopify Admin GraphQL: orders updated since cursor (paginated, 250 per page), customers, discount codes
             Meta Marketing API insights (if token): yesterday and last 7 days restated
6  sites     Rival brand sites on the watchlist with capture_method=site_json: robots.txt check, then product JSON
7  captures  GET /internal/captures?since=cursor (extension captures from D1)
8  facts     GET /internal/blob/facts:* (gzip JSON per table) → merge by natural keys (date, city, channel, sku…) → validate → PUT back changed tables
9  engine    build snapshot: KPIs, bridge, incrementality, market, segments, voice, recommendations, rule evaluation, readouts
10 ai        new reviews since cursor → Workers AI aspect tagging (budget-governed) → merged into review facts
11 publish   PUT /internal/blob/snap:{ws}:{version} (gzip); POST /internal/sync/finish with source status, rule events,
             readout results, suggested actions, usage
12 mirror    Sheets values.batchUpdate: Source status, Sync log, Actions, Tests tabs
13 notify    Worker sends Slack summary and rule alerts (from step 11 payload)
```

Typical duration: 2–4 minutes. Timeout 20 minutes. On failure, step 11 is skipped: the previous snapshot keeps serving, `sync_runs.status = failed` with error code, Data sources shows the failure, Slack alert to Owners and Analysts.

**Idempotency.** Every canonical row has a natural key; merges are upserts. Re-running a sync with the same files produces byte-identical facts and snapshot (snapshot `version` = SHA-256 of its content). Files are identified by Drive `md5Checksum`; a file with a known checksum is archived without re-parsing.

**Restatements.** Platforms restate recent days (ad conversions, returns). Parsers replace the last 14 days per source when a newer file covers them.

## 5. Refresh model

| Mode | How | Latency | Who |
| --- | --- | --- | --- |
| Scheduled | GitHub Actions hourly cron; runs when due (default every 6 h: about 01:10, 07:10, 13:10, 19:10 IST) | as scheduled | System |
| Manual | "Sync now" (Data sources header, This week freshness chip) → `POST /api/sync` → GitHub `workflow_dispatch` | 2–4 min | Owner, Analyst |
| On upload | Upload a file → Drive Inbox → dispatch | 2–4 min | Editor and above |
| Live captures | Extension → `/api/capture` → D1; Market screen merges captures newer than the snapshot | seconds | Editor and above |
| UI auto-refresh | SPA polls `GET /api/snapshot/meta` every 60 s while visible (5 min when hidden or above the usage governor); new version → fetch and swap with a notice "Updated just now" | ≤ 60 s after publish | All |
| Readouts | Worker cron finds due readouts → dispatches a sync with `--readouts-only` (fast path, about 1 min) | ≤ 30 min after due | System |

## 6. Action engine

Full catalogue in `10-ACTIONS.md`. Architecture:

```
UI Run ─► POST /api/actions {type, params, source_screen, suggestion_id}  (Idempotency-Key)
          │
          ├─ validate params (zod) and role
          ├─ needs approval? (role or threshold) → status awaiting_approval → notify approvers → stop
          ├─ executor kind:
          │    inline  (Worker, I/O only): shopify_*, meta_*, slack_notify, sheet_log, calendar_event,
          │                                drive_file (small), rule_create, task_assign, reminder_set
          │    job     (GitHub action-runner): audience_export, reply_drafts, budget_sheet, test_plan,
          │                                     listing_copy, brief_doc
          │    handoff (prepare + human confirms): amazon_coupon, flipkart_*, nykaa_*, qc_ads_pause,
          │                                     google_ads_exclusions (Phase 1–2)
          ├─ write action + events (D1), mirror to Sheet (queued for next minute via cron or done inline)
          └─ return {action_id, status, steps[], outputs[]}

Lifecycle: suggested → (awaiting_approval) → running → waiting_on_user (handoff) → done → measuring → result
           ↘ failed (retryable)   ↘ declined / expired   ↘ undone
```

State machine rules:

- Only `running` and `waiting_on_user` can move to `done`; `done` moves to `measuring` when a readout is scheduled, else to `result` with `result = not_measured`.
- `undo` is allowed from `done` or `measuring` when the executor implements it (Shopify discount, Meta budget, rule, reminder). Undo restores saved `before` values and logs `undone`.
- Retries: inline executors retry once with backoff on network errors; job executors are retried by re-dispatch up to 2 times.
- Every transition writes an `action_events` row and an `audit_log` row.

## 7. Authentication and sessions

- Google Identity Services "Sign in with Google" button on `/` returns an ID token (JWT) to the SPA.
- `POST /api/auth/google {credential}`: Worker fetches Google JWKS (cached in KV for 6 h), verifies RS256 signature, `iss`, `aud == GOOGLE_CLIENT_ID`, `exp`, `email_verified`. Looks up `users` (synced from the Users tab; the `OWNER_EMAIL` secret is always Owner).
- Session: random 32-byte ID stored hashed in D1 with user, role, expiry (7 days, sliding); cookie `__Host-drishti` HttpOnly, Secure, SameSite=Lax, Path=/.
- CSRF: double-submit token (`drishti-csrf` cookie, non-HttpOnly, plus `X-CSRF-Token` header) on every non-GET.
- Extension: after sign-in, `/api/extension/token` issues a capture-only token (scope `capture`, 30 days, revocable on Admin).
- Demo: no session; demo routes never call write APIs.

## 8. Internal endpoints (sync job ↔ Worker)

- Header `X-Drishti-Sig: t=<unix>,v1=<hex HMAC-SHA256(SYNC_SECRET, t + "." + method + path + "." + sha256(body))>`; reject if older than 300 s or replayed (nonce cache 10 min in memory and D1).
- Blob endpoints stream bodies to and from KV without parsing (CPU-safe).
- `/internal/config` returns encrypted secrets; the job decrypts with `DATA_KEY` (GitHub secret). Tokens never travel in plaintext.

## 9. Secrets

| Secret | Where | Purpose |
| --- | --- | --- |
| `GOOGLE_CLIENT_ID` | Worker var (not secret) | Sign-In audience |
| `GOOGLE_SA_JSON` | Worker secret and GitHub secret | Service account for Sheets, Drive, Calendar |
| `OWNER_EMAIL` | Worker secret | Bootstrap Owner |
| `SESSION_SECRET` | Worker secret | Cookie and CSRF signing |
| `SYNC_SECRET` | Worker secret and GitHub secret | Internal HMAC |
| `DATA_KEY` | Worker secret and GitHub secret | AES-GCM for tokens stored in D1 |
| `GITHUB_DISPATCH_TOKEN` | Worker secret | Fine-grained PAT with Actions: read and write on this repo only |
| `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` | GitHub secrets | Deploy, and Workers AI REST calls from the sync job |
| Shopify Admin token, Meta token, Slack webhook | D1 (encrypted) via Admin UI | Connectors and executors |

Rotation steps are in `04-ADMIN.md` §6.

## 10. Security and privacy

- Personal data: own-site customer IDs are hashed (`sha256(DATA_KEY || customer_id)`) in facts and snapshots. Names, emails and phones are never stored in KV, D1 or snapshots. Audience exports read Shopify directly in the action runner, hash emails and phones with SHA-256 (Meta's required normalisation), write to Drive Outbox, and keep nothing.
- Privacy mode (default on) additionally hides any free text that may contain a name (review author names are never collected).
- RBAC on every API route (`04-ADMIN.md` §2). Approvals enforce separation for budget actions above the threshold.
- Content Security Policy: `default-src 'self'; script-src 'self' https://accounts.google.com/gsi/client; frame-src https://accounts.google.com; connect-src 'self' https://accounts.google.com; img-src 'self' data:; style-src 'self' 'unsafe-inline'` (inline styles needed for computed chart geometry).
- Rate limits: 60 write requests per minute per user; 300 captures per hour per token.
- Audit log is append-only (no update or delete statements in code; enforced by a test that greps SQL).
- Data deletion: `04-ADMIN.md` §7.

## 11. Snapshot serving

- `GET /api/snapshot` → Worker reads pointer `snap:{ws}:latest` (value: version), then streams `snap:{ws}:{version}` with `Content-Encoding: gzip`, `Content-Type: application/json`, `ETag: version`, `Cache-Control: private, max-age=0, must-revalidate`. 304 on matching `If-None-Match`.
- `GET /api/snapshot/meta` → `{version, generated_at, data_through, sources_ok, sources_late}` from D1 (cheap).
- The SPA validates the snapshot with the zod schema in `packages/shared`; on schema mismatch it shows the last good cached snapshot from IndexedDB and reports `SNAPSHOT_SCHEMA_MISMATCH`.
- Demo: `GET /demo/snapshot.json` static asset built at deploy from `sample-data/demo`.
- Sandbox: no server snapshot. The SPA builds one in a Web Worker from dropped files (§14).

## 12. Observability

- `sync_runs`, `action_events`, `usage_daily` and `audit_log` tables are the system's logs; Data sources shows the last 10 sync runs on hover of the freshness chip.
- Worker uses `console.log` JSON lines (visible in `wrangler tail`), never logging personal data or tokens.
- Weekly usage digest to Owners (Slack): requests, KV writes, D1 writes, AI neurons, Actions minutes estimate vs limits.

## 13. Environments

| Env | URL | Data | Deployed by |
| --- | --- | --- | --- |
| local | `http://localhost:8787` (wrangler dev) and Vite on 5173 | sample-data, local D1 and KV | developer |
| staging | `https://drishti-staging.<subdomain>.workers.dev` | a copy of the template Sheet with sample data; Shopify development store | `deploy.yml` on every push to `main` |
| production | `https://drishti.<subdomain>.workers.dev` | the brand's Sheet and Drive | `deploy.yml` on a tag `v*` |

Both workers share the code; each has its own D1 database, KV namespace and secrets.

## 14. Deployment model and sandbox

**One deployment per brand** (decided 19 Oct 2026, `01-PRD.md` §4.3). Each brand runs its own copy of this stack on its own free accounts; there is no shared multi-tenant service. This keeps every brand inside its own free limits, keeps its data in its own accounts, and keeps cost at ₹0 however many brands use Drishti. The PreQL showcase deployment serves only public pages (home, demo, data guide, sandbox) and holds no brand data.

**Sandbox (`/try`).** The plug-and-play way to try Drishti:

- Files dropped on the page (the filled template `.xlsx`, export CSVs, or a ZIP of them) are read in a Web Worker by `packages/engine`: the same header detection, parsers and models as the sync job (`11-CONNECTORS.md` §3), and the same snapshot builder.
- Nothing is uploaded and no API is called. The parsed facts and snapshot live in memory (and IndexedDB, wrapped in try/catch, so a reload keeps them); "Clear my data" deletes them.
- **Linked Google Sheets (added 20 Oct 2026):** besides dropping files, a visitor can paste Google Sheets links shared as "Anyone with the link can view". The browser asks the Worker's `GET /api/sheet` (`07-API.md` §2) for the workbook, reads every tab with the same detection as files, and keeps the link. **Refresh** fetches every linked sheet again and rebuilds the snapshot; opening a company refreshes it too. This is the only sandbox call to the server, and it keeps nothing. Private sheets need the signed-in setup (M4), which reads them with the service account.
- **Vercel mirror (added 20 Oct 2026):** the same static build of the public pages (home, demo, sandbox) can also be served from Vercel Hobby (`vercel.json`). Vercel only serves files; its `/api/*` is rewritten to the Cloudflare Worker, so linked sheets work the same, and signed-in workspaces stay on Cloudflare. Hobby is for non-commercial use: the mirror is for showing Drishti, and moves off Hobby (or is dropped) before any paid use.
- Several companies can be kept at once, each under its own id with its files' parsed rows by source. Updating a company replaces only the sources in the new files and rebuilds its snapshot.
- Screens render exactly as in the demo, with `workspace.demo = true` and a "Your files, this browser only" chip. Actions are simulated as in demo mode (`10-ACTIONS.md` §7).
- Limits: up to 50 MB of files in total; screens without enough data show the EmptyState with what to add.
- Cost: zero server work (static assets only).

## 15. Compact sync (decided 21 Oct 2026)

Drishti is run as a working pitch for one brand at a time, with 10 to 20 users. Every feature stays; each is built in its smallest working form. Sync runs as follows:

1. **Sync now** (Owner or Analyst) calls `GET /api/sync/sources`. The Worker lists the Workspace Sheet and the files in the Inbox folder with the service account.
2. The browser fetches each one through `GET /api/sync/file/:id`. The Worker passes the bytes through, exporting the Sheet as xlsx. It serves only the Workspace Sheet or files inside the Inbox.
3. The browser runs the engine in a Web Worker, the same one the sandbox uses. The free Workers plan allows about 10 ms of CPU per request, too little to build a snapshot.
4. `PUT /api/snapshot` stores the snapshot in KV (`snapshot:<workspace>`) and records a `sync_runs` row. Every signed-in role reads it with `GET /api/snapshot`, and `/app` shows the eight screens on it.

The scheduled GitHub Actions sync (§6) can be added later without changing these endpoints.



---

<!-- file: docs/06-DATA-MODEL.md -->

# 06 · Data Model

Four stores, each with one job:

| Store | Holds | Written by | Read by |
| --- | --- | --- | --- |
| Google Sheet "Drishti Workspace" | Settings and inputs people edit; logs people read | People (green tabs); sync job (grey tabs) | Sync job |
| Google Drive | Raw exports (Inbox → Archive), generated files (Outbox) | People, Worker uploads, action runner | Sync job, people |
| Cloudflare KV | Canonical facts (gzip JSON per table), snapshots, caches | Worker (on behalf of the sync job) | Worker, sync job |
| Cloudflare D1 | Operational records: users, sessions, actions, rules, tests, captures, sources, sync runs, audit, usage | Worker | Worker, sync job (via internal API) |

All money is integer rupees in storage (`*_inr`), rounded to the rupee. Dates are `YYYY-MM-DD` in Asia/Kolkata; timestamps are ISO 8601 with offset. IDs are ULIDs unless stated.

## 1. Canonical fact tables (KV blobs `facts:{ws}:{table}`)

Each table is stored as gzip JSON `{ "schema": "<table>@1", "rows": [...] }` with rows as arrays in column order (compact). The demo CSVs in `sample-data/demo/` have exactly these columns. Natural keys are used for upserts.

### 1.1 `sales_city_daily` (demo: `fact_sales_city_daily.csv`)

| Column | Type | Notes |
| --- | --- | --- |
| date | date | key |
| city | text | key; canonical city list in `packages/shared/src/geo.ts`; unknown cities map to "Other" |
| state | text | |
| channel | enum | key; `own_site`, `amazon`, `quick_commerce`, `nykaa`, `flipkart` |
| orders | int | |
| units | int | |
| net_revenue_inr | int | after discounts, before returns; GST-inclusive selling price as reported |
| returned_orders | int | returns and RTO |

Built from: Shopify orders (own_site), Amazon order and business reports (amazon, city from ship-city where present, else allocated by the state's share of the last 28 days), quick-commerce store files (quick_commerce), Nykaa and Flipkart files (city when present, else allocated by state or national share). Allocation is flagged in `sales_alloc_log` so models can down-weight allocated rows.

### 1.2 `sales_sku_daily` (demo: `fact_sales_sku_daily.csv`)

`date, channel, sku, units, net_revenue_inr, returned_units` (key: date, channel, sku).

### 1.3 `spend_city_daily` (demo: `fact_spend_city_daily.csv`)

| Column | Type | Notes |
| --- | --- | --- |
| date, city | | key |
| media | enum | key; `meta`, `google`, `amazon_ads`, `flipkart_ads`, `qc_ads`, `creators` |
| platform | text | display name |
| spend_inr | int | |
| platform_claimed_revenue_inr | int | the platform's own attributed revenue (Meta purchase value, Google conversion value, Amazon 14-day sales, Flipkart direct + indirect, QC platform-reported, creators: code redemptions) |

Optional finer table `spend_campaign_daily` (`date, media, campaign, campaign_type, targeting, city, spend_inr, claimed_inr, clicks, impressions`) feeds the brand-search and retargeting splits.

### 1.4 `orders_own_site` and `order_lines_own_site` (demo: `own_site_orders_sample.csv`, `own_site_order_lines_sample.csv`)

Orders: `order_id, created_at, customer_key, city, state, payment_method (COD|Prepaid), discount_code, discount_inr, gross_inr, net_inr, status (Delivered|RTO|Returned|Cancelled), first_order (yes|no)`.
Lines: `order_id, sku, qty, unit_price_inr`.
`customer_key` = hashed customer ID (the demo files use plain `customer_id` like `C200123`; the parser hashes it).

### 1.5 `customers_own_site` (demo: `own_site_customers_sample.csv`)

`customer_key, first_order_date, city, state, acquisition_source (meta|google|creators|referral|organic|unknown)`.
Acquisition source comes from Shopify's first-order UTM / referrer / discount code mapping (`11-CONNECTORS.md` §4.1). The demo file has an extra column `true_segment_do_not_use_in_model` used only by tests.

### 1.6 `qc_store_daily` (demo: `quick_commerce_store_daily.csv`)

`date, platform, city, store_id, sku, units, gmv_inr, closing_stock, stockout (yes|no), ad_spend_inr` (key: date, platform, store_id, sku).

### 1.7 `reviews` (demo: `reviews.csv`)

`review_id, platform, sku, review_date, rating (1-5), text, verified_purchase, brand_replied` plus engine-added `aspects` (array of `{aspect, sentiment: -1|0|1, source: "ai"|"lexicon"}`).
Review IDs from platforms are kept; when missing, `sha256(platform|sku|date|text)`.

### 1.8 `market_captures` (demo: `market_captures.csv`)

`captured_at, platform (Amazon|Flipkart|Nykaa|Blinkit|Zepto|Instamart|Brand site), label, brand, product_name, pack_ml, price_inr, mrp_inr, rating, review_count, in_stock, capture_method (extension|site_json), url` plus optional `top_reviews` (array of strings, extension only). Key: `url, captured_at` truncated to the hour.

### 1.9 `search_share_weekly` (demo: `search_share_weekly.csv`)

`week_ending, search_query, search_volume, impression_share, click_share, purchases_total, purchase_share` (from Amazon Brand Analytics, Search Query Performance).

### 1.10 Others

- `trends_weekly`: `week, term, region, interest` (Google Trends CSV).
- `creator_posts`: from the Creators tab (see §2).
- `products`, `channels`: from the Sheet each sync (not stored as facts).

## 2. Workspace Sheet contracts

The template is `sample-data/Drishti-Workspace-Template.xlsx` (and one CSV per tab in `sample-data/workspace/`). Headers are exact; extra columns to the right are ignored.

| Tab | Who writes | Columns | Validation |
| --- | --- | --- | --- |
| README | People | free text | ignored |
| Settings | People | `key, value, notes` | keys in `settingsSchema` (zod): brand_name, currency, timezone, week_starts_on, fiscal_year_start_month, approval_threshold_inr, sync_every_hours (3,6,12,24), target_cac_inr, target_ltv_to_cac, target_reply_rate, category_label, privacy_mode_default, notify_slack_webhook (ignored in Sheet; must be set in Admin), team_calendar_id |
| Products | People | `sku, name, category, pack_ml, mrp_inr, unit_cost_inr, launch_date, hero, asin, fsn, nykaa_id` | sku unique; pack_ml > 0 |
| Channels | People | `channel, label, commission_pct, payment_fee_pct, shipping_per_order_inr, other_pct, notes` | channel in enum |
| Watchlist | People | `watch_id, label, brand, platform, url, pack_ml, is_us, capture_method` | url https; capture_method `extension` or `site_json` (site_json only for `Brand site`) |
| Creators | People | `post_date, creator, handle, platform, followers, audience_cities, cost_inr, product_sku, post_url, discount_code` | post_date ≤ today |
| Targets | People | `kpi, period, target` | kpi in enum |
| Calendar | People | `start_date, end_date, event, channel, type (sale|festival|launch|other)` | |
| Rules | People and Drishti | `rule_id, name, condition, action, status (on|off), owner` | condition parsed by the rule DSL (§5) |
| Users | People | `email, role (Owner|Approver|Analyst|Editor|Viewer), name` | email unique |
| Mappings | People | `source, file_column, drishti_field` | overrides header detection |
| Actions | Drishti | `action_id, created_at, screen, type, title, owner, status, expected_inr, expected_per, measured_inr, readout_date, output_file, notes` | mirror of D1 |
| Tests | Drishti | `test_id, name, design, media, test_regions, control_regions, start_date, end_date, status` | mirror of D1 |
| Source status | Drishti | `source, method, last_received_at, status, rows_last_sync` | |
| Sync log | Drishti | `finished_at, trigger, result, seconds, sources_ok, sources_late, error` | last 200 rows kept |

## 3. D1 schema (`apps/worker/migrations/0001_init.sql`)

```sql
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
```

Retention: `sessions` expired > 30 days deleted daily; `captures` > 400 days deleted; `events` > 400 days deleted; `audit_log`, `actions`, `action_events` kept until workspace deletion.

## 4. KV keys (`DRISHTI_KV`)

| Key | Value | TTL | Notes |
| --- | --- | --- | --- |
| `snap:{ws}:latest` | version string | none | pointer |
| `snap:{ws}:{version}` | gzip JSON snapshot | 45 days | last 30 kept; older deleted by the sync job |
| `facts:{ws}:{table}` | gzip JSON fact table | none | one per table in §1 |
| `facts:{ws}:_manifest` | JSON {table: {rows, sha256, updated_at}} | none | lets the job skip unchanged tables |
| `jwks:google` | JSON | 6 h | |
| `tok:google_sa` | access token | 50 min | avoids re-signing on every call |
| `lock:sync:{ws}` | run id | 20 min | |

## 5. Rule DSL

Conditions are small expressions over snapshot metrics, evaluated by the engine at the end of each sync (never in the Worker). Grammar (PEG in `packages/engine/src/rules/grammar.ts`):

```
expr      := term (("and" | "or") term)*
term      := metric op number | "(" expr ")"
metric    := name | name "(" args ")"
op        := "<" | "<=" | ">" | ">=" | "==" | "!="
```

Available metrics: `qc_stock_days` (per store), `rival_price_change_pct` (per watched product, since last capture), `aspect_share(aspect, window)`, `source_lag_days` (per source), `true_roas(media, window)`, `search_share(query)`, `cac_new_buyer(window)`, `rating(platform)`. A rule over a per-entity metric fires once per entity per day.

Actions: `notify` (Slack + in-app to owner), `pause_store_ads` (prepares the pause list and notifies; see `10-ACTIONS.md` §4.9), `create_suggestion` (adds a suggested action).

## 6. Snapshot schema (`packages/shared/src/snapshot.ts`)

One JSON document per sync. TypeScript shape (zod schema mirrors it); every screen reads only its own section.

```ts
type Money = number;                       // rupees
type Delta = { value: number; unit: 'pct' | 'pts' | 'inr' | 'x'; direction: 'up' | 'down' | 'flat'; good: boolean | null };
type Kpi = { id: string; label: string; value: number; display: string; delta?: Delta; note?: string; spark?: number[]; tone?: 'good'|'bad'|'warn'|'neutral' };
type Verdict = { tone: 'good' | 'bad' | 'warn'; chip: string; text: string };
type Evidence = { label: string; detail?: string };
type Suggestion = {
  id: string; type: string; title: string; why: string; impactLabel: string; expectedInr?: Money; expectedPer?: 'week'|'month'|'once';
  confidence: 'high'|'medium'|'low'; priority: number; evidence: Evidence[]; params: Record<string, unknown>;
  runLabel: string; doneLabel: string; needsApproval: boolean; executor: 'inline'|'job'|'handoff'; steps: string[];
};

interface Snapshot {
  schema: 'drishti.snapshot@1';
  version: string;                         // sha256 of content
  generated_at: string; data_through: string; workspace: { name: string; demo: boolean };
  windows: { week: [string, string]; prior_week: [string, string]; d28: [string, string]; prior_d28: [string, string] };
  sources: { id: string; label: string; method: string; cadence: string; status: 'ok'|'received'|'late'|'never'|'error'; late_days: number;
             last_received_at?: string; feeds: string; how: string; rule: string }[];
  week: {
    verdict: Verdict; kpis: Kpi[];         // 6
    bridge: { prior: Money; current: Money; axis: [Money, Money]; explained_pct: number;
              drivers: { id: string; label: string; channel: string; value_lakh: number; method: string; evidence: Evidence[] }[] };
    working: { title: string; detail: string }[]; attention: { title: string; detail: string }[];
    inference: string; suggestions: Suggestion[];
  };
  performance: {
    verdict: Verdict; kpis: Kpi[];
    weekly: { weeks: string[]; revenue_by_channel: Record<string, number[]>; orders: number[]; aov: number[]; buyers: number[] };
    channels: { id: string; label: string; color: string; revenue: Money; growth_pct: number; orders: number; aov: Money;
                buyers?: number; return_pct: number; share_pct: number; headline: string; notes: string[]; suggestions: Suggestion[] }[];
  };
  impact: {
    verdict: Verdict; kpis: Kpi[];
    channels: { id: string; label: string; spend: Money; claimed: Money; real: Money; real_low: Money; real_high: Money;
                claimed_per100: number; real_per100: number; confidence: 'high'|'medium'|'low'; evidence: string;
                headline: string; suggestions: Suggestion[] }[];
    acquisition: { source: string; cac: Money; value_12m: Money; ltv_cac: number; payback_months: number }[];
    tests: { id: string; name: string; day: number; days: number; readout: string; note: string }[];
  };
  market: {
    verdict: Verdict; kpis: Kpi[]; category_label: string; median_per10: number; category_rating: number;
    products: { id: string; label: string; brand: string; platforms: string; is_us: boolean; price: Money; per10: number;
                change_14d_pct: number | null; rating: number; reviews: number; perception: { gentle_clinical: number; value_premium: number };
                says: string; threat: 'You'|'High threat'|'Medium threat'|'Low threat'|'Opportunity'|'Different buyer';
                headline: string; suggestions: Suggestion[] }[];
    price_changes: { label: string; platform: string; pct: number; date: string }[];
    open_space?: { quadrant: 'gentle_premium'|'gentle_value'|'clinical_premium'|'clinical_value'; label: string };
  };
  customers: {
    verdict: Verdict; kpis: Kpi[]; method: string;
    segments: { id: string; name: string; kind: 'preferred'|'problem'|'other'; buyers_pct: number; revenue_pct: number; aov: Money;
                orders_per_year: number; repeat_pct: number; cac: Money; ltv_12m: Money; ltv_cac: number; discount_pct: number;
                cod_pct: number; rto_pct: number; centroid: { orders: number; aov: Money }; sample: [number, number][];
                tag: string; headline: string; suggestions: Suggestion[] }[];
    stability: { ari_vs_last: number | null; k: number; silhouette: number };
  };
  voice: {
    verdict: Verdict; kpis: Kpi[];
    aspects: { id: string; name: string; mentions: number; us: number; category: number; tag: string; headline: string;
               quotes: { text: string; src: string }[]; suggestions: Suggestion[] }[];
    issues: { title: string; mentions: number; change_pct: number | null; is_new: boolean; platforms: string; first_seen: string }[];
  };
  data: { verdict: Verdict; kpis: Kpi[] };
  rules_fired: { rule_id: string; entity?: string; text: string }[];
}
```

`sample-data/expected/expected_metrics.json` holds golden values for the KPI windows. The demo snapshot is generated by `pnpm --filter engine build:demo` and committed only as a build artifact (not in git).



---

<!-- file: docs/07-API.md -->

# 07 · API and Protocols

Base URL: the Worker origin. JSON in and out (`Content-Type: application/json; charset=utf-8`) unless stated. Implemented with Hono on Cloudflare Workers; request and response bodies validated with zod schemas from `packages/shared/src/api.ts`.

## 1. Protocols

### 1.1 Auth

| Caller | Credential | Routes |
| --- | --- | --- |
| Browser (app) | `__Host-drishti` session cookie + `X-CSRF-Token` on non-GET | `/api/*` |
| Extension | `Authorization: Bearer <capture token>` | `/api/watchlist`, `/api/capture` |
| Sync job and action runner | `X-Drishti-Sig` HMAC (`05-SYSTEM-DESIGN.md` §8) | `/internal/*` |
| Anyone | none | `/`, `/demo`, `/demo/*`, static assets, `/api/health` |

### 1.2 Errors

```json
{ "error": { "code": "APPROVAL_REQUIRED", "message": "This change is over ₹10 L, so it needs an approver.", "detail": { "threshold_inr": 1000000 }, "request_id": "01JA…" } }
```

HTTP status follows meaning (400 validation, 401 no session, 403 role, 404, 409 conflict or idempotency replay with different body, 422 business rule, 429 rate limit, 502 upstream, 503 free-tier governor). Every `code` is in `03-EXCEPTIONS.md` §3 with its user message.

### 1.3 Idempotency

`POST /api/actions`, `POST /api/actions/:id/*`, `POST /api/uploads` and `POST /api/sync` accept `Idempotency-Key` (UUID). Same key and same body within 24 h returns the original response; same key with a different body returns 409 `IDEMPOTENCY_MISMATCH`. The SPA generates one key per click.

### 1.4 Pagination

Cursor-based: `?limit=50&cursor=<opaque>` → `{ items: [...], next_cursor: string | null }`.

### 1.5 Rate limits

Per user: 60 writes per minute, 600 reads per minute. Per capture token: 300 per hour. Exceeding returns 429 with `Retry-After`.

## 2. Public

| Method | Path | Response |
| --- | --- | --- |
| GET | `/api/health` | `{ ok: true, version: "<git sha>", time }` |
| GET | `/demo/snapshot.json` | Demo snapshot (static) |
| GET | `/api/sheet?url=<Google Sheets link>` | The whole workbook as XLSX bytes, for the sandbox's linked sheets (below) |
| GET | `/samples/*` | Template sheet (`Drishti-Workspace-Template.xlsx`), one CSV per Sheet tab, and one sample export per source (static, copied from `sample-data/` at build) |

### GET `/api/sheet?url=` (sandbox linked sheets)

Public, no login. Browsers cannot download a Google Sheet across sites, so the Worker fetches it for the sandbox: it accepts only `https://docs.google.com/spreadsheets/d/<id>/…` links, requests `/spreadsheets/d/<id>/export?format=xlsx` from Google, and streams the bytes back with `Cache-Control: no-store`. It never stores the sheet or logs its contents or link. The sheet must be shared as "Anyone with the link can view" (or published to the web). Up to 20 MB. Errors `SHEET_LINK_INVALID` 400, `SHEET_NOT_PUBLIC` 403 (Google answered with a sign-in page or 401/403), `SHEET_TOO_LARGE` 413, `SHEET_FETCH_FAILED` 502, `RATE_LIMITED` 429 (best effort, 30 per minute per IP, counted in memory so it uses no KV writes). Signed-in workspaces read their Sheet through the Sheets API with the service account instead (`11-CONNECTORS.md` §2).

## 3. Auth and session

### POST `/api/auth/google`
Request `{ credential: string }` (Google ID token). Response 200 `{ user: { email, name, role }, csrf: string }` and sets cookies. Errors: `AUTH_TOKEN_INVALID` 401, `AUTH_NOT_INVITED` 403, `AUTH_EMAIL_UNVERIFIED` 403.

### POST `/api/auth/logout`
Revokes the session. 204.

### GET `/api/me`
`{ user: { email, name, role }, workspace: { name, configured: boolean, onboarding: { sheet: bool, inbox: bool, outbox: bool, shopify: bool, first_sync: bool } }, theme_hint: null }`

### POST `/api/extension/token`
Editor and above. Response `{ token, expires_at }` (scope `capture`, 30 days).

## 4. Snapshot and sync

### GET `/api/snapshot`
Streams the latest snapshot (gzip). Headers `ETag`, `X-Snapshot-Generated-At`. 304 on `If-None-Match`. 404 `SNAPSHOT_NONE` before the first sync.

### GET `/api/snapshot/meta`
`{ version, generated_at, data_through, sources_ok, sources_late, sync: { status, started_at, trigger } | null }`

### POST `/api/sync`
Owner or Analyst. Request `{ reason?: string }`. Dispatches the GitHub workflow. Response 202 `{ run_id, status: "queued" }`. Errors: `SYNC_ALREADY_RUNNING` 409 (returns current run), `GITHUB_DISPATCH_FAILED` 502.

### GET `/api/sync/runs?limit=10`
`{ items: [{ id, trigger, status, started_at, finished_at, files_parsed, error_code }] }`

## 5. Actions

### GET `/api/suggestions?screen=market&context=rival:Rival%20B`
Suggestions from the latest snapshot joined with any action already started from them: `{ items: [{ ...Suggestion, action?: { id, status } }] }`.

### POST `/api/actions`
Create and run an action.

```json
{
  "type": "amazon_coupon",
  "suggestion_id": "sg_01JA…",           // optional (manual actions have none)
  "screen": "market",
  "params": { "asin": "B0LUMVC301", "sku": "LUM-VC30", "discount_pct": 12, "weeks": 3 },
  "owner_email": "priya@lumora.example",  // optional; default = caller
  "note": "Match Rival B"
}
```

Response 201:

```json
{
  "action": {
    "id": "ac_01JA…", "status": "waiting_on_user", "executor": "handoff",
    "title": "Match Rival B with a 12% Amazon coupon",
    "steps": [
      { "text": "Built the coupon file: 30 ml serum, 12% off, 3 weeks", "done": true, "at": "2026-10-17T10:02:11+05:30" },
      { "text": "Open Seller Central Coupons and upload the file", "done": false }
    ],
    "outputs": [
      { "kind": "drive_file", "label": "Coupon file", "url": "https://drive.google.com/file/d/…" },
      { "kind": "download", "label": "Coupon file (CSV)", "url": "/api/actions/ac_01JA…/outputs/0" },
      { "kind": "link", "label": "Open Seller Central Coupons", "url": "https://sellercentral.amazon.in/coupons/" }
    ],
    "expected": { "inr": 900000, "per": "week", "label": "+₹9 L/wk" },
    "readout_date": "2026-11-07"
  }
}
```

Status after create depends on executor: inline → `done` or `measuring` (or `failed`); job → `running` (poll); handoff → `waiting_on_user`; over threshold → `awaiting_approval`.
Errors: `VALIDATION_FAILED` 400, `ROLE_FORBIDDEN` 403, `APPROVAL_REQUIRED` 202 with `status: awaiting_approval` (not an error for the UI), `CONNECTOR_MISSING` 422 (e.g. Shopify not connected; response includes a handoff fallback when one exists), `EXECUTOR_FAILED` 502.

### GET `/api/actions?status=&period=month&cursor=`
List with summary block:

```json
{ "summary": { "waiting": 2, "run": 5, "expected_month_inr": 11000000, "confirmed_inr": 3800000, "hit_rate": 0.64, "measuring": 4,
               "next_readout": "2026-10-31", "overdue": 1 },
  "items": [ { "id", "title", "how", "screen", "owner", "status", "expected_label", "measured_label", "measured_progress", "readout_date" } ],
  "next_cursor": null }
```

### GET `/api/actions/:id`
Full action with `events[]`, `steps[]`, `outputs[]`, `approval`, `stage` (0–4 for the lifecycle bar), `can: { approve, decline, undo, confirm, retry }`.

### POST `/api/actions/:id/confirm`
Handoff done ("I've done it"). Body `{ note?: string, evidence_url?: string }`. Moves to `done` → `measuring` when a readout exists.

### POST `/api/actions/:id/approve` · `/decline`
Approver or Owner, and not the requester for budget actions above the threshold. Body for decline `{ reason }`. Approve runs the executor immediately.

### POST `/api/actions/:id/undo`
Allowed when `can.undo`. Restores `before_json`. Response has the new status `undone`. Error `UNDO_UNAVAILABLE` 422.

### POST `/api/actions/:id/retry`
For `failed`. Re-runs the executor with the same params and a new attempt number.

### POST `/api/actions/:id/assign`
Body `{ owner_email, due_date? }`. Notifies the owner (Slack, calendar event when connected, in-app).

### GET `/api/actions/:id/outputs/:n`
Streams a generated file (small outputs are kept in KV for 30 days under `out:{action_id}:{n}`; large ones redirect to the Drive file).

## 6. Rules, tests, notifications

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/rules` | Rules with last fired time |
| POST | `/api/rules` | Create (Editor+). Body `{ name, condition, action, params, owner_email }`. Condition is validated by the engine grammar compiled into the Worker (parse only, no evaluation) |
| PATCH | `/api/rules/:id` | `{ status: "on" | "off" }` or edits |
| GET | `/api/tests` | Tests with day N of M, readout date, result when done |
| GET | `/api/notifications` | In-app notifications for the caller |
| POST | `/api/notifications/:id/read` | 204 |

## 7. Market capture (extension)

### GET `/api/watchlist`
Bearer capture token. `{ items: [{ watch_id, label, brand, platform, url, url_pattern, pack_ml }] }`. `url_pattern` is a normalised pattern (host + path without tracking parameters) the extension matches against the active tab.

### POST `/api/capture`
```json
{ "url": "https://www.amazon.in/dp/…", "watch_id": "W05", "platform": "Amazon",
  "captured_at": "2026-10-17T10:41:00+05:30",
  "fields": { "title": "…", "price_inr": 449, "mrp_inr": 690, "rating": 4.2, "review_count": 26112, "in_stock": true,
              "pack_ml": 30, "top_reviews": ["…", "…"] },
  "adapter": "amazon_in@3", "extension_version": "1.0.0" }
```
Response 201 `{ id, merged: true }`. Validation: price between ₹10 and ₹100,000; rating 1–5; at most 10 reviews of 1,000 characters each. Errors `CAPTURE_NOT_ON_WATCHLIST` 422 (still stored as unlisted if the user confirms), `RATE_LIMITED` 429.

### GET `/api/captures?since=<iso>`
Captures newer than the snapshot, for the Market screen to merge live.

## 8. Data

### GET `/api/sources`
Source rows plus onboarding hints.

### POST `/api/uploads`
Editor+. `multipart/form-data` with one file (CSV, XLSX, up to 20 MB). The Worker streams it to the Drive Inbox with a resumable upload (no parsing), then dispatches a sync. Response 202 `{ drive_file_id, sync_run_id }`. Errors `UPLOAD_TYPE_UNSUPPORTED` 415, `UPLOAD_TOO_LARGE` 413, `DRIVE_NOT_SHARED` 422.

### POST `/api/sources/:id/remind`
Body `{ owner_email, time: "09:00" }`. Creates a daily reminder notification until the source is received.

## 9. Admin

| Method | Path | Role | Notes |
| --- | --- | --- | --- |
| GET | `/api/admin/workspace` | Owner | Sheet and folder IDs, settings snapshot, connector status |
| PUT | `/api/admin/workspace` | Owner | `{ sheet_url, inbox_url, outbox_url, archive_url? }` → validates access with the service account, extracts IDs |
| PUT | `/api/admin/connectors/:kind` | Owner | `kind` in `shopify`, `meta`, `slack`, `google_calendar`. Body has config and token; token encrypted before storage |
| POST | `/api/admin/connectors/:kind/test` | Owner | Live check (Shopify `shop { name }`, Meta `me`, Slack test message, Calendar insert-and-delete) |
| GET | `/api/admin/audit?cursor=` | Owner | Audit log |
| POST | `/api/admin/sessions/revoke` | Owner | `{ user_email }` or `{ all: true }` |
| GET | `/api/admin/usage?days=14` | Owner, Analyst | `usage_daily` rows with limits |
| POST | `/api/admin/export` | Owner | Starts a job that writes all facts and logs to Drive Outbox as CSV |
| DELETE | `/api/admin/workspace` | Owner | Requires body `{ confirm: "DELETE <workspace name>" }`; see `04-ADMIN.md` §7 |

### POST `/api/test/login` (staging only)
Exists only when `ENVIRONMENT = "staging"` (compile-time flag). Header `X-E2E-Secret` must equal `E2E_SECRET`; body `{ email }` must be in the Users tab. Returns a normal session. Production returns 404 (tested by API-03).

## 10. Product analytics

### POST `/api/events`
`{ name, props }` batched (up to 20). Demo events carry `demo: true` and no user hash. Names and props in `12-QA-AND-METRICS.md` §6.

## 11. Internal (sync job and action runner)

| Method | Path | Body or response |
| --- | --- | --- |
| POST | `/internal/sync/start` | `{ trigger, github_run_id }` → `{ run_id, workspace, cursors, next_due_at }` or 409 if locked |
| GET | `/internal/config` | Workspace IDs, settings, users, connector configs with `secret_enc`, cursors |
| GET | `/internal/blob/:key` | Raw stored bytes (gzip) or 404 |
| PUT | `/internal/blob/:key` | Raw body stored as is; `X-Content-Sha256` header verified; only `facts:*`, `snap:*`, `out:*` prefixes allowed |
| GET | `/internal/captures?since=` | Captures not yet ingested |
| POST | `/internal/sync/finish` | `{ run_id, snapshot: { version, generated_at, data_through, bytes }, sources: [...], suggestions: [...], rules_fired: [...], readouts: [{ action_id, measured_inr, measured_label, progress, result }], test_updates: [...], usage: {...}, cursors: {...} }` → sets latest pointer, upserts rows, queues notifications |
| POST | `/internal/sync/fail` | `{ run_id, code, detail }` |
| POST | `/internal/actions/:id/report` | From the action runner: `{ status, steps: [...], outputs: [...], error? }` |
| GET | `/internal/actions/:id` | Params for the action runner |



---

<!-- file: docs/08-METHODS.md -->

# 08 · Methods: Metrics, Models and AI

Everything here is implemented in `packages/engine` as pure TypeScript functions with unit tests. No numerical result comes from an AI model. Each output carries `method`, `window`, `evidence` and `confidence` so the UI can explain it.

## 1. Conventions

- **Windows.** "This week" = the last complete Monday–Sunday week (Settings `week_starts_on`). "Last 28 days" = the 28 complete days ending yesterday. Prior windows are the same length immediately before. Demo: week 5–11 Oct 2026, prior 28 Sep–4 Oct; 28 days 19 Sep–16 Oct 2026.
- **Revenue** = `net_revenue_inr` (after discounts, before returns). Margin views (where `unit_cost_inr` and channel fees exist) are labelled "margin".
- **Change** = `(current − prior) / prior`, shown with one decimal; "points" for rates.
- **Good or bad** is per metric (`packages/shared/src/metrics.ts`): up is good for revenue, orders, AOV, buyers, ROAS, LTV:CAC, rating, share, repeat; up is bad for CAC, returns, RTO, stockouts, negative share, discount share, late sources. Flat if |change| < 0.5% (or < 0.2 points).
- **Money display:** < ₹1 L → `₹12,400`; < ₹1 Cr → `₹29 L` / `₹4.6 L`; ≥ ₹1 Cr → `₹4.30 Cr`. Indian digit grouping.

## 2. KPI definitions

| KPI | Formula | Source |
| --- | --- | --- |
| Net revenue | Σ net_revenue_inr | sales_city_daily |
| Orders | Σ orders | sales_city_daily |
| Order value (AOV) | net revenue ÷ orders | |
| Buyers (own site) | distinct customer_key with an order in window | orders_own_site |
| Buyers (marketplaces) | Amazon: Brand Analytics repeat-purchase report unique customers when available; else orders ÷ orders-per-buyer from the last available report; others "n/a" | |
| Customers (Performance KPI) | own-site buyers + Amazon unique customers (when available), labelled with coverage | |
| Orders per buyer | own-site orders ÷ own-site buyers | |
| 90-day repeat | share of own-site buyers whose first order was 91–180 days ago and who ordered again within 90 days of it | |
| Ad spend | Σ spend_inr over all media | spend_city_daily |
| Claimed ROAS | Σ platform_claimed_revenue_inr ÷ Σ spend_inr | |
| True ROAS | Σ real revenue (incrementality, §3) ÷ Σ spend | |
| Real sales from ads | Σ over media of spend × true ROAS | |
| CAC, new buyers (own site) | acquisition spend attributed to own site ÷ new own-site buyers. Acquisition spend = spend on Meta (excluding campaigns tagged retargeting), Google (excluding brand search) and creators, × the share of each medium's real lift that lands on own site (from the model's channel split, default 0.5 / 0.6 / 0.3) | |
| CAC by source | spend on that source × own-site share ÷ new buyers whose acquisition_source = that source | customers_own_site |
| 12-month value (LTV) | mean net revenue in the first 365 days for buyers acquired 365–730 days ago; for younger cohorts, projected by the cohort curve of older cohorts (ratio method). Margin version subtracts unit cost and channel fees | orders_own_site |
| LTV:CAC | 12-month value ÷ CAC | |
| Payback (months) | first month where cumulative margin per buyer ≥ CAC | |
| Return rate | returned_orders ÷ orders | |
| RTO rate | own-site COD orders with status RTO ÷ COD orders | |
| Price per 10 ml | price ÷ pack_ml × 10 | market_captures |
| Category median | median price per 10 ml across the latest capture of each watched product (excluding us) | |
| Search purchase share | Brand Analytics purchase share for the tracked query (default: the category's head term) | search_share_weekly |
| Reply rate | reviews with brand_replied = yes ÷ reviews, last 90 days | reviews |

Golden values for the demo windows are in `sample-data/expected/expected_metrics.json`; engine tests compare exactly (sums) or within 0.001 (ratios).

## 3. Incrementality: what each rupee really did

### 3.1 Evidence hierarchy

For each medium the engine gathers evidence, then combines it:

1. **Planned geo tests** (holdout or boost) read with synthetic control. Weight 1.0 if ended within 120 days, decaying linearly to 0.3 at 365 days.
2. **Natural experiments** detected automatically (§3.3). Weight 0.6 each, same decay.
3. **Media-mix regression** on city × day data (§3.4). Weight 0.4.
4. **Claim-ratio prior** (added 20 Oct 2026): for a platform medium (not creators, whose platforms cannot see most sales they drive), its claimed return × the median real-to-claimed ratio of the media that have experiment evidence. Weight 0.2, 90% range ±60% of the value. It keeps a medium that no test or natural experiment has reached from being shown at, or above, the platform's own claim on the strength of a weak regression alone; any experiment on that medium soon outweighs it. On the demo data it moves Amazon Ads, Flipkart Ads and quick-commerce ads to within 0.4 of their planted returns.

Combined estimate = precision-weighted mean of the available estimates (weight × 1/variance). Interval from the combined variance. Confidence:

- **high**: at least one planned test in the last 120 days and interval width < 60% of the estimate;
- **medium**: natural experiments or a test older than 120 days, or interval width < 100% of the estimate;
- **low**: regression only, or interval width ≥ 100%.

The Impact screen shows the estimate as "₹153 per ₹100" with the interval on hover ("₹118 to ₹190, 90% range") and the evidence text ("three natural experiments and a live holdout in Pune and Ahmedabad").

### 3.2 Synthetic control (geo tests and natural experiments)

Inputs: daily total net revenue per city (all channels, `sales_city_daily`), test cities T (aggregated into one series y_T), donor cities D (cities not affected by the change and not in another live test; exclude cities with allocated rows > 30%).

1. **Pre-period:** 56 days before the change (minimum 28). Normalise each series by its pre-period mean.
2. **Weights:** w ∈ ℝ^|D|, w ≥ 0, Σw = 1, minimising Σ_pre (y_T − Σ w_d y_d)² + λ‖w‖² with λ = 0.01 × mean squared y_T, on 7-day rolling sums of the normalised series (day-to-day noise that cities do not share is smoothed out; trend and seasonality remain). Solve by accelerated projected gradient (FISTA) onto the simplex (Duchi et al. projection), at most 2,000 iterations, tolerance 1e-9. Deterministic start w = 1/|D|.
3. **Fit check (revised 20 Oct 2026):** pre-period RMSPE on the 7-day sums as a share of the treated level; require ≤ 8%, else the estimate is flagged `poor_fit` and confidence capped at low. R² is reported but not used: it is low whenever the pre-period is flat, and on the demo data it rewards shorter windows that move the estimate away from the truth (56 days: RMSPE 6%, ₹1.36 per ₹1, range contains the planted 1.53; 42 days: R² 0.80 but ₹1.03, range misses it).
4. **Effect:** during the test, gap_t = y_T,t − ŷ_T,t (in rupees after de-normalising). Total effect = Σ gap_t over the test plus a carryover tail of 7 days after the test ends (for holdouts the tail captures slow-decaying effects).
5. **Return:** for a holdout (spend removed), real revenue per rupee = −total effect ÷ spend removed, where spend removed = Σ over test days of expected spend in T (pre-period spend share × total media spend) minus actual spend in T. For a boost, = total effect ÷ extra spend.
6. **Interval:** placebo-in-space: run steps 2–5 treating each donor as if it were treated; the distribution of placebo effects (scaled to the same spend) gives a 90% interval around the estimate (5th–95th percentile of estimate + placebo noise). If fewer than 6 donors, use a block bootstrap over weeks of the pre-period residuals.
7. **Guardrails:** test invalid if spend in T did not drop at least 60% of plan (`TEST_NOT_APPLIED`), if a donor had a stockout or sale event in the window (removed automatically), or if a calendar event affects T only.

Expected on demo data: the Pune and Ahmedabad Meta holdout (from 26 Sep 2026) gives an estimate between 0.6 and 2.4 (planted 1.53); see tolerances in `expected_metrics.json`.

### 3.3 Natural-experiment detection

Scan `spend_city_daily` per medium and city:

- **Spend shock:** 7-day rolling spend falls by at least 40% (below 60% of the trailing 28-day median) or rises above 180% of it, for at least 5 consecutive days, while national spend for that medium stays within ±25%. After an event the same city and medium are not scanned for 28 days, so the return to normal is not a second event. (Clarified 20 Oct 2026: "below 40%" could not find the Jaipur brand-search cut that MOD-04 requires, a 45% drop; with this rule the detector finds exactly the three planted events.) Example in the demo: Meta in Kolkata 2–15 Mar 2026 (billing lapse), Meta burst in Hyderabad 1–10 Dec 2025, Google brand-search cut in Jaipur 4–17 Aug 2026.
- **Stockout window** (quick-commerce ads): for stores with stockout = yes, ad spend that ran during stockout days delivered nothing; the share of QC revenue lost vs same-store forecast quantifies the stockout cost (used by the bridge) and the comparison of in-stock vs out-of-stock stores with similar ad spend gives a QC-ads estimate.

Each detected event is read with §3.2 (city as T). Events shorter than 5 days or with pre-fit RMSPE above 8% are dropped.

### 3.4 Media-mix regression (MMM-lite)

Model per city c and day t (all channels' revenue combined, then split back to channels by the lift-split prior):

```
revenue[c,t] = α_c · trend_t · season_t · dow_t  +  Σ_m β_m · adstock(spend[m,c,·], θ_m)[t] · sat_m  +  γ · events[c,t]  +  ε
```

- `adstock(x, θ)[t] = (1−θ) Σ_{k≥0} θ^k x[t−k]` with θ per medium from a grid {0.1, 0.2, …, 0.8}, chosen by cross-validated error.
- Saturation `sat_m = 1 / (1 + (adstock / κ_m))` with κ_m set to the 80th percentile of daily adstocked spend (fixed in v1).
- City baseline α_c, trend (piecewise linear, knots every 90 days), weekly and festival seasonality (Calendar tab + Fourier terms, 3 harmonics yearly).
- β_m ≥ 0 (non-negative least squares by coordinate descent with ridge λ chosen by 5-fold blocked time-series CV).
- **Calibration:** where experiments exist, add a penalty pulling β_m toward the experiment estimate: + μ (β_m − β_exp)² / var_exp with μ = 1.
- Interval: block bootstrap over weeks (200 resamples).
- Window: last 365 days (minimum 120). If history < 120 days, MMM is skipped and the screen says "Not enough history yet; run a test".

β_m is the real revenue per rupee for medium m at current spend. The marginal return at current spend = β_m × d(sat)/d(adstock) evaluated at the last 28-day mean; used by the budget optimiser (§9.2).

### 3.5 Claimed per ₹100 vs real per ₹100

claimed_per100 = 100 × claimed ÷ spend; real_per100 = 100 × true ROAS. Colours: real ≥ ₹250 green, < ₹160 red, else neutral (thresholds in Settings, defaults shown).

## 4. The sales bridge (This week)

Goal: split Δ = revenue(this week) − revenue(prior week) into named drivers that explain at least 80% of Δ.

1. **Baseline forecast** per channel × SKU × city for this week: same-weekday mean of the prior 4 weeks × festival index (ratio of the same calendar window last year to its surrounding 4 weeks, capped 0.7–1.5) × trend factor (28-day vs prior 28-day growth, capped ±10%).
2. **Drivers**, each computed independently and then reconciled:
   - *Rival price cut* (per watched rival with a cut ≥ 5% in the last 21 days): our units on the affected SKU and platform vs baseline after the cut date, minus the same comparison on platforms where the rival did not cut (difference-in-differences). Converted to rupees. Evidence: capture dates and prices.
   - *Rating change* (per platform): rating drop × conversion elasticity to rating (default 0.12 sessions-to-order change per 0.1 star from history regression; fallback 0.10) × sessions × AOV.
   - *Stockouts*: Σ over store-days with stockout of baseline units × price (quick commerce); plus marketplace stock-out days from captures (in_stock = no) × baseline.
   - *Media changes*: Σ_m Δspend_m × true ROAS_m (this week vs prior), split by the medium's lift split.
   - *Planned tests*: effect of running holdouts this week from their synthetic control.
   - *Seasonality*: baseline(this week) − actual(prior week) explained by festival or pre-festival index.
   - *Unexplained*: Δ − Σ drivers.
3. **Reconcile:** if Σ |drivers| > |Δ| × 1.2, scale drivers by the least-squares fit to Δ (keeping signs). Explained % = 1 − |unexplained| ÷ |Δ|, floored at 0. Show "Explains N% of the change".
4. Display top 6 drivers by |value| in ₹ lakh, each tagged with its channel chip; lost in red, added in green. Hover shows method and evidence.

Verdict: Down week if Δ < −2%, Up week if > +2%, else Flat. "₹X of the drop is fixable" = Σ of negative drivers that have a matching suggestion (price, rating, stockout, media mix).

## 5. Performance

- Weekly series for the last 12 complete weeks; revenue stacked by channel; orders, AOV, own-site buyers as single series.
- Channel table over 28 days with growth vs prior 28.
- Channel headline templates (§10) chosen by the largest-magnitude fact for the channel (share change, return rate outlier, growth outlier, stockouts).

## 6. Market analytics

### 6.1 Positioning map (price and rating)
x = price per 10 ml (latest capture per product across platforms: min price), y = rating (latest), bubble area ∝ review count (radius = 14 + 5.2·√(reviews in thousands) px). Lines: category median price per 10 ml (excluding us) and category mean rating (weighted by reviews).

### 6.2 Perception map (what reviews say)
Two axes scored per product from review text (ours from `reviews`, rivals from captured `top_reviews`, accumulated over 90 days):

- **gentle ↔ clinical:** lexicon scores. Gentle terms: gentle, sensitive, no sting, soothing, calm, mild, no redness, natural. Clinical terms: results, clinical, active, percent, strong, dermat, potent, visible, spots. Score = (clinical − gentle) ÷ (clinical + gentle + 5) ∈ (−1, 1).
- **value ↔ premium:** value terms: cheap, affordable, value, budget, worth the price, offer; premium terms: luxury, premium, expensive, worth it, quality, packaging. Plus price position: 0.5 × z-score of price per 10 ml clipped to ±1. Score = 0.5 × lexicon + 0.5 × price.
- Labelled **indicative** when a rival has < 30 reviews collected.
- **Open space:** the quadrant with the lowest product count weighted by reviews; shaded and labelled ("Open space: gentle and premium").

### 6.3 Price change detection
Change on a product-platform when the new capture's price differs ≥ 5% from the median of the previous 3 captures and persists in the next capture (or 24 h passes). Flash deals (< 24 h) are ignored for the "Price changes this week" list but kept in history.

### 6.4 Threat classification (per rival)
- **High:** price cut ≥ 10% in 21 days and our search share or units fell significantly (DiD p < 0.1), or rating ≥ ours + 0.1 with price ≤ ours.
- **Opportunity:** rival raised price ≥ 5% or its rating dropped ≥ 0.1 with an aspect complaint where we score better.
- **Different buyer:** price per 10 ml < 0.65 × ours.
- **Medium / Low:** by distance on the map (Euclidean on normalised axes < 0.25 → medium).

### 6.5 Search share
Weekly purchase share for tracked queries from Brand Analytics; change vs 4-week average; attributed to rival moves by the bridge.

## 7. Customer types (k-means)

### 7.1 Features (per own-site customer with ≥ 1 order in the last 365 days)

| Feature | Transform |
| --- | --- |
| orders in 365 days | log1p |
| mean net order value | log |
| share of orders with a discount code | as is |
| share of orders paid COD | as is |
| share of COD orders that were RTO | as is (0 if no COD) |
| distinct categories bought | min(n, 4) / 4 |
| days since last order | log1p, then negated (recency) |
| days between orders (median, for ≥ 2 orders) | log1p; 365 if one order |

The three shares are shrunk toward the population rate, (count + 2 × rate) ÷ (orders + 2), because most customers have one or two orders a year and raw shares would be only 0 or 1 (added 20 Oct 2026; on the demo data agreement with the planted types rises from 0.18 to 0.21 adjusted Rand). Standardise each feature (z-score). Winsorise at ±3.

### 7.2 Clustering
- k-means++ initialisation with a seeded PRNG (mulberry32, seed 7), 10 restarts, max 300 iterations, tolerance 1e-6; keep the lowest inertia.
- k = 5 by default (stable, explainable). Report silhouette (sampled 2,000 points) for k = 3..7 in the method note; switch k only by Analyst choice.
- Stability: adjusted Rand index vs last run on customers present in both; if < 0.7, show "Groups shifted since last run" in the method note.

### 7.3 Naming and flags
Per cluster compute buyers %, revenue %, AOV, orders a year, repeat %, discount %, COD %, RTO %, CAC (by acquisition source mix), 12-month value, LTV:CAC.

- **Preferred** = highest LTV:CAC (ties: higher revenue %).
- **Problem** = highest (discount customers % + COD customers % + 2 × RTO %) among clusters with LTV:CAC < 2. "Discount customers %" is the share of the type's customers with at least one discounted order this year (likewise COD); the order-based discount % and COD % stay for money estimates.
- Names by rule (first match): orders ≥ 3 and repeat ≥ 60% → "Routine Loyalists"; AOV in top 2 and orders ≥ 1.8 → "Ingredient Explorers"; ≥ 50% of orders in festival windows → "Festive Gifters"; discount customers ≥ 50% and COD customers ≥ 50% → "Deal Hunters"; COD customers ≥ 60% and RTO ≥ 50% → "COD Returners" (added 20 Oct 2026); orders ≈ 1 and repeat < 10% → "One-time Trialists"; else "Type N". Names are editable per workspace (Settings key `segment_names`).
- Acceptance on demo data: the preferred cluster has mean orders ≥ 2.5 and AOV ≥ ₹850; the problem cluster has discount customers ≥ 0.6 and COD customers ≥ 0.6.

### 7.4 Map
x = orders a year (0.5–6.5), y = average order (₹300–₹1,500). Up to 120 sampled customers (stratified by cluster, deterministic) jittered ±0.08 orders; centroid label chips.

## 8. Customer voice

### 8.1 Aspect taxonomy (v1)
`pump_packaging, gentle, results, texture, fragrance, value, delivery, oxidation, size_claim, authenticity`. Each has an English + Hinglish keyword lexicon (`packages/engine/src/voice/lexicon.ts`), e.g. pump: pump, dispenser, nozzle, stuck, leak, "pump kharab", "kaam nahi". 

### 8.2 Tagging
1. **Lexicon pass** (always): sentence split; aspect if a keyword matches; sentiment from a polarity lexicon with negation handling (window of 3 tokens) and the review's star rating as a prior (1–2★ → −1 unless positive words dominate; 4–5★ → +1).
2. **AI pass** (new reviews only, if budget allows): Workers AI `@cf/meta/llama-3.2-3b-instruct` with the prompt in §11.1, temperature 0, JSON output validated by zod. On invalid JSON, retry once, then keep lexicon tags.
3. Merge: AI tags override lexicon tags for the same aspect; lexicon-only aspects are kept if the AI did not mention them and the keyword is unambiguous.
4. Quality gate: on `sample-data/demo/reviews.csv`, aspect agreement with the keyword truth must be ≥ 85% (`12-QA-AND-METRICS.md` AI-01).

### 8.3 Metrics
- Net sentiment per aspect = (positive − negative) ÷ mentions × 100, last 90 days; category value from rival `top_reviews` (indicative) or a configured benchmark.
- Emerging issues: per aspect-term (n-grams of 1–3 tokens within negative mentions), compare count in the last 30 days vs the prior 30; flag if count ≥ 20 and (Poisson test p < 0.01 or new, i.e., prior < 3). First seen = earliest date in the current run of mentions.
- Batch attribution: if an issue starts within 7 days of a known batch dispatch date (Products tab optional `batch_dates`) or concentrates on one SKU (≥ 80%), say so in the headline.

## 9. Recommendations and expected impact

### 9.1 Generation
Each insight type has a rule that emits zero or more suggestions with parameters. Examples (full list in `10-ACTIONS.md` §3):

| Insight | Suggestion | Expected impact formula |
| --- | --- | --- |
| Rival price cut hurting units | `amazon_coupon` matching to within 5% on price per 10 ml | recovered units/week (DiD loss × recovery 0.7) × (price − coupon) − coupon cost on baseline units |
| Medium with low true ROAS, another with high marginal ROAS | `budget_shift` | Δspend × (marginal ROAS_to − marginal ROAS_from), capped by saturation |
| Aspect with rising negative share tied to batch | `qa_hold`, `reply_drafts` | rating recovery 0.1–0.2★ over 6 weeks × rating elasticity × revenue |
| Stockouts in dark stores | `restock_request`, `qc_ads_pause` | lost units/day × days avoided × price; ad spend saved |
| Segment with discount share high and repeat insensitive | `shopify_discount_cap` | Σ discount saved at new cap × (1 − churn uplift 0.05) |
| Under-credited medium with high true ROAS | `budget_increase` (creators) | Δspend × marginal ROAS |
| Low-confidence medium | `geo_test` | value of information = P(decision flips) × |budget at stake × ROAS gap| (shown as "Confidence") |
| Source late | `source_reminder` | data quality (no rupee value) |

**No duplicates of open actions.** A suggestion is not shown while an action with the same type and target is waiting for approval, running, waiting on the user or measuring. Its money is already counted in that action, and showing both double-counts expected impact. The target is the medium pair for `budget_shift` and `budget_change` (any open budget action counts, since they move the same budget), the SKU and platform for price and coupon actions, the segment for discount and offer actions, the city for `restock_request` and `qc_ads_pause`, the batch and aspect for `qa_hold` and `reply_drafts`, and the source for `source_reminder`. The next suggestion moves up into its slot, so This week still shows five when five exist; the open action stays visible on the Actions screen. Declined, undone and expired actions do not block a suggestion; assigned ones do, until they are done or 14 days old.

### 9.2 Budget optimiser (for `budget_shift`)
Greedy reallocation in ₹1 L steps: repeatedly move ₹1 L from the medium with the lowest marginal return to the highest until marginal returns are within 10% or the per-medium change limit (±30% of current) is reached, or the total moved reaches the suggestion size (default ₹30 L). Expected impact = Σ step gains.

### 9.3 Priority
`priority = expected_inr_per_month × confidence_weight (high 1, medium 0.7, low 0.4) ÷ effort (inline 1, handoff 1.5, job 1.2, test 2)`. This week shows the top five across screens; each screen shows the top two for the selected context.

### 9.4 Measurement (readouts)
Each action stores `metric`, `baseline_json` (forecast method and values), `readout_date`. At readout:
- price and listing actions: units of the SKU on the platform vs forecast (other platforms as control, DiD);
- budget actions: revenue vs MMM counterfactual for the changed media;
- discount caps: margin per order and repeat rate for the segment vs the prior equal window and vs the other segments;
- QA and replies: rating trend and aspect share;
- tests: synthetic control.
Result: **hit** if measured ≥ 50% of expected, **partial** 20–50%, **miss** < 20% or negative, **inconclusive** if the interval includes zero and the point estimate is < 50%. Hit rate = hits ÷ (hits + partial + miss).

## 10. Words: inference and headlines

Inference text uses templates with slots, picked by the top facts, so it is deterministic and testable. Example templates (copy deck keys in `09-FRONTEND.md` §10):

- `week.inference.external`: "{share_external} of the drop came from outside your ads: {driver_list}. More ad spend won't fix them."
- `impact.headline.overclaim`: "{medium} claims ₹{claimed_per1} for every ₹1; the real figure is ₹{real_per1}. {reason}"
- `market.headline.price_cut`: "{rival} cut its price {pct}% on {date} and took {pts} points of your {platform} search share."
- `customers.headline.problem`: "{buyers_pct}% of buyers, {revenue_pct}% of revenue. They wait for discounts, pay cash, and {rto_pct}% of orders come back."

Optional AI polish (Settings `ai_polish = on`): the template output is passed to the model with "Rewrite in plain English for a busy CMO, max 30 words, keep every number exactly" and the result is accepted only if every number in the original appears unchanged; otherwise the template text is used.

## 11. AI prompts (Workers AI)

Model selection order: `@cf/meta/llama-3.2-3b-instruct` (classification, short drafts), fallback `@cf/meta/llama-3.1-8b-instruct-fp8-fast` (longer drafts). Check the model catalog at build time; names live in `packages/shared/src/ai.ts`. Neuron estimates per call are logged to `usage_daily`.

### 11.1 Review aspect tagging (batch of up to 20 reviews)

```
System: You label customer reviews of a skincare product. Use only these aspects:
pump_packaging, gentle, results, texture, fragrance, value, delivery, oxidation, size_claim, authenticity.
For each review return the aspects it mentions and the sentiment for each (-1 negative, 0 neutral, 1 positive).
Return JSON only: {"items":[{"id":"...","aspects":[{"aspect":"...","sentiment":-1}]}]}. No other text.
User: <JSON array of {id, rating, text}>
```

### 11.2 Review reply draft

```
System: You draft short, polite replies from a skincare brand to customer reviews. Rules: thank the customer,
acknowledge the specific issue in plain words, offer the remedy given, give the support email, never admit legal
liability, never mention other brands, max 60 words, Indian English. Return JSON {"id":"...","reply":"..."}.
User: {"id":"R000123","rating":2,"text":"Pump stopped working after a week","remedy":"free replacement pump",
"support_email":"care@lumora.example"}
```

### 11.3 Brief drafts (R&D, creator, QA hold)
Templates with headings filled by code (facts, numbers, quotes); the model only writes the two-paragraph summary from the bullet facts, with the same "keep every number" check.

### 11.4 Budget governor
Before each call: `estimated_neurons = in_tokens × in_rate + max_out_tokens × out_rate` (rates per model in `ai.ts`). If today's total + estimate > 8,000, skip (lexicon fallback or queue the draft job for tomorrow with a visible note).



---

<!-- file: docs/09-FRONTEND.md -->

# 09 · Frontend: Design System, Screens and Copy

The designs are the visual truth: `design/screens/*.png` (light and dark), `design/static-html/*.html` (exact inline styles you can open in a browser and inspect), and `design/prototype-source/*.dc.html` (prototype behaviour). Build to match them; the visual regression suite compares rendered screens with the PNGs (`12-QA-AND-METRICS.md` §5).

## 1. Stack and structure

- React 18, TypeScript (strict), Vite, React Router, TanStack Query (snapshot, actions), zod (runtime validation of snapshot and API responses).
- No UI framework and no chart library. Charts are small hand-built SVG/CSS components (the designs use positioned bars, dots and lines; this keeps bundle size under 250 KB gzip).
- Styling: CSS custom properties (tokens below) + CSS Modules. Inline `style` only for computed geometry (bar widths, dot positions).
- Font: Archivo (400–900) self-hosted via `@fontsource/archivo` (no Google Fonts request at runtime).
- Icons: inline stroke SVG components (no emoji in UI chrome; the ☀/☾ glyphs in the theme switch are text and may be replaced with SVG).

```
apps/web/src/
  app/ (router, providers, ThemeProvider, SnapshotProvider, DemoProvider)
  screens/ (Home, ThisWeek, Actions, Performance, Impact, Market, Customers, Voice, DataSources, SignIn, Onboarding, DataGuide, Sandbox)
  components/ (Sidebar, Header, SummaryStrip, KpiCell, DeltaChip, Sparkline, Panel, InsightCard, ActionCard, ActionList,
               DataTable, SelectableRow, Bridge, StackedBars, ClaimVsReal, PositionMap, CustomerMap, DivergingBars,
               LifecycleBar, StepList, Toggle, Tabs, Tooltip, Toast, ConfirmInline, EmptyState, ErrorState, Skeleton)
  lib/ (format.ts money and numbers, tone.ts good/bad, api.ts, idempotency.ts, analytics.ts, copy.ts)
  styles/ (tokens.css, base.css)
```

## 2. Tokens

Defined on `.dr-root` (light) and `.dr-root[data-theme="dark"]`. Theme selection: stored in `localStorage["drishti-theme"]` (wrapped in try/catch); default follows `prefers-color-scheme`. The sidebar is navy in both themes.

| Token | Light | Dark | Used for |
| --- | --- | --- | --- |
| `--bg` | `#F4F6FB` | `#0A0F1F` | Page background |
| `--surface` | `#FFFFFF` | `#121933` | Panels, KPI cells |
| `--sunken` | `#F4F6FB` | `#1A2241` | Action cards, inner wells |
| `--ink` | `#151A30` | `#E9ECF8` | Primary text |
| `--ink-2` | `#3A4160` | `#C4CAE2` | Secondary text |
| `--muted` | `#4A5172` | `#9AA3C6` | Labels, captions |
| `--muted-2` | `#6B7290` | `#8189AD` | Faint numbers (claimed values) |
| `--line` | `#E4E7F0` | `#252E50` | Borders, dividers |
| `--line-2` | `#DDE1EC` | `#303A60` | Pill button borders |
| `--line-3` | `#C9CFE3` | `#3A4570` | Secondary button borders, category bars |
| `--line-soft` | `#F0F2F7` | `#1B2340` | Table row dividers |
| `--chip` | `#EEF0F6` | `#222B4D` | Neutral chip background |
| `--plot` | `#FBFCFE` | `#0F1630` | Chart plot area |
| `--sel` | `#F1F4FF` | `#1E2A57` | Selected row |
| `--strong` | `#141B45` | `#E9ECF8` | Strong outline, selected marks |
| `--link` | `#2A4BC4` | `#8FA6FF` | Links |
| `--primary` | `#1E2A6E` | `#3346B8` | Primary buttons, insight card |
| `--primary-2` | `#26337D` | `#4053C4` | Insight card cells |
| `--side` | `#141B45` | `#0E1430` | Sidebar |
| `--good` | `#0B7A3E` | `#45D483` | Good text |
| `--good-bg` | `#E5F5EC` | `#123A28` | Good chip background |
| `--good-soft` | `#EFF8F2` | `#0F2A1F` | Good panel / verdict background |
| `--good-chip` | `#CDEBD8` | `#17492F` | Good verdict chip |
| `--good-strong` | `#0B6332` | `#5FE39A` | Good verdict chip text |
| `--good-line` | `#8FCDA8` | `#2F7A52` | Good dashed borders |
| `--bad` | `#B42318` | `#FF8A7A` | Bad text |
| `--bad-bg` | `#FDECEB` | `#3D1A1C` | Bad chip background |
| `--bad-soft` | `#FFF3F1` | `#24141C` | Bad panel / verdict background |
| `--bad-chip` | `#FBD9D5` | `#4A1E22` | Bad verdict chip |
| `--bad-strong` | `#9E1C12` | `#FFA597` | Bad verdict chip text |
| `--warn` | `#8A5300` | `#F2B544` | Warning text |
| `--warn-bg` | `#FFF4DB` | `#3A2C10` | Warning chip background |
| `--warn-soft` | `#FFF8EB` | `#221C10` | Warning verdict background |
| `--warn-chip` | `#FDE7BF` | `#4A3812` | Warning verdict chip |
| `--amz-bg` | `#FDEEE7` | `#3A2216` | Amazon channel chip |
| `--amz-ink` | `#8A3412` | `#FFA77A` | Amazon chip text |
| `--qc-bg` | `#E3F6EE` | `#10362A` | Quick-commerce chip, running status |
| `--qc-ink` | `#0E6145` | `#5EE0B0` | Quick-commerce chip text |
| `--own-bg` | `#E7F0FB` | `#172A47` | Own-site chip, running status |
| `--own-ink` | `#1A4E8F` | `#8DBBFF` | Own-site chip text |
| `--blue-text` | `#1F5FB0` | `#7DB2F5` | Preferred-type value |
| `--orange-text` | `#C04A0A` | `#FF9450` | Problem-type value |

**Fixed colours (both themes)**

| Use | Value |
| --- | --- |
| Signal red (logo full stop, brand) | `#FF2E2E` |
| Channel: Own site | `#2A78D6` |
| Channel: Amazon | `#EB6834` |
| Channel: Quick commerce | `#1BAF7A` |
| Channel: Nykaa | `#EDA100` |
| Channel: Flipkart | `#E87BA4` |
| Bridge lost / added | `#D03B3B` / `#0CA30C` |
| Preferred / problem / other (Customers, Market) | `#2A78D6` / `#E8590C` / `#9AA3C2` |
| Insight card inner text | `#FFFFFF`, muted `#C9D1F2`, evidence `#DCE2F7` |
| Threat badges on the insight card | High `#C2341F`, Medium `#A0620B`, Opportunity and Strength `#16794A`, You `#2A78D6`, neutral `rgba(255,255,255,0.18)` |
| Progress (lifecycle, measured) | `#5FE39A` on `rgba(255,255,255,0.18)` |

Channel colours always follow the entity, never the rank. Never rely on colour alone: each chart has labels or a legend with text, and every good/bad chip has ▲/▼ and words.

## 3. Type scale (Archivo)

| Role | Size / weight | Notes |
| --- | --- | --- |
| Wordmark | 28 / 900, letter-spacing −0.045em | `drishti` + red `.` |
| Page title (h1) | 28 / 800, −0.02em | |
| Page subtitle | 16 / 400, `--muted` | one line |
| Panel title (h2) | 19 / 700 | |
| KPI value | 29 / 700, −0.03em, nowrap, tabular figures | |
| KPI label | 14 / 400, `--muted` | max one line; shorten labels rather than wrap |
| Verdict text | 17 / 700, line-height 1.35 | max three lines |
| Insight headline | 18 / 600 | max three lines |
| Body, table cells | 15 / 400–700 | tabular figures for numbers |
| Small, chips, captions | 13 / 400–700 | |
| Minimum anywhere | 12 | |

## 4. Layout grid (desktop)

- Frame 1440 × 900, no page scroll. Root grid: `188px` sidebar + content.
- Content: padding 20 px 24 px; rows `50px` (header) / `124px` (summary strip) / `1fr` (body); gap 14 px.
- Summary strip: `268px` verdict cell + 6 equal KPI cells, 1 px dividers (`--line`), radius 20.
- Body: two columns `1.3fr | 1fr`, gap 14. Left: visualisation (top) and analysis (bottom), heights per screen (below). Right: insight card (auto height) and actions panel (fills; footer pinned with `margin-top: auto`).
- Panels: `--surface`, 1 px `--line` border, radius 20, padding 16–22.
- Widths between 1280 and 1920: the frame scales proportionally (CSS `zoom` fallback to `transform: scale()` on a fixed 1440 × 900 stage, centred, letterboxed with `--bg`). Below 1280 px or on touch devices with width < 900: a read-only summary page (Phase 3) and a note "Drishti works best on a laptop or desktop".

## 5. Components

| Component | Behaviour and states |
| --- | --- |
| Sidebar | Mark (lift eye) + wordmark, "by PreQL"; workspace button (name + "Demo, fictional data" in demo); nav links 46 px high, active = white pill with navy text, `aria-current="page"`; theme switch (Light/Dark segmented, `aria-pressed`); footer "Your data stays in your own accounts. Synced today, 7:10 am." |
| Header | h1 + subtitle; right: period and filter pills (Last week ▾, All channels ▾, All products ▾) and one primary button per screen |
| SummaryStrip | Verdict cell with tone background (`--bad-soft`, `--good-soft`, `--warn-soft`) and chip; 6 KpiCells |
| KpiCell | label, value, DeltaChip, optional sparkline (8 points, 50 px, last point coloured by tone), optional note chip ("claims 4.0x", "Target 3x") |
| DeltaChip | ▲/▼/● + value; colours from tone (good → `--good-bg`/`--good`; bad → `--bad-bg`/`--bad`; neutral → `--chip`/`--muted`) |
| InsightCard | navy card (`--primary`): small title "What this means…", confidence or threat badge, headline, 2–3 stat cells (`--primary-2`), evidence line or quotes |
| ActionCard | title, impact chip, why, buttons: primary run (label from suggestion), secondary Assign, optional Evidence link. States below |
| ActionList (This week) | accordion: one expanded, others one-line rows with dot (lost red / added green) and impact chip |
| DataTable / SelectableRow | rows are `<button aria-pressed>`; selected row `--sel` background; numbers right-aligned tabular |
| Bridge | prior and now dashed lines with labels; bars positioned on a ₹ axis; channel chip per driver; values right in ₹ lakh; caption "Explains N% of the change" |
| StackedBars | 12 weeks, channel stacks with 2 px gaps, earlier weeks opacity 0.45, metric tabs; non-revenue metrics as single-colour bars |
| ClaimVsReal | per channel two bars (claimed `--line-3`, real `--primary`), values right (claimed small muted, real bold coloured) |
| PositionMap | price per 10 ml × rating, bubbles; toggle to perception map with open-space shading; labels flip left when x > 80% |
| CustomerMap | sampled dots by type, centroid chips (buttons), axes labelled |
| DivergingBars | zero centre line; us bar (blue, red if negative) and category bar (`--line-3`) |
| LifecycleBar | 5 segments: Suggested, Approved, Running, Measuring, Result |
| StepList | numbered steps with ✓ for done and timestamps |
| Toggle (privacy) | `role="switch"` `aria-checked` |
| Toast | bottom-right, 4 s, used for "Updated just now", errors with Retry |

### 5.1 ActionCard states (every action button must do something)

| State | Visual | Trigger |
| --- | --- | --- |
| idle | primary navy button with run label ("Create coupon") | default |
| confirm | card expands inline: "This will:" numbered steps from `suggestion.steps`, expected impact, approval note if needed; buttons **Run** and **Cancel** | click run label |
| running | button shows spinner + "Working…"; steps tick as events arrive (poll `GET /api/actions/:id` every 2 s, max 2 min, then "Still working — we'll notify you") | Run |
| waiting_on_user | button "I've done it"; outputs listed (download, open link); | handoff executor |
| awaiting_approval | chip "Waiting for approval" + approver name; for Approvers the card shows Approve / Decline | over threshold |
| done | green pill "✓ {doneLabel}" + link "View in Actions" | success |
| failed | red text with the error message and **Retry** | error |
| undone | grey "Undone" | from Actions |

Demo mode runs the same states with simulated timings (600 ms per step) and stores actions in memory (and sessionStorage, wrapped in try/catch) so the Actions screen shows them.

## 6. Screens (data bindings refer to the snapshot schema in `06-DATA-MODEL.md` §6)

Each screen: Summary strip → Visual → Analysis → Inference → Suggested actions. Heights are for 1440 × 900.

### 6.0 Home (`/` when signed out) — revised 20 Oct 2026
No design PNG; uses the same tokens and both themes. **One screen, no page scroll, on desktop and on phones**: the page fills the window (`100dvh`) instead of the scaled 1440 × 900 stage, and checks no scroll at 1440 × 900, 1280 × 720 and 390 × 844.
- **Top bar:** the lift-eye mark (its red pupil follows the pointer and it blinks), wordmark, "A PreQL project", Light/Dark switch, Open the demo.
- **Hero:** eyebrow, the title "See what really worked." with "really" animated, a rotating line naming the four jobs (measures what each ad rupee really earned; watches rival prices, ratings and stockouts; turns every insight into a one-click action; proves whether each action paid off), one-paragraph lead, and **claims vs reality**: animated bars and counting numbers for what ad platforms claimed against what the brand sold (demo snapshot, labelled fictional).
- **Game, "Spot the real rupee":** four quick rounds built from the demo snapshot (real return of the most over-claimed medium; the biggest driver of the week; the problem customer type; the high-threat rival). Each answer reveals the measured fact with a "See it in the demo" link. Gamification: XP per right answer, a streak bonus, three levels (Curious, Sharp-eyed, Drishti-sighted), one badge per skill that lights up when earned, confetti on a right answer, a score ring at the end and the best score kept in `localStorage` (try/catch). The game only chooses which facts to ask; every number comes from the snapshot. A round is skipped when its data is missing (for example a placeholder segment name).
- **Footer strip (desktop):** How it works in three steps (Connect, Measure, Act and prove), a marquee of the channels Drishti covers, "Free. No card. Your data stays in your own accounts."
- **Buttons and links:** **Open the demo** (`/demo`), **Set up your workspace** (the setup guide until `/onboarding` ships in M4), **Download the sample sheet** (`/samples/Drishti-Workspace-Template.xlsx`), **What data Drishti needs** (`/guide` from M5), and **Analyse your company** (`/try`, decided 20 Oct 2026: built straight after M3).
- **Phones:** the hero, claims card, Open the demo and the game stack in one screen; the footer strip and secondary links hide; after an answer the question and wrong options fold away so the explanation and Next fit. The note "The full workspace is best on a laptop or desktop." sits under the button, since the eight screens stay a desktop layout.
- **Motion:** entrance fades, the shimmer, rotator, bar race, card flips, confetti, pulsing Play and marquee are decorative. All of it stops under `prefers-reduced-motion`, and the tests run with reduced motion.
- Signed-in users at `/` see This week instead.

### 6.1 This week (`/` when signed in, `/demo` in the demo, `snapshot.week`) — design `01-this-week-*.png`
- Left top (fills): Bridge from `week.bridge`; header "What moved sales ₹ lakh", legend Lost/Added.
- Left bottom (fixed ~286 px): two panels side by side: Working (`--good-soft`, ▲ title, 3 items) and Needs attention (`--bad-soft`, ▼ title, 3 items).
- Right top: InsightCard "What this means" with `week.inference`.
- Right bottom: ActionList "Suggested actions", "{done} of {n} done · Action log".

### 6.2 Actions (`/actions`, `GET /api/actions`) — design `02-actions-*.png`
- Summary: waiting chip and reason; Actions run; Expected impact; Confirmed so far; Hit rate (target 60%); Being measured (next readout); Overdue.
- Left (fills): Action log table: Action (title bold, how small muted, wraps to two lines), From, Owner, Status chip (Waiting amber, Running/Measuring blue, Done green, Scheduled grey, Overdue red, Undone grey), Expected, Measured (green if positive, red if late).
- Right top: navy card: executor line, source screen badge, title, LifecycleBar, measured vs expected block with progress and readout note.
- Right bottom: "What Drishti did" StepList with owner; footer buttons Approve and run (if allowed), Undo, Open {output}.

### 6.3 Performance (`/performance`, `snapshot.performance`) — design `03-performance-*.png`
- Left top: weekly chart with tabs; caption summary line (one line, max ~60 characters).
- Left bottom: channel table (selectable), short channel labels ("Quick com.").
- Right: InsightCard "What this means for {channel}" with bullet notes; two actions; footer share-of-revenue bar (selected channel full opacity, others 0.3).

### 6.4 Impact and ROI (`/impact`, `snapshot.impact`) — design `04-impact-roi-*.png`
- Left top: ClaimVsReal per ₹100 (6 channels), selectable.
- Left bottom: New-buyer cost and payback table (source, cost per buyer, 12-month value, value to cost chip, payback coloured).
- Right: InsightCard (headline, spend/claimed/real cells, evidence); two actions; footer running test progress.

### 6.5 Market (`/market`, `snapshot.market`) — design `05-market-*.png`
- Left top: PositionMap with segmented toggle "Price and rating" / "What reviews say".
- Left bottom (300 px): Similar products table (Product with dot, Where, Price, 14 days chip, Per 10 ml, Rating, Reviews).
- Right: InsightCard "What this means: {label}" with threat badge, per-10-ml/rating/says cells; two actions; footer "Price changes this week".

### 6.6 Customers (`/customers`, `snapshot.customers`) — design `06-customers-*.png`
- Left top: CustomerMap with legend Preferred/Problem/Others.
- Left bottom (262 px): type table (Type, Buyers, Revenue, Avg order, Orders/yr, Repeat, CAC, LTV:CAC chip).
- Right: InsightCard with tag (Preferred, Problem, Launch audience, Seasonal, Losing money), discount/COD/12-month value cells; two actions; footer method note.

### 6.7 Customer voice (`/voice`, `snapshot.voice`) — design `07-customer-voice-*.png`
- Left top: DivergingBars "What buyers talk about, net sentiment", legend You/Category, column headers, footnote with the definition.
- Left bottom (248 px): New and growing complaints table.
- Right: InsightCard with tag (Fix now, Strength, Behind, Watch, At par) and two quotes; two actions.

### 6.8 Data sources (`/data`, `snapshot.sources` + `GET /api/sources`) — design `08-data-sources-*.png`
- Summary: Up to date n of 13; Revenue covered; History; Rows stored; Third parties None; Cost ₹0.
- Left (fills): Sources table (Source, How we get it, How often, Status chip).
- Right: navy card "How we get it: {source}" (how, feeds, last received, rule); actions per source; footer Privacy mode switch.
- Header buttons: Upload a file; Request missing files.
- Until the workspace is configured, the table is replaced by an onboarding progress card (Sheet, Inbox, Outbox, Shopify optional, first sync) with "Continue setup" opening the wizard at the first unfinished step.

### 6.9 Sign in (`/signin`) — design `brand/logo-board-InUse.png`
Centered card: mark, "Sign in to drishti.", one-line description, "Continue with Google" (GIS button styled per Google brand rules), link "Or open the demo with fictional data".

### 6.10 Onboarding wizard (`/onboarding`, Owner)
Same frame as the screens (sidebar + content). Left: a step list with ✓ for done steps; right: the current step. Progress is saved in D1 (`GET /api/me` `onboarding` flags) so the wizard resumes where the Owner left off.
1. **Get the template:** download `Drishti-Workspace-Template.xlsx`; import it as a Google Sheet named "Drishti Workspace" (File → Import → Upload → Replace spreadsheet). A short table lists every tab and what goes in it.
2. **Create folders:** "Drishti Inbox", "Drishti Outbox", "Drishti Archive" in Google Drive.
3. **Share:** the service account email with a Copy button; share the Sheet and the three folders with it as Editor.
4. **Paste links:** Sheet URL and folder URLs; each is checked live (`PUT /api/admin/workspace`) and shows a green tick or the exact fix (`SHEET_NOT_SHARED`, `DRIVE_NOT_SHARED`).
5. **Connect Shopify (optional):** store domain and token, Test; or Skip.
6. **Add your first data:** which sources to start with (by the channels you sell on), a link to the data guide, then **Sync now**; the step shows sync progress and ends with "Open This week".

### 6.11 Data guide (`/guide`, public)
One row per source (the 13 file sources and the Sheet tabs): what it feeds, where to export it on the platform (menu path), how often, required columns with accepted aliases (from `11-CONNECTORS.md` §3), and **Download sample** (`/samples/<file>`). **Check my file:** drop a file and the engine (in the browser, nothing uploaded) says which source it is, how many rows parsed, the date range, and any missing columns with the fix. Signed-in Editors and above also get **Upload to Inbox** (`upload_file`).

### 6.12 Sandbox (`/try`, public, no login)
A drop zone ("Drop your filled template or exports here. Files stay in this browser."), a list of detected files (source, rows, dates, warnings), a coverage checklist of which screens have enough data, and **Show my screens**, which opens the eight screens at `/try/<company>/*` on the locally built snapshot. Header chip "Your files, this browser only"; **Clear my data**. See `05-SYSTEM-DESIGN.md` §14.
- **Two ways in, side by side:** **Link a Google Sheet** (paste a link; the hint shows how to share it as "Anyone with the link can view") and **Drop files**. A company can mix both. Linked sheets show the sheet name, the tabs Drishti recognised and "Fetched {time}"; **Refresh** (also in the screens' header chip) fetches them again and the screens rebuild. Unrecognised tabs are listed with their headers.
- **Companies (added 20 Oct 2026):** the sandbox keeps several companies side by side in this browser. **Your companies** lists each one (name, sources, data through, last updated) with Open, Update data, Rename and Delete; **Add a company** starts a new one. **Update data** reopens the drop zone for that company: a dropped file replaces the earlier file of the same source, other sources stay, and the screens rebuild at once. In the screens, the workspace menu switches company and links back to the list; the sidebar logo goes to the home page.

## 7. Data loading, polling and states

- On load: `GET /api/me` → if not signed in: `/` shows Home; `/demo/*`, `/try/*`, `/guide` and `/signin` stay public; any other route redirects to `/signin`. Then `GET /api/snapshot` (ETag) → validate → render. Cache the last good snapshot in IndexedDB.
- Poll `/api/snapshot/meta` every 60 s when visible; on new version fetch and swap; Toast "Updated just now".
- Loading: skeletons that keep the exact layout (no layout shift). Empty (before first sync): each screen shows its frame with a centred EmptyState "No data yet. Connect your Sheet and run the first sync" linking to Data sources.
- Errors: inline ErrorState in the panel that failed; global Toast for network errors with Retry.
- Stale data: if `data_through` is older than 26 hours, the footer chip turns amber "Data is from {date}".

## 8. Accessibility

- All interactive elements are native `<button>`, `<a href>`, `<input>`; selectable rows are buttons with `aria-pressed`; tabs use `role="tablist"`/`tab` with `aria-selected`; the privacy switch is `role="switch"`.
- Visible focus ring: 2 px `#2A78D6`, offset 2.
- Contrast: all text ≥ 4.5:1 in both themes (checked by axe in CI); chip text uses the strong token on the tinted background.
- Charts: each SVG/chart has `role="img"` with an `aria-label` summary, and the same numbers are present in an adjacent table or list (the screens already pair every chart with a table).
- Reduced motion: on the eight screens, no animation beyond 150 ms transitions. The home page (§6.0) is the one place with decorative motion. Everything respects `prefers-reduced-motion`.
- Keyboard: `g` then `1`–`8` jumps to screens (shown in a help popover); no global single-key shortcuts.

## 9. Formatting rules

- Money: `formatInr(v, {compact: true})` → "₹4.30 Cr", "₹29 L", "₹12,400"; ROAS "2.0x"; per ₹100 "₹153"; percentages one decimal unless ≥ 10 ("6.5%", "21%"); points "1.2 points".
- Dates: "17 Oct", "5 to 11 October 2026"; times "7:10 am".
- Never show more than one decimal in KPI values; tables may show two for ratios.

## 10. Copy deck (`packages/shared/src/copy.ts`)

All user-facing strings, keyed. Examples (full deck generated from the designs; keep wording):

| Key | Text |
| --- | --- |
| app.tagline | See what really worked. |
| nav.week / actions / performance / impact / market / customers / voice / data | This week / Actions / Performance / Impact and ROI / Market / Customers / Customer voice / Data sources |
| nav.footer | Your data stays in your own accounts. Synced {when}. |
| demo.workspace | Demo, fictional data |
| theme.light / theme.dark | Light / Dark |
| week.subtitle | {range}, against the week before |
| week.bridge.title | What moved sales |
| week.bridge.caption | Explains {pct}% of the change |
| week.working / week.attention | Working / Needs attention |
| week.inference.title | What this means |
| actions.title / subtitle | Actions / Every button you pressed, what Drishti did, and whether it paid off. |
| actions.did | What Drishti did |
| actions.lifecycle | Suggested, Approved, Running, Measuring, Result |
| action.confirm.lead | This will: |
| action.run / cancel / done_link | Run / Cancel / View in Actions |
| action.handoff.confirm | I've done it |
| action.waiting_approval | Waiting for approval from {name} |
| action.failed | Couldn't finish: {reason} |
| impact.subtitle | Last 28 days. Real sales = sales that would not have happened without the ad. |
| impact.claim_vs_real.title | Sales per ₹100 of ad spend |
| market.subtitle | {category} on Amazon, Flipkart and Nykaa. {n} products on your watchlist. |
| market.map.price / perception | Where you sit: price against rating / Where you sit: how reviews describe you |
| customers.method | Grouped with k-means ({k} groups, {n} buying signals) on own-site buyers. Marketplaces do not share who bought, so they are left out. |
| voice.netsentiment.note | Net sentiment = % positive minus % negative mentions of each topic. |
| data.subtitle | Where every number comes from. Data stays in your own Google and Cloudflare accounts. |
| data.privacy | Privacy mode / Hide customer names and phone numbers everywhere |
| empty.no_data | No data yet. Connect your Sheet and run the first sync. |
| stale.footer | Data is from {date} |
| signin.title / body | Sign in to drishti. / See which rupee really worked, what rivals changed and what to do next. |
| signin.demo | Or open the demo with fictional data |
| home.lead | A free marketing intelligence workspace for D2C brands that sell on their own site, Amazon, Flipkart, Nykaa and quick commerce. |
| home.how.title / steps | How it works / Connect your sheet and exports. · Drishti measures what really worked. · Act from every screen and see if it paid off. |
| home.cta.demo / try / setup | Open the demo / Analyse your company / Set up your workspace |
| home.sample / guide / free | Download the sample sheet / What data Drishti needs / Free. Your data stays in your own accounts. |
| onboarding.title | Set up your workspace |
| guide.title / subtitle | What data Drishti needs / Every source, where to export it, and a sample file for each. |
| guide.check | Check my file |
| try.title / drop / chip / show / clear | Try with your own data / Drop your filled template or exports here. Files stay in this browser. / Your files, this browser only / Show my screens / Clear my data |



---

<!-- file: docs/10-ACTIONS.md -->

# 10 · The Action Engine

**Principle:** every button does something real, visible and logged. In the prototype the buttons only turned green; in the product each one creates an action record, performs its executor's steps, produces an output the user can open, and is measured against its expected impact at a readout date.

## 1. Executor kinds

| Kind | What "doing it" means | Where it runs | Examples |
| --- | --- | --- | --- |
| **execute** (inline API) | Drishti calls an API that changes something, saving the previous value for undo | Worker | Shopify discount caps, Shopify segment discounts, Meta ad set budget or pause (Phase 2), Slack post, Calendar event, Sheet log |
| **prepare** (handoff) | Drishti builds a ready-to-use file or text, saves it to Drive Outbox, downloads it, opens the exact platform page, and waits for the person to confirm "I've done it" | Worker (small) or action runner (large) | Amazon coupon file, Amazon Ads bulk sheet (bids, competitor targeting), listing copy for each platform, Google Ads location exclusions, Flipkart claim list, quick-commerce pause list |
| **test** | Drishti designs a geo test (cities, duration, minimum detectable effect), exports the settings, tracks it daily, and reads it out automatically | Action runner + sync | Brand-search pause, Meta holdout, creator boost |
| **rule** | Drishti adds a monitoring rule that is evaluated every sync and notifies or prepares an action when it fires | Worker (create), sync (evaluate) | Price alerts, stockout ad pause list, source late reminders |
| **task** | Drishti assigns an owner and due date, notifies them (Slack, Calendar, in-app) and tracks completion | Worker | QA hold, restock request, ask the team to update a sheet |
| **draft** | Drishti writes a document with numbers filled by code and words drafted by Workers AI, saves it to Drive Outbox, and assigns review | Action runner | R&D brief, creator brief, review replies, Diwali campaign brief, QA hold note |
| **data** | Drishti moves data: uploads to the Inbox, triggers a sync, exports hashed audiences | Worker or action runner | Upload a file, Request missing files, Export audience |

Platform write access in v1 (free, no approval): **Shopify** (custom app on the brand's store or a development store), **Google** (Drive, Sheets, Calendar via the service account), **Slack** (incoming webhook). Phase 2 adds **Meta** (development-mode app on the brand's own ad account). Amazon, Flipkart, Nykaa and quick-commerce platforms have no free self-serve write APIs for this use, so their actions are **prepare** actions with exact files and links.

## 2. Common contract

Every action type is a module in `apps/worker/src/actions/types/<type>.ts` (and, for job executors, `apps/sync/src/actions/<type>.ts`) exporting:

```ts
export const def: ActionDef = {
  type: 'amazon_coupon',
  kind: 'prepare',
  executor: 'inline',                 // inline | job | handoff (handoff = prepare + confirm)
  phase: 1,
  roles: ['Owner', 'Approver', 'Analyst', 'Editor'],
  params: z.object({ asin: z.string(), sku: z.string(), discount_pct: z.number().min(5).max(40), weeks: z.number().int().min(1).max(8) }),
  needsApproval: (p, ws) => false,     // budget and price actions compare against ws.settings.approval_threshold_inr
  steps: (p) => [ /* human-readable steps shown in the confirm view */ ],
  run: async (ctx, p) => { /* do the work, emit ctx.step(...), ctx.output(...) */ return { status: 'waiting_on_user' } },
  undo: undefined,                     // or async (ctx, before) => {...}
  measure: { metric: 'units_sku_platform', windowDays: 21, method: 'did_vs_other_platforms' },
};
```

`ctx` gives: `step(text)`, `output({kind, label, url | bytes})`, `drive.saveFile(name, mime, bytes)`, `sheet.appendAction(row)`, `notify(user, text, link)`, `calendar.event(...)`, `shopify.graphql(...)`, `meta.post(...)`, `kv`, `db`, `now()`. All calls are mocked in tests.

Universal steps added by the engine (not repeated per type): log to D1 and the Actions tab, notify the owner, schedule the readout (calendar event "Readout: {title}" when Calendar is connected), audit.

## 3. Catalogue (every button in the designs)

| Type | Button label(s) | Screen(s) | Kind / executor | Phase | Output | Undo | Measured by |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `amazon_coupon` | Create coupon | This week, Performance, Market, Voice | prepare / handoff | 1 | Coupon CSV (ASIN, discount %, dates, budget) in Outbox + download; link to Seller Central Coupons; checklist | n/a (platform) | units of ASIN on Amazon vs forecast, other platforms as control, 21 days |
| `qa_hold` | Raise QA hold, Put batch on hold | This week, Voice | task + draft / inline | 1 | QA hold note (Google Doc) with complaints, dates, quotes, batch; task to QA owner | n/a | pump aspect share and rating, 6 weeks |
| `reply_drafts` | Draft replies | Voice | draft / job | 2 | Sheet in Outbox: review id, platform, link, draft reply; AI-drafted, human-sent | n/a | reply rate; updated ratings |
| `restock_request` | Restock Mumbai, Send restock request | This week, Performance | task / inline | 1 | Restock request (store list, units, days of cover) as CSV + Slack to supply owner | n/a | stockout store-days |
| `qc_ads_pause` | Pause ads in 21 stores, Turn on (auto-pause) | This week, Impact | rule + prepare / inline | 1 | Pause list per platform (store IDs, campaign names) each time stock < 1 day; posted to Slack; checklist | turn off rule | ad spend in stock-out store-days |
| `budget_shift` | Apply budget shift, Apply shift | This week, Impact | prepare (+ execute Meta in Phase 2) / job | 1 | Budget sheet: current vs new spend by medium and city with expected impact; Meta budgets changed via API when connected; other platforms checklist | Meta: restore budgets | revenue vs MMM counterfactual, 4 weeks |
| `budget_change` | Apply cut, Approve budget, Reduce budget | Impact, Performance | prepare / execute (Meta) | 1 / 2 | As above for one medium | Meta: restore | as above |
| `shopify_discount_cap` | Apply caps, Rein in discounts | This week, Customers | execute / inline | 1 | Shopify discount codes updated (e.g. SAVE20, FEST25, MEGA30 → 15%); change log | restore previous values | margin per order and repeat for the segment, 3 weeks |
| `shopify_segment_offer` | Launch plan, Send offer, Create list | Customers | execute / inline | 1 | Shopify customer segment (by hashed IDs → Shopify customer IDs) + discount code limited to that segment | deactivate code | segment orders vs forecast |
| `audience_export` | Export audience | Customers | data / job | 1 | Meta Custom Audience CSV with SHA-256 hashed emails and phones (normalised), saved to Outbox; checklist to upload in Ads Manager | delete file | CAC of lookalike campaigns |
| `refill_nudge` | Turn on nudge, Start reminders | Customers, Performance | execute + prepare / inline | 1 | Shopify segment "Serum day 21" + message draft; checklist to schedule in Shopify Email or Flow | deactivate segment | repeat rate at day 45 |
| `cod_otp` | Turn on (OTP on cash orders) | Customers | prepare / handoff | 1 | Settings checklist for the brand's checkout or shipping partner; expected impact | n/a | RTO rate |
| `prepaid_nudge` | Turn on offer | Performance | execute + prepare / inline | 1 | Shopify discount code PREPAID20 + checkout banner copy; checklist for payment-method restriction | deactivate | COD share and RTO |
| `listing_update` | Update listing(s), Lead listings with "gentle" | Market, Voice, Performance | draft + prepare / job | 1 | New title, bullets and image text per platform (code fills facts, AI drafts words) in a Doc; links to each listing editor | n/a | conversion and search share |
| `amazon_ads_bulk` | Apply bids, Create campaign (competitor pages, Rival D pages) | Impact, Market, Voice | prepare / job | 1 | Amazon Ads bulk sheet (XLSX) with the bid changes or new product-targeting campaign; link to bulk operations | n/a | Amazon Ads claimed and real return |
| `geo_test` | Launch test, Create test, Extend test, Run a 3-week geo test | Impact, Market | test / job | 2 (plan in 1) | Test plan (cities, duration, power), exclusion list CSV per platform, calendar readout, daily progress | stop test | synthetic control at end date |
| `price_alert` | Set alert, Alert me if…, Track, Watch | Market | rule / inline | 1 | Rule in D1 and Rules tab | turn off | n/a |
| `price_rule` | Apply rule (exclude from price matching), Lock price | Market | rule / inline | 1 | Rule that suppresses price-match suggestions for a rival or platform for N weeks | turn off | n/a |
| `watchlist_add` | Add to watchlist | Market | data / inline | 1 | Rows appended to the Watchlist tab | remove rows | n/a |
| `brief` | Send brief (R&D, creator, routine card, trial pack, results claim) | Market, Impact, Voice, Customers | draft / job | 1 | Google Doc in Outbox; task to owner | n/a | depends on brief (not measured by default) |
| `campaign_schedule` | Schedule (Diwali gift sets) | Customers | prepare + task / job | 1 | Audience file, brief, calendar event on send date | cancel event | segment revenue in window |
| `creator_budget` | Approve budget (creators) | Impact | prepare / job | 1 | Creator plan sheet (cities, budget, briefs) + rows in Creators tab marked planned | n/a | regional lift (synthetic control by creator region) |
| `flipkart_claim` | File claim | Voice | prepare / handoff | 1 | Claim list (order IDs, dates, reason) and steps | n/a | ₹ reimbursed (entered on confirm) |
| `packaging_request` | Raise request (sealed sleeve) | Voice | task / inline | 1 | Task to ops owner with evidence | n/a | delivery complaints |
| `nykaa_request` | Request slot, Create bundles | Performance | prepare / inline | 1 | Email draft to the key account manager; bundle listing file | n/a | Nykaa revenue in sale window |
| `source_reminder` | Set reminder, Remind the ads team daily, Ask the team to update it | Data | task / inline | 1 | Daily 9 am Slack and in-app reminder until the file arrives | stop | lag days |
| `request_files` | Request missing files | Data | task / inline | 1 | One reminder per late source | stop | lag days |
| `upload_file` | Upload a file, Upload files | Data | data / inline | 1 | File in Drive Inbox; sync dispatched | delete from Inbox (before sync) | n/a |
| `sync_now` | Sync now, Re-run grouping, Capture prices now | Data, Customers, Market | data / job | 1 | Sync run; for capture, opens the extension queue | n/a | n/a |
| `assign` | Assign | all action cards | task / inline | 1 | Owner + due date; notifications | reassign | n/a |
| `approve`, `decline`, `undo`, `confirm` | Approve and run, Decline, Undo, I've done it | Actions, cards | control / inline | 1 | State change and executor run | — | — |

## 4. Specifications for the most important types

### 4.1 `amazon_coupon` (prepare)
- **Params:** asin, sku, discount_pct (default: smallest of 5%-steps that brings our price per 10 ml within 5% of the rival), weeks (default 3), budget_inr (default = expected redemptions × discount, capped at ₹3 L).
- **Steps:** (1) Build coupon CSV with columns `ASIN, Discount type, Discount, Start date, End date, Budget (INR), Coupon title` (Seller Central's own upload template varies; the file also includes a plain checklist sheet; if the brand's template differs, the Mappings tab can rename columns). (2) Save to Drive Outbox `/Actions/{action_id}/` and offer download. (3) Open `https://sellercentral.amazon.in/coupons/` in a new tab. (4) Wait for "I've done it" (optional note or screenshot link).
- **Expected:** from §9.1 of `08-METHODS.md`. **Readout:** 21 days after confirm.
- **Demo:** CSV generated in the browser and downloaded; status moves to Measuring after a simulated confirm.

### 4.2 `shopify_discount_cap` (execute)
- **Params:** segment_id, cap_pct (default 15), codes (computed: codes used by the segment in 90 days with value > cap).
- **Run:** for each code: `discountCodeBasicUpdate` (or `discountAutomaticBasicUpdate`) setting `customerGets.value.percentage = cap_pct/100`. Save previous values in `before_json`. Steps logged per code.
- **Approval:** if the forecast revenue at risk > threshold.
- **Undo:** restore each code's previous percentage.
- **Errors:** `SHOPIFY_TOKEN_INVALID`, `SHOPIFY_SCOPE_MISSING` (needs `write_discounts`), `SHOPIFY_CODE_NOT_FOUND` (skip and warn). Partial success keeps successes, marks the action `done` with a warning and lists failures.

### 4.3 `budget_shift` (prepare; execute for Meta in Phase 2)
- **Params:** amount_inr (default ₹30 L per month), from[] and to[] media with amounts (from the optimiser), cities split.
- **Approval:** always if amount > threshold (default ₹10 L).
- **Run (job):** build the budget sheet (current daily budgets by medium and city from the last 7 days; new budgets; expected impact per row; totals) as a Google Sheet in Outbox; for Meta (if connected) update ad set `daily_budget` values via the Marketing API (store old values); for other platforms produce a checklist with the exact new daily budgets.
- **Undo (Meta part):** restore budgets. **Readout:** 28 days, MMM counterfactual with the experiment-calibrated betas.

### 4.4 `geo_test` (test)
- **Plan:** candidate test cities = cities with ≥ 1% of spend and stable pre-period fit; choose 2–4 test cities that minimise pre-period RMSPE of the synthetic control while keeping lost revenue under the test budget (default ₹5 L); duration from a power calculation using placebo noise (minimum detectable effect 25% of claimed return, 80% power) between 14 and 28 days.
- **Outputs:** test plan Doc; CSV of location exclusions (Google Ads: city names and criteria IDs from `geo.ts`; Meta: city keys); calendar events for start, mid-check and readout.
- **Tracking:** each sync checks spend in test cities fell ≥ 60% of plan by day 3, else `TEST_NOT_APPLIED` alert. Day N of M shown on Impact.
- **Readout:** `08-METHODS.md` §3.2; result updates the medium's evidence and confidence; action result = "done" with the estimate (not hit/miss).

### 4.5 `qa_hold` (task + draft)
- **Run:** create a Google Doc "QA hold: {product} batch {batch}" from a template: summary numbers (mentions, first seen, platforms, share of new reviews), 5 quotes, suspected batch and units in stock (if provided), requested decision. Assign to the QA owner (Settings `qa_owner` or chosen), due in 2 days; Slack and in-app notification.
- **Confirm:** owner clicks "Hold confirmed" and enters units held (optional).
- **Readout:** 6 weeks: rating and pump share.

### 4.6 `reply_drafts` (draft, job)
- **Run:** select negative reviews for the aspect without brand reply (≤ 500 per run); batch to Workers AI with prompt 11.2; validate; write a Google Sheet (review link, platform, rating, text, draft) to Outbox. Respect the AI budget; continue next day if capped ("120 of 380 drafted today; the rest tomorrow").
- **Human step:** replies are posted by people on each platform (no posting automation).

### 4.7 `audience_export` (data, job)
- **Run:** fetch the segment's customers from Shopify (emails, phones) inside the action runner, normalise (lowercase, trim; phones to E.164 with +91 default) and hash with SHA-256; write CSV with headers `email, phone` (hashed) to Outbox; delete local copies. Nothing is stored in KV or D1 except counts.
- **Checklist:** upload in Meta Ads Manager → Audiences → Custom audience → Customer list; create a 1% lookalike in India.

### 4.8 `price_alert` and other rules
Create a rule (`06-DATA-MODEL.md` §5) with the condition prefilled (e.g. `rival_price_change_pct(watch_id="W05") <= -0.05`), owner, channel. Fires at the next sync after the condition is true; notification links to the Market screen with the rival selected.

### 4.9 `qc_ads_pause` (rule + prepare)
Quick-commerce ad consoles have no free public write API, so "auto-pause" means: every sync, for stores with `closing_stock / avg daily units < 1`, Drishti posts the list of store IDs and campaign names to Slack (and the action detail) with a one-line instruction per platform, and logs estimated spend saved. When stock returns, it posts the resume list. If a platform later offers an API, the executor switches to execute without UI change.

### 4.10 `upload_file` and `sync_now`
Upload streams to Drive (resumable upload) and dispatches a sync; the action's steps show "Uploaded", "Sync started", "Parsed as Amazon business report (180 rows)", "Snapshot updated". Sync now dispatches and polls `/api/sync/runs`.

## 5. Approvals

- Budget and price actions whose absolute monthly money effect (spend moved, discount cost or revenue at risk) exceeds `approval_threshold_inr` require an Approver or Owner who is not the requester.
- Viewers cannot run actions; Editors can run actions in their screens but not approve; Analysts can sync and run data actions; Approvers can approve; Owners can do everything.
- Approval requests expire after 7 days.

## 6. Notifications

| Event | Channel |
| --- | --- |
| Action assigned to you, approval requested, decided | Slack (if webhook), in-app, calendar event for due dates (if connected) |
| Readout result | Slack summary to owner and requester; in-app |
| Rule fired | Slack to rule owner; in-app |
| Weekly summary (Monday after the 7 am sync) | Slack to Owners and Approvers: verdict, top 3 drivers, suggested actions |

## 7. Demo behaviour

In `/demo` every action runs a client-side simulation with the same steps, outputs that can be downloaded (generated from the demo snapshot: coupon CSV, budget sheet CSV, brief as Markdown, audience file with fake hashes), and timing of 600 ms per step. Actions are kept in memory (and sessionStorage when available) and appear on the Actions screen with "Demo" tags. No network writes.

## 8. Compact engine (decided 21 Oct 2026)

For the pitch build (10 to 20 users, docs/05 §15), the browser runs each action's steps, the same as in the demo. Every change is saved through `PUT /api/actions/:id`, which:

- keeps the action in D1 so the whole team sees it;
- writes its row on the Actions tab of the Workspace Sheet when its status changes;
- saves each generated file to the Drive Outbox once and returns an "Open in Drive" link;
- posts to Slack when `SLACK_WEBHOOK_URL` is set.

Shopify execute with undo follows when a development store is connected. Until then, Shopify actions produce their files like prepare actions.



---

<!-- file: docs/11-CONNECTORS.md -->

# 11 · Connectors and Data Sources

## 1. Source inventory

| Source id | What | How Drishti gets it | Cadence / SLA | Feeds | Phase |
| --- | --- | --- | --- | --- | --- |
| `workspace_sheet` | Settings, products, channels, watchlist, creators, targets, calendar, rules, users, mappings | Sheets API via service account | every sync | everything | 1 |
| `shopify` | Own-site orders, customers, discount codes | Shopify Admin GraphQL API (custom app token, read-mostly) | every sync, SLA 24 h | sales, customers, CAC, segments | 1 |
| `shopify_orders_csv` | Historical own-site orders beyond the API window | Shopify Orders export CSV dropped in Drive Inbox | once (backfill) | history | 1 |
| `amazon_business_report` | Amazon sales, units, sessions by ASIN by day | CSV to Drive Inbox (download or emailed) | daily, SLA 48 h | sales, SKU, conversion | 1 |
| `amazon_orders_report` | Amazon orders with ship city and state | CSV to Drive Inbox | daily, SLA 48 h | city-level sales | 1 |
| `amazon_brand_analytics` | Search Query Performance, repeat purchase | CSVs to Drive Inbox | weekly, SLA 9 days | search share, buyers | 1 |
| `amazon_ads` | Campaign performance with claimed sales | Scheduled report emailed → Drive Inbox, or CSV | daily, SLA 48 h | spend, claims | 1 |
| `flipkart_sales` | Orders and returns | CSV to Drive Inbox | daily, SLA 48 h | sales | 1 |
| `flipkart_ads` | Ad spend and direct/indirect revenue | CSV to Drive Inbox | daily, SLA 48 h | spend, claims | 1 |
| `nykaa_sales` | Vendor sales | CSV to Drive Inbox | weekly, SLA 9 days | sales | 1 |
| `quick_commerce` | Blinkit, Zepto, Instamart store-level sales, stock and ad spend | CSVs to Drive Inbox | daily, SLA 48 h | sales, stockouts, QC ads | 1 |
| `meta_ads` | Spend and claimed purchases by campaign and region | Scheduled report emailed → Drive, or CSV; Phase 2: Marketing API (read) | daily, SLA 36 h | spend, claims, geo tests | 1 (API 2) |
| `google_ads` | Cost and conversion value by campaign and city | Scheduled report emailed → Drive, or CSV | daily, SLA 36 h | spend, claims, geo tests | 1 |
| `creators` | Posts, cost, audience cities | Creators tab | weekly, SLA 8 days | creator lift | 1 |
| `reviews` | Our reviews on each platform | Platform review exports where available; extension captures of review pages; Shopify review app CSV | weekly, SLA 9 days | voice | 1 |
| `watchlist_capture` | Rival and own prices, ratings, reviews, stock on marketplaces | Chrome extension, user-initiated | when captured | market | 2 |
| `rival_sites` | Rival brands' own product pages | Sync job reads public product data where robots.txt allows | every sync | market | 2 |
| `google_trends` | Search interest by state | CSV download to Drive Inbox | weekly | context for creator and ad lift | 1 |
| `costs` | Product costs and channel fees | Products and Channels tabs | monthly | margin, LTV | 1 |

Every file-based source has a sample in `sample-data/inbox/` with representative columns. Real platform exports change columns over time; detection is by header signature with aliases, and the Mappings tab overrides any column. Contract tests run every sample through its parser.

## 2. Google setup (free, no billing account)

1. Google Cloud console → new project `drishti-<brand>` (no billing account; do not link one).
2. Enable APIs: Google Sheets API, Google Drive API, Google Calendar API (optional), Google Docs API (for briefs).
3. Create a **service account** `drishti-sync`, create a JSON key, download it once. Store it as `GOOGLE_SA_JSON` in Cloudflare (Worker secret) and GitHub (Actions secret). Delete the local file.
4. Create an **OAuth client ID** (type Web application) for Sign-In; authorised JavaScript origins: the Worker URLs (staging and production) and `http://localhost:5173`. Consent screen: External, Testing mode, add teammates as test users (up to 100; basic profile scopes need no verification).
Steps 1–4 are done once by the deployer (runbook). Steps 5–6 are guided in the app by the onboarding wizard (`09-FRONTEND.md` §6.10), which also checks access live.

5. In Google Drive: create folders `Drishti Inbox`, `Drishti Outbox`, `Drishti Archive` (and `Drishti Inbox/Unrecognised` is created automatically). Import `Drishti-Workspace-Template.xlsx` as a Google Sheet named `Drishti Workspace`.
6. Share the Sheet and the three folders with the service account email as **Editor**. Optionally share a Google Calendar (Settings and sharing → Share with specific people → service account → "Make changes to events") and put its ID in Settings `team_calendar_id`.

Service-account tokens: the Worker and the job sign a JWT (RS256, `scope` = space-separated scopes, `aud` = `https://oauth2.googleapis.com/token`) and exchange it for an access token; the Worker caches it in KV for 50 minutes.

## 3. Drive Inbox conventions and file detection

- Any file in `Drishti Inbox` (CSV, XLSX, or a ZIP containing them) is a candidate. Google Sheets placed there are exported as CSV.
- Detection order: (1) filename prefix rule if present (`amazon_business_report*`, `meta_ads*`…), (2) header signature: the source whose required headers (after alias normalisation: lowercase, strip punctuation, collapse spaces, map aliases) are all present with the highest match score, (3) Mappings tab overrides.
- Unknown → moved to `Drishti Inbox/Unrecognised`, `FILE_UNRECOGNISED` warning on Data sources with the headers found and a "Map columns" link that pre-fills the Mappings tab.
- Duplicate (same Drive md5) → archived without parsing.
- Parsed → moved to `Drishti Archive/YYYY-MM/` with the source id prefixed to the name.

**Header signatures (required headers, with accepted aliases)**

| Source | Required headers (aliases in brackets) | Sample file |
| --- | --- | --- |
| shopify_orders_csv | Name [Order, Order ID]; Created at; Total; Lineitem sku | `shopify_orders_export.csv` |
| amazon_business_report | (Child) ASIN [ASIN]; Units Ordered; Ordered Product Sales; Date [Day] | `amazon_business_report_daily.csv` |
| amazon_ads | Campaign Name; Spend [Cost]; 14 Day Total Sales [Sales (14 day), 7 Day Total Sales] | `amazon_ads_campaigns_daily.csv` |
| amazon_brand_analytics | Search Query [search_query]; Search Query Volume [search_volume]; Purchases: Brand Share % [purchase_share] | `amazon_brand_analytics_search_query.csv` |
| meta_ads | Campaign name; Amount spent (INR) [Amount spent]; Purchases conversion value [Website purchases conversion value]; Day [Reporting starts] | `meta_ads_daily.csv` |
| google_ads | Campaign; Cost; Conv. value [All conv. value]; Day | `google_ads_daily.csv` |
| flipkart_sales | Order Date; FSN; Final Selling Price [Selling Price]; Quantity | `flipkart_sales_daily.csv` |
| flipkart_ads | Ad Spend; Direct Revenue; Indirect Revenue | `flipkart_ads_daily.csv` |
| nykaa_sales | Nykaa SKU Code; GMV; Units Sold | `nykaa_sales_weekly.csv` |
| quick_commerce | store_id [Store ID, Darkstore]; closing_stock [Closing Stock, Inventory]; units [Qty Sold] | `quick_commerce_store_daily.csv` |
| google_trends | Week; one or more term columns, or Term + Interest | `google_trends_weekly.csv` |
| reviews | review_id [Review ID]; rating [Star Rating]; text [Review Text, Review] | `reviews_export.csv` |
| watchlist_capture | captured_at; price_inr; capture_method | `watchlist_captures.csv` (export of captures) |

Parsing rules: numbers may contain `₹`, commas, `%`, or be in Indian grouping; dates in `YYYY-MM-DD`, `DD/MM/YYYY`, `DD-Mon-YYYY` or Excel serials; rows with all-empty key fields are skipped and counted; each parser returns `{ rows, warnings, skipped, coverage: { from, to } }`.

## 4. Shopify

### 4.1 Setup
- **Real brand:** Shopify admin → Settings → Apps and sales channels → Develop apps → Create an app "Drishti". Admin API scopes: `read_orders`, `read_customers`, `read_products`, `read_discounts`, `write_discounts`; add `write_customers` only if segment offers are used (check the current scope names when building). Install, copy the Admin API access token once, paste into Drishti Admin → Connectors → Shopify.
- **Showcase / staging:** create a free Shopify Partners account and a development store; create the same custom app; run `pnpm seed:shopify` (creates the 6 Lumora products, 300 customers and about 600 orders from `sample-data/demo/own_site_orders_sample.csv`, throttled to respect API limits).
- The order API may only return recent orders by default; historical orders are backfilled from a Shopify Orders CSV export dropped into the Inbox (`shopify_orders_csv`).

### 4.2 Pull (sync job)
GraphQL `orders(first: 250, after: $cursor, query: "updated_at:>='<cursor>'")` with `id, name, createdAt, displayFinancialStatus, displayFulfillmentStatus, cancelledAt, totalPriceSet, subtotalPriceSet, totalDiscountsSet, discountCodes, paymentGatewayNames, shippingAddress { city provinceCode }, customer { id }, customerJourneySummary { firstVisit { utmParameters { source medium campaign } referrerUrl } }, lineItems(first: 20) { sku quantity originalUnitPriceSet }`. COD = gateway name contains "Cash on Delivery" or "COD". RTO = fulfillment returned / tag `RTO` (configurable tag list in Settings). Acquisition source from first order's UTM source (facebook/instagram → meta, google → google, creator codes from Creators tab → creators, referral program code prefix → referral, else organic/unknown). Customer IDs hashed immediately.

### 4.3 Write (executors)
`discountCodeBasicUpdate`, `discountCodeBasicCreate`, `discountCodeDeactivate`, `segmentCreate` (Phase 1 executors). All calls use the token decrypted from D1 inside the Worker; GraphQL cost is checked from `extensions.cost` and calls back off when throttled.

## 5. Meta and Google Ads

- **Phase 1 (CSV):** in Ads Manager and Google Ads, create a daily scheduled report with the columns in §3 (Meta: breakdown by Region; Google: by City "Location of interest" or "User location") and send it by email; the Gmail-to-Drive script (§8) saves it to the Inbox. Or download and drop manually.
- **Phase 2 (Meta API):** create a Meta for Developers app in Development mode, add the brand's ad account, generate a long-lived token with `ads_read` (and `ads_management` for budget executors). Insights: `/{ad_account}/insights?level=adset&breakdowns=region&time_increment=1&fields=spend,actions,action_values,campaign_name,adset_name`. Budget changes: `POST /{adset_id}?daily_budget=`. Development mode works only for accounts where the app's users have roles; no app review needed for the brand's own account.
- **Google Ads API** needs a developer token with approval; it is Phase 4 and optional. CSV covers v1.

## 6. Rival brand websites (live, scheduled)

For Watchlist rows with `platform = Brand site` and `capture_method = site_json`:

1. Fetch `https://<host>/robots.txt` (cached 24 h). If the product path is disallowed for `DrishtiBot` or `*`, skip with `ROBOTS_DISALLOWED` and show it on Data sources.
2. User-Agent: `DrishtiBot/1.0 (+https://<deployment>/bot)`; the `/bot` page explains what the bot reads and how to opt out.
3. If the URL path matches `/products/<handle>` try the public Shopify product JSON `https://<host>/products/<handle>.js` (price in paise → rupees, `available`, variants by size); else fetch the HTML and parse `application/ld+json` `Product` → `offers.price`, `offers.availability`, `aggregateRating`.
4. Limits: one request per host every 10 s, at most 4 fetches per product per day, 10 s timeout, no retries beyond one, no following of links, no cookies.
5. Rows land in `market_captures` with `capture_method = site_json`.

Marketplaces (Amazon, Flipkart, Nykaa, Blinkit, Zepto, Instamart) are **never** fetched by the sync job.

## 7. Chrome extension (Drishti Capture)

- **Distribution:** "Load unpacked" from `apps/extension/dist` (Chrome Web Store needs a one-time developer fee, so it is not used). Works in Chrome and Edge.
- **Manifest V3:** `permissions: ["storage", "activeTab", "scripting", "tabs"]`; `host_permissions`: only the Drishti origin(s) for API calls. No content scripts declared statically; the capture script is injected with `chrome.scripting.executeScript` only when the user clicks Capture (activeTab).
- **Sign-in:** popup → "Connect to Drishti" opens `/extension/connect` in a tab; after app sign-in the page calls `POST /api/extension/token` and passes the token to the extension via `chrome.runtime.sendMessage` (externally_connectable restricted to the Drishti origin). Stored in `chrome.storage.local`.
- **Watchlist awareness:** the service worker fetches `/api/watchlist` every 6 hours; `tabs.onUpdated` compares the active URL with `url_pattern` and sets a badge dot (no page access).
- **Capture:** popup shows the matched watchlist item (or "Not on your watchlist — capture anyway?"); Capture injects the adapter for the host:
  - `amazon_in`: price from the buy-box price element, MRP from the list price, rating and count from the reviews summary, stock from availability, pack size from the title (regex `(\d+)\s?(ml|g)`), up to 8 visible review texts; fallback to JSON-LD if present.
  - `flipkart`, `nykaa`, `blinkit`, `zepto`, `instamart`: similar selectors; each adapter has a version and a fixture HTML test.
  - `generic_jsonld`: any page with a schema.org Product.
  Selectors live in `apps/extension/src/adapters/*.ts` with unit tests on saved fixture HTML (fixtures are synthetic pages built for tests, not copies of real pages).
- **Capture all:** opens the next watchlist URL in the current tab; the user reviews the page and presses Capture (or the keyboard shortcut `Alt+Shift+C`); repeat. Nothing is opened or read without a user action per page.
- **Data minimisation:** only the fields listed in `07-API.md` §7; no cookies, no account data, no other tabs.

## 8. Gmail to Drive (optional automation, free)

Platforms that can email scheduled reports (Amazon Ads, Meta Ads Manager, Google Ads, some partner portals) can feed the Inbox automatically with a Google Apps Script in the brand's own Google account:

```js
// Apps Script: Extensions > Apps Script in any Google Sheet, or script.google.com. Run setup() once.
const LABEL = 'drishti-inbox';            // Gmail filter: from the report senders → apply this label
const INBOX_FOLDER_ID = 'PASTE_FOLDER_ID';
function saveReports() {
  const label = GmailApp.getUserLabelByName(LABEL);
  const done = GmailApp.getUserLabelByName(LABEL + '/done') || GmailApp.createLabel(LABEL + '/done');
  const folder = DriveApp.getFolderById(INBOX_FOLDER_ID);
  label.getThreads(0, 50).forEach(t => {
    t.getMessages().forEach(m => m.getAttachments().forEach(a => {
      if (/\.(csv|xlsx|zip)$/i.test(a.getName())) folder.createFile(a.copyBlob()).setName(Utilities.formatDate(m.getDate(), 'Asia/Kolkata', 'yyyyMMdd_HHmm_') + a.getName());
    }));
    t.removeLabel(label); t.addLabel(done);
  });
}
function setup() { ScriptApp.newTrigger('saveReports').timeBased().everyHours(1).create(); }
```

Apps Script runs free in the brand's own Google account. It is optional; the runbook shows how to set it up.

## 9. Sample data (fictional Lumora Skin)

| File | Rows | Notes |
| --- | --- | --- |
| `demo/fact_sales_city_daily.csv` | 33,840 | 1 Apr 2025–16 Oct 2026, 12 cities × 5 channels |
| `demo/fact_sales_sku_daily.csv` | 16,920 | date × channel × 6 SKUs |
| `demo/fact_spend_city_daily.csv` | 30,600 | 6 media with platform claims |
| `demo/own_site_orders_sample.csv`, `…_order_lines_sample.csv`, `…_customers_sample.csv` | 8,807 / 15,235 / 6,350 | a 5% sample of own-site buyers (scale factor 20 for KPIs that need totals) |
| `demo/quick_commerce_store_daily.csv` | 4,840 | 40 sample dark stores, 18 Jun–16 Oct 2026 |
| `demo/reviews.csv` | 4,791 | last 90 days, synthetic texts |
| `demo/market_captures.csv` | 1,082 | 11 watched listings + 2 rival brand sites |
| `demo/search_share_weekly.csv` | 130 | 26 weeks × 5 queries |
| `demo/products.csv` | 6 | |
| `demo/creator_posts_truth.csv` | 118 | all posts including six not yet in the Creators tab (tests the "12 days late" case) |
| `inbox/*.csv` | 13 files | raw-format samples for parser tests; also published at `/samples/` for the data guide downloads |
| `workspace/*.csv`, `Drishti-Workspace-Template.xlsx` | 15 tabs | Sheet template |
| `expected/expected_metrics.json` | | golden KPI values, planted effects, test tolerances |

**Planted effects** (tests check the engine finds them): Meta holdout in Pune and Ahmedabad from 26 Sep 2026; Google brand-search cut in Jaipur 4–17 Aug 2026 and in Jaipur, Lucknow, Indore, Kochi from 11 Oct 2026; Meta billing lapse in Kolkata 2–15 Mar 2026 and burst in Hyderabad 1–10 Dec 2025; Rival B price cut of 18.2% on Amazon on 2 Oct 2026; Mumbai quick-commerce stockout 5–7 Oct 2026; pump defect complaints from 21 Sep 2026; Flipkart Ads file missing after 11 Oct; creator posts after 5 Oct missing from the sheet; true and claimed ROAS per medium in `expected_metrics.json`.

Design screens show illustrative numbers close to, but not identical with, the numbers the engine computes from this data (for example ₹18.4 Cr in the design vs ₹18.1 Cr computed for the last 28 days). Tests use `expected_metrics.json`, never the design numbers.



---

<!-- file: docs/12-QA-AND-METRICS.md -->

# 12 · QA, Tests and Metrics

## 1. Test pyramid

| Layer | Tool | Where | Runs |
| --- | --- | --- | --- |
| Unit (engine, formatting, rules grammar) | Vitest | `packages/engine`, `packages/shared`, `apps/web/src/lib` | every push |
| Golden (KPIs vs `expected_metrics.json`) | Vitest | `packages/engine/test/golden.test.ts` | every push |
| Model property tests (incrementality, k-means, voice) | Vitest | `packages/engine/test/models/*` | every push |
| Parser contract tests (every `sample-data/inbox` file) | Vitest | `packages/engine/test/parsers/*` | every push |
| Worker API tests | Vitest with `@cloudflare/vitest-plugin` (local D1 and KV; renamed from `@cloudflare/vitest-pool-workers`) | `apps/worker/test/*` | every push |
| Sync job integration (mock Google, Shopify, rival sites) | Vitest + msw | `apps/sync/test/*` | every push |
| Extension adapters (fixture HTML) | Vitest + happy-dom | `apps/extension/test/*` | every push |
| End-to-end | Playwright (Chromium) | `e2e/*`: the demo suite against the built SPA served statically (`vite preview` of `apps/web/dist`, the files the Worker serves; `wrangler dev` needs a Cloudflare login because Workers AI is remote-only), signed-in flows against staging nightly, production after deploy. Runs with reduced motion | push (demo suite), nightly (full) |
| Visual regression | Playwright `toHaveScreenshot` vs `design/screens/*.png` | `e2e/visual.spec.ts` | push |
| Accessibility | `@axe-core/playwright` | `e2e/a11y.spec.ts` | push |
| Performance | Lighthouse CI on `/demo` and `/` (performance ≥ 0.8, accessibility ≥ 0.95, best practices ≥ 0.9; `lighthouserc.json`) | `ci.yml` | push to main |

CI must be green before any milestone is marked done.

## 2. Test catalog (IDs used across the docs)

### Golden and models
- **GOLD-01** Last 28 days revenue, orders, units, AOV, return rate equal `expected_metrics.json.last_28_days` (sums exact, ratios ±0.001).
- **GOLD-02** Same for prior 28 days, this week, prior week.
- **GOLD-03** By channel (`last_28_days_by_channel`) and by medium spend and claimed ROAS (`last_28_days_media`).
- **GOLD-04** Own-site sample counts, repeat share, COD share, RTO share of COD; reviews count, average rating, pump negatives last 30 days, reply rate.
- **MOD-01** Synthetic control weights are non-negative and sum to 1 (property test on random inputs).
- **MOD-02** On a simulated series with a known effect, the estimate is within 10% (no noise) and the 90% interval covers the truth in ≥ 85% of 100 noisy simulations.
- **MOD-03** Meta holdout on demo data: estimate in [0.6, 2.4]; interval contains the estimate; pre-period fit RMSPE ≤ 8% of the treated level (revised 20 Oct 2026, `08-METHODS.md` §3.2).
- **MOD-04** Natural-experiment detector finds Kolkata (Mar 2026), Hyderabad (Dec 2025), Jaipur (Aug 2026) events and no event for a city without planted changes over the same windows.
- **MOD-05** Every medium's true ROAS estimate < claimed ROAS except creators (> claimed).
- **MOD-06** Bridge explains ≥ 80% of the demo week change; Rival B and Mumbai stockout drivers are negative and among the top four.
- **MOD-07** k-means is deterministic for a seed; preferred cluster mean orders ≥ 2.5 and AOV ≥ ₹850; problem cluster: at least 60% of its customers used a discount and at least 60% paid COD (`08-METHODS.md` §7.3).
- **MOD-08** Price-change detector flags Rival B (−18%, 2 Oct), Rival F (−10%, 9 Oct), Rival D (+5%, 11 Oct) and not the 1-day flash deals.
- **MET-05** Readout calculator: hit, partial, miss and inconclusive boundaries on fixtures.

### AI and voice
- **AI-01** Lexicon tagging agrees with keyword truth on `reviews.csv` for ≥ 85% of reviews.
- **AI-02** AI tagging client validates JSON with zod; invalid output triggers one retry then lexicon fallback (mocked model).
- **AI-03** Budget governor blocks calls past 8,000 estimated neurons and records usage.
- **AI-04** Drafts keep every number from the facts (number-preservation check rejects altered numbers).
- **VOICE-01** Emerging issues: "pump" flagged as growing with first seen 21 Sep; "smaller than shown" flagged as new on Flipkart. The sample reviews contain no size complaint, so the second part runs on a copy of the demo reviews with 25 such Flipkart reviews added in October (clarified 20 Oct 2026).

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
- **E2E-10** Demo approval: budget shift shows Waiting for approval; Approve and run on Actions moves it to Running. The demo's open budget shift (A-0002) is the one approved; This week does not suggest a second one (`08-METHODS.md` §9.1).
- **E2E-11** Demo undo on a done action shows Undone and the restore step.
- **E2E-12** Assign opens owner picker and logs the assignment.
- **E2E-13..16** Staging (signed-in test user via a test-only Google token mock in staging): coupon handoff, geo test plan, QA hold, discount cap on the Shopify development store.
- **E2E-20** Staging onboarding: workspace links validated, first sync completes and screens render real data.
- **E2E-21** Home page: signed out `/` shows the home page with no page scroll at 1440 × 900 in both themes; Open the demo, Set up your workspace, Download the sample sheet and What data Drishti needs open the right page or download the template.
- **E2E-25** Home game: every round can be answered, shows the measured answer with a link into the demo, and ends on the score card.
- **E2E-26** Home on a phone (390 × 844): no scroll before or after answering a round; Next and Open the demo stay on screen.
- **E2E-22** Onboarding wizard (staging): steps resume after reload; a bad link shows the sharing fix; finishing step 6 starts a sync and ends on This week.
- **E2E-23** Data guide: every Download sample link returns its file; Check my file on each `sample-data/inbox` file names the right source with no upload request sent.
- **E2E-24** Sandbox: dropping `Drishti-Workspace-Template.xlsx` plus the inbox samples renders all eight screens; editing a file and dropping it again changes the numbers; no network request other than static assets is made.
- **E2E-27** Sandbox linked sheet (`/api/sheet` mocked with a workbook of the inbox samples): linking renders the screens; Refresh after the mock changes updates the numbers; a private sheet shows the sharing fix.
- **API-SHEET** `/api/sheet` rejects non-Google links (400), maps a Google sign-in redirect to `SHEET_NOT_PUBLIC`, stops at 20 MB, and sends `Cache-Control: no-store`.

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
- CI runs the visual suite on a Windows runner (`windows-latest`, free for public repos): the design PNGs were rendered on Windows, and Linux font smoothing alone differs by about 4 %, over the tolerance.

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



---

<!-- file: docs/13-STRATEGY-AND-KRAS.md -->

# 13 · Phased Strategy Plan and Key Result Areas

## 1. Objectives

| # | Objective | Why it matters for PreQL |
| --- | --- | --- |
| O1 | Ship a working, public showcase of Drishti that a recruiter understands in two minutes | Placement and internship conversations need proof of enterprise-level depth, not slides |
| O2 | Make every action real: executed, prepared, tested or assigned, then measured | This is the difference between a dashboard and a decision system; it is also the story recruiters remember |
| O3 | Prove value with real data from at least two pilot brands | Converts "student project" into "used by a brand" |
| O4 | Stay at ₹0 and keep brand data in brand accounts | Removes the two biggest objections: budget and data trust |
| O5 | Leave a maintainable product the club can hand over every year | Long-term brand for PreQL |
| O6 | Be fundraise-ready: design partners with measured wins, a repeatable onboarding, a clear ownership structure | Turns the project into a company an investor can back (`01-PRD.md` §11) |
| O7 | Validate willingness to pay: letters of intent at a Cloud or measurement-study price | Proves the business model before raising |

## 2. Action maturity ladder (how "the buttons do something" grows)

| Level | Name | What a click does | Reached in |
| --- | --- | --- | --- |
| L0 | Simulated | Shows the steps and a generated file in the demo; logged in the browser | Phase 0 |
| L1 | Prepared and logged | Builds the real file or document, saves to Drive Outbox, opens the exact platform page, logs to D1 and the Sheet, notifies the owner | Phase 1 |
| L2 | Executed with undo | Calls the platform API (Shopify, Meta, Google Calendar, Slack), saves the before-state, can undo | Phase 1 (Shopify), Phase 2 (Meta) |
| L3 | Closed loop | Every action has expected impact and a scheduled readout that measures it; hit rate reported | Phase 2 |
| L4 | Guarded autopilot | Rules fire actions within limits (for example pause-list on stockout, price alerts, reminders), with approvals above thresholds | Phase 2–3 |

## 3. Phases

Dates assume a start on Monday 19 Oct 2026, a core team of four (product, data, engineering, design) at about 8 hours a week each, and Claude Code doing most of the build.

### Phase 0 · Showcase build (19 Oct – 1 Nov 2026, 2 weeks)

**Goal:** public demo live; every screen and button works on fictional data.

| Deliverable | Milestones (`14-SETUP-RUNBOOK.md` §8) |
| --- | --- |
| Repo, CI, Cloudflare deploy, demo route | M0, M1 |
| Engine KPIs + golden tests; demo snapshot built from sample data | M2 |
| Eight screens in light and dark matching the designs; simulated actions (L0) | M3 |
| Visual, a11y, E2E suites green; Lighthouse ≥ 90 | M3 |
| Two-minute walkthrough video (screen recording, free tools) and a one-page case PDF | — |
| Investor screens polished first: This week, Impact and ROI, Market, Actions | M3 |
| Investor kit v1: pitch deck, investment memo, demo script, data-room checklist | — |

**Gate to Phase 1:** E2E-01..12 green on production; three people outside the team complete the demo walkthrough unaided in under three minutes; the investor demo script runs in under two minutes on production.

### Phase 1 · Measure and assist (2 Nov – 29 Nov 2026, 4 weeks)

**Goal:** a real workspace syncing real-format data; L1 actions everywhere and L2 on Shopify.

| Deliverable | Milestones |
| --- | --- |
| Google Sign-In, roles, sessions, Admin | M4 |
| Workspace Sheet + Drive Inbox + parsers for all 13 sources; scheduled and manual sync; Data sources live | M5 |
| Incrementality (natural experiments, synthetic control, MMM-lite), bridge, market, k-means, voice (lexicon): methods and MOD tests on demo data first, right after M3; re-checked on synced data after M5 | M6 |
| Action engine: prepare, task, rule, data executors; Shopify execute with undo; Actions screen on D1; Sheet mirror | M7 |
| Staging workspace on the template Sheet + Shopify development store | M5–M7 |

**Gate to Phase 2:** staging runs 7 days of scheduled syncs with ≥ 95% success; every button in the copy deck maps to a working action (ACT-30).

### Phase 2 · Act and prove (30 Nov – 27 Dec 2026, 4 weeks)

**Goal:** closed loop (L3) and guarded rules (L4); experiments as first-class.

| Deliverable | Milestones |
| --- | --- |
| Geo test planner, tracking and automated readouts; evidence hierarchy with confidence | M8 |
| Workers AI review tagging and drafts with budget governor; reply drafts; briefs | M8 |
| Chrome extension and rival-site watcher; live captures on Market | M9 |
| Approvals, notifications (Slack, Calendar), weekly Monday summary | M9 |
| Meta API read and budget execute (development mode) | M9 (optional) |

**Gate to Phase 3:** one complete geo test readout on staging data; readout engine measured at least five demo actions end to end; pilot materials ready.

### Phase 3 · Pilot (28 Dec 2026 – 7 Feb 2027, 6 weeks)

Diwali (8 Nov 2026) and the festive sales are the busiest weeks for brand teams, so pilot outreach starts in December.

**Goal:** two brands use Drishti weekly on their own accounts.

| Workstream | Plan |
| --- | --- |
| Targeting | 10 to 15 D2C brands with ₹5–100 Cr annual revenue, selling on Amazon plus own site plus at least one of Nykaa, Flipkart or quick commerce; reach through alumni, faculty and the club's speaker network. Large brands (Nykaa, boAt, Mamaearth, Lenskart, Wakefit, SUGAR, Purplle) are approached for feedback sessions and hiring conversations using the demo, not for data |
| Offer | Free, self-hosted on their accounts, set up in under one hour by the team, read-only by default, cancel anytime by unsharing |
| Onboarding | J1 journey; the team runs setup on a call; first insight readout within 72 hours |
| Cadence | Weekly 20-minute review with the brand's marketer; capture hours saved and decisions made |
| Evidence | At least one geo test per pilot; at least five measured actions per pilot |
| Output | Two case studies with the brand's permission (or anonymised) |
| Commercial | Ask each partner with a measured win for a letter of intent at a Cloud or measurement-study price (`01-PRD.md` §11.4); target 3–5 design partners, 2 letters of intent |

**Gate to Phase 4:** at least one pilot reports a measured improvement and agrees to be referenced.

### Phase 4 · Scale and hand over (Feb – Apr 2027)

- Multi-workspace (agency view), onboarding wizard, phone summary view.
- Amazon SP-API and Amazon Ads API connectors (official, free with registration), Google Ads API (developer token), Bayesian MMM option.
- Annual club handover in April (`04-ADMIN.md` §9), or, if the founders spin out a company (`01-PRD.md` §11.8), a club showcase licence instead.
- Pre-seed raise on design-partner evidence: measured wins, letters of intent, weekly use. Drishti Cloud (R5) is built only after funding.

## 4. Key Result Areas (KRAs), KPIs and targets

| KRA | KPI | Baseline | Phase 0 target | Phase 1 target | Phase 2 target | Phase 3 target | Owner | Measured from |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **KRA 1 · Product readiness** | E2E, visual and a11y suites passing | — | 100% | 100% | 100% | 100% | Engineering lead | CI |
| | Lighthouse performance / accessibility on `/demo` | — | ≥ 90 / ≥ 95 | ≥ 90 / ≥ 95 | same | same | Engineering lead | Lighthouse CI |
| | Screens with no scroll at 1440 × 900 | — | 8 of 8 | 8 of 8 | 8 of 8 | 8 of 8 | Design lead | E2E-02 |
| **KRA 2 · Action engine maturity** | Buttons that do something real (L1+) | 0% | 100% at L0 | 100% at L1 | ≥ 60% at L2 or L3 | ≥ 70% | Product lead | ACT-30 + catalogue |
| | Actions with expected impact and readout | 0% | n/a | 80% | 100% of measurable types | 100% | Data lead | actions table |
| | Hit rate of measured actions | — | n/a | n/a | ≥ 50% (staging) | ≥ 60% (pilots) | Data lead | readouts |
| **KRA 3 · Measurement quality** | Planted effects recovered on sample data (MOD-03..08) | — | 100% | 100% | 100% | 100% | Data lead | tests |
| | Channels with true ROAS confidence medium or high | — | n/a | ≥ 50% | ≥ 80% | ≥ 80% per pilot | Data lead | snapshot |
| | Bridge explained share | — | ≥ 80% (demo) | ≥ 80% | ≥ 80% | ≥ 75% (real data) | Data lead | snapshot |
| **KRA 4 · Data freshness and reliability** | Source-days within SLA | — | n/a | ≥ 85% | ≥ 90% | ≥ 90% | Engineering lead | sources |
| | Sync success rate | — | n/a | ≥ 95% | ≥ 98% | ≥ 98% | Engineering lead | sync_runs |
| | Manual sync duration (p90) | — | n/a | ≤ 5 min | ≤ 4 min | ≤ 4 min | Engineering lead | sync_runs |
| **KRA 5 · Cost and compliance** | Spend; payment methods on file | — | ₹0; none | ₹0; none | ₹0; none | ₹0; none | Product lead | accounts |
| | Peak daily use vs free limits (any resource) | — | < 30% | < 50% | < 50% | < 60% | Engineering lead | usage_daily |
| | Automated marketplace visits | — | 0 | 0 | 0 | 0 | Product lead | code review, SITE tests |
| **KRA 6 · Adoption and value (pilots)** | Pilot brands live | 0 | — | — | 0 (outreach) | 2 | Partnerships lead | — |
| | Weekly active users per pilot | — | — | — | — | ≥ 3 | Product lead | events |
| | Weeks with ≥ 1 action run | — | — | — | — | ≥ 75% | Product lead | events |
| | Analyst hours saved per week | 6–10 h (interviews) | — | — | — | ≥ 4 h | Partnerships lead | pilot survey |
| | Confirmed monthly impact per pilot | — | — | — | — | ≥ ₹2 L or ≥ 3% of ad spend reallocated with a measured gain | Data lead | readouts |
| **KRA 7 · Showcase and careers** | Demo sessions with ≥ 3 screens | — | 50 | 150 | 300 | 500 | Partnerships lead | events (demo) |
| | Recruiter or brand conversations using the demo | — | 5 | 15 | 25 | 40 | Partnerships lead | CRM sheet |
| | Interviews, internships or live projects attributed | — | — | 2 | 5 | 8 | Club POR | club records |
| | Case studies published | 0 | — | — | 1 (method write-up) | 2 (pilots) | Product lead | — |
| **KRA 8 · Fundraise readiness** | Design partners signed | 0 | — | 2 in conversation | 3 agreed | 3–5 live | Founders | partner tracker |
| | Design partners with a measured win (geo test or natural experiment) | 0 | — | — | 1 (staging) | ≥ 2 | Data lead | readouts |
| | Letters of intent at a stated price | 0 | — | — | — | ≥ 2 | Founders | signed letters |
| | Investor conversations using the demo | 0 | 3 | 8 | 12 | 20 | Founders | CRM sheet |
| | Investor kit (deck, memo, demo script, data room) | — | v1 | v2 with staging data | v3 with first readout | v4 with pilot results | Product lead | kit versions |
| | Ownership, licence and entity decided (`01-PRD.md` §11.8) | open | decided | — | — | — | Founders | signed agreement |

KRA reviews: weekly 30-minute team check (KRA 1–5), fortnightly with the club POR (KRA 6–7). Each review updates the progress table in this file.

## 5. Team and roles

| Role | Responsibilities | Time |
| --- | --- | --- |
| Product lead | Scope, copy deck, action catalogue, KRA tracking, demo story | 8 h/week |
| Data lead | Engine methods, model validation, readouts, pilot analysis | 8 h/week |
| Engineering lead | Claude Code sessions, CI/CD, connectors, free-tier governance | 8–10 h/week |
| Design lead | Visual fidelity, dark mode, accessibility, brand | 4–6 h/week |
| Partnerships lead | Recruiter and brand outreach, pilots, case studies | 4–6 h/week |
| Club POR (sponsor) | Unblocks access, approves pilots and public posts | 1 h/week |

## 6. Showcase plan

1. **Assets:** live demo link, 2-minute walkthrough video, one-page PDF (problem, approach, screens, methods, results on sample data), GitHub repo with a clear README and the docs, LinkedIn post series (four posts: real vs claimed ROI; rival price moves; customer types; actions that measure themselves).
2. **Narrative for interviews:** "Platforms claimed ₹22 Cr in an ₹18 Cr month. We built a free system that measures what each rupee really did with geo experiments, explains every week's change, and turns each insight into an action that is executed, logged and measured. Here it is."
3. **Narrative for investors:** "Indian D2C brands spend a quarter or more of revenue on ads across six platforms that all claim the same sale. Drishti measures what each rupee really did with experiments, built for Amazon, Flipkart, Nykaa and quick commerce, and closes the loop from insight to action to measured result. Free and self-hosted to earn trust; Drishti Cloud and measurement studies to earn revenue." Investor kit: pitch deck, investment memo, demo script and data-room checklist (private, kept by the founders).
4. **Depth on demand:** be ready to explain synthetic control, natural experiments, MMM calibration, k-means feature design, aspect sentiment and the free-tier architecture (the docs are the script).

## 7. Risks to the plan

| Risk | Signal | Response |
| --- | --- | --- |
| Build slips past the placement window | M3 not done by 1 Nov | Ship demo with fewer screens polished (This week, Impact, Market, Actions first); others follow |
| No pilot brand by mid-January | < 2 positive replies from 15 | Pilot with a club member's family business or a small D2C seller on Amazon; or run a "data donation" with anonymised exports |
| Free-tier change | Limits check fails | Adjust governors; document fallback (e.g. reduce sync frequency) |
| Model credibility challenged | Pilot disputes a result | Show the test design and placebo distribution; run a holdout to settle it |
| Team bandwidth during exams | Missed weekly reviews | Milestones sized to one Claude Code session each; pause between phases, not mid-milestone |
| Investors see a project, not a company | Questions about revenue, ownership or commitment dominate meetings | Settle `01-PRD.md` §11.8 first; lead with design-partner evidence and the open-core model |
| Design partners like it but will not pay | No letters of intent after a measured win | Test the measurement-study offer first (one-off, lower commitment); revisit Cloud pricing bands |

## 8. Progress table (update weekly)

| Week | Phase | Milestones done | KRA notes |
| --- | --- | --- | --- |
| 19 Oct 2026 | 0 | — | Docs v1.0, designs, sample data ready |
| 20 Oct 2026 | 0 | M0, M1, M2 | Repo, CI, Workers deployed (staging auto-deploys); engine and demo snapshot with GOLD-01..04 green. Founder framing added: business model, KRA 8, build order (M3 investor screens first, then M6) |



---

<!-- file: docs/14-SETUP-RUNBOOK.md -->

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
