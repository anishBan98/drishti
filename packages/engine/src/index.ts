// Engine: parsers, facts, metrics, models, recommendations and the snapshot builder (docs/05 §2).
// All numbers shown in Drishti come from code in this package.
export const ENGINE_VERSION = '0.2.0';

export * from './csv';
export * from './facts/types';
export { loadDemoFacts, loadTrends, hashCustomerId, DEMO_FILES, type ReadFile } from './facts/demo';
export { loadWorkspace, DEFAULT_SETTINGS, type Workspace, type Settings } from './facts/workspace';
export * from './kpi';
export * from './windows';
export { buildSnapshot, stableStringify, type BuildOptions } from './snapshot';
export { tagReview, tagReviews, ASPECTS } from './voice/lexicon';
export { kmeans } from './models/kmeans';
export { fitMmm, nnls } from './models/mmm';
export { suggest, type SuggestInput } from './suggest';
