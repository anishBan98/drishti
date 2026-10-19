// Number and money formatting (docs/09-FRONTEND.md §9, docs/08-METHODS.md §1).

const LAKH = 100_000;
const CRORE = 10_000_000;

/** Indian digit grouping: 1234567 → "12,34,567". */
export function groupIndian(n: number): string {
  const sign = n < 0 ? '-' : '';
  const [int = '0', frac] = Math.abs(n).toString().split('.');
  const last3 = int.slice(-3);
  const rest = int.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return sign + (rest ? `${rest},${last3}` : last3) + (frac ? `.${frac}` : '');
}

/** "₹12,400" below ₹1 L, "₹4.6 L" / "₹29 L" below ₹1 Cr, "₹4.30 Cr" / "₹18.4 Cr" above. */
export function formatInr(value: number, opts: { compact?: boolean } = {}): string {
  const sign = value < 0 ? '−' : '';
  const v = Math.abs(value);
  if (!opts.compact || v < LAKH) return `${sign}₹${groupIndian(Math.round(v))}`;
  if (v < CRORE) {
    const l = v / LAKH;
    return `${sign}₹${l < 10 ? trim(l.toFixed(1)) : Math.round(l)} L`;
  }
  const cr = v / CRORE;
  return `${sign}₹${cr < 10 ? cr.toFixed(2) : cr.toFixed(1)} Cr`;
}

/** Ratio → "6.5%" (one decimal under 10), "21%" at 10 and above. */
export function formatPct(ratio: number, opts: { signed?: boolean } = {}): string {
  const p = ratio * 100;
  const a = Math.abs(p);
  const body = a >= 10 ? String(Math.round(a)) : trim(a.toFixed(1));
  const sign = p < 0 && body !== '0' ? '−' : opts.signed && p > 0 ? '+' : '';
  return `${sign}${body}%`;
}

/** Rate difference in points: 0.012 → "1.2 points". */
export function formatPoints(diff: number): string {
  const p = trim(Math.abs(diff * 100).toFixed(1));
  return `${p} ${p === '1' ? 'point' : 'points'}`;
}

/** ROAS → "2.0x"; spend of zero gives "—" (docs/03 §4). */
export function formatRoas(roas: number | null): string {
  return roas === null || !Number.isFinite(roas) ? '—' : `${roas.toFixed(1)}x`;
}

/** Real or claimed sales per ₹100 → "₹153". */
export function formatPer100(per100: number): string {
  return `₹${Math.round(per100)}`;
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** "2026-10-17" → "17 Oct". */
export function formatShortDate(iso: string): string {
  const [, m = 1, d = 1] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]!.slice(0, 3)}`;
}

/** ["2026-10-05","2026-10-11"] → "5 to 11 October 2026" (or "28 September to 4 October 2026"). */
export function formatRange([from, to]: readonly [string, string]): string {
  const [fy, fm = 1, fd] = from.split('-').map(Number);
  const [ty, tm = 1, td] = to.split('-').map(Number);
  const month = (m: number) => MONTHS[m - 1]!;
  if (fy === ty && fm === tm) return `${fd} to ${td} ${month(tm)} ${ty}`;
  if (fy === ty) return `${fd} ${month(fm)} to ${td} ${month(tm)} ${ty}`;
  return `${fd} ${month(fm)} ${fy} to ${td} ${month(tm)} ${ty}`;
}

/** "2025-04-01" or "2025-04" → "Apr 2025". */
export function formatMonthYear(iso: string): string {
  const [y, m = 1] = iso.split('-').map(Number);
  return `${MONTHS[m - 1]!.slice(0, 3)} ${y}`;
}

/** ["Jaipur", "Lucknow", "Kochi"] → "Jaipur, Lucknow and Kochi". */
export function joinList(items: readonly string[]): string {
  return items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;
}

function trim(s: string): string {
  return s.endsWith('.0') ? s.slice(0, -2) : s;
}
