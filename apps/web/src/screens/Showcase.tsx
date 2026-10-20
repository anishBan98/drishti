import { formatInr, formatPct, t, type CopyKey, type Snapshot } from '@drishti/shared';
import { useEffect, useMemo, useState } from 'react';
import { Icon, type IconName } from '../components/Icon';
import css from './showcase.module.css';

// The home card's rotating banner: one finding per slide, as "before Drishti" against "with Drishti", with the
// demo brand's numbers from the engine's snapshot and a small chart of the difference.

const SLIDE_MS = 5600;
const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

interface Bar {
  label: string;
  value: number;
  /** A second, fainter bar behind the first: what was believed before. */
  ghost?: number;
  text: string;
  tone: 'good' | 'bad' | 'neutral';
}
interface Side {
  stat: string;
  /** Struck through: a belief Drishti replaces, not a fact. */
  strike?: boolean;
  caption: string;
  text: string;
}
interface Slide {
  id: string;
  icon: IconName;
  tag: CopyKey;
  before: Side;
  after: Side;
  chart: CopyKey;
  bars: Bar[];
  /** A marker on the scale, such as break-even. */
  mark?: { at: number; label: string };
}

function slidesFor(s: Snapshot): Slide[] {
  const money = (v: number) => formatInr(v, { compact: true });
  const live = s.impact.channels.filter((c) => c.measured !== false);
  const claimed = live.reduce((a, c) => a + c.claimed, 0);
  const real = live.reduce((a, c) => a + c.real, 0);
  const drivers = [...s.week.bridge.drivers].sort((a, b) => Math.abs(b.value_lakh) - Math.abs(a.value_lakh));
  const change = s.week.bridge.current - s.week.bridge.prior;
  const seen = new Set<string>();
  const prices = [...s.market.price_changes]
    .sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))
    .filter((p) => !seen.has(p.label) && !!seen.add(p.label));
  const biggest = prices[0];
  const segs = [...s.customers.segments].sort((a, b) => b.ltv_cac - a.ltv_cac);
  const best = segs[0];
  const slides: (Slide | null)[] = [
    live.length
      ? {
          id: 'roi',
          icon: 'chart',
          tag: 'home.show.roi.tag',
          before: {
            stat: money(claimed),
            strike: true,
            caption: t('home.show.roi.before.stat'),
            text: t('home.show.roi.before'),
          },
          after: { stat: money(real), caption: t('home.show.roi.after.stat'), text: s.impact.verdict.text },
          chart: 'home.show.roi.chart',
          bars: live.slice(0, 5).map((c) => ({
            label: c.label,
            value: c.real_per100,
            ghost: c.claimed_per100,
            text: `${formatInr(c.claimed_per100)} → ${formatInr(c.real_per100)}`,
            tone: c.real_per100 >= 100 ? 'good' : 'bad',
          })),
          mark: { at: 100, label: t('home.show.break_even') },
        }
      : null,
    drivers.length
      ? {
          id: 'week',
          icon: 'pulse',
          tag: 'home.show.week.tag',
          before: { stat: money(change), caption: t('home.show.week.before.stat'), text: t('home.show.week.before') },
          after: {
            stat: t('home.show.week.after.value', { n: drivers.length }),
            caption: t('home.show.week.after.stat'),
            text: s.week.verdict.text,
          },
          chart: 'home.show.week.chart',
          bars: drivers.slice(0, 5).map((d) => ({
            label: d.label,
            value: Math.abs(d.value_lakh),
            text: money(d.value_lakh * 100_000),
            tone: d.value_lakh < 0 ? 'bad' : 'good',
          })),
        }
      : null,
    biggest
      ? {
          id: 'market',
          icon: 'eye',
          tag: 'home.show.market.tag',
          before: {
            stat: t('home.show.market.before.value'),
            strike: true,
            caption: t('home.show.market.before.stat'),
            text: t('home.show.market.before'),
          },
          after: {
            stat: formatPct(biggest.pct, { signed: true }),
            caption: t('home.show.market.after.stat', { rival: biggest.label, platform: biggest.platform }),
            text: s.market.verdict.text,
          },
          chart: 'home.show.market.chart',
          bars: prices.slice(0, 5).map((p) => ({
            label: `${p.label} · ${p.platform}`,
            value: Math.abs(p.pct),
            text: formatPct(p.pct, { signed: true }),
            tone: p.pct < 0 ? 'bad' : 'neutral',
          })),
        }
      : null,
    best
      ? {
          id: 'customers',
          icon: 'users',
          tag: 'home.show.customers.tag',
          before: {
            stat: t('home.show.customers.before.value'),
            strike: true,
            caption: t('home.show.customers.before.stat'),
            text: t('home.show.customers.before'),
          },
          after: {
            stat: `${best.ltv_cac.toFixed(1)}×`,
            caption: t('home.show.customers.after.stat', { segment: best.name }),
            text: s.customers.verdict.text,
          },
          chart: 'home.show.customers.chart',
          bars: segs.slice(0, 5).map((x) => ({
            label: x.name,
            value: x.ltv_cac,
            text: `${x.ltv_cac.toFixed(1)}×`,
            tone: x.ltv_cac >= 1 ? 'good' : 'bad',
          })),
          mark: { at: 1, label: t('home.show.break_even') },
        }
      : null,
  ];
  return slides.filter((x): x is Slide => !!x);
}

export function Showcase({ s }: { s: Snapshot }) {
  const slides = useMemo(() => slidesFor(s), [s]);
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(reduced);
  const [hover, setHover] = useState(false);
  const running = !paused && !hover && slides.length > 1;
  useEffect(() => {
    if (!running) return;
    const id = setTimeout(() => setI((x) => (x + 1) % slides.length), SLIDE_MS);
    return () => clearTimeout(id);
  }, [running, i, slides.length]);

  const slide = slides[i % slides.length];
  if (!slide) return null;
  const max = Math.max(...slide.bars.map((b) => Math.max(b.value, b.ghost ?? 0)), slide.mark?.at ?? 0) || 1;
  return (
    <div
      className={css.show}
      role="region"
      aria-roledescription="carousel"
      aria-label={t('home.show.label')}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
    >
      <div className={css.head}>
        <span key={slide.id} className={css.tag}>
          <Icon name={slide.icon} size={14} /> {t(slide.tag)}
        </span>
        <div className={css.controls}>
          {slides.map((x, k) => (
            <button
              key={x.id}
              type="button"
              className={`${css.dot} ${k === i ? css.dotOn : ''}`}
              aria-label={t('home.show.goto', { n: k + 1, total: slides.length })}
              aria-current={k === i ? 'true' : undefined}
              onClick={() => setI(k)}
            >
              {k === i && running && <span className={css.dotFill} style={{ animationDuration: `${SLIDE_MS}ms` }} />}
            </button>
          ))}
          <button
            type="button"
            className={css.pause}
            aria-pressed={paused}
            aria-label={paused ? t('home.show.play') : t('home.show.pause')}
            onClick={() => setPaused((p) => !p)}
          >
            <Icon name={paused ? 'play' : 'pause'} size={12} />
          </button>
        </div>
      </div>

      <div key={slide.id} className={css.slide} aria-live={running ? 'off' : 'polite'}>
        <div className={css.compare}>
          <div className={css.before}>
            <span className={css.when}>{t('home.show.before')}</span>
            <strong className={`${css.stat} ${slide.before.strike ? css.strike : ''}`}>{slide.before.stat}</strong>
            <span className={css.caption}>{slide.before.caption}</span>
            <p>{slide.before.text}</p>
          </div>
          <span className={css.arrow} aria-hidden="true">
            <Icon name="arrowRight" size={16} />
          </span>
          <div className={css.after}>
            <span className={css.when}>{t('home.show.after')}</span>
            <strong className={css.stat}>{slide.after.stat}</strong>
            <span className={css.caption}>{slide.after.caption}</span>
            <p>{slide.after.text}</p>
          </div>
        </div>

        <div className={css.chart}>
          <p className={css.chartTitle}>
            {t(slide.chart)}
            {slide.bars.some((b) => b.ghost !== undefined) && (
              <span className={css.legend}>
                <i className={css.keyGhost} /> {t('home.show.claimed')} <i className={css.keyReal} />{' '}
                {t('home.show.real')}
              </span>
            )}
          </p>
          <ul className={css.bars}>
            {slide.bars.map((b, k) => (
              <li key={b.label} className={css.row} style={{ animationDelay: `${120 + k * 90}ms` }}>
                <span className={css.rowLabel}>{b.label}</span>
                <span className={css.track}>
                  {b.ghost !== undefined && (
                    <span className={css.ghost} style={{ width: `${(b.ghost / max) * 100}%` }} />
                  )}
                  <span
                    className={`${css.fill} ${css[b.tone]}`}
                    style={{ width: `${(b.value / max) * 100}%`, animationDelay: `${200 + k * 90}ms` }}
                  />
                  {slide.mark && <span className={css.mark} style={{ left: `${(slide.mark.at / max) * 100}%` }} />}
                </span>
                <span className={`${css.rowValue} ${css[`${b.tone}Text`]}`}>{b.text}</span>
              </li>
            ))}
          </ul>
          {slide.mark && (
            <p className={css.markNote}>
              <span className={css.markKey} /> {slide.mark.label}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
