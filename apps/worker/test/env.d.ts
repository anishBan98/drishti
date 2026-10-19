import type { D1Migration } from '@cloudflare/vitest-plugin';
import type { Env as WorkerEnv } from '../src/env';
import type * as MainModule from '../src/index';

declare global {
  namespace Cloudflare {
    interface GlobalProps {
      mainModule: typeof MainModule;
    }
    interface Env extends WorkerEnv {
      TEST_MIGRATIONS: D1Migration[];
    }
  }
}
