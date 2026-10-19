# 13 · Phased Strategy Plan and Key Result Areas

## 1. Objectives

| # | Objective | Why it matters for PreQL |
| --- | --- | --- |
| O1 | Ship a working, public showcase of Drishti that a recruiter understands in two minutes | Placement and internship conversations need proof of enterprise-level depth, not slides |
| O2 | Make every action real: executed, prepared, tested or assigned, then measured | This is the difference between a dashboard and a decision system; it is also the story recruiters remember |
| O3 | Prove value with real data from at least two pilot brands | Converts "student project" into "used by a brand" |
| O4 | Stay at ₹0 and keep brand data in brand accounts | Removes the two biggest objections: budget and data trust |
| O5 | Leave a maintainable product the club can hand over every year | Long-term brand for PreQL |

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

**Gate to Phase 1:** E2E-01..12 green on production; three people outside the team complete the demo walkthrough unaided in under three minutes.

### Phase 1 · Measure and assist (2 Nov – 29 Nov 2026, 4 weeks)

**Goal:** a real workspace syncing real-format data; L1 actions everywhere and L2 on Shopify.

| Deliverable | Milestones |
| --- | --- |
| Google Sign-In, roles, sessions, Admin | M4 |
| Workspace Sheet + Drive Inbox + parsers for all 13 sources; scheduled and manual sync; Data sources live | M5 |
| Incrementality v1 (natural experiments + MMM-lite), bridge, market, k-means, voice (lexicon) on synced data | M6 |
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

**Gate to Phase 4:** at least one pilot reports a measured improvement and agrees to be referenced.

### Phase 4 · Scale and hand over (Feb – Apr 2027)

- Multi-workspace (agency view), onboarding wizard, phone summary view.
- Amazon SP-API and Amazon Ads API connectors (official, free with registration), Google Ads API (developer token), Bayesian MMM option.
- Annual club handover in April (`04-ADMIN.md` §9).

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
3. **Depth on demand:** be ready to explain synthetic control, natural experiments, MMM calibration, k-means feature design, aspect sentiment and the free-tier architecture (the docs are the script).

## 7. Risks to the plan

| Risk | Signal | Response |
| --- | --- | --- |
| Build slips past the placement window | M3 not done by 1 Nov | Ship demo with fewer screens polished (This week, Impact, Market, Actions first); others follow |
| No pilot brand by mid-January | < 2 positive replies from 15 | Pilot with a club member's family business or a small D2C seller on Amazon; or run a "data donation" with anonymised exports |
| Free-tier change | Limits check fails | Adjust governors; document fallback (e.g. reduce sync frequency) |
| Model credibility challenged | Pilot disputes a result | Show the test design and placebo distribution; run a holdout to settle it |
| Team bandwidth during exams | Missed weekly reviews | Milestones sized to one Claude Code session each; pause between phases, not mid-milestone |

## 8. Progress table (update weekly)

| Week | Phase | Milestones done | KRA notes |
| --- | --- | --- | --- |
| 19 Oct 2026 | 0 | — | Docs v1.0, designs, sample data ready |
