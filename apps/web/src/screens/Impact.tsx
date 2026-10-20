import { formatInr, formatRoas, formatShortDate, t, type Snapshot } from '@drishti/shared';
import { useState } from 'react';
import { ActionCards } from '../components/Actions';
import { Header, Main, SummaryStrip } from '../components/Frame';
import { EvidenceLine, InsightCard } from '../components/Insight';
import { PillMenu } from '../components/PillMenu';
import ui from '../components/ui.module.css';
import css from './screens.module.css';

const money = (v: number) => formatInr(v, { compact: true });
/** Real return colours (docs/08 §3.5): ₹250+ green, under ₹160 red. */
const realColor = (per100: number) => (per100 >= 250 ? 'var(--good)' : per100 < 160 ? 'var(--bad)' : 'var(--ink)');
const ratioTone = (r: number, target: number) => (r >= target ? ui.good : r >= 2 ? ui.warn : ui.bad);
const paybackColor = (m: number) => (m <= 4 ? 'var(--good)' : m > 6 ? 'var(--bad)' : 'var(--ink)');

export function Impact({ snapshot }: { snapshot: Snapshot }) {
  const im = snapshot.impact;
  const [selected, setSelected] = useState(() => [...im.channels].sort((a, b) => b.spend - a.spend)[0]?.id ?? '');
  const ch = im.channels.find((c) => c.id === selected) ?? im.channels[0]!;
  const scale = Math.max(...im.channels.map((c) => Math.max(c.claimed_per100, c.real_per100))) * 1.03 || 1;
  const target = Number(/(\d+(\.\d+)?)/.exec(im.kpis.find((k) => k.id === 'ltv_cac')?.note ?? '')?.[1] ?? 3);
  const test = im.tests[0];
  const acqCols = '1.3fr repeat(4, minmax(0, 1fr))';
  return (
    <Main>
      <Header title={t('nav.impact')} subtitle={t('impact.subtitle')}>
        <PillMenu
          label={t('ui.period.d28')}
          options={[{ value: 'd28', label: t('ui.period.d28') }]}
          value="d28"
          what={t('ui.filter.period')}
        />
        <button
          type="button"
          className={ui.primaryPill}
          onClick={() => {
            setSelected(im.channels.find((c) => c.suggestions.some((s) => s.type === 'geo_test'))?.id ?? selected);
            document.querySelector<HTMLElement>('[data-suggestion="geo_test"] button')?.focus();
          }}
        >
          {t('ui.impact.plan_test')}
        </button>
      </Header>
      <SummaryStrip verdict={im.verdict} kpis={im.kpis} />
      <div className={ui.body}>
        <div className={css.leftTwo}>
          <section aria-label={t('impact.claim_vs_real.title')} className={ui.panel}>
            <div className={ui.panelHead}>
              <h2 className={ui.h2}>{t('impact.claim_vs_real.title')}</h2>
              <div className={ui.legend}>
                <span className={ui.legendItem}>
                  <span className={ui.swatch} style={{ background: 'var(--line-3)' }} />
                  {t('ui.impact.legend.claims')}
                </span>
                <span className={ui.legendItem}>
                  <span className={ui.swatch} style={{ background: 'var(--primary)' }} />
                  {t('ui.impact.legend.real')}
                </span>
              </div>
            </div>
            <div className={css.rows}>
              {im.channels.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={c.id === selected}
                  className={css.cvr}
                  onClick={() => setSelected(c.id)}
                >
                  <span className={css.cvrName}>{c.id === 'qc_ads' ? t('ui.impact.qc_short') : c.label}</span>
                  <span
                    className={css.cvrBars}
                    role="img"
                    aria-label={`${c.label}: claims ₹${Math.round(c.claimed_per100)}, real ₹${Math.round(c.real_per100)} per ₹100`}
                  >
                    <span className={css.barClaim} style={{ width: `${(c.claimed_per100 / scale) * 100}%` }} />
                    <span className={css.barReal} style={{ width: `${(c.real_per100 / scale) * 100}%` }} />
                  </span>
                  <span className={css.cvrVals}>
                    <span className={css.small}>₹{Math.round(c.claimed_per100)}</span>
                    <span
                      className={css.strongVal}
                      style={{ color: realColor(c.real_per100) }}
                      title={t('ui.impact.range', { low: money(c.real_low), high: money(c.real_high) })}
                    >
                      ₹{Math.round(c.real_per100)}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </section>
          <section aria-label={t('ui.impact.acq.title')} className={ui.panel}>
            <div className={ui.panelHead}>
              <h2 className={ui.h2}>{t('ui.impact.acq.title')}</h2>
              <span className={ui.headNote}>{t('ui.impact.acq.target', { x: target })}</span>
            </div>
            <div className={css.gridHead} style={{ gridTemplateColumns: acqCols }}>
              <span>{t('ui.impact.col.source')}</span>
              <span className={css.r}>{t('ui.impact.col.cac')}</span>
              <span className={css.r}>{t('ui.impact.col.value')}</span>
              <span className={css.r}>{t('ui.impact.col.ratio')}</span>
              <span className={css.r}>{t('ui.impact.col.payback')}</span>
            </div>
            <div className={css.rows}>
              {im.acquisition.map((a) => (
                <div key={a.source} className={css.gridRow} style={{ gridTemplateColumns: acqCols }}>
                  <span className={css.b}>{a.source}</span>
                  <span className={css.r}>{formatInr(a.cac)}</span>
                  <span className={css.r}>{formatInr(a.value_12m)}</span>
                  <span className={`${ui.tag} ${ratioTone(a.ltv_cac, target)} ${css.end}`}>
                    {formatRoas(a.ltv_cac)}
                  </span>
                  <span
                    className={css.r}
                    style={{
                      color: paybackColor(a.payback_months),
                      fontWeight: a.payback_months <= 4 || a.payback_months > 6 ? 700 : 400,
                    }}
                  >
                    {t('ui.mo', { n: a.payback_months })}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
        <div className={ui.rightCol}>
          <InsightCard
            title={t('ui.means.for', { name: ch.label })}
            badge={`${t('ui.confidence')} ${t(`ui.confidence.${ch.confidence}`)}`}
            headline={ch.headline}
            cells={[
              { label: t('ui.impact.cell.spend'), value: money(ch.spend) },
              { label: t('ui.impact.cell.claimed'), value: money(ch.claimed) },
              { label: t('ui.impact.cell.real'), value: money(ch.real) },
            ]}
          >
            <EvidenceLine evidence={ch.evidence} />
          </InsightCard>
          <ActionCards
            suggestions={ch.suggestions}
            screen="impact"
            forName={ch.label}
            footer={
              test ? (
                <>
                  <div className={css.footRow}>
                    <span className={css.b}>{test.name}</span>
                    <span style={{ color: 'var(--muted)' }}>
                      {t('ui.impact.day', { day: test.day, days: test.days })}
                    </span>
                  </div>
                  <div
                    className={css.progressTrack}
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={test.days}
                    aria-valuenow={test.day}
                    aria-label={test.name}
                  >
                    <div className={css.progressFill} style={{ width: `${(test.day / test.days) * 100}%` }} />
                  </div>
                  <div className={css.footNote}>
                    {t('ui.impact.readout', { date: formatShortDate(test.readout), note: test.note })}
                  </div>
                </>
              ) : undefined
            }
          />
        </div>
      </div>
    </Main>
  );
}
