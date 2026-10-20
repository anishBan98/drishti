import { strFromU8, unzipSync } from 'fflate';

// Minimal XLSX reader for the sandbox (docs/05 §14): every sheet as rows of strings, so the same CSV parsers apply.
// No DOM is used (it runs in a Web Worker). Numbers stay as written; dates stay as Excel serials, which parseDate reads.

export interface Sheet {
  name: string;
  rows: string[][];
}

const unescape = (s: string) =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, '&');

/** Text of every <t> inside a fragment (rich text has several runs). */
const textOf = (xml: string) =>
  [...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => unescape(m[1] ?? '')).join('');

/** "B12" → column index 1. */
function colIndex(ref: string): number {
  const letters = /^[A-Z]+/.exec(ref)?.[0] ?? 'A';
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

const attr = (tag: string, name: string) => new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1];

export function isXlsx(bytes: Uint8Array): boolean {
  // ZIP local file header "PK\x03\x04".
  return bytes.length > 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 3 && bytes[3] === 4;
}

export function readXlsx(bytes: Uint8Array): Sheet[] {
  const files = unzipSync(bytes, { filter: (f) => f.name.startsWith('xl/') });
  const text = (name: string) => (files[name] ? strFromU8(files[name]) : '');

  const shared = [...text('xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => textOf(m[1] ?? ''));

  // Sheet names and their part paths, in workbook order.
  const rels = new Map<string, string>();
  for (const m of text('xl/_rels/workbook.xml.rels').matchAll(/<Relationship\b[^>]*>/g)) {
    const id = attr(m[0], 'Id');
    const target = attr(m[0], 'Target');
    if (id && target) rels.set(id, target.replace(/^\/?xl\//, '').replace(/^\//, ''));
  }
  const sheets: Sheet[] = [];
  for (const m of text('xl/workbook.xml').matchAll(/<sheet\b[^>]*>/g)) {
    const name = unescape(attr(m[0], 'name') ?? '');
    const rid = attr(m[0], 'r:id');
    const target = rid ? rels.get(rid) : undefined;
    if (!target) continue;
    sheets.push({ name, rows: readSheet(text(`xl/${target}`), shared) });
  }
  return sheets;
}

function readSheet(xml: string, shared: string[]): string[][] {
  const rows: string[][] = [];
  for (const rm of xml.matchAll(/<row\b([^>]*)>([\s\S]*?)<\/row>/g)) {
    const r = Number(attr(rm[0], 'r') ?? rows.length + 1) - 1;
    const cells: string[] = [];
    for (const cm of (rm[2] ?? '').matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const open = `<c${cm[1] ?? ''}>`;
      const body = cm[2] ?? '';
      const ref = attr(open, 'r');
      const idx = ref ? colIndex(ref) : cells.length;
      const type = attr(open, 't');
      const v = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1];
      let value = '';
      if (type === 's') value = shared[Number(v)] ?? '';
      else if (type === 'inlineStr') value = textOf(body);
      else if (type === 'b') value = v === '1' ? 'TRUE' : 'FALSE';
      else if (v !== undefined) value = unescape(v);
      cells[idx] = value;
    }
    rows[r] = Array.from(cells, (c) => c ?? '');
  }
  // Drop leading gaps and trailing empty rows; keep row order.
  return rows.filter((r) => r && r.some((c) => c.trim() !== ''));
}

/** Rows back to CSV text, so sheet tabs flow through the CSV parsers. */
export function rowsToCsv(rows: string[][]): string {
  return rows.map((r) => r.map((c) => (/[",\n\r]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(',')).join('\n');
}

/** A ZIP of exports (not a workbook) → its CSV and XLSX files; anything else → the file itself (docs/11 §3). */
export function expandArchive(name: string, bytes: Uint8Array): { name: string; bytes: Uint8Array }[] {
  if (!isXlsx(bytes)) return [{ name, bytes }];
  const files = unzipSync(bytes);
  if (files['xl/workbook.xml']) return [{ name, bytes }];
  return Object.entries(files)
    .filter(([n, b]) => b.length && !n.endsWith('/') && !/(^|\/)(__MACOSX|\.)/.test(n) && /\.(csv|xlsx)$/i.test(n))
    .map(([n, b]) => ({ name: n.split('/').pop() ?? n, bytes: b }));
}
