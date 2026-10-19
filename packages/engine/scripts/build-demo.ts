// Builds the demo snapshot from sample-data (docs/06 §6, docs/05 §11): apps/web/public/demo/snapshot.json.
// Run: pnpm --filter @drishti/engine build:demo
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { buildSnapshot } from '../src/snapshot';
import { loadDemoFacts, loadTrends } from '../src/facts/demo';
import { loadWorkspace } from '../src/facts/workspace';
import { DEMO_SAMPLE_SCALE } from '../src/context';

const root = path.resolve(import.meta.dirname, '../../..');
const sample = path.join(root, 'sample-data');
const out = path.join(root, 'apps/web/public/demo/snapshot.json');

const t0 = Date.now();
const facts = loadDemoFacts((name) => readFileSync(path.join(sample, 'demo', name), 'utf8'), { hashKey: 'demo' });
facts.trends_weekly = loadTrends(readFileSync(path.join(sample, 'inbox/google_trends_weekly.csv'), 'utf8'));
const ws = loadWorkspace((tab) => {
  try {
    return readFileSync(path.join(sample, 'workspace', `${tab}.csv`), 'utf8');
  } catch {
    return undefined;
  }
});
// The demo's generated_at is the morning sync after the data (fixed, so builds are reproducible).
const snapshot = buildSnapshot(facts, ws, {
  demo: true,
  generatedAt: '2026-10-17T07:10:00+05:30',
  sampleScale: DEMO_SAMPLE_SCALE,
});
const json = JSON.stringify(snapshot);
mkdirSync(path.dirname(out), { recursive: true });
writeFileSync(out, json);
console.log(
  JSON.stringify({
    msg: 'demo snapshot built',
    version: snapshot.version,
    bytes: Buffer.byteLength(json),
    ms: Date.now() - t0,
    out: path.relative(root, out),
  }),
);
