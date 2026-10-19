import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const tracked = (pattern: RegExp) =>
  execFileSync('git', ['ls-files', '-co', '--exclude-standard'], { encoding: 'utf8' })
    .split('\n')
    .filter((f) => pattern.test(f));

describe('repository rules', () => {
  it('PreQL-Drishti-SPEC.md is generated from docs/ (node scripts/build-spec.mjs)', () => {
    expect(() => execFileSync('node', ['scripts/build-spec.mjs', '--check'], { stdio: 'pipe' })).not.toThrow();
  });

  it('API-08: the audit log is append-only (no UPDATE or DELETE on audit_log in code)', () => {
    const code = tracked(/^(apps|packages)\/.*\.(ts|tsx|sql|js|mjs)$/).filter((f) => !f.includes('/test/'));
    const offenders = code.filter((f) =>
      /\b(UPDATE\s+audit_log|DELETE\s+FROM\s+audit_log)\b/i.test(readFileSync(f, 'utf8')),
    );
    expect(offenders).toEqual([]);
  });
});
