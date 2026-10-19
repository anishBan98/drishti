import { readFileSync } from 'node:fs';
import path from 'node:path';
import { loadDemoFacts } from '../src/facts/demo';
import type { Facts } from '../src/facts/types';

export const ROOT = path.resolve(import.meta.dirname, '../../..');
export const DEMO_DIR = path.join(ROOT, 'sample-data/demo');

export const readDemo = (name: string) => readFileSync(path.join(DEMO_DIR, name), 'utf8');

let cached: Facts | undefined;
/** Demo facts loaded once per test file. */
export function demoFacts(): Facts {
  return (cached ??= loadDemoFacts(readDemo, { hashKey: 'test' }));
}

export const expected = JSON.parse(readFileSync(path.join(ROOT, 'sample-data/expected/expected_metrics.json'), 'utf8'));
