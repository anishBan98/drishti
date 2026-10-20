import { t } from '@drishti/shared';
import { Link } from 'react-router';
import { useTheme } from '../app/theme';
import { GUIDE_URL, Mark, SETUP_URL } from '../components/Frame';
import css from './home.module.css';

// Home (docs/09 §6.0): what Drishti is, the three questions, how it works, and three ways in. No login.
const QUESTIONS = [
  ['home.q1.title', 'home.q1.body'],
  ['home.q2.title', 'home.q2.body'],
  ['home.q3.title', 'home.q3.body'],
] as const;
const STEPS = ['home.how.1', 'home.how.2', 'home.how.3'] as const;
const SHOTS = [
  { file: '01-this-week', label: 'nav.week', path: '/demo' },
  { file: '04-impact-roi', label: 'nav.impact', path: '/demo/impact' },
  { file: '05-market', label: 'nav.market', path: '/demo/market' },
  { file: '02-actions', label: 'nav.actions', path: '/demo/actions' },
] as const;

export function Home() {
  const { theme, setTheme } = useTheme();
  return (
    <div className={css.home}>
      <section className={css.left} aria-label={t('app.name')}>
        <div className={css.brand}>
          <Mark size={56} />
          <div>
            <div className={css.wordmark}>
              drishti<span className={css.dot}>.</span>
            </div>
            <div className={css.by}>{t('home.by')}</div>
          </div>
        </div>
        <h1 className={css.title}>{t('home.title')}</h1>
        <p className={css.lead}>{t('home.lead')}</p>
        <ul className={css.questions}>
          {QUESTIONS.map(([q, a]) => (
            <li key={q}>
              <strong>{t(q)}</strong>
              <span>{t(a)}</span>
            </li>
          ))}
        </ul>
        <div className={css.theme} role="group" aria-label={t('ui.theme.group')}>
          <button type="button" aria-pressed={theme === 'light'} onClick={() => setTheme('light')}>
            ☀ {t('theme.light')}
          </button>
          <button type="button" aria-pressed={theme === 'dark'} onClick={() => setTheme('dark')}>
            ☾ {t('theme.dark')}
          </button>
        </div>
      </section>
      <section className={css.right} aria-label={t('home.how.title')}>
        <h2 className={css.h2}>{t('home.how.title')}</h2>
        <ol className={css.steps}>
          {STEPS.map((s, i) => (
            <li key={s}>
              <span className={css.num}>{i + 1}</span>
              {t(s)}
            </li>
          ))}
        </ol>
        <div className={css.ctas}>
          <Link to="/demo" className={css.primary}>
            {t('home.cta.demo')}
          </Link>
          <a href={SETUP_URL} target="_blank" rel="noreferrer" className={css.secondary}>
            {t('home.cta.setup')}
          </a>
        </div>
        <div className={css.links}>
          <a href="/samples/Drishti-Workspace-Template.xlsx" download>
            {t('home.sample')}
          </a>
          <a href={GUIDE_URL} target="_blank" rel="noreferrer">
            {t('home.guide')}
          </a>
        </div>
        <h2 className={css.h3}>{t('home.screens')}</h2>
        <div className={css.shots}>
          {SHOTS.map((s) => (
            <Link key={s.file} to={s.path} className={css.shot}>
              <img src={`/screens/${s.file}-${theme}.png`} alt={t(s.label)} width={1440} height={900} loading="lazy" />
              <span>{t(s.label)}</span>
            </Link>
          ))}
        </div>
        <p className={css.free}>{t('home.free')}</p>
      </section>
    </div>
  );
}
