import { t, type Evidence } from '@drishti/shared';
import type { ReactNode } from 'react';
import ui from './ui.module.css';

// InsightCard (docs/09 §5): navy card with a title, an optional badge, the headline, stat cells and evidence.
export const BADGE_BG: Record<string, string> = {
  'High threat': '#C2341F',
  'Medium threat': '#A0620B',
  Opportunity: '#16794A',
  Strength: '#16794A',
  Preferred: '#16794A',
  You: '#2A78D6',
  Problem: '#C2341F',
  'Losing money': '#C2341F',
  'Fix now': '#C2341F',
  Behind: '#A0620B',
};

export function InsightCard({
  title,
  badge,
  headline,
  cells,
  children,
  label,
}: {
  title: string;
  badge?: string;
  headline: string;
  cells?: { label: string; value: string }[];
  children?: ReactNode;
  label?: string;
}) {
  return (
    <section aria-label={label ?? title} className={ui.insight}>
      <div className={ui.insightHead}>
        <h2 className={ui.insightTitle}>{title}</h2>
        {badge && (
          <span className={ui.insightBadge} style={BADGE_BG[badge] ? { background: BADGE_BG[badge] } : undefined}>
            {badge}
          </span>
        )}
      </div>
      <p className={ui.headline}>{headline}</p>
      {cells && cells.length > 0 && (
        <div className={ui.cells}>
          {cells.map((c) => (
            <div key={c.label} className={ui.cell}>
              <span className={ui.cellLabel}>{c.label}</span>
              <span className={ui.cellValue}>{c.value}</span>
            </div>
          ))}
        </div>
      )}
      {children}
    </section>
  );
}

export function EvidenceLine({ evidence }: { evidence: Evidence[] | string }) {
  const text = typeof evidence === 'string' ? evidence : evidence.map((e) => e.label).join(' ');
  if (!text) return null;
  return (
    <p className={ui.evidence}>
      {t('ui.impact.evidence')} {text}
    </p>
  );
}
