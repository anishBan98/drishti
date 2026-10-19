import { z } from 'zod';

// Snapshot schema (docs/06-DATA-MODEL.md §6). One JSON document per sync; every screen reads only its section.

export const SNAPSHOT_SCHEMA = 'drishti.snapshot@1' as const;

const money = z.number();
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const range = z.tuple([isoDate, isoDate]);
const confidence = z.enum(['high', 'medium', 'low']);

export const deltaSchema = z.object({
  value: z.number(),
  unit: z.enum(['pct', 'pts', 'inr', 'x']),
  direction: z.enum(['up', 'down', 'flat']),
  good: z.boolean().nullable(),
});

export const kpiSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.number(),
  display: z.string(),
  delta: deltaSchema.optional(),
  note: z.string().optional(),
  spark: z.array(z.number()).optional(),
  tone: z.enum(['good', 'bad', 'warn', 'neutral']).optional(),
});

export const verdictSchema = z.object({ tone: z.enum(['good', 'bad', 'warn']), chip: z.string(), text: z.string() });
export const evidenceSchema = z.object({ label: z.string(), detail: z.string().optional() });

export const suggestionSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string(),
  why: z.string(),
  impactLabel: z.string(),
  expectedInr: money.optional(),
  expectedPer: z.enum(['week', 'month', 'once']).optional(),
  confidence,
  priority: z.number(),
  evidence: z.array(evidenceSchema),
  params: z.record(z.string(), z.unknown()),
  runLabel: z.string(),
  doneLabel: z.string(),
  needsApproval: z.boolean(),
  executor: z.enum(['inline', 'job', 'handoff']),
  steps: z.array(z.string()),
});

const sourceSchema = z.object({
  id: z.string(),
  label: z.string(),
  method: z.string(),
  cadence: z.string(),
  status: z.enum(['ok', 'received', 'late', 'never', 'error']),
  late_days: z.number(),
  last_received_at: z.string().optional(),
  feeds: z.string(),
  how: z.string(),
  rule: z.string(),
});

const headed = { verdict: verdictSchema, kpis: z.array(kpiSchema) };

export const snapshotSchema = z.object({
  schema: z.literal(SNAPSHOT_SCHEMA),
  version: z.string(),
  generated_at: z.string(),
  data_through: isoDate,
  workspace: z.object({ name: z.string(), demo: z.boolean() }),
  windows: z.object({ week: range, prior_week: range, d28: range, prior_d28: range }),
  sources: z.array(sourceSchema),
  week: z.object({
    ...headed,
    bridge: z.object({
      prior: money,
      current: money,
      axis: z.tuple([money, money]),
      explained_pct: z.number(),
      drivers: z.array(
        z.object({
          id: z.string(),
          label: z.string(),
          channel: z.string(),
          value_lakh: z.number(),
          method: z.string(),
          evidence: z.array(evidenceSchema),
        }),
      ),
    }),
    working: z.array(z.object({ title: z.string(), detail: z.string() })),
    attention: z.array(z.object({ title: z.string(), detail: z.string() })),
    inference: z.string(),
    suggestions: z.array(suggestionSchema),
  }),
  performance: z.object({
    ...headed,
    weekly: z.object({
      weeks: z.array(z.string()),
      revenue_by_channel: z.record(z.string(), z.array(z.number())),
      orders: z.array(z.number()),
      aov: z.array(z.number()),
      buyers: z.array(z.number()),
    }),
    channels: z.array(
      z.object({
        id: z.string(),
        label: z.string(),
        color: z.string(),
        revenue: money,
        growth_pct: z.number(),
        orders: z.number(),
        aov: money,
        buyers: z.number().optional(),
        return_pct: z.number(),
        share_pct: z.number(),
        headline: z.string(),
        notes: z.array(z.string()),
        suggestions: z.array(suggestionSchema),
      }),
    ),
  }),
  impact: z.object({
    ...headed,
    channels: z.array(
      z.object({
        id: z.string(),
        label: z.string(),
        spend: money,
        claimed: money,
        real: money,
        real_low: money,
        real_high: money,
        claimed_per100: z.number(),
        real_per100: z.number(),
        confidence,
        evidence: z.string(),
        headline: z.string(),
        suggestions: z.array(suggestionSchema),
      }),
    ),
    acquisition: z.array(
      z.object({ source: z.string(), cac: money, value_12m: money, ltv_cac: z.number(), payback_months: z.number() }),
    ),
    tests: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        day: z.number(),
        days: z.number(),
        readout: z.string(),
        note: z.string(),
      }),
    ),
  }),
  market: z.object({
    ...headed,
    category_label: z.string(),
    median_per10: z.number(),
    category_rating: z.number(),
    products: z.array(
      z.object({
        id: z.string(),
        label: z.string(),
        brand: z.string(),
        platforms: z.string(),
        is_us: z.boolean(),
        price: money,
        per10: z.number(),
        change_14d_pct: z.number().nullable(),
        rating: z.number(),
        reviews: z.number(),
        perception: z.object({ gentle_clinical: z.number(), value_premium: z.number() }),
        says: z.string(),
        threat: z.enum(['You', 'High threat', 'Medium threat', 'Low threat', 'Opportunity', 'Different buyer']),
        headline: z.string(),
        suggestions: z.array(suggestionSchema),
      }),
    ),
    price_changes: z.array(z.object({ label: z.string(), platform: z.string(), pct: z.number(), date: isoDate })),
    open_space: z
      .object({
        quadrant: z.enum(['gentle_premium', 'gentle_value', 'clinical_premium', 'clinical_value']),
        label: z.string(),
      })
      .optional(),
  }),
  customers: z.object({
    ...headed,
    method: z.string(),
    segments: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        kind: z.enum(['preferred', 'problem', 'other']),
        buyers_pct: z.number(),
        revenue_pct: z.number(),
        aov: money,
        orders_per_year: z.number(),
        repeat_pct: z.number(),
        cac: money,
        ltv_12m: money,
        ltv_cac: z.number(),
        discount_pct: z.number(),
        cod_pct: z.number(),
        rto_pct: z.number(),
        centroid: z.object({ orders: z.number(), aov: money }),
        sample: z.array(z.tuple([z.number(), z.number()])),
        tag: z.string(),
        headline: z.string(),
        suggestions: z.array(suggestionSchema),
      }),
    ),
    stability: z.object({ ari_vs_last: z.number().nullable(), k: z.number(), silhouette: z.number() }),
  }),
  voice: z.object({
    ...headed,
    aspects: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        mentions: z.number(),
        us: z.number(),
        category: z.number(),
        tag: z.string(),
        headline: z.string(),
        quotes: z.array(z.object({ text: z.string(), src: z.string() })),
        suggestions: z.array(suggestionSchema),
      }),
    ),
    issues: z.array(
      z.object({
        title: z.string(),
        mentions: z.number(),
        change_pct: z.number().nullable(),
        is_new: z.boolean(),
        platforms: z.string(),
        first_seen: isoDate,
      }),
    ),
  }),
  data: z.object(headed),
  rules_fired: z.array(z.object({ rule_id: z.string(), entity: z.string().optional(), text: z.string() })),
});

export type Delta = z.infer<typeof deltaSchema>;
export type Kpi = z.infer<typeof kpiSchema>;
export type Verdict = z.infer<typeof verdictSchema>;
export type Evidence = z.infer<typeof evidenceSchema>;
export type Suggestion = z.infer<typeof suggestionSchema>;
export type Snapshot = z.infer<typeof snapshotSchema>;
