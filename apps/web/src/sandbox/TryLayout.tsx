import { t, type Snapshot } from '@drishti/shared';
import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, Outlet, useLocation, useParams } from 'react-router';
import { Stage } from '../app/stage';
import { useTheme } from '../app/theme';
import { WorkspaceProvider } from '../app/workspace';
import { FrameGrid, Header, Main, SCREENS, Sidebar } from '../components/Frame';
import { ToastProvider, useToast } from '../components/Toast';
import frame from '../components/frame.module.css';
import ui from '../components/ui.module.css';
import { seedActions } from '../lib/demo-actions';
import { getCompany, hasLinks, refreshLinks, useCompanies } from './companies';
import { coverageFor } from './coverage';
import type { Company } from './protocol';
import css from './try.module.css';
import { ago } from './time';
import { Icon } from '../components/Icon';

// A sandbox company's eight screens (docs/09 §6.12): the demo frame on the company's own snapshot. Opening it
// refreshes linked sheets; the sidebar chip refreshes on demand.

const DEFAULT_USERS = [{ email: 'you@example.com', role: 'Owner', name: 'You' }];
const AUTO_REFRESH_MS = 60_000;

function RefreshChip({ company }: { company: Company }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const linked = hasLinks(company);
  const fetched = company.sources
    .filter((s) => s.kind === 'link' && s.fetchedAt)
    .map((s) => s.fetchedAt!)
    .sort()
    .at(0);
  const refresh = async () => {
    setBusy(true);
    const before = company.snapshot?.version;
    const next = await refreshLinks(company.id).catch(() => undefined);
    setBusy(false);
    const failed = next?.sources.find((s) => s.error);
    if (failed?.error) toast(t(`error.${failed.error}` as Parameters<typeof t>[0]));
    else if (next?.snapshot?.version !== before) toast(t('try.updated_now'));
  };
  return (
    <div className={css.sideFoot}>
      <span className={css.sideChip}>{t('try.chip')}</span>
      <p className={frame.footer}>
        {linked
          ? t('try.footer.fetched', { when: ago(fetched) })
          : t('try.footer.files', { when: ago(company.updatedAt) })}
      </p>
      {linked && (
        <button type="button" className={css.sideRefresh} onClick={refresh} disabled={busy} aria-busy={busy}>
          <Icon name="refresh" /> {busy ? t('try.refreshing') : t('try.refresh')}
        </button>
      )}
    </div>
  );
}

/** A screen whose data has not been added shows what to add instead of zeros. */
function CoverageGate({ company, snapshot }: { company: Company; snapshot: Snapshot }) {
  const { pathname } = useLocation();
  const base = `/try/${company.id}`;
  const path = pathname.slice(base.length).replace(/^\//, '');
  const screen = SCREENS.find((s) => s.path === path) ?? SCREENS[0];
  const cover = coverageFor(company.tables).find((c) => c.screen === screen.id);
  if (cover && !cover.ok)
    return (
      <Main>
        <Header title={t(screen.label)} subtitle={company.name} />
        <div className={css.gate}>
          <p className={css.gateTitle}>{t('try.empty.title')}</p>
          <p className={ui.empty}>{t(cover.need)}</p>
          <Link className={ui.btnPrimary} to={`${base}/manage`}>
            {t('try.empty.action')}
          </Link>
        </div>
      </Main>
    );
  return <Outlet context={snapshot} />;
}

export function TryLayout() {
  const { id = '' } = useParams();
  const { companies, ready } = useCompanies();
  const company = companies.find((c) => c.id === id);
  const refreshed = useRef<string | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    seedActions([], `try:${id}`);
  }, [id]);

  // Opening a company fetches its linked sheets again (docs/05 §14), at most once a minute.
  useEffect(() => {
    const c = getCompany(id);
    if (!c || refreshed.current === id || !hasLinks(c)) return;
    refreshed.current = id;
    const oldest = c.sources
      .filter((s) => s.kind === 'link')
      .map((s) => Date.parse(s.fetchedAt ?? '') || 0)
      .sort()[0];
    if (Date.now() - (oldest ?? 0) > AUTO_REFRESH_MS) void refreshLinks(id).catch(() => undefined);
  }, [id, ready]);

  if (!ready)
    return (
      <div className="dr-root" data-theme={theme}>
        <div className={css.loading} role="status">
          <span className={ui.spinner} aria-hidden="true" /> {t('try.loading')}
        </div>
      </div>
    );
  if (!company) return <Navigate to="/try" replace />;
  if (!company.snapshot) return <Navigate to={`/try/${id}/manage`} replace />;
  const base = `/try/${id}`;
  const users = company.users?.length ? company.users : DEFAULT_USERS;
  const others = companies.filter((c) => c.id !== id && c.snapshot);

  return (
    <Stage>
      <ToastProvider>
        <WorkspaceProvider base={base} demo users={users}>
          <FrameGrid>
            <Sidebar
              base={base}
              workspaceName={company.name}
              demo
              note={t('try.chip')}
              snapshot={company.snapshot}
              menu={
                <>
                  <Link role="menuitem" className={frame.menuItem} to={`${base}/manage`}>
                    {t('try.menu.manage')}
                  </Link>
                  {others.length > 0 && <p className={frame.menuNote}>{t('try.menu.switch')}</p>}
                  {others.map((o) => (
                    <Link key={o.id} role="menuitem" className={frame.menuItem} to={`/try/${o.id}`}>
                      {o.name}
                    </Link>
                  ))}
                  <Link role="menuitem" className={frame.menuItem} to="/try">
                    {t('try.menu.all')}
                  </Link>
                  <Link role="menuitem" className={frame.menuItem} to="/">
                    {t('ui.workspace.menu.home')}
                  </Link>
                </>
              }
              footer={<RefreshChip company={company} />}
            />
            <CoverageGate company={company} snapshot={company.snapshot} />
          </FrameGrid>
        </WorkspaceProvider>
      </ToastProvider>
    </Stage>
  );
}
