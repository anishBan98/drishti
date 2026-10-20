import {
  CHANNELS,
  CHANNEL_COLOR,
  CHANNEL_LABEL,
  CHANNEL_SHORT,
  formatInr,
  formatPct,
  formatShortDate,
  t,
  type Channel,
  type Snapshot,
} from '@drishti/shared';
import { useState } from 'react';
import { ActionCards } from '../components/Actions';
import { Header, Main, SummaryStrip } from '../components/Frame';
import { PillMenu } from '../components/PillMenu';
import ui from '../components/ui.module.css';
import css from './screens.module.css';

type Metric = 'revenue' | 'orders' | 'aov' | 'buyers';
const TABS: { id: Metric; label: Parameters<typeof t>[0] }[] = [
  { id: 'revenue', label: 'ui.perf.tab.revenue' },
  { id: 'orders', label: 'ui.perf.tab.orders' },
  { id: 'aov', label: 'ui.perf.tab.aov' },
  { id: 'buyers', label: 'ui.perf.tab.buyers' },
];
const kfmt = (n: number) =>
  n >= 100_000 ? `${(n / 100_000).toFixed(2)} L` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(Math.round(n));
const niceMax = (v: number) => {
  const p = 10 ** Math.floor(Math.log10(v || 1));
  return Math.ceil(v / p / 2.5) * 2.5 * p;
};

function WeeklyChart({ p, metric, d28start }: { p: Snapshot['performance']; metric: Metric; d28start: string }) {
  const w = p.weekly;
  const totals = w.weeks.map((_, i) => CHANNELS.reduce((a, c) => a + (w.revenue_by_channel[c]?.[i] ?? 0), 0));
  const single = metric === 'orders' ? w.orders : metric === 'aov' ? w.aov : metric === 'buyers' ? w.buyers : totals;
  const max = niceMax(Math.max(...single));
  const fmt = (v: number) => (metric === 'revenue' || metric === 'aov' ? formatInr(v, { compact: true }) : kfmt(v));
  return (
    <div className={css.chartArea}>
      <div className={css.yAxis}>
        {[1, 0.5, 0].map((f) => (
          <span key={f} className={css.yTick} style={{ top: `${(1 - f) * 100}%` }}>
            {f === 0 ? '0' : fmt(max * f)}
          </span>
        ))}
      </div>
      <div
        className={css.bars}
        role="img"
        aria-label={`${t(TABS.find((x) => x.id === metric)!.label)}, ${w.weeks.length} weeks`}
      >
        <div className={css.gridLine} style={{ top: '50%' }} />
        <div className={css.gridLine} style={{ top: 0 }} />
        {w.weeks.map((wk, i) => {
          const faded = addDaysIso(wk, 6) < d28start;
          return (
            <div
              key={wk}
              className={css.stack}
              style={{ opacity: faded ? 0.45 : 1 }}
              title={`${formatShortDate(wk)}: ${fmt(single[i] ?? 0)}`}
            >
              {metric === 'revenue' ? (
                CHANNELS.map((c) => (
                  <div
                    key={c}
                    className={css.seg}
                    style={{
                      height: `${((w.revenue_by_channel[c]?.[i] ?? 0) / max) * 100}%`,
                      background: CHANNEL_COLOR[c],
                    }}
                  />
                ))
              ) : (
                <div
                  className={css.seg}
                  style={{ height: `${((single[i] ?? 0) / max) * 100}%`, background: 'var(--primary)' }}
                />
              )}
            </div>
          );
        })}
      </div>
      <div />
      <div className={css.xLabels}>
        {w.weeks.map((wk) => (
          <span key={wk}>{formatShortDate(addDaysIso(wk, 6))}</span>
        ))}
      </div>
    </div>
  );
}

const addDaysIso = (d: string, n: number) =>
  new Date(Date.parse(`${d}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

export function Performance({ snapshot }: { snapshot: Snapshot }) {
  const p = snapshot.performance;
  const [metric, setMetric] = useState<Metric>('revenue');
  const [selected, setSelected] = useState<Channel>(
    () => ([...p.channels].sort((a, b) => b.revenue - a.revenue)[0]?.id as Channel) ?? 'amazon',
  );
  const ch = p.channels.find((c) => c.id === selected) ?? p.channels[0]!;
  const total = p.channels.reduce((a, c) => a + c.revenue, 0);
  const revKpi = p.kpis.find((k) => k.id === 'revenue');
  const qc = p.channels.find((c) => c.id === 'quick_commerce');
  const caption = t('ui.perf.caption', {
    revenue: formatInr(total, { compact: true }),
    change: t((revKpi?.delta?.value ?? 0) >= 0 ? 'ui.perf.up' : 'ui.perf.down', {
      pct: formatPct(Math.abs(revKpi?.delta?.value ?? 0)),
    }),
    channel: CHANNEL_LABEL.quick_commerce,
    share: formatPct(qc?.share_pct ?? 0),
  });
  const cols = '1.4fr 1fr 0.8fr 0.8fr 0.7fr 0.8fr 0.8fr';
  const channelOptions = [
    { value: 'all', label: t('ui.filter.all_channels') },
    ...CHANNELS.map((c) => ({ value: c, label: CHANNEL_LABEL[c] })),
  ];
  return (
    <Main>
      <Header title={t('nav.performance')} subtitle={t('ui.perf.subtitle')}>
        <PillMenu
          label={t('ui.period.d28')}
          options={[{ value: 'd28', label: t('ui.period.d28') }]}
          value="d28"
          what={t('ui.filter.period')}
        />
        <PillMenu
          label={t('ui.filter.all_channels')}
          options={channelOptions}
          value="all"
          onChange={(v) => v !== 'all' && setSelected(v as Channel)}
        />
        <PillMenu
          label={t('ui.filter.all_products')}
          options={[{ value: 'all', label: t('ui.filter.all_products') }]}
          value="all"
          what={t('ui.filter.products')}
        />
      </Header>
      <SummaryStrip verdict={p.verdict} kpis={p.kpis} />
      <div className={ui.body}>
        <div className={css.perfLeft}>
          <section aria-label={t('ui.perf.title')} className={ui.panel} style={{ padding: '18px 22px 14px', gap: 10 }}>
            <div className={ui.panelHead} style={{ alignItems: 'flex-start' }}>
              <div>
                <h2 className={ui.h2}>{t('ui.perf.title')}</h2>
                <div className={css.subCaption}>{caption}</div>
              </div>
              <div role="tablist" aria-label={t('ui.perf.title')} className={css.metricTabs}>
                {TABS.map((x) => (
                  <button
                    key={x.id}
                    type="button"
                    role="tab"
                    aria-selected={metric === x.id}
                    className={css.metricTab}
                    onClick={() => setMetric(x.id)}
                  >
                    {t(x.label)}
                  </button>
                ))}
              </div>
            </div>
            <WeeklyChart p={p} metric={metric} d28start={snapshot.windows.d28[0]} />
            <div className={css.chartLegend}>
              {metric === 'revenue' &&
                CHANNELS.map((c) => (
                  <span key={c} className={ui.legendItem}>
                    <span className={ui.swatch} style={{ background: CHANNEL_COLOR[c] }} />
                    {CHANNEL_LABEL[c]}
                  </span>
                ))}
              <span style={{ color: 'var(--muted-2)' }}>{t('ui.perf.faded')}</span>
            </div>
          </section>
          <section aria-label={t('ui.perf.channels')} className={`${ui.panel} ${css.tablePanel}`}>
            <div className={css.tableHead}>
              <h2 className={ui.h2}>{t('ui.perf.channels')}</h2>
              <span className={ui.headNote}>{t('ui.select_hint')}</span>
            </div>
            <div className={css.gridHead} style={{ gridTemplateColumns: cols }}>
              <span>{t('ui.perf.col.channel')}</span>
              <span className={css.r}>{t('ui.perf.col.revenue')}</span>
              <span className={css.r}>{t('ui.perf.col.growth')}</span>
              <span className={css.r}>{t('ui.perf.col.orders')}</span>
              <span className={css.r}>{t('ui.perf.col.aov')}</span>
              <span className={css.r}>{t('ui.perf.col.buyers')}</span>
              <span className={css.r}>{t('ui.perf.col.returns')}</span>
            </div>
            <div className={css.rows}>
              {p.channels.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={c.id === selected}
                  className={css.gridRowBtn}
                  style={{ gridTemplateColumns: cols, minHeight: 40 }}
                  onClick={() => setSelected(c.id as Channel)}
                >
                  <span className={css.nameCell}>
                    <span className={ui.swatch} style={{ background: c.color, width: 10, height: 10 }} />
                    {CHANNEL_SHORT[c.id as Channel] ?? c.label}
                  </span>
                  <span className={css.r}>{formatInr(c.revenue, { compact: true })}</span>
                  <span
                    className={`${css.r} ${css.b}`}
                    style={{ color: c.growth_pct < 0 ? 'var(--bad)' : 'var(--good)' }}
                  >
                    {c.growth_pct < 0 ? '▼' : '▲'} {formatPct(Math.abs(c.growth_pct), { whole: true })}
                  </span>
                  <span className={css.r}>{kfmt(c.orders)}</span>
                  <span className={css.r}>{formatInr(c.aov)}</span>
                  <span className={css.r} style={{ color: c.buyers === undefined ? 'var(--muted)' : undefined }}>
                    {c.buyers === undefined ? t('ui.na') : kfmt(c.buyers)}
                  </span>
                  <span
                    className={`${css.r} ${css.b}`}
                    style={{ color: c.return_pct > 0.07 ? 'var(--bad)' : 'var(--good)' }}
                  >
                    {formatPct(c.return_pct)}
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>
        <div className={ui.rightCol}>
          <section aria-label={t('ui.means.for', { name: ch.label })} className={ui.insight}>
            <div className={ui.insightHead}>
              <h2 className={ui.insightTitle}>{t('ui.means.for', { name: ch.label })}</h2>
              <span className={ui.insightTitle} style={{ fontWeight: 500 }}>
                {t('ui.of_revenue', { pct: formatPct(ch.share_pct) })}
              </span>
            </div>
            <p className={ui.headline}>{ch.headline}</p>
            <ul className={ui.bullets}>
              {ch.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </section>
          <ActionCards
            suggestions={ch.suggestions}
            screen="performance"
            forName={ch.label}
            footer={
              <>
                <div className={css.footRow}>
                  <span className={css.b}>{t('ui.share_of_revenue')}</span>
                  <span style={{ color: 'var(--muted)' }}>
                    {t('ui.share_is', { name: ch.label, pct: formatPct(ch.share_pct) })}
                  </span>
                </div>
                <div
                  className={css.shareBar}
                  role="img"
                  aria-label={p.channels.map((c) => `${c.label} ${formatPct(c.share_pct)}`).join(', ')}
                >
                  {p.channels.map((c) => (
                    <span
                      key={c.id}
                      style={{
                        width: `${c.share_pct * 100}%`,
                        background: c.color,
                        opacity: c.id === selected ? 1 : 0.3,
                      }}
                    />
                  ))}
                </div>
              </>
            }
          />
        </div>
      </div>
    </Main>
  );
}
