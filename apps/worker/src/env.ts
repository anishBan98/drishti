// Bindings and vars from wrangler.toml. Secrets (docs/05 §9) are added as their milestones land.
export interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  KV: KVNamespace;
  AI: Ai;
  ENVIRONMENT: 'production' | 'staging' | 'local';
  WORKSPACE_ID: string;
  GITHUB_REPO: string;
  GOOGLE_CLIENT_ID: string;
  DEMO_ENABLED: string;
  VERSION: string;
}

export type AppEnv = { Bindings: Env; Variables: { requestId: string } };
