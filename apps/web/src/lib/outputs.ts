import { t } from '@drishti/shared';
import type { DemoAction } from './demo-actions';

// Demo outputs (docs/10-ACTIONS.md §7): files generated in the browser from the action's parameters, downloadable
// like the real executors' Drive files. The coupon CSV has the columns from docs/10 §4.1.

export interface DemoOutput {
  kind: 'download' | 'link';
  label: string;
  filename?: string;
  mime?: string;
  content?: string;
  url?: string;
}

const csv = (rows: (string | number)[][]) =>
  rows
    .map((r) => r.map((c) => (/[",\n]/.test(String(c)) ? `"${String(c).replace(/"/g, '""')}"` : String(c))).join(','))
    .join('\n') + '\n';

const isoIn = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
const str = (v: unknown, fallback = '') => (v === undefined || v === null ? fallback : String(v));

function fakeHash(seed: string): string {
  let h = 2166136261;
  let out = '';
  for (let round = 0; out.length < 64; round++) {
    for (const ch of seed + round) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    out += (h >>> 0).toString(16).padStart(8, '0');
  }
  return out.slice(0, 64);
}

export function buildOutputs(a: DemoAction): DemoOutput[] {
  const p = a.params;
  const slug = a.id.replace(/^ac_demo_/, '');
  switch (a.type) {
    case 'amazon_coupon': {
      const weeks = Number(p.weeks ?? 3);
      return [
        {
          kind: 'download',
          label: t('ui.output.coupon'),
          filename: `coupon-${slug}.csv`,
          mime: 'text/csv',
          content: csv([
            ['ASIN', 'Discount type', 'Discount', 'Start date', 'End date', 'Budget (INR)', 'Coupon title'],
            [
              str(p.asin),
              'Percentage',
              str(p.discount_pct),
              isoIn(1),
              isoIn(1 + weeks * 7),
              300000,
              t('ui.output.coupon_title', { pct: str(p.discount_pct) }),
            ],
          ]),
        },
        { kind: 'link', label: t('ui.output.seller_central'), url: 'https://sellercentral.amazon.in/coupons/' },
      ];
    }
    case 'budget_shift':
    case 'budget_change': {
      const moves =
        (p.moves as Record<string, number> | undefined) ??
        (p.medium ? { [str(p.medium)]: Number(p.change_inr_per_month ?? 0) } : {});
      return [
        {
          kind: 'download',
          label: t('ui.output.budget'),
          filename: `budget-${slug}.csv`,
          mime: 'text/csv',
          content: csv([
            ['Medium', 'Change per month (INR)', 'New daily change (INR)'],
            ...Object.entries(moves).map(([m, v]) => [m, v, Math.round(v / 30)]),
          ]),
        },
      ];
    }
    case 'audience_export':
      return [
        {
          kind: 'download',
          label: t('ui.output.audience'),
          filename: `audience-${slug}.csv`,
          mime: 'text/csv',
          content: csv([
            ['email', 'phone'],
            ...Array.from({ length: 20 }, (_, i) => [fakeHash(`e${i}${slug}`), fakeHash(`p${i}${slug}`)]),
          ]),
        },
      ];
    case 'brief':
    case 'qa_hold':
    case 'listing_update':
    case 'reply_drafts':
    case 'packaging_request':
    case 'nykaa_request': {
      const lines = [
        `# ${a.title}`,
        '',
        str(p.why),
        '',
        `${t('ui.action.expected', { value: a.expected_label })} ${t('ui.confidence.value', { value: str(p.confidence) })}`,
        '',
        ...((p.evidence as string[] | undefined) ?? []).map((e) => `- ${e}`),
        '',
        ...a.steps.map((s, i) => `${i + 1}. ${s.text}`),
      ];
      return [
        {
          kind: 'download',
          label: t('ui.output.document'),
          filename: `${a.type}-${slug}.md`,
          mime: 'text/markdown',
          content: lines.join('\n') + '\n',
        },
      ];
    }
    default:
      return [
        {
          kind: 'download',
          label: t('ui.output.record'),
          filename: `${a.type}-${slug}.csv`,
          mime: 'text/csv',
          content: csv([['Step', 'Done at'], ...a.steps.map((s) => [s.text, s.at ?? ''])]),
        },
      ];
  }
}

/** Saves a generated file in the browser. */
export function download(o: DemoOutput) {
  if (o.kind === 'link' && o.url) {
    window.open(o.url, '_blank', 'noopener');
    return;
  }
  const blob = new Blob([o.content ?? ''], { type: o.mime ?? 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = o.filename ?? 'drishti.txt';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
