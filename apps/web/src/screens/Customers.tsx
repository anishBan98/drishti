import { formatInr, formatPct, formatRoas, t, type Snapshot } from '@drishti/shared';
import { useState } from 'react';
import { ActionCards } from '../components/Actions';
import { Header, Main, SummaryStrip } from '../components/Frame';
import { InsightCard } from '../components/Insight';
import { PillMenu } from '../components/PillMenu';
import { screenSuggestion, useQuickAction } from '../lib/quick-action';
import ui from '../components/ui.module.css';
import css from './screens.module.css';

type Segment = Snapshot['customers']['segments'][number];
const KIND_COLOR: Record<Segment['kind'], string> = { preferred: '#2A78D6', problem: '#E8590C', other: '#9AA3C2' };
// Map axes (docs/08 §7.4): orders a year 0.5–6.5, average order ₹300–₹1,500.
const xPos = (orders: number) => ((Math.min(6.5, Math.max(0.5, orders)) - 0.5) / 6) * 100;
const yPos = (aov: number) => (1 - (Math.min(1500, Math.max(300, aov)) - 300) / 1200) * 100;
const ratioTone = (r: number) => (r >= 3 ? ui.good : r >= 2 ? ui.warn : ui.bad);

export function Customers({ snapshot }: { snapshot: Snapshot }) {
  const c = snapshot.customers;
  const run = useQuickAction(t('nav.customers'));
  const [selected, setSelected] = useState(
    () => (c.segments.find((s) => s.kind === 'problem') ?? c.segments[0])?.id ?? '',
  );
  const s = c.segments.find((x) => x.id === selected) ?? c.segments[0]!;
  const buyers = c.kpis.find((k) => k.id === 'buyers');
  const cols = '1.9fr repeat(5, minmax(0, 0.8fr)) 0.7fr 0.8fr';
  // Centroid chips of nearby groups would overlap: stack each later one lower.
  // Chip size as a share of the plot (about 830 × 300 px at 1440 × 900): width from the name, height 34 px.
  const chipPos = new Map<string, { left: number; top: number; w: number }>();
  const H = 11;
  for (const x of c.segments) {
    const w = ((x.name.length * 8.5 + 48) / 830) * 100;
    const left = Math.min(100 - w / 2 - 1, Math.max(w / 2 + 1, xPos(x.centroid.orders)));
    const clash = (top: number) =>
      [...chipPos.values()].some((p) => Math.abs(p.left - left) < (p.w + w) / 2 + 1 && Math.abs(p.top - top) < H);
    const start = Math.min(100 - H / 2, Math.max(H / 2, yPos(x.centroid.aov)));
    let top = start;
    for (let step = 1; clash(top) && step < 12; step++) {
      // Try below, then above, moving one chip height further each time.
      const down = start + Math.ceil(step / 2) * H;
      const up = start - Math.ceil(step / 2) * H;
      top = step % 2 ? (down <= 100 - H / 2 ? down : up) : up >= H / 2 ? up : down;
    }
    chipPos.set(x.id, { left, top, w });
  }
  return (
    <Main>
      <Header
        title={t('nav.customers')}
        subtitle={t('ui.customers.subtitle', { n: buyers?.display ?? '', k: c.stability.k })}
      >
        <PillMenu
          label={t('ui.period.12m')}
          options={[{ value: '12m', label: t('ui.period.12m') }]}
          value="12m"
          what={t('ui.filter.period')}
        />
        <button
          type="button"
          className={ui.primaryPill}
          onClick={() =>
            run(
              screenSuggestion('sync_now', 'customers', t('ui.customers.rerun'), t('ui.data.sg.sync.why'), {
                scope: 'segments',
              }),
            )
          }
        >
          {t('ui.customers.rerun')}
        </button>
      </Header>
      <SummaryStrip verdict={c.verdict} kpis={c.kpis} />
      <div className={ui.body}>
        <div className={`${css.leftTwo} ${css.bottom262}`}>
          <section aria-label={t('ui.customers.title')} className={ui.panel}>
            <div className={ui.panelHead}>
              <h2 className={ui.h2}>{t('ui.customers.title')}</h2>
              <div className={ui.legend}>
                {(['preferred', 'problem', 'other'] as const).map((k) => (
                  <span key={k} className={ui.legendItem}>
                    <span className={ui.dotSwatch} style={{ background: KIND_COLOR[k] }} />
                    {t(`ui.customers.legend.${k}`)}
                  </span>
                ))}
              </div>
            </div>
            <div className={css.custMap}>
              <div className={css.yLabel}>{t('ui.customers.axis.aov')}</div>
              <div className={css.plot}>
                <div
                  role="img"
                  style={{ position: 'absolute', inset: 0 }}
                  aria-label={c.segments
                    .map((x) => `${x.name}: ${x.orders_per_year} orders a year, ${formatInr(x.aov)} average order`)
                    .join('; ')}
                >
                  <div className={css.refV} style={{ left: '50%' }} />
                  <div className={css.refH} style={{ top: '50%' }} />
                  {c.segments.flatMap((x) =>
                    x.sample.map(([o, aov], i) => (
                      <span
                        key={`${x.id}-${i}`}
                        className={css.custDot}
                        style={{
                          left: `${xPos(o)}%`,
                          top: `${yPos(aov)}%`,
                          background: KIND_COLOR[x.kind],
                          opacity: x.id === selected ? 0.85 : 0.3,
                        }}
                      />
                    )),
                  )}
                </div>
                {c.segments.map((x) => (
                  <button
                    key={x.id}
                    type="button"
                    aria-pressed={x.id === selected}
                    className={css.centroid}
                    style={{
                      left: `${chipPos.get(x.id)!.left}%`,
                      top: `${chipPos.get(x.id)!.top}%`,
                    }}
                    onClick={() => setSelected(x.id)}
                  >
                    <span className={ui.dotSwatch} style={{ background: KIND_COLOR[x.kind] }} />
                    {x.name}
                  </button>
                ))}
              </div>
              <div />
              <div className={css.xAxis}>
                <span>0.5</span>
                <span>{t('ui.customers.axis.orders')}</span>
                <span>6.5</span>
              </div>
            </div>
          </section>
          <section aria-label={t('ui.customers.col.type')} className={`${ui.panel} ${css.tablePanel}`}>
            <div className={css.gridHead} style={{ gridTemplateColumns: cols }}>
              <span>{t('ui.customers.col.type')}</span>
              <span className={css.r}>{t('ui.customers.col.buyers')}</span>
              <span className={css.r}>{t('ui.customers.col.revenue')}</span>
              <span className={css.r}>{t('ui.customers.col.aov')}</span>
              <span className={css.r}>{t('ui.customers.col.orders')}</span>
              <span className={css.r}>{t('ui.customers.col.repeat')}</span>
              <span className={css.r}>{t('ui.customers.col.cac')}</span>
              <span className={css.r}>{t('ui.customers.col.ltv_cac')}</span>
            </div>
            <div className={css.rows}>
              {c.segments.map((x) => (
                <button
                  key={x.id}
                  type="button"
                  aria-pressed={x.id === selected}
                  className={css.gridRowBtn}
                  style={{ gridTemplateColumns: cols, minHeight: 38 }}
                  onClick={() => setSelected(x.id)}
                >
                  <span className={css.nameCell}>
                    <span className={ui.dotSwatch} style={{ background: KIND_COLOR[x.kind] }} />
                    {x.name}
                  </span>
                  <span className={css.r}>{formatPct(x.buyers_pct, { whole: true })}</span>
                  <span className={css.r}>{formatPct(x.revenue_pct, { whole: true })}</span>
                  <span className={css.r}>{formatInr(x.aov)}</span>
                  <span className={css.r}>{x.orders_per_year.toFixed(1)}</span>
                  <span className={css.r}>{formatPct(x.repeat_pct, { whole: true })}</span>
                  <span className={css.r}>{formatInr(x.cac)}</span>
                  <span className={`${ui.tag} ${ratioTone(x.ltv_cac)} ${css.end}`}>{formatRoas(x.ltv_cac)}</span>
                </button>
              ))}
            </div>
          </section>
        </div>
        <div className={ui.rightCol}>
          <InsightCard
            title={t('ui.means.colon', { name: s.name })}
            badge={s.tag}
            headline={s.headline}
            cells={[
              { label: t('ui.customers.cell.discount'), value: formatPct(s.discount_pct) },
              { label: t('ui.customers.cell.cod'), value: formatPct(s.cod_pct) },
              { label: t('ui.customers.cell.value'), value: formatInr(s.ltv_12m) },
            ]}
          />
          <ActionCards
            suggestions={s.suggestions}
            screen="customers"
            forName={s.name}
            footer={<p className={css.footNote}>{c.method}</p>}
          />
        </div>
      </div>
    </Main>
  );
}
