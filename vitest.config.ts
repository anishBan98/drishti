import { defineConfig } from 'vitest/config';

// Each app and package is its own Vitest project; packages add their own
// vitest.config.ts when they need a custom environment (e.g. the Worker pool).
export default defineConfig({
  test: {
    projects: ['packages/*', 'apps/*', 'scripts'],
    passWithNoTests: true,
  },
});
