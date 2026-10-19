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
        miniflare: { bindings: { TEST_MIGRATIONS: migrations, VERSION: 'test' } },
      }),
    ],
    test: {
      name: 'worker',
      setupFiles: ['./test/apply-migrations.ts'],
    },
  };
});
