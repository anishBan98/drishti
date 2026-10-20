import { describe, expect, it } from 'vitest';
import { estimateNeurons } from '../src/ai';
import { GOVERNORS, LIMITS } from '../src/limits';

// FREE-02 (docs/12 §4): a simulated busy day for the pitch build (20 people, docs/05 §15) stays under 50% of every
// free limit. Counts follow the compact design: the browser builds snapshots; the Worker passes bytes through.

const PEOPLE = 20;
const day = {
  // Page loads (me, snapshot, actions) plus API calls while working, per person.
  workerRequests: PEOPLE * 300,
  // Syncs: one snapshot write each; service-account token cached 50 minutes; capture rate keys; Monday flag.
  kvWrites: 12 + 30 + PEOPLE * 10 + 1,
  kvReads: PEOPLE * 300,
  // Actions: each person runs 5, each saved ~10 times while it runs; audit rows; sync runs; captures.
  d1RowsWritten: PEOPLE * 5 * 10 * 2 + 12 * 3 + PEOPLE * 10,
  // AI: one summary per draft action; 2 per person.
  aiNeurons: PEOPLE * 2 * estimateNeurons('large', 2500, 220),
  // A sync reads the Sheet and up to 20 Inbox files; 12 syncs a day spread over hours.
  sheetsPerMinutePeak: 25,
};

describe('FREE-02 a busy day stays under half of every free limit', () => {
  it.each([
    ['Worker requests', day.workerRequests, LIMITS.workerRequestsPerDay],
    ['KV writes', day.kvWrites, LIMITS.kvWritesPerDay],
    ['KV reads', day.kvReads, LIMITS.kvReadsPerDay],
    ['D1 rows written', day.d1RowsWritten, LIMITS.d1RowsWrittenPerDay],
    ['Workers AI neurons', day.aiNeurons, LIMITS.workersAiNeuronsPerDay],
    ['Sheets calls per minute', day.sheetsPerMinutePeak, LIMITS.sheetsRequestsPerMinutePerUser],
  ])('%s: %i of %i', (_name, used, limit) => {
    expect(used).toBeLessThan(limit * 0.5);
  });

  it('the AI governor stops before the free allocation', () => {
    expect(GOVERNORS.aiNeuronStopAt).toBeLessThan(LIMITS.workersAiNeuronsPerDay);
  });
});
