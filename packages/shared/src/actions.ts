// Action catalogue (docs/10-ACTIONS.md §3): kind, executor and phase per type. Button labels, done labels and the
// confirm-view steps live in the copy deck under action.<type>.run / .done / .steps (steps separated by " | ").

export type ActionKind = 'execute' | 'prepare' | 'test' | 'rule' | 'task' | 'draft' | 'data' | 'control';
export type Executor = 'inline' | 'job' | 'handoff';

export interface ActionMeta {
  kind: ActionKind;
  executor: Executor;
  phase: 1 | 2;
  /** Budget and price actions compare their monthly money effect with approval_threshold_inr (docs/10 §5). */
  money: boolean;
}

export const ACTION_TYPES = {
  amazon_coupon: { kind: 'prepare', executor: 'handoff', phase: 1, money: true },
  qa_hold: { kind: 'task', executor: 'inline', phase: 1, money: false },
  reply_drafts: { kind: 'draft', executor: 'job', phase: 2, money: false },
  restock_request: { kind: 'task', executor: 'inline', phase: 1, money: false },
  qc_ads_pause: { kind: 'rule', executor: 'inline', phase: 1, money: false },
  budget_shift: { kind: 'prepare', executor: 'job', phase: 1, money: true },
  budget_change: { kind: 'prepare', executor: 'job', phase: 1, money: true },
  shopify_discount_cap: { kind: 'execute', executor: 'inline', phase: 1, money: true },
  shopify_segment_offer: { kind: 'execute', executor: 'inline', phase: 1, money: true },
  audience_export: { kind: 'data', executor: 'job', phase: 1, money: false },
  refill_nudge: { kind: 'execute', executor: 'inline', phase: 1, money: false },
  cod_otp: { kind: 'prepare', executor: 'handoff', phase: 1, money: false },
  prepaid_nudge: { kind: 'execute', executor: 'inline', phase: 1, money: true },
  listing_update: { kind: 'draft', executor: 'job', phase: 1, money: false },
  amazon_ads_bulk: { kind: 'prepare', executor: 'job', phase: 1, money: true },
  geo_test: { kind: 'test', executor: 'job', phase: 2, money: true },
  price_alert: { kind: 'rule', executor: 'inline', phase: 1, money: false },
  price_rule: { kind: 'rule', executor: 'inline', phase: 1, money: false },
  watchlist_add: { kind: 'data', executor: 'inline', phase: 1, money: false },
  brief: { kind: 'draft', executor: 'job', phase: 1, money: false },
  campaign_schedule: { kind: 'prepare', executor: 'job', phase: 1, money: false },
  creator_budget: { kind: 'prepare', executor: 'job', phase: 1, money: true },
  flipkart_claim: { kind: 'prepare', executor: 'handoff', phase: 1, money: false },
  packaging_request: { kind: 'task', executor: 'inline', phase: 1, money: false },
  nykaa_request: { kind: 'prepare', executor: 'inline', phase: 1, money: false },
  source_reminder: { kind: 'task', executor: 'inline', phase: 1, money: false },
  request_files: { kind: 'task', executor: 'inline', phase: 1, money: false },
  upload_file: { kind: 'data', executor: 'inline', phase: 1, money: false },
  sync_now: { kind: 'data', executor: 'job', phase: 1, money: false },
  assign: { kind: 'task', executor: 'inline', phase: 1, money: false },
} as const satisfies Record<string, ActionMeta>;

export type ActionType = keyof typeof ACTION_TYPES;

/** Effort divisor for priority (docs/08 §9.3): inline 1, handoff 1.5, job 1.2, test 2. */
export function effort(type: ActionType): number {
  const m: ActionMeta = ACTION_TYPES[type];
  return m.kind === 'test' ? 2 : m.executor === 'handoff' ? 1.5 : m.executor === 'job' ? 1.2 : 1;
}

export const CONFIDENCE_WEIGHT = { high: 1, medium: 0.7, low: 0.4 } as const;
