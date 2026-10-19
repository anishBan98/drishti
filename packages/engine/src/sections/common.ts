import {
  delta,
  formatInr,
  formatPct,
  formatPoints,
  round,
  t,
  type CopyKey,
  type Delta,
  type Kpi,
} from '@drishti/shared';

// Small helpers to build KPI cells (docs/06 §6 Kpi; docs/09 §5 KpiCell) with copy-deck labels.

export function kpi(
  id: string,
  label: CopyKey,
  value: number,
  display: string,
  opts: { delta?: Delta; note?: string; spark?: number[]; tone?: Kpi['tone'] } = {},
): Kpi {
  const tone =
    opts.tone ?? (opts.delta ? (opts.delta.good === null ? 'neutral' : opts.delta.good ? 'good' : 'bad') : undefined);
  return {
    id,
    label: t(label),
    value: round(value, 4),
    display,
    ...(opts.delta ? { delta: opts.delta } : {}),
    ...(opts.note ? { note: opts.note } : {}),
    ...(opts.spark ? { spark: opts.spark.map((v) => round(v, 2)) } : {}),
    ...(tone ? { tone } : {}),
  };
}

export const money = (v: number) => formatInr(v, { compact: true });

/** "▲ 6.2%" style text for a delta (used inside sentences). */
export function deltaText(d: Delta): string {
  if (d.direction === 'flat') return t('delta.flat');
  return d.unit === 'pts' ? formatPoints(Math.abs(d.value)) : formatPct(Math.abs(d.value));
}

/** Compact count: 69,400 → "69.4k", 2,97,000 → "2.97 L". */
export function count(n: number): string {
  if (n >= 100_000) return `${(n / 100_000).toFixed(2).replace(/\.?0+$/, '')} L`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(Math.round(n));
}

export { delta };
