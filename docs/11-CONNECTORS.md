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
| `inbox/*.csv` | 13 files | raw-format samples for parser tests |
| `workspace/*.csv`, `Drishti-Workspace-Template.xlsx` | 15 tabs | Sheet template |
| `expected/expected_metrics.json` | | golden KPI values, planted effects, test tolerances |

**Planted effects** (tests check the engine finds them): Meta holdout in Pune and Ahmedabad from 26 Sep 2026; Google brand-search cut in Jaipur 4–17 Aug 2026 and in Jaipur, Lucknow, Indore, Kochi from 11 Oct 2026; Meta billing lapse in Kolkata 2–15 Mar 2026 and burst in Hyderabad 1–10 Dec 2025; Rival B price cut of 18.2% on Amazon on 2 Oct 2026; Mumbai quick-commerce stockout 5–7 Oct 2026; pump defect complaints from 21 Sep 2026; Flipkart Ads file missing after 11 Oct; creator posts after 5 Oct missing from the sheet; true and claimed ROAS per medium in `expected_metrics.json`.

Design screens show illustrative numbers close to, but not identical with, the numbers the engine computes from this data (for example ₹18.4 Cr in the design vs ₹18.1 Cr computed for the last 28 days). Tests use `expected_metrics.json`, never the design numbers.
