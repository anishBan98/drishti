import { useSyncExternalStore } from 'react';
import type { BuildRequest, BuildResponse, Company, CompanySource } from './protocol';

// Sandbox companies (docs/05 §14, docs/09 §6.12): kept in this browser's IndexedDB (in memory if storage is
// blocked), built by the engine worker. Linked Google Sheets are fetched through GET /api/sheet.

export const MAX_TOTAL_BYTES = 50 * 1024 * 1024;
const DB_NAME = 'drishti-sandbox';
const STORE = 'companies';

let companies: Company[] = [];
let ready = false;
const listeners = new Set<() => void>();
const emit = () => {
  companies = [...companies];
  for (const l of listeners) l();
};

// ---- storage ---------------------------------------------------------------------------------------------------

let dbPromise: Promise<IDBDatabase | null> | null = null;
function db(): Promise<IDBDatabase | null> {
  dbPromise ??= new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

async function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T | undefined> {
  const d = await db();
  if (!d) return undefined;
  return new Promise((resolve) => {
    try {
      const r = run(d.transaction(STORE, mode).objectStore(STORE));
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => resolve(undefined);
    } catch {
      resolve(undefined);
    }
  });
}

export async function loadCompanies(): Promise<void> {
  if (ready) return;
  const all = (await tx<Company[]>('readonly', (s) => s.getAll())) ?? [];
  companies = all.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  ready = true;
  emit();
}

async function save(c: Company) {
  c.updatedAt = new Date().toISOString();
  companies = [c, ...companies.filter((x) => x.id !== c.id)];
  emit();
  await tx('readwrite', (s) => s.put(c));
}

export function useCompanies(): { companies: Company[]; ready: boolean } {
  const list = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => companies,
  );
  if (!ready) void loadCompanies();
  return { companies: list, ready };
}

export const getCompany = (id: string) => companies.find((c) => c.id === id);

// ---- engine worker ---------------------------------------------------------------------------------------------

let worker: Worker | null = null;
let seq = 0;
const pending = new Map<number, (r: BuildResponse) => void>();
function engine(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./engine.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<BuildResponse>) => {
      pending.get(e.data.id)?.(e.data);
      pending.delete(e.data.id);
    };
  }
  return worker;
}

/** Runs the engine in its worker on a set of files (sandbox companies and the signed-in workspace's sync). */
export function buildFrom(hashKey: string, sources: BuildRequest['sources']): Promise<BuildResponse> {
  const id = ++seq;
  const req: BuildRequest = { id, hashKey, generatedAt: new Date().toISOString(), sources };
  return new Promise((resolve) => {
    pending.set(id, resolve);
    engine().postMessage(req);
  });
}

const build = (c: Company) =>
  buildFrom(
    c.hashKey,
    c.sources.filter((s) => s.bytes).map((s) => ({ id: s.id, name: s.name, bytes: s.bytes! })),
  );

/** Rebuilds a company's snapshot from its sources and saves it. */
async function rebuild(c: Company, added: string[] = []): Promise<Company> {
  let res = await build(c);
  // Newly added files replace older files that carried only the same sources (docs/09 §6.12 Update data).
  if (res.ok && added.length) {
    const fresh = new Set(res.tables.filter((t) => added.includes(t.input) && t.source).map((t) => t.source));
    const stale = c.sources.filter((s) => {
      if (added.includes(s.id) || s.kind !== 'file') return false;
      const own = res.ok ? res.tables.filter((t) => t.input === s.id && t.source) : [];
      return own.length > 0 && own.every((t) => fresh.has(t.source));
    });
    if (stale.length) {
      c = { ...c, sources: c.sources.filter((s) => !stale.includes(s)) };
      res = await build(c);
    }
  }
  const next: Company = res.ok
    ? {
        ...c,
        snapshot: res.snapshot,
        tables: res.tables,
        users: res.users,
        warnings: res.warnings,
        buildError: undefined,
      }
    : { ...c, buildError: res.error };
  await save(next);
  return next;
}

// ---- operations ------------------------------------------------------------------------------------------------

const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID().slice(0, 12)
    : Math.random().toString(36).slice(2, 14);

export async function createCompany(name: string): Promise<Company> {
  const now = new Date().toISOString();
  const c: Company = {
    id: uid(),
    name: name.trim() || 'My company',
    hashKey: uid() + uid(),
    createdAt: now,
    updatedAt: now,
    sources: [],
  };
  await save(c);
  return c;
}

export async function renameCompany(id: string, name: string) {
  const c = getCompany(id);
  if (c && name.trim())
    await save({
      ...c,
      name: name.trim(),
      snapshot: c.snapshot && { ...c.snapshot, workspace: { ...c.snapshot.workspace, name: name.trim() } },
    });
}

export async function deleteCompany(id: string) {
  companies = companies.filter((c) => c.id !== id);
  emit();
  await tx('readwrite', (s) => s.delete(id));
}

const totalBytes = (c: Company) => c.sources.reduce((a, s) => a + s.size, 0);

export class SandboxError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

/** Adds dropped files and rebuilds once for the whole drop. */
export async function addFiles(id: string, files: File[]): Promise<Company> {
  const c = getCompany(id);
  if (!c) throw new SandboxError('NOT_FOUND');
  if (files.some((f) => !/\.(csv|xlsx|zip)$/i.test(f.name))) throw new SandboxError('UPLOAD_TYPE_UNSUPPORTED');
  if (totalBytes(c) + files.reduce((a, f) => a + f.size, 0) > MAX_TOTAL_BYTES) throw new SandboxError('SANDBOX_FULL');
  const now = new Date().toISOString();
  const added: CompanySource[] = await Promise.all(
    files.map(async (f) => ({
      id: uid(),
      kind: 'file' as const,
      name: f.name,
      bytes: await f.arrayBuffer(),
      size: f.size,
      addedAt: now,
    })),
  );
  return rebuild(
    { ...c, sources: [...c.sources, ...added] },
    added.map((s) => s.id),
  );
}

/** GET /api/sheet → the workbook bytes and its name, or a copy-deck error code. */
async function fetchSheet(url: string): Promise<{ bytes: ArrayBuffer; name: string }> {
  let res: Response;
  try {
    res = await fetch(`/api/sheet?url=${encodeURIComponent(url)}`, { cache: 'no-store' });
  } catch {
    throw new SandboxError('SHEET_FETCH_FAILED');
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { code?: string } } | null;
    throw new SandboxError(body?.error?.code ?? 'SHEET_FETCH_FAILED');
  }
  const raw = res.headers.get('x-sheet-name') ?? '';
  const name = (() => {
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  })();
  return { bytes: await res.arrayBuffer(), name };
}

export const isSheetLink = (url: string) => /^https:\/\/docs\.google\.com\/spreadsheets\/d\//.test(url.trim());

export async function addLink(id: string, url: string): Promise<Company> {
  const c = getCompany(id);
  if (!c) throw new SandboxError('NOT_FOUND');
  if (!isSheetLink(url)) throw new SandboxError('SHEET_LINK_INVALID');
  if (c.sources.some((s) => s.kind === 'link' && s.url === url.trim())) return refreshLinks(id);
  const { bytes, name } = await fetchSheet(url);
  if (totalBytes(c) + bytes.byteLength > MAX_TOTAL_BYTES) throw new SandboxError('SANDBOX_FULL');
  const now = new Date().toISOString();
  const src: CompanySource = {
    id: uid(),
    kind: 'link',
    name: name || 'Google Sheet',
    url: url.trim(),
    bytes,
    size: bytes.byteLength,
    addedAt: now,
    fetchedAt: now,
  };
  return rebuild({ ...c, sources: [...c.sources, src] });
}

/** Fetches every linked sheet again and rebuilds; a sheet that fails keeps its last copy and shows the error. */
export async function refreshLinks(id: string): Promise<Company> {
  const c = getCompany(id);
  if (!c) throw new SandboxError('NOT_FOUND');
  const sources = await Promise.all(
    c.sources.map(async (s) => {
      if (s.kind !== 'link' || !s.url) return s;
      try {
        const { bytes, name } = await fetchSheet(s.url);
        return {
          ...s,
          bytes,
          size: bytes.byteLength,
          name: name || s.name,
          fetchedAt: new Date().toISOString(),
          error: undefined,
        };
      } catch (e) {
        return { ...s, error: e instanceof SandboxError ? e.code : 'SHEET_FETCH_FAILED' };
      }
    }),
  );
  return rebuild({ ...c, sources });
}

export async function removeSource(id: string, sourceId: string): Promise<Company> {
  const c = getCompany(id);
  if (!c) throw new SandboxError('NOT_FOUND');
  return rebuild({ ...c, sources: c.sources.filter((s) => s.id !== sourceId) });
}

export const hasLinks = (c: Company) => c.sources.some((s) => s.kind === 'link');
