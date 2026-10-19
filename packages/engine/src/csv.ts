// CSV reading and value parsing shared by every parser (docs/11-CONNECTORS.md §3 "Parsing rules").

/** RFC 4180 CSV → array of string rows. Handles quotes, escaped quotes, CRLF and a UTF-8 BOM. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  let i = text.charCodeAt(0) === 0xfeff ? 1 : 0;
  for (; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (ch !== '\r') field += ch;
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

/** CSV with a header row → objects keyed by header. */
export function parseCsvObjects(text: string): { header: string[]; rows: Record<string, string>[] } {
  const [header = [], ...body] = parseCsv(text);
  const keys = header.map((h) => h.trim());
  return { header: keys, rows: body.map((r) => Object.fromEntries(keys.map((k, i) => [k, r[i] ?? '']))) };
}

/** "₹1,23,456.50", "12%", "(500)", "1.2e3" → number; empty or unparseable → null. Percentages become ratios. */
export function parseNumber(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  let s = raw.trim();
  if (s === '' || s === '-' || s === '—') return null;
  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  const pct = s.endsWith('%');
  s = s.replace(/[₹,\s%]|INR|Rs\.?/gi, '');
  if (s.startsWith('−')) s = '-' + s.slice(1);
  if (!/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(s)) return null;
  let n = Number(s);
  if (pct) n /= 100;
  return negative ? -n : n;
}

/** Integer rupees (storage rule: money is integer rupees, docs/06 intro). */
export function parseInr(raw: string | undefined): number | null {
  const n = parseNumber(raw);
  return n === null ? null : Math.round(n);
}

const MON: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

/** YYYY-MM-DD, DD/MM/YYYY, DD-Mon-YYYY, ISO timestamps (date part) or Excel serials → "YYYY-MM-DD". */
export function parseDate(raw: string | undefined): string | null {
  if (!raw) return null;
  const s = raw.trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (m) return iso(+m[3]!, +m[2]!, +m[1]!);
  m = s.match(/^(\d{1,2})[- ]([A-Za-z]{3})[a-z]*[- ,]+(\d{4})$/);
  if (m && MON[m[2]!.toLowerCase()]) return iso(+m[3]!, MON[m[2]!.toLowerCase()]!, +m[1]!);
  if (/^\d{5}(\.\d+)?$/.test(s)) {
    // Excel serial: day 25569 is 1970-01-01.
    const ms = (Math.floor(Number(s)) - 25569) * 86_400_000;
    return new Date(ms).toISOString().slice(0, 10);
  }
  return null;
}

function iso(y: number, m: number, d: number): string | null {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** yes / true / 1 → true. */
export function parseBool(raw: string | undefined): boolean {
  return /^(yes|y|true|1)$/i.test((raw ?? '').trim());
}
