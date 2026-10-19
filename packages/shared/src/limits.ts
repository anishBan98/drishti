// Free-tier limits and Drishti's governors (docs/05-SYSTEM-DESIGN.md §3), checked against Cloudflare docs 2026-10-19.
// FREE-01 (docs/12 §4) compares this file with the docs table.
export const LIMITS_CHECKED = '2026-10-19';

export const LIMITS = {
  workerRequestsPerDay: 100_000,
  workerCpuMsPerInvocation: 10,
  cronTriggersPerAccount: 5,
  subrequestsPerInvocation: 50,
  kvReadsPerDay: 100_000,
  kvWritesPerDay: 1_000,
  kvStorageBytes: 1_000_000_000,
  kvValueBytes: 25 * 1024 * 1024,
  d1RowsReadPerDay: 5_000_000,
  d1RowsWrittenPerDay: 100_000,
  d1DatabaseBytes: 500_000_000,
  d1QueriesPerInvocation: 50,
  workersAiNeuronsPerDay: 10_000,
  sheetsRequestsPerMinutePerProject: 300,
  sheetsRequestsPerMinutePerUser: 60,
} as const;

export const GOVERNORS = {
  pollSlowdownAtRequests: 60_000,
  syncMaxKvKeysPerRun: 40,
  snapshotMaxBytes: 5 * 1024 * 1024,
  capturesPerDay: 2_000,
  aiNeuronStopAt: 8_000,
  sheetsClientThrottlePerMinute: 30,
} as const;
