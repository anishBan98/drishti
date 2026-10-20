import { formatShortDate, t, type CopyKey } from '@drishti/shared';
import { useEffect, useRef, useState, type DragEvent, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router';
import { useTheme } from '../app/theme';
import { EyeMark } from '../components/EyeMark';
import { GUIDE_URL, SCREENS, screenHref } from '../components/Frame';
import ui from '../components/ui.module.css';
import {
  addFiles,
  addLink,
  createCompany,
  deleteCompany,
  hasLinks,
  isSheetLink,
  refreshLinks,
  removeSource,
  renameCompany,
  SandboxError,
  useCompanies,
} from '../sandbox/companies';
import { coverageFor } from '../sandbox/coverage';
import type { Company } from '../sandbox/protocol';
import css from '../sandbox/try.module.css';
import { ago, sizeLabel } from '../sandbox/time';

// Sandbox pages (docs/09 §6.12): your companies, and one company's data (link sheets, drop files, what was found,
// which screens are ready). One fluid page, not the 1440 × 900 stage, so it works on phones too.

const errorText = (e: unknown) =>
  t(`error.${e instanceof SandboxError ? e.code : 'INTERNAL'}` as CopyKey, { request_id: 'sandbox' });

function TopBar() {
  const { theme, setTheme } = useTheme();
  return (
    <header className={css.top}>
      <Link to="/" className={css.brand}>
        <EyeMark size={36} />
        <span className={css.wordmark}>
          drishti<span className={css.dot}>.</span>
        </span>
        <span className="sr-only"> {t('ui.brand.home')}</span>
      </Link>
      <div className={css.topRight}>
        <div className={css.theme} role="group" aria-label={t('ui.theme.group')}>
          <button
            type="button"
            aria-pressed={theme === 'light'}
            aria-label={t('theme.light')}
            onClick={() => setTheme('light')}
          >
            ☀
          </button>
          <button
            type="button"
            aria-pressed={theme === 'dark'}
            aria-label={t('theme.dark')}
            onClick={() => setTheme('dark')}
          >
            ☾
          </button>
        </div>
        <Link to="/demo" className={css.ghost}>
          {t('home.cta.demo')}
        </Link>
      </div>
    </header>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <div className="dr-root" data-theme={theme}>
      <div className={css.page}>
        <TopBar />
        <main className={css.main}>{children}</main>
      </div>
    </div>
  );
}

const sourcesLabel = (n: number) => (n === 1 ? t('try.company.source') : t('try.company.sources', { n }));

function CompanyCard({ c }: { c: Company }) {
  const [confirm, setConfirm] = useState(false);
  const through = c.snapshot?.data_through;
  return (
    <li className={css.card}>
      <div className={css.cardHead}>
        <h3 className={css.cardTitle}>{c.name}</h3>
        {hasLinks(c) && <span className={css.pill}>{t('try.source.link')}</span>}
      </div>
      <p className={css.meta}>
        {through && c.sources.length
          ? t('try.company.meta', { sources: sourcesLabel(c.sources.length), date: formatShortDate(through) })
          : t('try.company.meta_empty')}
      </p>
      <p className={css.metaSoft}>{t('try.updated', { when: ago(c.updatedAt) })}</p>
      <div className={css.row}>
        {c.snapshot ? (
          <Link className={ui.btnPrimary} to={`/try/${c.id}`}>
            {t('try.open')}
          </Link>
        ) : null}
        <Link className={ui.btnSecondary} to={`/try/${c.id}/manage`}>
          {t('try.manage')}
        </Link>
        {confirm ? (
          <span className={css.confirm} role="group" aria-label={t('try.delete.confirm', { name: c.name })}>
            <span className={css.confirmText}>{t('try.delete.confirm', { name: c.name })}</span>
            <button type="button" className={css.danger} onClick={() => void deleteCompany(c.id)}>
              {t('try.delete')}
            </button>
            <button type="button" className={ui.linkBtn} onClick={() => setConfirm(false)}>
              {t('action.cancel')}
            </button>
          </span>
        ) : (
          <button type="button" className={ui.linkBtn} onClick={() => setConfirm(true)}>
            {t('try.delete')}
          </button>
        )}
      </div>
    </li>
  );
}

/** /try: your companies, and adding one. */
export function TryHome() {
  const { companies, ready } = useCompanies();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const create = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const c = await createCompany(name);
    navigate(`/try/${c.id}/manage`);
  };
  return (
    <Shell>
      <section className={css.hero}>
        <span className={css.chip}>🔒 {t('try.chip')}</span>
        <h1 className={css.h1}>{t('try.title')}</h1>
        <p className={css.lead}>{t('try.lead')}</p>
      </section>
      <section aria-labelledby="companies" className={css.section}>
        <h2 id="companies" className={css.h2}>
          {t('try.companies')}
        </h2>
        <ul className={css.grid}>
          {companies.map((c) => (
            <CompanyCard key={c.id} c={c} />
          ))}
          <li className={`${css.card} ${css.addCard}`}>
            <form onSubmit={create} className={css.addForm}>
              <h3 className={css.cardTitle}>{t('try.add_company')}</h3>
              <label className={css.label}>
                {t('try.name.label')}
                <input
                  className={css.input}
                  value={name}
                  maxLength={60}
                  placeholder={t('try.name.placeholder')}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <button type="submit" className={ui.btnPrimary} disabled={busy}>
                {t('try.create')}
              </button>
            </form>
          </li>
        </ul>
        {ready && companies.length === 0 && <p className={css.metaSoft}>{t('try.companies.empty')}</p>}
      </section>
      <p className={css.links}>
        <a href="/samples/Drishti-Workspace-Template.xlsx" download>
          ⬇ {t('try.template')}
        </a>
        <a href={GUIDE_URL} target="_blank" rel="noreferrer">
          {t('try.guide')}
        </a>
      </p>
    </Shell>
  );
}

function LinkSheet({ c, onError, onDone }: { c: Company; onError: (m: string) => void; onDone: () => void }) {
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isSheetLink(url)) return onError(t('error.SHEET_LINK_INVALID'));
    setBusy(true);
    try {
      await addLink(c.id, url);
      setUrl('');
      onDone();
    } catch (err) {
      onError(errorText(err));
    }
    setBusy(false);
  };
  return (
    <section className={css.panel} aria-labelledby="link-title">
      <div className={css.panelHead}>
        <span className={css.icon} aria-hidden="true">
          🔗
        </span>
        <h2 id="link-title" className={css.h3}>
          {t('try.link.title')}
        </h2>
      </div>
      <p className={css.help}>{t('try.link.help')}</p>
      <form onSubmit={submit} className={css.linkForm}>
        <label className="sr-only" htmlFor="sheet-url">
          {t('try.link.label')}
        </label>
        <input
          id="sheet-url"
          className={css.input}
          type="url"
          inputMode="url"
          autoComplete="off"
          placeholder={t('try.link.placeholder')}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button type="submit" className={ui.btnPrimary} disabled={busy || !url.trim()} aria-busy={busy}>
          {busy ? t('try.link.fetching') : t('try.link.add')}
        </button>
      </form>
    </section>
  );
}

function DropFiles({ c, onError, onDone }: { c: Company; onError: (m: string) => void; onDone: () => void }) {
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const take = async (files: File[]) => {
    if (!files.length) return;
    setBusy(true);
    try {
      await addFiles(c.id, files);
      onDone();
    } catch (err) {
      onError(errorText(err));
    }
    setBusy(false);
  };
  const drop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    void take([...e.dataTransfer.files]);
  };
  return (
    <section className={css.panel} aria-labelledby="drop-title">
      <div className={css.panelHead}>
        <span className={css.icon} aria-hidden="true">
          ⬆
        </span>
        <h2 id="drop-title" className={css.h3}>
          {t('try.drop.title')}
        </h2>
      </div>
      <p className={css.help}>{t('try.drop.help')}</p>
      <div
        className={`${css.dropzone} ${over ? css.dropOver : ''}`}
        data-testid="dropzone"
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={drop}
        aria-busy={busy}
      >
        {busy ? (
          <span role="status">
            <span className={ui.spinner} aria-hidden="true" /> {t('try.drop.reading')}
          </span>
        ) : (
          <>
            <span className={css.dropText}>{t('try.drop.zone')}</span>
            <span className={css.metaSoft}>{t('try.drop.or')}</span>
            <button type="button" className={ui.btnSecondary} onClick={() => input.current?.click()}>
              {t('try.drop.choose')}
            </button>
          </>
        )}
        <input
          ref={input}
          type="file"
          multiple
          accept=".csv,.xlsx,.zip"
          className="sr-only"
          tabIndex={-1}
          aria-label={t('try.drop.choose')}
          onChange={(e) => {
            void take([...(e.target.files ?? [])]);
            e.target.value = '';
          }}
        />
      </div>
    </section>
  );
}

function Sources({ c, onError }: { c: Company; onError: (m: string) => void }) {
  const [busy, setBusy] = useState(false);
  const refresh = async () => {
    setBusy(true);
    const next = await refreshLinks(c.id).catch((e) => {
      onError(errorText(e));
      return undefined;
    });
    const failed = next?.sources.find((s) => s.error);
    if (failed?.error) onError(t(`error.${failed.error}` as CopyKey));
    setBusy(false);
  };
  return (
    <section className={css.panel} aria-labelledby="sources-title">
      <div className={css.panelHead}>
        <h2 id="sources-title" className={css.h3}>
          {t('try.sources.title')}
        </h2>
        {hasLinks(c) && (
          <button type="button" className={ui.btnSecondary} onClick={refresh} disabled={busy} aria-busy={busy}>
            {busy ? t('try.refreshing') : `↻ ${t('try.refresh_all')}`}
          </button>
        )}
      </div>
      {c.sources.length === 0 ? (
        <p className={css.metaSoft}>{t('try.sources.empty')}</p>
      ) : (
        <ul className={css.list}>
          {c.sources.map((s) => (
            <li key={s.id} className={css.item}>
              <span className={css.kind}>{s.kind === 'link' ? '🔗' : '📄'}</span>
              <span className={css.itemBody}>
                <span className={css.itemName}>{s.name}</span>
                <span className={css.metaSoft}>
                  {s.kind === 'link'
                    ? t('try.source.fetched', { when: ago(s.fetchedAt) })
                    : t('try.source.added', { size: sizeLabel(s.size), when: ago(s.addedAt) })}
                </span>
                {s.error && <span className={css.err}>{t(`error.${s.error}` as CopyKey)}</span>}
              </span>
              <button
                type="button"
                className={ui.linkBtn}
                aria-label={t('try.remove.label', { name: s.name })}
                onClick={() => void removeSource(c.id, s.id)}
              >
                {t('try.remove')}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Found({ c }: { c: Company }) {
  const tables = c.tables ?? [];
  if (!tables.length) return null;
  return (
    <section className={css.panel} aria-labelledby="found-title">
      <h2 id="found-title" className={css.h3}>
        {t('try.found.title')}
      </h2>
      <ul className={css.list}>
        {tables.map((tb, i) => (
          <li key={`${tb.name}-${i}`} className={css.item}>
            <span className={`${css.dotState} ${tb.kind === 'unknown' ? css.dotWarn : css.dotOk}`} aria-hidden="true" />
            <span className={css.itemBody}>
              <span className={css.itemName}>{tb.name}</span>
              <span className={css.metaSoft}>
                {tb.kind === 'source'
                  ? [
                      tb.label,
                      t('try.found.rows', { rows: tb.rows.toLocaleString('en-IN') }),
                      tb.from && tb.to
                        ? t('try.found.range', { from: formatShortDate(tb.from), to: formatShortDate(tb.to) })
                        : '',
                      tb.skipped ? t('try.found.skipped', { n: tb.skipped }) : '',
                    ]
                      .filter(Boolean)
                      .join(' · ')
                  : tb.kind === 'tab'
                    ? t('try.found.tab', { tab: tb.source ?? '' })
                    : t('try.found.unknown', { headers: tb.headers.join(', ') })}
              </span>
            </span>
          </li>
        ))}
      </ul>
      {c.warnings && c.warnings.length > 0 && (
        <div className={css.notes}>
          <strong>{t('try.notes')}</strong>
          <ul>
            {c.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function Ready({ c }: { c: Company }) {
  const cover = coverageFor(c.tables);
  return (
    <section className={`${css.panel} ${css.readyPanel}`} aria-labelledby="ready-title">
      <h2 id="ready-title" className={css.h3}>
        {t('try.coverage.title')}
      </h2>
      <ul className={css.checks}>
        {cover.map((x) => {
          const s = SCREENS.find((y) => y.id === x.screen)!;
          return (
            <li key={x.screen} className={x.ok ? css.checkOk : css.checkNo}>
              <span aria-hidden="true">{x.ok ? '✓' : '○'}</span>
              <span>
                <strong>{t(s.label)}</strong>
                {!x.ok && <span className={css.metaSoft}> {t(x.need)}</span>}
              </span>
            </li>
          );
        })}
      </ul>
      {c.snapshot && c.sources.length > 0 ? (
        <Link className={`${ui.btnPrimary} ${css.show}`} to={screenHref(`/try/${c.id}`, 'week')}>
          {t('try.show')} →
        </Link>
      ) : (
        <button type="button" className={`${ui.btnPrimary} ${css.show}`} disabled>
          {t('try.show')} →
        </button>
      )}
    </section>
  );
}

/** /try/:id/manage: link sheets, drop files, see what was found and which screens are ready. */
export function TryManage() {
  const { id = '' } = useParams();
  const { companies, ready } = useCompanies();
  const c = companies.find((x) => x.id === id);
  const [message, setMessage] = useState('');
  const [name, setName] = useState(c?.name ?? '');
  useEffect(() => setName(c?.name ?? ''), [c?.name]);
  if (!ready) return <Shell>{null}</Shell>;
  if (!c) return <Navigate to="/try" replace />;
  return (
    <Shell>
      <nav className={css.crumbs} aria-label={t('try.back')}>
        <Link to="/try">← {t('try.back')}</Link>
      </nav>
      <div className={css.titleRow}>
        <label className="sr-only" htmlFor="company-name">
          {t('try.name.label')}
        </label>
        <input
          id="company-name"
          className={css.nameInput}
          value={name}
          maxLength={60}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => name !== c.name && void renameCompany(c.id, name)}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        />
        <span className={css.chip}>🔒 {t('try.chip')}</span>
      </div>
      <div role="alert" className={message ? css.alert : 'sr-only'}>
        {message}
        {message && (
          <button type="button" className={ui.linkBtn} onClick={() => setMessage('')}>
            ✕
          </button>
        )}
      </div>
      {c.buildError && <p className={css.alert}>{t('try.build_error', { error: c.buildError })}</p>}
      <div className={css.columns}>
        <div className={css.col}>
          <LinkSheet c={c} onError={setMessage} onDone={() => setMessage('')} />
          <DropFiles c={c} onError={setMessage} onDone={() => setMessage('')} />
          <Sources c={c} onError={setMessage} />
        </div>
        <div className={css.col}>
          <Ready c={c} />
          <Found c={c} />
        </div>
      </div>
    </Shell>
  );
}
