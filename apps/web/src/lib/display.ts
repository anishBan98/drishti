import { CHANNEL_SHORT, formatInr, formatPct, formatPoints, t, type Delta } from '@drishti/shared';

/** Delta text without the arrow: "6.5%", "1.2 points", "0.2" (ROAS), "₹4 L". */
export function formatDelta(d: Delta): string {
  if (d.direction === 'flat') return t('delta.flat');
  const v = Math.abs(d.value);
  switch (d.unit) {
    case 'pct':
      return formatPct(v);
    case 'pts':
      return formatPoints(v);
    case 'x':
      return v.toFixed(1);
    case 'inr':
      return formatInr(v, { compact: true });
  }
}

/** Channel chip colours by short label (bridge and tables). */
export function channelChip(label: string): { bg: string; ink: string; dot?: string } {
  if (label === CHANNEL_SHORT.amazon) return { bg: 'var(--amz-bg)', ink: 'var(--amz-ink)', dot: 'var(--c-amazon)' };
  if (label === CHANNEL_SHORT.quick_commerce) return { bg: 'var(--qc-bg)', ink: 'var(--qc-ink)', dot: 'var(--c-qc)' };
  if (label === CHANNEL_SHORT.own_site) return { bg: 'var(--own-bg)', ink: 'var(--own-ink)', dot: 'var(--c-own)' };
  if (label === CHANNEL_SHORT.nykaa) return { bg: 'var(--warn-bg)', ink: 'var(--warn)', dot: 'var(--c-nykaa)' };
  if (label === CHANNEL_SHORT.flipkart) return { bg: 'var(--bad-bg)', ink: 'var(--bad)', dot: 'var(--c-flipkart)' };
  return { bg: 'var(--chip)', ink: 'var(--muted)' };
}

/** Impact label tone: losses avoided and risks red, gains green, non-rupee labels green. */
export function impactTone(label: string): 'good' | 'bad' {
  return /^[−-]|risk/i.test(label) ? 'bad' : 'good';
}

export const lakh = (v: number) => (v > 0 ? `+${v}` : v < 0 ? `−${Math.abs(v)}` : '0');
