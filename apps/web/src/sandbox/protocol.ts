import type { Snapshot } from '@drishti/shared';

// Messages between the sandbox page and its engine worker, and the shapes kept in browser storage.

export interface BuildRequest {
  id: number;
  hashKey: string;
  generatedAt: string;
  sources: { id: string; name: string; bytes: ArrayBuffer }[];
}

/** One recognised (or unrecognised) table, for the "What Drishti found" list. */
export interface TableSummary {
  /** Id of the file or link it came from. */
  input: string;
  name: string;
  kind: 'source' | 'tab' | 'unknown';
  /** Source id (e.g. meta_ads) or workspace tab (e.g. products). */
  source: string | null;
  label: string | null;
  rows: number;
  skipped: number;
  from: string | null;
  to: string | null;
  warnings: string[];
  headers: string[];
}

export interface WorkspaceUserRow {
  email: string;
  role: string;
  name: string;
}

export type BuildResponse =
  | {
      id: number;
      ok: true;
      snapshot: Snapshot;
      tables: TableSummary[];
      users: WorkspaceUserRow[];
      warnings: string[];
      allocatedShare: number;
    }
  | { id: number; ok: false; error: string };

/** A file the visitor dropped, or a Google Sheet they linked. */
export interface CompanySource {
  id: string;
  kind: 'file' | 'link';
  name: string;
  /** The link as pasted (links only). */
  url?: string;
  /** File bytes, or the last fetched workbook for a link. */
  bytes?: ArrayBuffer;
  size: number;
  addedAt: string;
  fetchedAt?: string;
  /** Copy-deck error code of the last fetch, if it failed. */
  error?: string;
}

export interface Company {
  id: string;
  name: string;
  /** Salt for hashing customer IDs in this browser (docs/05 §10). */
  hashKey: string;
  createdAt: string;
  updatedAt: string;
  sources: CompanySource[];
  snapshot?: Snapshot;
  tables?: TableSummary[];
  users?: WorkspaceUserRow[];
  warnings?: string[];
  buildError?: string;
}
