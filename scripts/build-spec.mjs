#!/usr/bin/env node
// Regenerates PreQL-Drishti-SPEC.md from docs/*.md (the docs are the source of truth).
// Usage: node scripts/build-spec.mjs [--check]   (--check exits 1 if the file is out of date)
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';

const files = readdirSync('docs')
  .filter((f) => /^\d\d-.*\.md$/.test(f))
  .sort();
const docs = files.map((f) => ({ f, text: readFileSync(`docs/${f}`, 'utf8') }));
const title = (text) => text.match(/^# (.+)$/m)?.[1] ?? '';

let out =
  '# PreQL Presents Drishti — Complete Specification\n\n' +
  '> One file containing every document in `docs/`, in order. Sample data, designs and brand files are in the build pack folders.\n\n' +
  '## Contents\n\n' +
  docs.map(({ f, text }) => `- \`${f}\` — ${title(text)}`).join('\n') +
  '\n';
for (const { f, text } of docs) out += `\n\n\n---\n\n<!-- file: docs/${f} -->\n\n${text.replace(/\n*$/, '\n')}`;

const target = 'PreQL-Drishti-SPEC.md';
if (process.argv.includes('--check')) {
  if (readFileSync(target, 'utf8') !== out) {
    console.error(`${target} is out of date. Run: node scripts/build-spec.mjs`);
    process.exit(1);
  }
  console.log(`${target} is up to date.`);
} else {
  writeFileSync(target, out);
  console.log(`Wrote ${target} from ${docs.length} docs.`);
}
