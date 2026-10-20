import { readFileSync } from 'node:fs';
import path from 'node:path';
import { snapshotSchema } from '@drishti/shared';
import { describe, expect, it } from 'vitest';
import { loadDemoFacts } from '../src/facts/demo';
import { assemble, detect, parseFile, readXlsx, type ParsedTable } from '../src/parsers';
import { buildSnapshot } from '../src/snapshot';

// Parsers and connectors (docs/12 §2, CON-01..16) and the sandbox build (docs/05 §14).

const root = path.resolve(import.meta.dirname, '../../../sample-data');
const inbox = (f: string) => readFileSync(path.join(root, 'inbox', f), 'utf8');
const demo = loadDemoFacts((n) => readFileSync(path.join(root, 'demo', n), 'utf8'), { hashKey: 'demo' });
const opts = { hashKey: 'test' };
const one = (f: string) => parseFile(f, inbox(f), opts)[0]!;
const sum = <T>(rows: T[], f: (r: T) => number) => rows.reduce((s, r) => s + f(r), 0);
const near = (a: number, b: number) => expect(Math.abs(a - b)).toBeLessThanOrEqual(Math.max(50, b * 0.0001));

const CASES = [
  ['CON-01', 'shopify_orders_export.csv', 'shopify_orders_csv'],
  ['CON-02', 'amazon_business_report_daily.csv', 'amazon_business_report'],
  ['CON-03', 'amazon_ads_campaigns_daily.csv', 'amazon_ads'],
  ['CON-04', 'amazon_brand_analytics_search_query.csv', 'amazon_brand_analytics'],
  ['CON-05', 'meta_ads_daily.csv', 'meta_ads'],
  ['CON-07', 'google_ads_daily.csv', 'google_ads'],
  ['CON-08', 'flipkart_sales_daily.csv', 'flipkart_sales'],
  ['CON-09', 'flipkart_ads_daily.csv', 'flipkart_ads'],
  ['CON-10', 'nykaa_sales_weekly.csv', 'nykaa_sales'],
  ['CON-11', 'quick_commerce_store_daily.csv', 'quick_commerce'],
  ['CON-12', 'google_trends_weekly.csv', 'google_trends'],
  ['CON-13', 'reviews_export.csv', 'reviews'],
  ['CON-13b', 'watchlist_captures.csv', 'watchlist_capture'],
] as const;

describe('inbox samples (CON-01..13)', () => {
  for (const [id, file, source] of CASES) {
    it(`${id} ${file} is detected as ${source} and parses with no skipped rows`, () => {
      const t = one(file);
      expect(t.detected).toMatchObject({ kind: 'source', source });
      expect(t.skipped).toBe(0);
      expect(t.coverage).not.toBeNull();
    });
  }

  it('detects by header even when the file name says nothing', () => {
    const t = parseFile('export (3).csv', inbox('meta_ads_daily.csv'), opts)[0]!;
    expect(t.detected).toMatchObject({ source: 'meta_ads' });
  });

  it('spend files match the demo facts on the same dates (within rounding of paise)', () => {
    for (const f of [
      'meta_ads_daily.csv',
      'google_ads_daily.csv',
      'amazon_ads_campaigns_daily.csv',
      'flipkart_ads_daily.csv',
    ]) {
      const rows = one(f).part.spend_city_daily!;
      const dates = new Set(rows.map((r) => r.date));
      const ref = demo.spend_city_daily.filter((r) => r.media === rows[0]!.media && dates.has(r.date));
      near(
        sum(rows, (r) => r.spend_inr),
        sum(ref, (r) => r.spend_inr),
      );
      near(
        sum(rows, (r) => r.platform_claimed_revenue_inr),
        sum(ref, (r) => r.platform_claimed_revenue_inr),
      );
    }
  });

  it('marketplace sales files match the demo SKU facts exactly', () => {
    for (const f of ['amazon_business_report_daily.csv', 'flipkart_sales_daily.csv', 'nykaa_sales_weekly.csv']) {
      const rows = one(f).part.sales_sku_daily!;
      const dates = new Set(rows.map((r) => r.date));
      const ref = demo.sales_sku_daily.filter((r) => r.channel === rows[0]!.channel && dates.has(r.date));
      expect(sum(rows, (r) => r.units)).toBe(sum(ref, (r) => r.units));
      expect(sum(rows, (r) => r.net_revenue_inr)).toBe(sum(ref, (r) => r.net_revenue_inr));
    }
  });

  it('Shopify orders, store rows and reviews match the demo files', () => {
    const shop = one('shopify_orders_export.csv');
    const cov = shop.coverage!;
    const ref = demo.orders_own_site.filter((o) => o.date >= cov.from && o.date <= cov.to);
    expect(shop.part.orders_own_site!.length).toBe(ref.length);
    expect(sum(shop.part.orders_own_site!, (o) => o.net_inr)).toBe(sum(ref, (o) => o.net_inr));
    const qc = one('quick_commerce_store_daily.csv').part.qc_store_daily!;
    const qcRef = demo.qc_store_daily.filter((r) => r.date >= qc[0]!.date && r.date <= qc.at(-1)!.date);
    expect(sum(qc, (r) => r.units)).toBe(sum(qcRef, (r) => r.units));
    expect(one('reviews_export.csv').part.reviews!.length).toBe(1568);
  });
});

describe('detection edge cases', () => {
  it('CON-14 unknown headers are reported with the headers found', () => {
    const t = parseFile('mystery.csv', 'foo,bar,baz\n1,2,3', opts)[0]!;
    expect(t.detected.kind).toBe('unknown');
    expect(t.headers).toEqual(['foo', 'bar', 'baz']);
  });

  it('CON-15 a Mappings override renames a column and the file parses', () => {
    const text = inbox('meta_ads_daily.csv').replace('Amount spent (INR)', 'Money out');
    expect(parseFile('m.csv', text, opts)[0]!.detected.kind).not.toBe('source');
    const t = parseFile('m.csv', text, { ...opts, mapping: { 'money out': 'Amount spent (INR)' } })[0]!;
    expect(t.detected).toMatchObject({ source: 'meta_ads' });
    expect(sum(t.part.spend_city_daily!, (r) => r.spend_inr)).toBeGreaterThan(0);
  });

  it('CON-16 Indian formats, ₹, commas and Excel serial dates parse', () => {
    const csv = 'Date,(Child) ASIN,SKU,Units Ordered,Ordered Product Sales\n46282,B01,S1,"1,234","₹1,23,456.50"';
    const t = parseFile('a.csv', csv, opts)[0]!;
    expect(t.part.sales_sku_daily![0]).toMatchObject({ date: '2026-09-17', units: 1234, net_revenue_inr: 123457 });
  });

  it('workspace tabs are recognised by name and by headers', () => {
    expect(detect('Products', ['sku', 'name', 'pack_ml', 'mrp_inr'])).toEqual({ kind: 'tab', tab: 'products' });
    expect(detect('whatever.csv', ['key', 'value', 'notes'])).toEqual({ kind: 'tab', tab: 'settings' });
  });
});

describe('sandbox build (docs/05 §14)', () => {
  const xlsx = new Uint8Array(readFileSync(path.join(root, 'Drishti-Workspace-Template.xlsx')));
  const files = CASES.map(([, f]) => f);
  const tables: ParsedTable[] = [
    ...parseFile('Drishti-Workspace-Template.xlsx', xlsx, opts),
    ...files.flatMap((f) => parseFile(f, inbox(f), opts)),
  ];

  it('reads every tab of the template workbook', () => {
    const names = readXlsx(xlsx).map((s) => s.name);
    expect(names).toEqual(expect.arrayContaining(['Settings', 'Products', 'Channels', 'Creators', 'Tests']));
  });

  it('assembles facts: marketplace codes map to SKUs and city-less rows are allocated with totals kept', () => {
    const a = assemble(tables);
    expect(a.ws.settings.brand_name).toBe('Lumora Skin');
    expect(a.facts.sales_sku_daily.some((r) => r.sku.startsWith('asin:'))).toBe(false);
    expect(a.facts.sales_city_daily.every((r) => r.city)).toBe(true);
    const amazonIn = sum(one('amazon_business_report_daily.csv').part.sales_city_daily!, (r) => r.net_revenue_inr);
    const amazonOut = sum(
      a.facts.sales_city_daily.filter((r) => r.channel === 'amazon'),
      (r) => r.net_revenue_inr,
    );
    expect(amazonOut).toBe(amazonIn);
    expect(a.allocatedShare).toBeGreaterThan(0.3);
    expect(a.warnings.join(' ')).toMatch(/no city/);
  });

  it('builds a valid snapshot; with 30 days of history real returns are "not measured yet", not invented', () => {
    const a = assemble(tables);
    const snap = buildSnapshot(a.facts, a.ws, { demo: true, generatedAt: '2026-10-17T07:10:00+05:30' });
    expect(snapshotSchema.safeParse(snap).success).toBe(true);
    expect(snap.windows.week).toEqual(['2026-10-05', '2026-10-11']);
    expect(snap.impact.channels.every((c) => c.measured === false)).toBe(true);
    expect(snap.impact.verdict.chip).toBe('Not measured yet');
    expect(snap.week.kpis.find((k) => k.id === 'true_roas')!.display).toBe('—');
    expect(snap.week.suggestions.some((s) => s.type === 'budget_shift')).toBe(false);
  });
});

describe('partial data (a sandbox company with only some sources)', () => {
  const combos: Record<string, string[]> = {
    nothing: [],
    shopify: ['shopify_orders_export.csv'],
    amazon: ['amazon_business_report_daily.csv'],
    meta: ['meta_ads_daily.csv'],
    reviews: ['reviews_export.csv'],
    captures: ['watchlist_captures.csv'],
    'quick commerce': ['quick_commerce_store_daily.csv'],
    nykaa: ['nykaa_sales_weekly.csv'],
    'shopify + meta': ['shopify_orders_export.csv', 'meta_ads_daily.csv'],
  };
  for (const [name, files] of Object.entries(combos)) {
    it(`${name}: builds a valid snapshot with no NaN or Infinity anywhere`, () => {
      const a = assemble(files.flatMap((f) => parseFile(f, inbox(f), opts)));
      const snap = buildSnapshot(a.facts, a.ws, { demo: true, generatedAt: '2026-10-17T07:10:00+05:30' });
      expect(snapshotSchema.safeParse(snap).success).toBe(true);
      const bad: string[] = [];
      const walk = (v: unknown, at: string) => {
        if (typeof v === 'number' && !Number.isFinite(v)) bad.push(at);
        else if (typeof v === 'string' && /NaN|Infinity/.test(v)) bad.push(`${at}: ${v}`);
        else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, `${at}.${k}`);
      };
      walk(snap, 'snapshot');
      expect(bad).toEqual([]);
    });
  }
});
