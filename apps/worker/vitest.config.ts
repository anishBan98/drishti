import path from 'node:path';
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-plugin';
import { defineConfig } from 'vitest/config';

// Worker API tests run inside workerd with local D1 and KV (docs/12 §1).
export default defineConfig(async () => {
  const migrations = await readD1Migrations(path.join(import.meta.dirname, 'migrations'));
  return {
    plugins: [
      cloudflareTest({
        wrangler: { configPath: '../../wrangler.toml', environment: 'staging' },
        remoteBindings: false,
        miniflare: {
          // Test-only values (not secrets): the owner, a fake OAuth client ID and the staging E2E login key.
          bindings: {
            TEST_MIGRATIONS: migrations,
            VERSION: 'test',
            OWNER_EMAIL: 'owner@lumora.example',
            GOOGLE_CLIENT_ID: 'test-client.apps.googleusercontent.com',
            E2E_SECRET: 'e2e-test-secret',
          },
        },
      }),
    ],
    test: {
      name: 'worker',
      setupFiles: ['./test/apply-migrations.ts'],
    },
  };
});
