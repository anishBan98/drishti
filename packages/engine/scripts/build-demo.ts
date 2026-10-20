// Builds the demo data from sample-data (docs/06 §6, docs/05 §11):
//   apps/web/public/demo/snapshot.json   the snapshot every screen reads
//   apps/web/public/demo/workspace.json  users and existing actions from the template Sheet (Actions screen seed)
//   apps/web/public/samples/*            the template sheet, one CSV per tab and the inbox samples (docs/07 §2)
// Run: pnpm --filter @drishti/engine build:demo
import { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { formatInr, t, type CopyKey } from '@drishti/shared';
import { DEMO_SAMPLE_SCALE } from '../src/context';
import { parseCsvObjects, parseNumber } from '../src/csv';
import { loadDemoFacts, loadTrends } from '../src/facts/demo';
import { loadWorkspace } from '../src/facts/workspace';
import { buildSnapshot } from '../src/snapshot';

const root = path.resolve(import.meta.dirname, '../../..');
const sample = path.join(root, 'sample-data');
const outDir = path.join(root, 'apps/web/public');

const t0 = Date.now();
const facts = loadDemoFacts((name) => readFileSync(path.join(sample, 'demo', name), 'utf8'), { hashKey: 'demo' });
facts.trends_weekly = loadTrends(readFileSync(path.join(sample, 'inbox/google_trends_weekly.csv'), 'utf8'));
const readTab = (tab: string) => {
  try {
    return readFileSync(path.join(sample, 'workspace', `${tab}.csv`), 'utf8');
  } catch {
    return undefined;
  }
};
const ws = loadWorkspace(readTab);
// The demo's generated_at is the morning sync after the data (fixed, so builds are reproducible).
const snapshot = buildSnapshot(facts, ws, {
  demo: true,
  generatedAt: '2026-10-17T07:10:00+05:30',
  sampleScale: DEMO_SAMPLE_SCALE,
});
const json = JSON.stringify(snapshot);
mkdirSync(path.join(outDir, 'demo'), { recursive: true });
writeFileSync(path.join(outDir, 'demo/snapshot.json'), json);

// Workspace seed for the demo: users and the Actions tab (docs/06 §2), shaped like GET /api/actions items.
const users = parseCsvObjects(readTab('users') ?? '').rows.map((r) => ({
  email: r.email ?? '',
  role: r.role ?? '',
  name: r.name ?? '',
}));
const TYPE_ALIAS: Record<string, string> = { coupon_prepare: 'amazon_coupon' };
const EXECUTOR: Record<string, string> = {
  amazon_coupon: 'handoff',
  budget_shift: 'job',
  shopify_discount_cap: 'inline',
};
const per = (p: string | undefined) => (p === 'week' ? 'week' : p === 'once' ? 'once' : 'month');
const actions = parseCsvObjects(readTab('actions') ?? '').rows.map((r) => {
  const type = TYPE_ALIAS[r.type ?? ''] ?? r.type ?? '';
  const expected = parseNumber(r.expected_inr);
  const measured = parseNumber(r.measured_inr);
  const status = r.status ?? 'done';
  const label = (v: number | null) =>
    v === null
      ? ''
      : t(`impact.per.${per(r.expected_per)}` as CopyKey, { value: '+' + formatInr(v, { compact: true }) });
  // Fill the step template from the action itself (the Sheet row has no params column).
  const title = r.title ?? '';
  const vars = {
    product: facts.products.find((p) => p.hero)?.name ?? '',
    discount_pct: /(d+)%/.exec(title)?.[1] ?? '',
    cap_pct: /(d+)%/.exec(title)?.[1] ?? '',
    weeks: 3,
    segment: /for (.+)$/.exec(title)?.[1] ?? '',
  };
  const steps = t(`action.${type}.steps` as CopyKey, vars)
    .split(' | ')
    .map((text, i, all) => ({
      text,
      done: status !== 'awaiting_approval' && (status !== 'measuring' || i < all.length - 1),
      at: r.created_at,
    }));
  return {
    id: r.action_id,
    type,
    title: r.title,
    how: t(`executor.${EXECUTOR[type] ?? 'inline'}` as CopyKey),
    screen: r.screen,
    owner: r.owner,
    status,
    executor: EXECUTOR[type] ?? 'inline',
    expected_label: label(expected),
    measured_label: measured === null ? undefined : label(measured),
    measured_progress: expected && measured !== null ? Math.round((measured / expected) * 100) / 100 : undefined,
    readout_date: r.readout_date || undefined,
    steps,
    outputs: [],
    created_at: r.created_at,
    demo: false,
    approver:
      status === 'awaiting_approval'
        ? users.find((u) => u.role === 'Owner')?.name.replace(/\s*\(.*\)$/, '')
        : undefined,
    undoable: type === 'shopify_discount_cap',
    params: {},
  };
});
writeFileSync(path.join(outDir, 'demo/workspace.json'), JSON.stringify({ users, actions }));

// Downloadable samples for the home page and the data guide.
mkdirSync(path.join(outDir, 'samples'), { recursive: true });
copyFileSync(
  path.join(sample, 'Drishti-Workspace-Template.xlsx'),
  path.join(outDir, 'samples/Drishti-Workspace-Template.xlsx'),
);
for (const dir of ['workspace', 'inbox'])
  for (const f of readdirSync(path.join(sample, dir)))
    if (f.endsWith('.csv')) copyFileSync(path.join(sample, dir, f), path.join(outDir, 'samples', f));

// The visual suite's design fixture (docs/12 §5), served at /demo/design-*.json for ?fixture=design.
for (const f of ['design-snapshot.json', 'design-workspace.json'])
  copyFileSync(path.join(root, 'e2e/fixtures', f), path.join(outDir, 'demo', f));

// Screen thumbnails for the home page (the four investor screens, light and dark).
mkdirSync(path.join(outDir, 'screens'), { recursive: true });
for (const f of readdirSync(path.join(root, 'design/screens')))
  if (/^0[1245]-.*.png$/.test(f)) copyFileSync(path.join(root, 'design/screens', f), path.join(outDir, 'screens', f));

console.log(
  JSON.stringify({
    msg: 'demo built',
    version: snapshot.version,
    bytes: Buffer.byteLength(json),
    actions: actions.length,
    users: users.length,
    ms: Date.now() - t0,
  }),
);
