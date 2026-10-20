import { parseCsv, parseCsvObjects } from '../csv';
import { loadWorkspace, type Workspace } from '../facts/workspace';
import type { Facts, Product, SalesCityDaily, SpendCityDaily } from '../facts/types';
import { makeTable, normHeader, SOURCES, WORKSPACE_TABS, type FactPart, type SourceDef } from './sources';
import { isXlsx, readXlsx, rowsToCsv } from './xlsx';

// File detection and assembly for the sandbox and Check my file (docs/11 §3, docs/05 §14). Pure TS: runs in Node and
// in a browser Web Worker.

export { normHeader, SOURCES, WORKSPACE_TABS, type SourceDef } from './sources';
export { readXlsx, isXlsx, rowsToCsv } from './xlsx';

export type Detected =
  { kind: 'source'; source: string; label: string } | { kind: 'tab'; tab: string } | { kind: 'unknown' };

/** One table recognised in a file or a sheet tab. */
export interface ParsedTable {
  /** File name, or "file › tab" for a workbook tab. */
  name: string;
  detected: Detected;
  headers: string[];
  rows: number;
  skipped: number;
  coverage: { from: string; to: string } | null;
  warnings: string[];
  part: FactPart;
  /** Workspace tab as CSV text (for loadWorkspace). */
  tabCsv?: string;
}

const strip = (name: string) =>
  name
    .replace(/\.[a-z0-9]+$/i, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');

const scoreOf = (headers: string[], required: readonly (readonly string[])[]) =>
  required.every((alts) => alts.some((a) => headers.includes(a))) ? required.length : 0;

/** Detection order (docs/11 §3): filename prefix, then the header signature with the most required columns. */
export function detect(name: string, rawHeaders: string[], mapping: Record<string, string> = {}): Detected {
  const headers = rawHeaders.map((h) => {
    const n = normHeader(h);
    return mapping[n] ? normHeader(mapping[n]) : n;
  });
  const base = strip(name.split('›').pop() ?? name);
  const tabByName = WORKSPACE_TABS.find((w) => w.tab === base || w.tab === base.replace(/_/g, ''));
  if (tabByName && scoreOf(headers, tabByName.required)) return { kind: 'tab', tab: tabByName.tab };
  const byPrefix = SOURCES.find((s) => s.prefix?.test(base) && scoreOf(headers, s.required));
  if (byPrefix) return { kind: 'source', source: byPrefix.id, label: byPrefix.label };
  let best: { s: SourceDef; score: number } | null = null;
  for (const s of SOURCES) {
    const score = scoreOf(headers, s.required);
    if (score && (!best || score > best.score)) best = { s, score };
  }
  if (best) return { kind: 'source', source: best.s.id, label: best.s.label };
  const tab = WORKSPACE_TABS.find((w) => scoreOf(headers, w.required));
  return tab ? { kind: 'tab', tab: tab.tab } : { kind: 'unknown' };
}

export interface ParseOptions {
  /** Salt for customer ID hashing (docs/05 §10). */
  hashKey: string;
  /** Mappings tab: normalised file column → expected column. */
  mapping?: Record<string, string>;
}

function parseRows(name: string, raw: string[][], opts: ParseOptions): ParsedTable {
  const headers = (raw[0] ?? []).map((h) => h.trim());
  const detected = detect(name, headers, opts.mapping);
  const base: ParsedTable = {
    name,
    detected,
    headers,
    rows: Math.max(0, raw.length - 1),
    skipped: 0,
    coverage: null,
    warnings: [],
    part: {},
  };
  if (detected.kind === 'tab') return { ...base, tabCsv: rowsToCsv(raw) };
  if (detected.kind === 'unknown') return base;
  const src = SOURCES.find((s) => s.id === detected.source)!;
  const warnings: string[] = [];
  const { part, skipped, dates } = src.parse(makeTable(raw, opts.mapping), { hashKey: opts.hashKey, warnings });
  const sorted = dates.filter(Boolean).sort();
  return {
    ...base,
    skipped,
    warnings,
    part,
    coverage: sorted.length ? { from: sorted[0]!, to: sorted.at(-1)! } : null,
  };
}

/** Parses a CSV text or XLSX bytes into one table per file or per workbook tab. */
export function parseFile(name: string, content: string | Uint8Array, opts: ParseOptions): ParsedTable[] {
  if (typeof content !== 'string' && isXlsx(content)) {
    const sheets = readXlsx(content);
    // A workbook's own Mappings tab applies to its other tabs.
    const mapTab = sheets.find((s) => strip(s.name) === 'mappings');
    const mapping = { ...opts.mapping, ...(mapTab ? mappingFrom(rowsToCsv(mapTab.rows)) : {}) };
    return sheets
      .filter((s) => s.rows.length > 1)
      .map((s) => parseRows(`${name} › ${s.name}`, s.rows, { ...opts, mapping }));
  }
  const text = typeof content === 'string' ? content : new TextDecoder().decode(content);
  return [parseRows(name, parseCsv(text), opts)];
}

/** Mappings tab rows (source, file_column, drishti_field) → normalised file column → expected column. */
export function mappingFrom(csv: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const r of parseCsvObjects(csv).rows)
    if (r.file_column && r.drishti_field) out[normHeader(r.file_column)] = r.drishti_field;
  return out;
}

export interface Assembled {
  facts: Facts;
  ws: Workspace;
  /** Share of sales revenue whose city was allocated from national shares (docs/06 §1.2). */
  allocatedShare: number;
  warnings: string[];
}

const EMPTY: Facts = {
  sales_city_daily: [],
  sales_sku_daily: [],
  spend_city_daily: [],
  orders_own_site: [],
  order_lines_own_site: [],
  customers_own_site: [],
  qc_store_daily: [],
  reviews: [],
  market_captures: [],
  search_share_weekly: [],
  products: [],
  creator_posts: [],
  trends_weekly: [],
};

/** Builds facts and the workspace from every parsed table of a company. */
export function assemble(tables: ParsedTable[]): Assembled {
  const warnings: string[] = [];
  const tabs = new Map<string, string>();
  for (const t of tables) if (t.detected.kind === 'tab' && t.tabCsv) tabs.set(t.detected.tab, t.tabCsv);
  const ws = loadWorkspace((tab) => tabs.get(tab));

  const facts: Facts = structuredClone(EMPTY);
  for (const t of tables)
    for (const [k, rows] of Object.entries(t.part) as [keyof Facts, unknown[]][]) (facts[k] as unknown[]).push(...rows);

  facts.products = productsFrom(tabs.get('products'), facts);
  mapSkus(facts);
  facts.creator_posts = ws.creators;
  facts.spend_city_daily.push(...creatorSpend(facts, ws));
  const allocatedShare = allocateCities(facts, warnings);
  for (const t of tables) warnings.push(...t.warnings);
  return { facts, ws, allocatedShare, warnings };
}

function productsFrom(csv: string | undefined, facts: Facts): Product[] {
  if (csv) {
    return parseCsvObjects(csv).rows.map((r) => ({
      sku: r.sku ?? '',
      name: r.name ?? r.sku ?? '',
      category: r.category ?? '',
      pack_ml: Number(r.pack_ml) || 0,
      mrp_inr: Number(r.mrp_inr ?? r.mrp) || 0,
      unit_cost_inr: Number(r.unit_cost_inr ?? r.unit_cost) || 0,
      launch_date: r.launch_date ?? '',
      hero: /^(true|yes|1)$/i.test(r.hero ?? ''),
      asin: r.asin ?? '',
      fsn: r.fsn ?? '',
      nykaa_id: r.nykaa_id ?? '',
    }));
  }
  // No Products tab: one product per SKU seen, the best seller as hero.
  const rev = new Map<string, number>();
  for (const s of facts.sales_sku_daily) rev.set(s.sku, (rev.get(s.sku) ?? 0) + s.net_revenue_inr);
  const top = [...rev].sort((a, b) => b[1] - a[1])[0]?.[0];
  return [...rev.keys()].map((sku) => ({
    sku,
    name: sku,
    category: '',
    pack_ml: 0,
    mrp_inr: 0,
    unit_cost_inr: 0,
    launch_date: '',
    hero: sku === top,
    asin: '',
    fsn: '',
    nykaa_id: '',
  }));
}

/** Marketplace codes (asin:…, fsn:…, nykaa:…) → the SKU from the Products tab, when known. */
function mapSkus(facts: Facts) {
  const by = {
    asin: new Map(facts.products.filter((p) => p.asin).map((p) => [p.asin, p.sku])),
    fsn: new Map(facts.products.filter((p) => p.fsn).map((p) => [p.fsn, p.sku])),
    nykaa: new Map(facts.products.filter((p) => p.nykaa_id).map((p) => [p.nykaa_id, p.sku])),
  };
  for (const s of facts.sales_sku_daily) {
    const m = /^(asin|fsn|nykaa):(.*)$/.exec(s.sku);
    if (m) s.sku = by[m[1] as keyof typeof by].get(m[2]!) ?? m[2]!;
  }
}

/** Creator posts become creator spend, split over their audience cities; the claim is their codes' own-site revenue. */
function creatorSpend(facts: Facts, ws: Workspace): SpendCityDaily[] {
  const byCode = new Map<string, number>();
  for (const o of facts.orders_own_site)
    if (o.discount_code) byCode.set(o.discount_code, (byCode.get(o.discount_code) ?? 0) + o.net_inr);
  const out: SpendCityDaily[] = [];
  for (const p of ws.creators) {
    if (!p.post_date || !p.cost_inr) continue;
    const cities = p.audience_cities.length ? p.audience_cities : [''];
    const claim = byCode.get(p.discount_code) ?? 0;
    cities.forEach((city, i) => {
      const share = (x: number) =>
        i === cities.length - 1
          ? x - Math.floor(x / cities.length) * (cities.length - 1)
          : Math.floor(x / cities.length);
      out.push({
        date: p.post_date,
        city,
        media: 'creators',
        platform: 'Creators',
        spend_inr: share(p.cost_inr),
        platform_claimed_revenue_inr: share(claim),
      });
    });
  }
  return out;
}

/**
 * Rows without a city are split across cities by the national share of sales that do have a city (docs/06 §1.2);
 * with no city anywhere they stay as one "All India" row. Returns the allocated share of revenue.
 */
function allocateCities(facts: Facts, warnings: string[]): number {
  const known = facts.sales_city_daily.filter((r) => r.city);
  const byCity = new Map<string, { rev: number; state: string }>();
  for (const r of known) {
    const c = byCity.get(r.city) ?? { rev: 0, state: r.state };
    c.rev += r.net_revenue_inr;
    if (!c.state && r.state) c.state = r.state;
    byCity.set(r.city, c);
  }
  // States for QC cities come from any other row naming the same city.
  const total = [...byCity.values()].reduce((s, c) => s + c.rev, 0);
  const shares = total ? [...byCity].map(([city, c]) => ({ city, state: c.state, w: c.rev / total })) : [];
  for (const r of facts.sales_city_daily) if (!r.state) r.state = byCity.get(r.city)?.state ?? '';

  const split = <T extends { city: string }>(
    rows: T[],
    fields: (keyof T)[],
    setState?: (row: T, state: string) => void,
  ) => {
    const out: T[] = [];
    for (const r of rows) {
      if (r.city) {
        out.push(r);
        continue;
      }
      if (!shares.length) {
        out.push({ ...r, city: 'All India' });
        continue;
      }
      const parts = shares.map((s) => ({ ...r, city: s.city }) as T);
      for (const f of fields) {
        const v = r[f] as number;
        let left = v;
        parts.forEach((p, i) => {
          const x = i === parts.length - 1 ? left : Math.round(v * shares[i]!.w);
          (p[f] as number) = x;
          left -= x;
        });
      }
      if (setState) parts.forEach((p, i) => setState(p, shares[i]!.state));
      out.push(...parts.filter((p) => fields.some((f) => (p[f] as number) !== 0)));
    }
    return out;
  };

  const salesTotal = facts.sales_city_daily.reduce((s, r) => s + r.net_revenue_inr, 0);
  const allocated = facts.sales_city_daily.filter((r) => !r.city).reduce((s, r) => s + r.net_revenue_inr, 0);
  facts.sales_city_daily = split<SalesCityDaily>(
    facts.sales_city_daily,
    ['orders', 'units', 'net_revenue_inr', 'returned_orders'],
    (row, state) => (row.state = state),
  );
  facts.spend_city_daily = split<SpendCityDaily>(facts.spend_city_daily, ['spend_inr', 'platform_claimed_revenue_inr']);
  const share = salesTotal ? allocated / salesTotal : 0;
  if (share > 0.3)
    warnings.push(
      `${Math.round(share * 100)}% of sales have no city and were spread by the national city mix; city-level tests are less reliable.`,
    );
  return share;
}
