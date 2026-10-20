import { t, type CopyKey, type Delta, type Kpi, type Snapshot, type Verdict } from '@drishti/shared';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, useNavigate } from 'react-router';
import { useTheme } from '../app/theme';
import { formatDelta } from '../lib/display';
import css from './frame.module.css';

export const SCREENS = [
  { id: 'week', path: '', label: 'nav.week' },
  { id: 'actions', path: 'actions', label: 'nav.actions' },
  { id: 'performance', path: 'performance', label: 'nav.performance' },
  { id: 'impact', path: 'impact', label: 'nav.impact' },
  { id: 'market', path: 'market', label: 'nav.market' },
  { id: 'customers', path: 'customers', label: 'nav.customers' },
  { id: 'voice', path: 'voice', label: 'nav.voice' },
  { id: 'data', path: 'data', label: 'nav.data' },
] as const satisfies readonly { id: string; path: string; label: CopyKey }[];
export type ScreenId = (typeof SCREENS)[number]['id'];

export const screenHref = (base: string, id: ScreenId) => {
  const s = SCREENS.find((x) => x.id === id)!;
  return s.path ? `${base}/${s.path}` : base;
};

/** The lift-eye mark (brand/drishti-mark-on-navy.svg). */
export function Mark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" aria-hidden="true">
      <g transform="translate(0 -6)">
        <path d="M18 108 Q100 26 182 108" fill="none" stroke="#FFFFFF" strokeWidth="20" strokeLinecap="round" />
        <path
          d="M18 108 Q92 168 150 118 L184 80"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="20"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="100" cy="104" r="25" fill="#FF2E2E" />
      </g>
    </svg>
  );
}

export function Wordmark() {
  return (
    <div className={css.wordmark}>
      drishti<span className={css.dot}>.</span>
    </div>
  );
}

function useOutside(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && close();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);
  return ref;
}

/** "g" then 1–8 jumps to a screen (docs/09 §8). Ignored while typing in a field or with a modifier held. */
function useScreenShortcuts(base: string) {
  const navigate = useNavigate();
  useEffect(() => {
    let armedAt = 0;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName))) return;
      if (e.key === 'g') {
        armedAt = Date.now();
        return;
      }
      const n = Number(e.key);
      if (armedAt && Date.now() - armedAt < 1500 && n >= 1 && n <= SCREENS.length) {
        e.preventDefault();
        navigate(screenHref(base, SCREENS[n - 1]!.id));
      }
      armedAt = 0;
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [base, navigate]);
}

function syncedText(snapshot: Snapshot | undefined): { text: string; stale: boolean } {
  if (!snapshot) return { text: t('nav.footer', { when: '…' }), stale: false };
  const at = new Date(snapshot.generated_at);
  const time = at
    .toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })
    .replace(/\s?(AM|PM)$/i, (m) => ` ${m.trim().toLowerCase()}`);
  // The demo world is frozen on the morning after its data: its sync is always "today".
  return { text: t('nav.footer', { when: t('ui.synced.today', { time }) }), stale: false };
}

export function Sidebar({
  base,
  workspaceName,
  demo,
  snapshot,
  note,
  menu,
  footer,
}: {
  base: string;
  workspaceName: string;
  demo: boolean;
  snapshot?: Snapshot;
  /** Line under the workspace name (default: the demo note). */
  note?: string;
  /** Workspace menu items (default: home and setup links). */
  menu?: ReactNode;
  /** Replaces the "Synced" footer (the sandbox shows its Refresh chip). */
  footer?: ReactNode;
}) {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useOutside(open, () => setOpen(false));
  const synced = syncedText(snapshot);
  useScreenShortcuts(base);
  return (
    <nav aria-label={t('ui.nav.label')} className={css.side}>
      {/* The logo goes back to the home page, as on any website. */}
      <Link to="/" className={css.brand}>
        <Mark />
        <div>
          <Wordmark />
          <div className={css.by}>{t('app.by')}</div>
        </div>
        <span className="sr-only"> {t('ui.brand.home')}</span>
      </Link>
      <div className={css.wsWrap} ref={ref}>
        <button
          type="button"
          className={css.ws}
          aria-expanded={open}
          aria-haspopup="menu"
          onClick={() => setOpen((o) => !o)}
        >
          <span className={css.wsName}>{workspaceName} ▾</span>
          {(note ?? (demo ? t('demo.workspace') : '')) && (
            <span className={css.wsNote}>{note ?? t('demo.workspace')}</span>
          )}
        </button>
        {open && (
          <div className={css.menu} role="menu">
            {menu ?? (
              <>
                {demo && <p className={css.menuNote}>{t('ui.workspace.menu.demo_note')}</p>}
                <a role="menuitem" className={css.menuItem} href="/">
                  {t('ui.workspace.menu.home')}
                </a>
                <a role="menuitem" className={css.menuItem} href={SETUP_URL} target="_blank" rel="noreferrer">
                  {t('ui.workspace.menu.setup')}
                </a>
              </>
            )}
            <p className={css.menuNote}>{t('ui.shortcuts.hint')}</p>
          </div>
        )}
      </div>
      {SCREENS.map((s, i) => (
        <NavLink
          key={s.id}
          to={screenHref(base, s.id)}
          aria-keyshortcuts={`g ${i + 1}`}
          end
          className={({ isActive }) => `${css.nav} ${isActive ? css.navActive : ''}`}
        >
          {t(s.label)}
        </NavLink>
      ))}
      <div role="group" aria-label={t('ui.theme.group')} className={css.theme}>
        <button
          type="button"
          aria-pressed={theme === 'light'}
          className={`${css.themeBtn} ${theme === 'light' ? css.themeOn : ''}`}
          onClick={() => setTheme('light')}
        >
          ☀ {t('theme.light')}
        </button>
        <button
          type="button"
          aria-pressed={theme === 'dark'}
          className={`${css.themeBtn} ${theme === 'dark' ? css.themeOn : ''}`}
          onClick={() => setTheme('dark')}
        >
          ☾ {t('theme.dark')}
        </button>
      </div>
      {footer ?? <p className={`${css.footer} ${synced.stale ? css.stale : ''}`}>{synced.text}</p>}
    </nav>
  );
}

/** Setup instructions until the onboarding wizard lands (milestone M4). */
export const SETUP_URL = 'https://github.com/anishBan98/drishti/blob/main/docs/14-SETUP-RUNBOOK.md';
export const GUIDE_URL = 'https://github.com/anishBan98/drishti/blob/main/docs/11-CONNECTORS.md';

export function Header({ title, subtitle, children }: { title: string; subtitle: string; children?: ReactNode }) {
  return (
    <header className={css.header}>
      <div className={css.titles}>
        <h1 className={css.h1}>{title}</h1>
        <span className={css.subtitle}>{subtitle}</span>
      </div>
      <div className={css.tools}>{children}</div>
    </header>
  );
}

const ARROW: Record<Delta['direction'], string> = { up: '▲', down: '▼', flat: '●' };

export function DeltaChip({ delta, suffix }: { delta: Delta; suffix?: string }) {
  const tone = delta.good === null ? 'neutral' : delta.good ? 'good' : 'bad';
  return (
    <span className={`${css.delta} ${css[`tone_${tone}`]}`}>
      {ARROW[delta.direction]} {formatDelta(delta)}
      {suffix ? ` ${suffix}` : ''}
    </span>
  );
}

export function Sparkline({ values, tone, label }: { values: number[]; tone: Kpi['tone']; label: string }) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const y = (v: number) => (max === min ? 12 : 22 - ((v - min) / (max - min)) * 20);
  const pts = values.map((v, i) => `${round1((i / (values.length - 1)) * 100)},${round1(y(v))}`).join(' ');
  const last = values.at(-1) ?? 0;
  const color = tone === 'good' ? '#0CA30C' : tone === 'bad' ? '#D03B3B' : '#A3ABC7';
  return (
    <svg viewBox="0 0 100 24" preserveAspectRatio="none" width="50" height="22" role="img" aria-label={label}>
      <polyline points={pts} fill="none" stroke="#A3ABC7" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      <circle cx="100" cy={round1(y(last))} r="3" fill={color} />
    </svg>
  );
}
const round1 = (v: number) => Math.round(v * 10) / 10;

const VALUE_TONE: Record<string, string> = {
  claimed_roas: 'var(--muted-2)',
  preferred: 'var(--blue-text)',
  problem: 'var(--orange-text)',
};

export function KpiCell({ kpi }: { kpi: Kpi }) {
  const noteAsChip = !kpi.delta && kpi.note;
  return (
    <div className={css.kpi} data-kpi={kpi.id}>
      <div className={css.kpiLabel}>{kpi.label}</div>
      <div className={css.kpiValue} style={VALUE_TONE[kpi.id] ? { color: VALUE_TONE[kpi.id] } : undefined}>
        {kpi.display}
      </div>
      <div className={`${css.kpiFoot} ${kpi.spark ? '' : css.kpiFootLeft}`}>
        {kpi.delta && <DeltaChip delta={kpi.delta} suffix={kpi.delta.good === null ? kpi.note : undefined} />}
        {kpi.delta && kpi.note && kpi.delta.good !== null && <span className={css.note}>{kpi.note}</span>}
        {noteAsChip && <span className={`${css.delta} ${css[`tone_${kpi.tone ?? 'neutral'}`]}`}>{kpi.note}</span>}
        {kpi.spark && kpi.spark.length > 1 && !kpi.note && (
          <Sparkline values={kpi.spark} tone={kpi.tone} label={`${kpi.label}, 8 weeks`} />
        )}
      </div>
    </div>
  );
}

const VERDICT_ARROW: Record<Verdict['tone'], string> = { bad: '▼', good: '▲', warn: '●' };

export function SummaryStrip({ verdict, kpis }: { verdict: Verdict; kpis: Kpi[] }) {
  return (
    <section aria-label={t('ui.summary')} className={css.strip}>
      <div className={`${css.verdict} ${css[`verdict_${verdict.tone}`]}`}>
        <span className={`${css.verdictChip} ${css[`chip_${verdict.tone}`]}`}>
          {VERDICT_ARROW[verdict.tone]} {verdict.chip}
        </span>
        <p className={css.verdictText}>{verdict.text}</p>
      </div>
      {kpis.slice(0, 6).map((k) => (
        <KpiCell key={k.id} kpi={k} />
      ))}
    </section>
  );
}

export function Main({ children }: { children: ReactNode }) {
  return <main className={css.main}>{children}</main>;
}

export function FrameGrid({ children }: { children: ReactNode }) {
  return <div className={css.frame}>{children}</div>;
}
