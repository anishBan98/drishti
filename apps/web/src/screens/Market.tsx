import { formatPct, formatShortDate, t, type Snapshot } from '@drishti/shared';
import { useState } from 'react';
import { ActionCards } from '../components/Actions';
import { Header, Main, SummaryStrip } from '../components/Frame';
import { InsightCard } from '../components/Insight';
import { PillMenu } from '../components/PillMenu';
import { screenSuggestion, useQuickAction } from '../lib/quick-action';
import ui from '../components/ui.module.css';
import css from './screens.module.css';

type Product = Snapshot['market']['products'][number];

const count = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));
/** Bubble size from review count (docs/08 §6.1): 14 + 5.2·√(reviews in thousands) px. */
const size = (reviews: number) => Math.round(14 + 5.2 * Math.sqrt(reviews / 1000));
const bubbleColor = (p: Product, selected: boolean) => (selected ? '#E8590C' : p.is_us ? '#2A78D6' : '#9AA3C2');

function PositionMap({
  m,
  selected,
  onSelect,
  mode,
}: {
  m: Snapshot['market'];
  selected: string;
  onSelect: (id: string) => void;
  mode: 'price' | 'perception';
}) {
  const ps = m.products;
  const priceLo = Math.floor(Math.min(...ps.map((p) => p.per10)) / 20) * 20 - 20;
  const priceHi = Math.ceil(Math.max(...ps.map((p) => p.per10)) / 20) * 20 + 20;
  const rLo = Math.floor(Math.min(...ps.map((p) => p.rating)) * 10 - 1) / 10;
  const rHi = Math.ceil(Math.max(...ps.map((p) => p.rating)) * 10 + 1) / 10;
  const x = (p: Product) =>
    mode === 'price'
      ? ((p.per10 - priceLo) / (priceHi - priceLo)) * 100
      : ((p.perception.gentle_clinical + 1) / 2) * 100;
  const y = (p: Product) =>
    mode === 'price' ? (1 - (p.rating - rLo) / (rHi - rLo)) * 100 : (1 - (p.perception.value_premium + 1) / 2) * 100;
  const medianX = ((m.median_per10 - priceLo) / (priceHi - priceLo)) * 100;
  const catY = (1 - (m.category_rating - rLo) / (rHi - rLo)) * 100;
  const quad = m.open_space?.quadrant;
  // Labels of bubbles that almost coincide would overlap: move each later one down a line.
  const nudge = new Map<string, number>();
  ps.forEach((p, i) => {
    const clash = ps.slice(0, i).filter((q) => Math.abs(x(q) - x(p)) < 8 && Math.abs(y(q) - y(p)) < 8).length;
    nudge.set(p.id, clash * 18);
  });
  return (
    <div className={css.mapGrid}>
      <div className={css.yLabel}>
        {mode === 'price'
          ? t('ui.market.axis.rating', { low: rLo.toFixed(1), high: rHi.toFixed(1) })
          : `${t('ui.market.axis.value')} → ${t('ui.market.axis.premium')}`}
      </div>
      <div className={css.plot}>
        {mode === 'price' ? (
          <>
            <div className={css.refV} style={{ left: `${medianX}%` }} />
            <div className={css.refLabel} style={{ left: `calc(${medianX}% + 6px)`, top: 8 }}>
              {t('ui.market.median', { value: `₹${Math.round(m.median_per10)}` })}
            </div>
            <div className={css.refH} style={{ top: `${catY}%` }} />
            <div className={css.refLabel} style={{ right: 8, top: `calc(${catY}% + 4px)` }}>
              {t('ui.market.category', { value: m.category_rating.toFixed(1) })}
            </div>
          </>
        ) : (
          <>
            {quad && (
              <>
                <div
                  className={css.openSpace}
                  data-testid="open-space"
                  style={{
                    left: quad.startsWith('gentle') ? 0 : '50%',
                    top: quad.endsWith('premium') ? 0 : '50%',
                    width: '50%',
                    height: '50%',
                  }}
                />
                <div
                  className={css.openLabel}
                  style={{ left: quad.startsWith('gentle') ? 0 : '50%', top: quad.endsWith('premium') ? 0 : '50%' }}
                >
                  {m.open_space?.label}
                </div>
              </>
            )}
            <div className={css.refV} style={{ left: '50%' }} />
            <div className={css.refH} style={{ top: '50%' }} />
          </>
        )}
        {ps.map((p) => {
          const sel = p.id === selected;
          const d = size(p.reviews);
          const px = x(p);
          const flip = px > 80;
          const label = `${p.label}: ₹${Math.round(p.per10)} per 10 ml, ${p.rating} stars, ${count(p.reviews)} reviews`;
          return (
            <span key={p.id}>
              <button
                type="button"
                title={label}
                aria-label={label}
                aria-pressed={sel}
                className={css.bubble}
                style={{
                  left: `${px}%`,
                  top: `${y(p)}%`,
                  width: d,
                  height: d,
                  background: bubbleColor(p, sel),
                  border: sel ? '3px solid var(--strong)' : undefined,
                }}
                onClick={() => onSelect(p.id)}
              />
              <span
                className={css.bubbleLabel}
                style={{
                  left: `${px}%`,
                  top: `${y(p)}%`,
                  transform: flip
                    ? `translate(calc(-100% - ${d / 2 + 6}px), calc(-50% + ${nudge.get(p.id) ?? 0}px))`
                    : `translate(${d / 2 + 6}px, calc(-50% + ${nudge.get(p.id) ?? 0}px))`,
                  fontWeight: sel || p.is_us ? 700 : 500,
                  color: sel ? 'var(--strong)' : undefined,
                }}
              >
                {p.label}
              </span>
            </span>
          );
        })}
      </div>
      <div />
      <div className={css.xAxis}>
        {mode === 'price' ? (
          <>
            <span>₹{priceLo}</span>
            <span>{t('ui.market.axis.price')}</span>
            <span>₹{priceHi}</span>
          </>
        ) : (
          <>
            <span>{t('ui.market.axis.gentle')}</span>
            <span>{t('ui.market.axis.clinical')}</span>
          </>
        )}
      </div>
    </div>
  );
}

export function Market({ snapshot }: { snapshot: Snapshot }) {
  const m = snapshot.market;
  const run = useQuickAction(t('nav.market'));
  const [mode, setMode] = useState<'price' | 'perception'>('price');
  const [selected, setSelected] = useState(
    () => (m.products.find((p) => p.threat === 'High threat') ?? m.products[0])?.id ?? '',
  );
  const p = m.products.find((x) => x.id === selected) ?? m.products[0]!;
  const cols = '1.5fr 0.9fr 0.8fr 0.9fr 0.8fr 0.7fr 0.7fr';
  const changes = [
    ...new Map(m.price_changes.filter((c) => c.platform !== 'Brand site').map((c) => [c.label, c])).values(),
  ]
    .sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))
    .slice(0, 3);
  const captured = snapshot.sources.find((s) => s.id === 'watchlist_capture');
  return (
    <Main>
      <Header
        title={t('nav.market')}
        subtitle={t('market.subtitle', { category: m.category_label, n: m.products.length })}
      >
        <PillMenu
          label={t('ui.filter.all_platforms')}
          options={[{ value: 'all', label: t('ui.filter.all_platforms') }]}
          value="all"
          what={t('ui.filter.period')}
        />
        <button
          type="button"
          className={ui.primaryPill}
          onClick={() =>
            run(
              screenSuggestion('sync_now', 'market', t('ui.market.capture'), t('source.watchlist_capture.how'), {
                scope: 'captures',
              }),
            )
          }
        >
          {t('ui.market.capture')}
        </button>
      </Header>
      <SummaryStrip verdict={m.verdict} kpis={m.kpis} />
      <div className={ui.body}>
        <div className={css.leftTwo}>
          <section
            aria-label={t(mode === 'price' ? 'market.map.price' : 'market.map.perception')}
            className={`${ui.panel} ${css.mapPanel}`}
          >
            <div className={ui.panelHead} style={{ alignItems: 'center' }}>
              <h2 className={ui.h2}>{t(mode === 'price' ? 'market.map.price' : 'market.map.perception')}</h2>
              <div role="tablist" className={css.segmented}>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'price'}
                  className={css.segBtn}
                  onClick={() => setMode('price')}
                >
                  {t('ui.market.toggle.price')}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'perception'}
                  className={css.segBtn}
                  onClick={() => setMode('perception')}
                >
                  {t('ui.market.toggle.perception')}
                </button>
              </div>
            </div>
            <PositionMap m={m} selected={selected} onSelect={setSelected} mode={mode} />
          </section>
          <section aria-label={t('ui.market.similar')} className={`${ui.panel} ${css.tablePanel}`}>
            <div className={css.tableHead}>
              <h2 className={ui.h2}>{t('ui.market.similar')}</h2>
              <span className={ui.headNote}>
                {t('ui.market.captured', {
                  when: captured?.last_received_at ? formatShortDate(captured.last_received_at) : '',
                })}
              </span>
            </div>
            <div className={css.gridHead} style={{ gridTemplateColumns: cols }}>
              <span>{t('ui.market.col.product')}</span>
              <span>{t('ui.market.col.where')}</span>
              <span className={css.r}>{t('ui.market.col.price')}</span>
              <span className={css.r}>{t('ui.market.col.change')}</span>
              <span className={css.r}>{t('ui.market.col.per10')}</span>
              <span className={css.r}>{t('ui.market.col.rating')}</span>
              <span className={css.r}>{t('ui.market.col.reviews')}</span>
            </div>
            <div className={css.rows}>
              {m.products.map((x) => {
                const ch = x.change_14d_pct;
                const tone = ch === null || Math.abs(ch) < 0.005 ? ui.neutral : ch < 0 ? ui.bad : ui.good;
                return (
                  <button
                    key={x.id}
                    type="button"
                    aria-pressed={x.id === selected}
                    className={css.gridRowBtn}
                    style={{ gridTemplateColumns: cols }}
                    onClick={() => setSelected(x.id)}
                  >
                    <span className={css.nameCell}>
                      <span className={ui.dotSwatch} style={{ background: bubbleColor(x, x.id === selected) }} />
                      {x.label}
                    </span>
                    <span style={{ color: 'var(--ink-2)' }}>{x.platforms}</span>
                    <span className={css.r}>₹{x.price}</span>
                    <span className={`${ui.chip} ${tone} ${css.end}`} style={{ fontSize: 13, fontWeight: 700 }}>
                      {ch === null || Math.abs(ch) < 0.005
                        ? t('ui.no_change')
                        : `${ch < 0 ? '▼' : '▲'} ${formatPct(Math.abs(ch))}`}
                    </span>
                    <span className={css.r}>₹{Math.round(x.per10)}</span>
                    <span className={css.r}>{x.rating.toFixed(1)}</span>
                    <span className={css.r}>{count(x.reviews)}</span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
        <div className={ui.rightCol}>
          <InsightCard
            title={t('ui.means.colon', { name: p.label })}
            badge={p.threat}
            headline={p.headline}
            cells={[
              { label: t('ui.market.cell.per10'), value: `₹${Math.round(p.per10)}` },
              { label: t('ui.market.cell.rating'), value: `${p.rating.toFixed(1)} ★` },
              { label: t('ui.market.cell.says'), value: p.says },
            ]}
          />
          <ActionCards
            suggestions={p.suggestions}
            screen="market"
            forName={p.label}
            footer={
              changes.length ? (
                <div className={css.changeList}>
                  <div className={css.b}>{t('ui.market.changes')}</div>
                  {changes.map((c) => (
                    <div key={c.label} className={css.footRow}>
                      <span>
                        {c.label} · {c.platform}
                      </span>
                      <span style={{ color: c.pct < 0 ? 'var(--bad)' : 'var(--good)', fontWeight: 700 }}>
                        {c.pct < 0 ? '▼' : '▲'}{' '}
                        {t('ui.market.change_on', { pct: formatPct(Math.abs(c.pct)), date: formatShortDate(c.date) })}
                      </span>
                    </div>
                  ))}
                </div>
              ) : undefined
            }
          />
        </div>
      </div>
    </Main>
  );
}
