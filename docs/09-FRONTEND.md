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
| home.cta.demo / try / setup | Open the demo / Try with your own data / Set up your workspace |
| home.sample / guide / free | Download the sample sheet / What data Drishti needs / Free. Your data stays in your own accounts. |
| onboarding.title | Set up your workspace |
| guide.title / subtitle | What data Drishti needs / Every source, where to export it, and a sample file for each. |
| guide.check | Check my file |
| try.title / drop / chip / show / clear | Try with your own data / Drop your filled template or exports here. Files stay in this browser. / Your files, this browser only / Show my screens / Clear my data |
