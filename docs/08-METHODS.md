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

Combined estimate = precision-weighted mean of the available estimates (weight × 1/variance). Interval from the combined variance. Confidence:

- **high**: at least one planned test in the last 120 days and interval width < 60% of the estimate;
- **medium**: natural experiments or a test older than 120 days, or interval width < 100% of the estimate;
- **low**: regression only, or interval width ≥ 100%.

The Impact screen shows the estimate as "₹153 per ₹100" with the interval on hover ("₹118 to ₹190, 90% range") and the evidence text ("three natural experiments and a live holdout in Pune and Ahmedabad").

### 3.2 Synthetic control (geo tests and natural experiments)

Inputs: daily total net revenue per city (all channels, `sales_city_daily`), test cities T (aggregated into one series y_T), donor cities D (cities not affected by the change and not in another live test; exclude cities with allocated rows > 30%).

1. **Pre-period:** 56 days before the change (minimum 28). Normalise each series by its pre-period mean.
2. **Weights:** w ∈ ℝ^|D|, w ≥ 0, Σw = 1, minimising Σ_pre (y_T − Σ w_d y_d)² + λ‖w‖² with λ = 0.01 × mean squared y_T. Solve by projected gradient descent onto the simplex (Duchi et al. projection), 2,000 iterations, tolerance 1e-9. Deterministic start w = 1/|D|.
3. **Fit check:** pre-period RMSPE; require R² ≥ 0.6, else the estimate is flagged `poor_fit` and confidence capped at low.
4. **Effect:** during the test, gap_t = y_T,t − ŷ_T,t (in rupees after de-normalising). Total effect = Σ gap_t over the test plus a carryover tail of 7 days after the test ends (for holdouts the tail captures slow-decaying effects).
5. **Return:** for a holdout (spend removed), real revenue per rupee = −total effect ÷ spend removed, where spend removed = Σ over test days of expected spend in T (pre-period spend share × total media spend) minus actual spend in T. For a boost, = total effect ÷ extra spend.
6. **Interval:** placebo-in-space: run steps 2–5 treating each donor as if it were treated; the distribution of placebo effects (scaled to the same spend) gives a 90% interval around the estimate (5th–95th percentile of estimate + placebo noise). If fewer than 6 donors, use a block bootstrap over weeks of the pre-period residuals.
7. **Guardrails:** test invalid if spend in T did not drop at least 60% of plan (`TEST_NOT_APPLIED`), if a donor had a stockout or sale event in the window (removed automatically), or if a calendar event affects T only.

Expected on demo data: the Pune and Ahmedabad Meta holdout (from 26 Sep 2026) gives an estimate between 0.6 and 2.4 (planted 1.53); see tolerances in `expected_metrics.json`.

### 3.3 Natural-experiment detection

Scan `spend_city_daily` per medium and city:

- **Spend shock:** 7-day rolling spend drops below 40% or rises above 180% of the trailing 28-day median for at least 5 consecutive days, while national spend for that medium stays within ±25%. Example in the demo: Meta in Kolkata 2–15 Mar 2026 (billing lapse), Meta burst in Hyderabad 1–10 Dec 2025, Google brand-search cut in Jaipur 4–17 Aug 2026.
- **Stockout window** (quick-commerce ads): for stores with stockout = yes, ad spend that ran during stockout days delivered nothing; the share of QC revenue lost vs same-store forecast quantifies the stockout cost (used by the bridge) and the comparison of in-stock vs out-of-stock stores with similar ad spend gives a QC-ads estimate.

Each detected event is read with §3.2 (city as T). Events shorter than 5 days or with pre-fit R² < 0.6 are dropped.

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

Standardise each feature (z-score). Winsorise at ±3.

### 7.2 Clustering
- k-means++ initialisation with a seeded PRNG (mulberry32, seed 7), 10 restarts, max 300 iterations, tolerance 1e-6; keep the lowest inertia.
- k = 5 by default (stable, explainable). Report silhouette (sampled 2,000 points) for k = 3..7 in the method note; switch k only by Analyst choice.
- Stability: adjusted Rand index vs last run on customers present in both; if < 0.7, show "Groups shifted since last run" in the method note.

### 7.3 Naming and flags
Per cluster compute buyers %, revenue %, AOV, orders a year, repeat %, discount %, COD %, RTO %, CAC (by acquisition source mix), 12-month value, LTV:CAC.

- **Preferred** = highest LTV:CAC (ties: higher revenue %).
- **Problem** = highest (discount % + COD % + 2 × RTO %) among clusters with LTV:CAC < 2.
- Names by rule (first match): orders ≥ 3 and repeat ≥ 60% → "Routine Loyalists"; AOV in top 2 and orders ≥ 1.8 → "Ingredient Explorers"; ≥ 50% of orders in festival windows → "Festive Gifters"; discount ≥ 50% and COD ≥ 50% → "Deal Hunters"; orders ≈ 1 and repeat < 10% → "One-time Trialists"; else "Type N". Names are editable per workspace (Settings key `segment_names`).
- Acceptance on demo data: the preferred cluster has mean orders ≥ 2.5 and AOV ≥ ₹850; the problem cluster has discount ≥ 0.6 and COD ≥ 0.6.

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
