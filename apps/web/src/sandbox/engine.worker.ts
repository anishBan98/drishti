/// <reference lib="webworker" />
import { assemble, buildSnapshot, expandArchive, parseCsvObjects, parseFile, type ParsedTable } from '@drishti/engine';
import type { BuildRequest, BuildResponse, TableSummary } from './protocol';

// Sandbox engine (docs/05 §14): parses a company's files and linked sheets and builds its snapshot here in the
// browser, off the main thread. Nothing leaves the browser.

const summary = (t: ParsedTable, input: string): TableSummary => ({
  input,
  name: t.name,
  kind: t.detected.kind,
  source: t.detected.kind === 'source' ? t.detected.source : t.detected.kind === 'tab' ? t.detected.tab : null,
  label: t.detected.kind === 'source' ? t.detected.label : null,
  rows: t.rows,
  skipped: t.skipped,
  from: t.coverage?.from ?? null,
  to: t.coverage?.to ?? null,
  warnings: t.warnings,
  headers: t.detected.kind === 'unknown' ? t.headers.slice(0, 12) : [],
});

self.onmessage = (e: MessageEvent<BuildRequest>) => {
  const req = e.data;
  try {
    const tables: ParsedTable[] = [];
    const summaries: TableSummary[] = [];
    for (const src of req.sources) {
      for (const f of expandArchive(src.name, new Uint8Array(src.bytes))) {
        const parsed = parseFile(f.name, f.bytes, { hashKey: req.hashKey });
        tables.push(...parsed);
        summaries.push(...parsed.map((t) => summary(t, src.id)));
      }
    }
    const a = assemble(tables);
    const snapshot = buildSnapshot(a.facts, a.ws, { demo: true, generatedAt: req.generatedAt });
    const usersTab = tables.find((t) => t.detected.kind === 'tab' && t.detected.tab === 'users')?.tabCsv;
    const users = usersTab
      ? parseCsvObjects(usersTab)
          .rows.filter((r) => r.email && r.role)
          .map((r) => ({ email: r.email!, role: r.role!, name: r.name || r.email! }))
      : [];
    const res: BuildResponse = {
      id: req.id,
      ok: true,
      snapshot,
      tables: summaries,
      users,
      warnings: [...new Set(a.warnings)],
      allocatedShare: a.allocatedShare,
    };
    (self as unknown as Worker).postMessage(res);
  } catch (err) {
    const res: BuildResponse = { id: req.id, ok: false, error: err instanceof Error ? err.message : String(err) };
    (self as unknown as Worker).postMessage(res);
  }
};
