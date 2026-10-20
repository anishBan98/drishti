import { ACTION_TYPES, formatShortDate, t, type ActionType, type Suggestion } from '@drishti/shared';
import { useSyncExternalStore } from 'react';
import { buildOutputs, type DemoOutput } from './outputs';

// Demo action engine (docs/10-ACTIONS.md §7): the same states as the real engine, simulated in the browser with
// 600 ms per step. Kept in memory and in sessionStorage (wrapped in try/catch); no network writes.

export type ActionStatus =
  | 'suggested'
  | 'awaiting_approval'
  | 'running'
  | 'waiting_on_user'
  | 'done'
  | 'measuring'
  | 'result'
  | 'failed'
  | 'declined'
  | 'expired'
  | 'undone'
  // Handed to a person to do; not run by Drishti, so not counted as an action run.
  | 'assigned'
  // Display-only states for rows that come from the Sheet (scheduled campaigns, overdue tasks).
  | 'scheduled'
  | 'overdue';

export interface ActionStep {
  text: string;
  done: boolean;
  at?: string;
}

export interface DemoAction {
  id: string;
  suggestion_id?: string;
  type: string;
  title: string;
  how: string;
  screen: string;
  owner: string;
  status: ActionStatus;
  executor: 'inline' | 'job' | 'handoff';
  expected_label: string;
  measured_label?: string;
  measured_progress?: number;
  readout_date?: string;
  readout_text?: string;
  steps: ActionStep[];
  outputs: DemoOutput[];
  created_at: string;
  demo: boolean;
  approver?: string;
  due?: string;
  overdue?: boolean;
  undoable: boolean;
  params: Record<string, unknown>;
}

const KEY = 'drishti-demo-actions';
const STEP_MS = 600;
let actions: DemoAction[] = [];
let seeded = false;
const listeners = new Set<() => void>();

function emit() {
  actions = [...actions];
  try {
    sessionStorage.setItem(KEY, JSON.stringify(actions.filter((a) => a.demo)));
  } catch {
    /* storage unavailable */
  }
  for (const l of listeners) l();
}

/** Seeds once with the workspace's existing actions plus anything run earlier in this tab. */
export function seedActions(seed: DemoAction[]) {
  if (seeded) return;
  seeded = true;
  let saved: DemoAction[] = [];
  try {
    saved = JSON.parse(sessionStorage.getItem(KEY) ?? '[]') as DemoAction[];
  } catch {
    saved = [];
  }
  actions = [...saved, ...seed.filter((s) => !saved.some((a) => a.id === s.id))];
  emit();
  // A reload stops the step timers; pick up any action that was mid-run where it left off.
  for (const a of actions) if (a.demo && a.status === 'running') execute(a.id);
}

export function useActions(): DemoAction[] {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => actions,
  );
}

export const actionForSuggestion = (list: DemoAction[], suggestionId: string) =>
  list.find((a) => a.suggestion_id === suggestionId);

const now = () => new Date().toISOString();
const update = (id: string, patch: Partial<DemoAction> | ((a: DemoAction) => Partial<DemoAction>)) => {
  actions = actions.map((a) => (a.id === id ? { ...a, ...(typeof patch === 'function' ? patch(a) : patch) } : a));
  emit();
};
export const getAction = (id: string) => actions.find((a) => a.id === id);

function readoutFor(type: string): string | undefined {
  const days: Record<string, number> = {
    amazon_coupon: 21,
    qa_hold: 42,
    shopify_discount_cap: 21,
    budget_shift: 28,
    budget_change: 28,
    geo_test: 21,
  };
  const d = days[type];
  if (!d) return undefined;
  return new Date(Date.now() + d * 86_400_000).toISOString().slice(0, 10);
}

/** Run a suggestion: approval if needed, else tick its steps and finish by executor kind. */
export function runSuggestion(
  s: Suggestion,
  ctx: { screen: string; owner: string; approver: string; snapshotName: string },
): string {
  const id = `ac_demo_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const action: DemoAction = {
    id,
    suggestion_id: s.id,
    type: s.type,
    title: s.title,
    how: t(`executor.${s.executor}`),
    screen: ctx.screen,
    owner: ctx.owner,
    status: s.needsApproval ? 'awaiting_approval' : 'running',
    executor: s.executor,
    expected_label: s.impactLabel,
    steps: s.steps.map((text) => ({ text, done: false })),
    outputs: [],
    created_at: now(),
    demo: true,
    approver: s.needsApproval ? ctx.approver : undefined,
    undoable: [
      'shopify_discount_cap',
      'shopify_segment_offer',
      'budget_shift',
      'budget_change',
      'price_alert',
      'price_rule',
      'qc_ads_pause',
      'source_reminder',
      'refill_nudge',
      'prepaid_nudge',
    ].includes(s.type),
    params: {
      ...s.params,
      impact: s.impactLabel,
      why: s.why,
      confidence: s.confidence,
      evidence: s.evidence.map((e) => e.label),
    },
  };
  actions = [action, ...actions];
  emit();
  if (!s.needsApproval) execute(id);
  return id;
}

function execute(id: string) {
  const a = getAction(id);
  if (!a) return;
  update(id, { status: 'running' });
  const total = a.steps.length;
  // A handoff's last step is the person's own ("Wait for you to confirm"), so it stays open.
  const autoSteps = a.executor === 'handoff' ? Math.max(1, total - 1) : total;
  // Start at the first open step: an approval step is already done, and a resumed run keeps its progress.
  const first = a.steps.findIndex((st) => !st.done);
  let i = first === -1 ? total : first;
  const tick = () => {
    const cur = getAction(id);
    if (!cur || cur.status !== 'running') return;
    if (i < autoSteps) {
      const at = now();
      update(id, (x) => ({ steps: x.steps.map((st, k) => (k === i ? { ...st, done: true, at } : st)) }));
      i++;
      setTimeout(tick, STEP_MS);
      return;
    }
    const outputs = buildOutputs(cur);
    const readout = readoutFor(cur.type);
    if (cur.executor === 'handoff') update(id, { status: 'waiting_on_user', outputs });
    else
      update(id, {
        status: readout ? 'measuring' : 'done',
        outputs,
        readout_date: readout,
        measured_progress: readout ? 0 : undefined,
      });
  };
  setTimeout(tick, STEP_MS);
}

/** "I've done it" on a handoff: confirms the last step and starts measuring. */
export function confirmHandoff(id: string) {
  const readout = readoutFor(getAction(id)?.type ?? '');
  update(id, (a) => ({
    status: readout ? 'measuring' : 'done',
    readout_date: readout,
    measured_progress: readout ? 0 : undefined,
    steps: a.steps.map((s) => (s.done ? s : { ...s, done: true, at: now() })),
  }));
}

export function approve(id: string, approver: string) {
  update(id, (a) => ({
    approver,
    steps: [{ text: t('ui.actions.approve.step', { name: approver }), done: true, at: now() }, ...a.steps],
  }));
  execute(id);
}

export function decline(id: string) {
  update(id, (a) => ({
    status: 'declined',
    steps: [...a.steps, { text: t('ui.actions.decline.step'), done: true, at: now() }],
  }));
}

export function undo(id: string) {
  update(id, (a) => ({
    status: 'undone',
    steps: [...a.steps, { text: t('ui.actions.undo.step'), done: true, at: now() }],
  }));
}

export function assign(
  id: string | undefined,
  s: Suggestion | undefined,
  owner: string,
  due: string,
  screen: string,
): string {
  const assigned = t('ui.action.assigned', { name: owner, date: formatShortDate(due) });
  if (id) {
    update(id, (a) => ({
      owner,
      due,
      steps: [...a.steps, { text: assigned, done: true, at: now() }],
    }));
    return id;
  }
  // Assigning a suggestion that has not run yet creates a task action for the owner.
  const newId = `ac_demo_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  actions = [
    {
      id: newId,
      suggestion_id: s?.id,
      type: 'assign',
      title: s?.title ?? '',
      how: assigned,
      screen,
      owner,
      status: 'assigned',
      executor: 'inline',
      expected_label: s?.impactLabel ?? '',
      steps: [{ text: assigned, done: true, at: now() }],
      outputs: [],
      created_at: now(),
      demo: true,
      due,
      undoable: false,
      params: { suggestion: s?.type },
    },
    ...actions,
  ];
  emit();
  return newId;
}

export function isActionType(type: string): type is ActionType {
  return type in ACTION_TYPES;
}

/** Lifecycle stage 0–4 (Suggested, Approved, Running, Measuring, Result). */
export function stageOf(a: DemoAction): number {
  switch (a.status) {
    case 'suggested':
    case 'assigned':
    case 'awaiting_approval':
    case 'declined':
    case 'expired':
      return 0;
    case 'running':
    case 'waiting_on_user':
      return 2;
    case 'done':
      return a.readout_date ? 3 : 4;
    case 'measuring':
      return 3;
    default:
      return 4;
  }
}
