import {
  CHANNELS,
  SNAPSHOT_SCHEMA,
  snapshotSchema,
  type Channel,
  type Snapshot,
  type Suggestion,
} from '@drishti/shared';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js';
import { buildContext } from './context';
import type { Facts } from './facts/types';
import type { Workspace } from './facts/workspace';
import { buildCustomers } from './sections/customers';
import { buildData, buildSources } from './sections/data';
import { buildImpact } from './sections/impact';
import { buildMarket } from './sections/market';
import { buildPerformance } from './sections/performance';
import { buildVoice, topIssue } from './sections/voice';
import { buildWeek } from './sections/week';
import { suggest } from './suggest';
import { t } from '@drishti/shared';

// Snapshot builder (docs/05 §4 step 9, docs/06 §6). Deterministic: the same facts give the same version.

export interface BuildOptions {
  demo: boolean;
  /** ISO timestamp of the sync; excluded from the version hash so re-runs give the same version (SYNC-02). */
  generatedAt: string;
  /** Own-site files are a sample in the demo (×20, docs/11 §9). */
  sampleScale?: number;
}

/** Stable JSON: object keys sorted, so the hash does not depend on insertion order. */
export function stableStringify(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(',')}]`;
  if (v && typeof v === 'object')
    return `{${Object.keys(v as object)
      .sort()
      .filter((k) => (v as Record<string, unknown>)[k] !== undefined)
      .map((k) => `${JSON.stringify(k)}:${stableStringify((v as Record<string, unknown>)[k])}`)
      .join(',')}}`;
  return JSON.stringify(v);
}

export function buildSnapshot(facts: Facts, ws: Workspace, opts: BuildOptions): Snapshot {
  const ctx = buildContext(facts, ws, { sampleScale: opts.sampleScale ?? 1, today: opts.generatedAt.slice(0, 10) });
  const threshold = ws.settings.approval_threshold_inr;

  const sources = buildSources(ctx);
  const market = buildMarket(ctx);
  const impact = buildImpact(ctx);
  const customers = buildCustomers(ctx);
  const voice = buildVoice(ctx);

  // Channel suggestions for Performance: the market coupon on its platform, plus one move per channel.
  const coupon = market.section.products.flatMap((p) => p.suggestions).find((s) => s.type === 'amazon_coupon');
  const issue = topIssue(ctx);
  const perChannel: Partial<Record<Channel, Suggestion[]>> = {};
  for (const c of CHANNELS) {
    const list: Suggestion[] = [];
    if (c === 'amazon' && coupon) list.push(coupon);
    const type = (
      {
        amazon: 'listing_update',
        own_site: 'prepaid_nudge',
        quick_commerce: 'restock_request',
        nykaa: 'nykaa_request',
        flipkart: 'flipkart_claim',
      } as const
    )[c];
    list.push(
      suggest(
        {
          type,
          context: `channel=${c}`,
          title: t(`perf.sg.${c}.title`),
          why: t(`perf.sg.${c}.why`),
          impactLabel: t('impact.label.rating'),
          confidence: 'low',
          params: { channel: c },
          stepVars: { city: 'the busiest city' },
        },
        threshold,
      ),
    );
    perChannel[c] = list;
  }

  const candidates = [
    ...market.section.products.flatMap((p) => p.suggestions.filter((s) => s.type === 'amazon_coupon')),
    ...voice.aspects.flatMap((a) => a.suggestions.filter((s) => s.type === 'qa_hold')),
    ...customers.segments.flatMap((s) => s.suggestions.filter((x) => x.type === 'shopify_discount_cap')),
    ...impact.section.channels.flatMap((c) => c.suggestions.filter((s) => s.type === 'budget_change')),
  ];
  const week = buildWeek(ctx, { changes: market.changes, candidates, sources, issue });

  const body: Omit<Snapshot, 'version'> = {
    schema: SNAPSHOT_SCHEMA,
    generated_at: opts.generatedAt,
    data_through: ctx.through,
    workspace: { name: ws.settings.brand_name, demo: opts.demo },
    windows: { week: ctx.w.week, prior_week: ctx.w.prior_week, d28: ctx.w.d28, prior_d28: ctx.w.prior_d28 },
    sources,
    week,
    performance: buildPerformance(ctx, perChannel),
    impact: impact.section,
    market: market.section,
    customers: customers.section,
    voice,
    data: buildData(ctx, sources),
    rules_fired: [],
  };
  const { generated_at: _g, ...hashed } = body;
  const version = bytesToHex(sha256(utf8ToBytes(stableStringify(hashed)))).slice(0, 32);
  return snapshotSchema.parse({ ...body, version });
}
