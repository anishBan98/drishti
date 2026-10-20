import { CHANNEL_LABEL, CHANNELS, formatInr, t, type CopyKey, type Snapshot } from '@drishti/shared';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useSnapshot } from '../app/data';
import { useTheme } from '../app/theme';
import { EyeMark } from '../components/EyeMark';
import { GUIDE_URL, SETUP_URL } from '../components/Frame';
import { buildRounds, levelFor, STREAK_BONUS, XP_PER_ROUND, type GameRound } from '../lib/home-game';
import css from './home.module.css';

// Home (docs/09 §6.0): one screen, no scroll, desktop and phone. What Drishti is, what it does, and a short game
// on the demo brand's real (fictional) numbers. Motion is decorative and stops under prefers-reduced-motion.

const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const ROTATOR: CopyKey[] = ['home.rotator.1', 'home.rotator.2', 'home.rotator.3', 'home.rotator.4'];
const BEST_KEY = 'drishti-best-xp';
const EXTRA_CHANNELS = ['Blinkit', 'Zepto', 'Instamart', 'Meta', 'Google', 'Shopify', 'Creators'];

function useCountUp(target: number, ms = 1400) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!target) return;
    if (reduced()) {
      setV(target);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / ms);
      setV(target * (1 - (1 - p) ** 3));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

function Rotator() {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (reduced()) return;
    const id = setInterval(() => setI((x) => (x + 1) % ROTATOR.length), 2800);
    return () => clearInterval(id);
  }, []);
  return (
    <p className={css.rotator} aria-live="off">
      <span className={css.rotPrefix}>{t('home.rotator.prefix')}</span>{' '}
      <span key={i} className={css.rotWord}>
        {t(ROTATOR[i]!)}
      </span>
    </p>
  );
}

function ClaimBars({ s }: { s: Snapshot | undefined }) {
  const claimed = s ? s.impact.channels.reduce((a, c) => a + c.claimed, 0) : 0;
  const sold = s ? s.performance.channels.reduce((a, c) => a + c.revenue, 0) : 0;
  const c = useCountUp(claimed);
  const v = useCountUp(sold);
  const max = Math.max(claimed, sold) || 1;
  return (
    <div
      className={css.claims}
      role="img"
      aria-label={`${t('home.claim.claimed')} ${formatInr(claimed, { compact: true })}; ${t('home.claim.sold')} ${formatInr(sold, { compact: true })}`}
    >
      <div className={css.claimRow}>
        <span className={css.claimLabel}>{t('home.claim.claimed')}</span>
        <div className={css.claimTrack}>
          <div className={`${css.claimBar} ${css.claimBarRed}`} style={{ width: `${(c / max) * 100}%` }} />
        </div>
        <span className={css.claimValue}>{formatInr(c, { compact: true })}</span>
      </div>
      <div className={css.claimRow}>
        <span className={css.claimLabel}>{t('home.claim.sold')}</span>
        <div className={css.claimTrack}>
          <div className={`${css.claimBar} ${css.claimBarBlue}`} style={{ width: `${(v / max) * 100}%` }} />
        </div>
        <span className={css.claimValue}>{formatInr(v, { compact: true })}</span>
      </div>
      <p className={css.claimNote}>
        {t('home.claim.note')} <span className={css.claimDemo}>{t('home.claim.demo')}</span>
      </p>
    </div>
  );
}

function Confetti({ burst }: { burst: number }) {
  if (!burst || reduced()) return null;
  const colors = ['#FF2E2E', '#5FE39A', '#8FA6FF', '#F2B544', '#FFFFFF'];
  return (
    <span key={burst} className={css.confetti} aria-hidden="true">
      {Array.from({ length: 22 }, (_, i) => {
        const a = (i / 22) * Math.PI * 2;
        const r = 70 + ((i * 37) % 60);
        return (
          <i
            key={i}
            style={
              {
                '--dx': `${Math.cos(a) * r}px`,
                '--dy': `${Math.sin(a) * r - 30}px`,
                '--rot': `${(i * 47) % 360}deg`,
                background: colors[i % colors.length],
              } as React.CSSProperties
            }
          />
        );
      })}
    </span>
  );
}

function readBest(): number {
  try {
    return Number(localStorage.getItem(BEST_KEY) ?? 0) || 0;
  } catch {
    return 0;
  }
}

function Game({ s }: { s: Snapshot | undefined }) {
  const rounds = useMemo<GameRound[]>(() => (s ? buildRounds(s) : []), [s]);
  const [phase, setPhase] = useState<'intro' | 'play' | 'done'>('intro');
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [right, setRight] = useState(0);
  const [earned, setEarned] = useState<string[]>([]);
  const [burst, setBurst] = useState(0);
  const [bonus, setBonus] = useState(0);
  const [best, setBest] = useState(readBest);
  const round = rounds[i];
  const level = levelFor(xp);
  const max = rounds.length * XP_PER_ROUND + Math.max(0, rounds.length - 1) * STREAK_BONUS;

  const answer = (k: number) => {
    if (picked !== null || !round) return;
    setPicked(k);
    if (round.options[k]?.correct) {
      const b = streak >= 1 ? STREAK_BONUS : 0;
      setBonus(b);
      setXp((x) => x + XP_PER_ROUND + b);
      setStreak((x) => x + 1);
      setRight((x) => x + 1);
      setEarned((e) => [...e, round.id]);
      setBurst((x) => x + 1);
    } else {
      setStreak(0);
      setBonus(0);
    }
  };
  const next = () => {
    if (i + 1 < rounds.length) {
      setI(i + 1);
      setPicked(null);
      return;
    }
    setPhase('done');
    if (xp > best) {
      setBest(xp);
      try {
        localStorage.setItem(BEST_KEY, String(xp));
      } catch {
        /* storage unavailable */
      }
    }
  };
  const restart = () => {
    setPhase('play');
    setI(0);
    setPicked(null);
    setXp(0);
    setStreak(0);
    setRight(0);
    setEarned([]);
  };

  return (
    <section className={css.game} aria-label={t('home.game.title')}>
      <div className={css.gameHead}>
        <h2 className={css.gameTitle}>{t('home.game.title')}</h2>
        <div className={css.gameStats}>
          <span className={css.xp} aria-label={t('home.game.xp', { xp })}>
            ⚡ {t('home.game.xp', { xp })}
          </span>
          <span key={level.key} className={css.level}>
            {t(level.key)}
          </span>
        </div>
      </div>
      <div className={css.progress} aria-hidden="true">
        {rounds.map((r, k) => (
          <span
            key={r.id}
            className={`${css.pip} ${k < i || phase === 'done' ? css.pipDone : k === i && phase === 'play' ? css.pipNow : ''}`}
          >
            <span>{r.skill}</span>
          </span>
        ))}
      </div>
      <div className={css.xpTrack} aria-hidden="true">
        <div className={css.xpFill} style={{ width: `${max ? (xp / max) * 100 : 0}%` }} />
      </div>

      {phase === 'intro' && (
        <div className={css.card} key="intro">
          <p className={css.gameSub}>{t('home.game.sub')}</p>
          <Badges rounds={rounds} earned={earned} />
          <button type="button" className={css.play} disabled={!rounds.length} onClick={() => setPhase('play')}>
            {rounds.length ? `▶ ${t('home.game.start')}` : t('home.game.loading')}
          </button>
          {best > 0 && <p className={css.best}>{t('home.game.best', { xp: best })}</p>}
        </div>
      )}

      {phase === 'play' && round && (
        <div className={`${css.card} ${picked !== null ? css.answered : ''}`} key={round.id}>
          <span className={css.skill}>
            {t('home.game.round', { n: i + 1, total: rounds.length })} · {round.skill}
          </span>
          <p className={css.prompt}>{round.prompt}</p>
          <div className={css.options}>
            {round.options.map((o, k) => {
              const state = picked === null ? '' : o.correct ? css.optRight : k === picked ? css.optWrong : css.optDim;
              return (
                <button
                  key={o.label}
                  type="button"
                  className={`${css.option} ${state}`}
                  style={{ animationDelay: `${k * 70}ms` }}
                  disabled={picked !== null}
                  aria-pressed={picked === k}
                  onClick={() => answer(k)}
                >
                  {o.label}
                  {picked !== null && o.correct && <span aria-hidden="true"> ✓</span>}
                  {picked === k && o.correct && <Confetti burst={burst} />}
                </button>
              );
            })}
          </div>
          <div role="status" aria-live="polite" className={css.feedbackWrap}>
            {picked !== null && (
              <div className={css.feedback}>
                <strong className={round.options[picked]?.correct ? css.good : css.bad}>
                  {round.options[picked]?.correct ? t('home.game.correct', { xp: XP_PER_ROUND }) : t('home.game.wrong')}
                  {round.options[picked]?.correct && bonus > 0 ? ` · ${t('home.game.streak', { xp: bonus })}` : ''}
                </strong>
                <span>{round.reveal}</span>
                <div className={css.feedbackActions}>
                  <button type="button" className={css.next} onClick={next}>
                    {i + 1 < rounds.length ? t('home.game.next') : t('home.game.finish')} →
                  </button>
                  <Link to={round.path} className={css.see}>
                    {t('home.game.see')}
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {phase === 'done' && (
        <div className={css.card} key="done">
          <ScoreRing value={right} total={rounds.length} />
          <p className={css.doneTitle}>{t('home.game.done.title', { score: right, total: rounds.length })}</p>
          <p className={`${css.gameSub} ${css.doneBody}`}>{t('home.game.done.body')}</p>
          <Badges rounds={rounds} earned={earned} />
          <div className={css.feedbackActions}>
            <Link to="/demo" className={css.next}>
              {t('home.cta.demo')} →
            </Link>
            <button type="button" className={css.see} onClick={restart}>
              ↻ {t('home.game.again')}
            </button>
          </div>
          <p className={css.best}>{t('home.game.best', { xp: Math.max(best, xp) })}</p>
        </div>
      )}
    </section>
  );
}

const GLYPH: Record<GameRound['id'], string> = { impact: '₹', week: '⇅', customers: '◕', market: '◎' };

/** One badge per skill; earned badges light up (gamification, docs/09 §6.0). */
function Badges({ rounds, earned }: { rounds: GameRound[]; earned: string[] }) {
  return (
    <ul className={css.badges} aria-label={t('home.game.badges')}>
      {rounds.map((r, k) => {
        const on = earned.includes(r.id);
        return (
          <li key={r.id} className={`${css.badge} ${on ? css.badgeOn : ''}`} style={{ animationDelay: `${k * 90}ms` }}>
            <span className={css.badgeGlyph} aria-hidden="true">
              {GLYPH[r.id]}
            </span>
            <span>{r.skill}</span>
            <span className={css.badgeState}>{on ? t('home.game.badge.on') : t('home.game.badge.off')}</span>
          </li>
        );
      })}
    </ul>
  );
}

function ScoreRing({ value, total }: { value: number; total: number }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  return (
    <svg width="112" height="112" viewBox="0 0 112 112" className={css.ring} aria-hidden="true">
      <circle cx="56" cy="56" r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="10" />
      <circle
        cx="56"
        cy="56"
        r={r}
        fill="none"
        stroke="#5FE39A"
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - (total ? value / total : 0))}
        className={css.ringFill}
        transform="rotate(-90 56 56)"
      />
      <text x="56" y="64" textAnchor="middle" fontSize="26" fontWeight="800" fill="#fff">
        {value}/{total}
      </text>
    </svg>
  );
}

export function Home() {
  const { theme, setTheme } = useTheme();
  const { data } = useSnapshot();
  const ref = useRef<HTMLDivElement>(null);
  const [title1, title2] = t('home.title').split(t('home.title.emphasis'));
  const channels = [...CHANNELS.map((c) => CHANNEL_LABEL[c]), ...EXTRA_CHANNELS];
  return (
    <div className="dr-root" data-theme={theme}>
      <div className={css.home} ref={ref}>
        <div className={css.aurora} aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <header className={css.top}>
          <div className={css.brand}>
            <EyeMark size={44} />
            <div>
              <div className={css.wordmark}>
                drishti<span className={css.dot}>.</span>
              </div>
              <div className={css.by}>{t('home.by')}</div>
            </div>
          </div>
          <div className={css.topRight}>
            <div className={css.theme} role="group" aria-label={t('ui.theme.group')}>
              <button type="button" aria-pressed={theme === 'light'} onClick={() => setTheme('light')}>
                ☀<span className={css.hideSm}> {t('theme.light')}</span>
              </button>
              <button type="button" aria-pressed={theme === 'dark'} onClick={() => setTheme('dark')}>
                ☾<span className={css.hideSm}> {t('theme.dark')}</span>
              </button>
            </div>
            <Link to="/demo" className={`${css.primary} ${css.hideSm}`}>
              {t('home.cta.demo')}
            </Link>
          </div>
        </header>
        <main className={css.main}>
          <section className={css.hero} aria-label={t('app.name')}>
            <p className={css.eyebrow}>{t('home.eyebrow')}</p>
            <h1 className={css.title}>
              {title2 === undefined ? (
                t('home.title')
              ) : (
                <>
                  {title1}
                  <span className={css.really}>{t('home.title.emphasis')}</span>
                  {title2}
                </>
              )}
            </h1>
            <Rotator />
            <p className={css.lead}>{t('home.lead')}</p>
            <ClaimBars s={data} />
            <div className={css.ctas}>
              <Link to="/demo" className={css.primary}>
                {t('home.cta.demo')} →
              </Link>
              <a href={SETUP_URL} target="_blank" rel="noreferrer" className={css.secondary}>
                {t('home.cta.setup')}
              </a>
            </div>
            <div className={css.links}>
              <a href="/samples/Drishti-Workspace-Template.xlsx" download>
                ⬇ {t('home.sample')}
              </a>
              <a href={GUIDE_URL} target="_blank" rel="noreferrer">
                {t('home.guide')}
              </a>
            </div>
            <p className={css.mobileNote}>{t('home.mobile_note')}</p>
          </section>
          <Game s={data} />
        </main>
        <footer className={css.foot}>
          <ol className={css.steps} aria-label={t('home.how.title')}>
            {(['1', '2', '3'] as const).map((n) => (
              <li key={n} className={css.step}>
                <span className={css.stepNum}>{n}</span>
                <span>
                  <strong>{t(`home.how.${n}`)}</strong>
                  <span className={css.stepDetail}>{t(`home.how.${n}.detail`)}</span>
                </span>
              </li>
            ))}
          </ol>
          <p className="sr-only">{`${t('home.channels')} ${channels.join(', ')}`}</p>
          <div className={css.marquee}>
            <div className={css.marqueeTrack} aria-hidden="true">
              {[...channels, ...channels].map((c, k) => (
                <span key={`${c}-${k}`} className={css.chip}>
                  {c}
                </span>
              ))}
            </div>
          </div>
          <p className={css.free}>{t('home.free')}</p>
        </footer>
      </div>
    </div>
  );
}
