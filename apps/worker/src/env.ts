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
  // Secrets (docs/05 §9), set with `wrangler secret put`.
  OWNER_EMAIL?: string;
  GOOGLE_SA_JSON?: string;
  E2E_SECRET?: string;
  /** Optional Slack incoming webhook for action notifications (docs/10 §6). */
  SLACK_WEBHOOK_URL?: string;
}

export type AppEnv = { Bindings: Env; Variables: { requestId: string } };
