import {
  ACTION_TYPES,
  CONFIDENCE_WEIGHT,
  effort,
  formatInr,
  t,
  type ActionType,
  type CopyKey,
  type Evidence,
  type Suggestion,
} from '@drishti/shared';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js';

// Suggested actions (docs/08-METHODS.md §9). Expected impact comes from formulas in the section modules; this file
// turns it into a Suggestion with labels and steps from the copy deck, priority (§9.3) and the approval check.

export interface SuggestInput {
  type: ActionType;
  context: string;
  title: string;
  why: string;
  /** Expected money effect; negative values are losses avoided (shown as such by the impact label). */
  expectedInr?: number;
  expectedPer?: 'week' | 'month' | 'once';
  /** Label when there is no rupee value (e.g. "Rating", "Confidence"). */
  impactLabel?: string;
  confidence: 'high' | 'medium' | 'low';
  evidence?: Evidence[];
  params?: Record<string, unknown>;
  stepVars?: Record<string, string | number>;
  /** Monthly money at stake for the approval check (docs/10 §5: spend moved, discount cost or revenue at risk).
   * Defaults to the expected effect. */
  moneyAtStakeInr?: number;
  /** Copy-deck key for a context-specific button label (default action.<type>.run). */
  runLabelKey?: CopyKey;
}

const PER_MONTH = { week: 4.33, month: 1, once: 1 } as const;

export function suggest(input: SuggestInput, approvalThresholdInr: number): Suggestion {
  const meta = ACTION_TYPES[input.type];
  const per = input.expectedPer ?? 'month';
  const monthly = Math.abs(input.expectedInr ?? 0) * PER_MONTH[per];
  const label =
    input.impactLabel ??
    (input.expectedInr !== undefined
      ? t(`impact.per.${per}`, {
          value: (input.expectedInr >= 0 ? '+' : '−') + formatInr(Math.abs(input.expectedInr), { compact: true }),
        })
      : '');
  const steps = t(`action.${input.type}.steps` as CopyKey, input.stepVars ?? {})
    .split(' | ')
    .map((s) => s.trim());
  const id = 'sg_' + bytesToHex(sha256(utf8ToBytes(`${input.type}|${input.context}|${input.title}`))).slice(0, 16);
  return {
    id,
    type: input.type,
    title: input.title,
    why: input.why,
    impactLabel: label,
    ...(input.expectedInr !== undefined ? { expectedInr: Math.round(input.expectedInr), expectedPer: per } : {}),
    confidence: input.confidence,
    priority: Math.round((monthly * CONFIDENCE_WEIGHT[input.confidence]) / effort(input.type)),
    evidence: input.evidence ?? [],
    params: input.params ?? {},
    runLabel: t(input.runLabelKey ?? (`action.${input.type}.run` as CopyKey)),
    doneLabel: t(`action.${input.type}.done` as CopyKey),
    needsApproval: meta.money && (input.moneyAtStakeInr ?? monthly) > approvalThresholdInr,
    executor: meta.executor,
    steps,
  };
}

export function topByPriority(list: Suggestion[], n: number): Suggestion[] {
  return [...list].sort((a, b) => b.priority - a.priority || (a.id < b.id ? -1 : 1)).slice(0, n);
}
