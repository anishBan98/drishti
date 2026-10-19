#!/usr/bin/env node
// Blocks files that must never be committed (docs/12-QA-AND-METRICS.md §3):
// anything over 10 MB, and names matching *.secret*, *.pem or *sa*.json.
// Default: checks staged files (pre-commit hook). With --all: checks every tracked file (CI).
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const MAX_BYTES = 10 * 1024 * 1024;
const BLOCKED = [/\.secret/i, /\.pem$/i, /sa.*\.json$/i];

const all = process.argv.includes('--all');
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' });
const files = (all ? git('ls-files', '-z') : git('diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z'))
  .split('\0')
  .filter(Boolean);

const problems = [];
for (const file of files) {
  const base = path.posix.basename(file);
  if (BLOCKED.some((re) => re.test(base))) problems.push(`${file}: name matches a blocked secret pattern`);
  const size = Number(git('cat-file', '-s', `${all ? 'HEAD' : ''}:${file}`).trim());
  if (size > MAX_BYTES) problems.push(`${file}: ${(size / 1048576).toFixed(1)} MB is over the 10 MB limit`);
}

if (problems.length) {
  console.error('Blocked files:\n' + problems.map((p) => `  - ${p}`).join('\n'));
  process.exit(1);
}
console.log(`File check passed (${files.length} files).`);
