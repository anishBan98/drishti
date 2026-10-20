import { t, type CopyKey } from '@drishti/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, Navigate, Outlet, useNavigate } from 'react-router';
import { api, ApiError, useMe, useSignOut, type Me } from '../app/session';
import { Stage } from '../app/stage';
import { useSync, useWorkspaceSnapshot } from '../app/sync';
import { useTheme } from '../app/theme';
import { WorkspaceProvider } from '../app/workspace';
import { FrameGrid, Sidebar } from '../components/Frame';
import { ToastProvider, useToast } from '../components/Toast';
import frame from '../components/frame.module.css';
import { seedActions } from '../lib/demo-actions';
import { ago } from '../sandbox/time';
import ui from '../components/ui.module.css';
import css from '../sandbox/try.module.css';
import { Shell } from './Try';
import { Icon } from '../components/Icon';

// Signed-in pages (docs/09 §6.10, docs/04 §4): sign in with Google, the workspace start page, onboarding steps 1–5
// and Admin. Same page shell as the sandbox.

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (o: { client_id: string; callback: (r: { credential: string }) => void }) => void;
          renderButton: (el: HTMLElement, o: Record<string, unknown>) => void;
        };
      };
    };
  }
}

const GSI = 'https://accounts.google.com/gsi/client';
const errorText = (e: unknown) => (e instanceof ApiError ? e.message : t('error.INTERNAL', { request_id: 'web' }));

/** /signin: the Sign in with Google button (Google Identity Services). */
export function SignIn() {
  const me = useMe();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const box = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');
  const config = useQuery({
    queryKey: ['auth-config'],
    queryFn: () => api<{ client_id: string | null }>('/api/auth/config'),
  });

  useEffect(() => {
    const clientId = config.data?.client_id;
    if (!clientId || !box.current) return;
    const render = () => {
      window.google!.accounts.id.initialize({
        client_id: clientId,
        callback: async ({ credential }) => {
          setError('');
          try {
            await api('/api/auth/google', { method: 'POST', body: JSON.stringify({ credential }) });
            await qc.invalidateQueries({ queryKey: ['me'] });
            navigate('/app');
          } catch (e) {
            setError(errorText(e));
          }
        },
      });
      window.google!.accounts.id.renderButton(box.current!, {
        theme: 'filled_blue',
        size: 'large',
        shape: 'pill',
        text: 'signin_with',
      });
    };
    if (window.google) return render();
    const s = document.createElement('script');
    s.src = GSI;
    s.async = true;
    s.onload = render;
    s.onerror = () => setError(t('auth.google_unavailable'));
    document.head.appendChild(s);
  }, [config.data?.client_id, navigate, qc]);

  if (me.data) return <Navigate to="/app" replace />;
  return (
    <Shell>
      <section className={css.hero}>
        <span className={css.chip}>🔒 {t('auth.chip')}</span>
        <h1 className={css.h1}>{t('auth.title')}</h1>
        <p className={css.lead}>{t('auth.lead')}</p>
      </section>
      <section className={css.panel} style={{ maxWidth: 520, marginTop: 24 }} aria-label={t('auth.title')}>
        {config.data && !config.data.client_id ? (
          <p className={css.help}>{t('auth.not_configured')}</p>
        ) : (
          <div ref={box} />
        )}
        <div role="alert" className={error ? css.alert : 'sr-only'}>
          {error}
        </div>
        <p className={css.help}>
          {t('auth.no_account')} <Link to="/try">{t('home.cta.try')}</Link>
        </p>
      </section>
    </Shell>
  );
}

function useAdminWorkspace(enabled: boolean) {
  return useQuery({
    queryKey: ['admin-workspace'],
    enabled,
    queryFn: () =>
      api<{
        workspace: { name: string; sheet_id: string | null; inbox_folder_id: string | null } | null;
        service_account: string | null;
      }>('/api/admin/workspace'),
  });
}

type Check = { ok: boolean; name?: string; message?: string };

/** Sheet and folder links with live access checks (onboarding step 4 and Admin → Workspace). */
function LinksForm({ onSaved }: { onSaved?: () => void }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [checks, setChecks] = useState<Record<string, Check> | null>(null);
  const [error, setError] = useState('');
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError('');
    try {
      const r = await api<{ ok: boolean; checks: Record<string, Check> }>('/api/admin/workspace', {
        method: 'PUT',
        body: JSON.stringify(Object.fromEntries(f.entries())),
      });
      setChecks(r.checks);
      await qc.invalidateQueries({ queryKey: ['me'] });
      onSaved?.();
    } catch (err) {
      const body = err instanceof ApiError ? (err.body as { checks?: Record<string, Check> }) : undefined;
      if (body?.checks) setChecks(body.checks);
      else setError(errorText(err));
    }
    setBusy(false);
  };
  const field = (name: string, label: CopyKey, required = true) => (
    <label className={css.label}>
      {t(label)}
      <input name={name} className={css.input} type="url" required={required} placeholder="https://" />
      {checks?.[name.replace('_url', '')] && (
        <span className={checks[name.replace('_url', '')]!.ok ? css.metaSoft : css.err}>
          {checks[name.replace('_url', '')]!.ok
            ? `✓ ${checks[name.replace('_url', '')]!.name ?? ''}`
            : checks[name.replace('_url', '')]!.message}
        </span>
      )}
    </label>
  );
  return (
    <form onSubmit={submit} className={css.addForm}>
      {field('sheet_url', 'onb.links.sheet')}
      {field('inbox_url', 'onb.links.inbox')}
      {field('outbox_url', 'onb.links.outbox')}
      {field('archive_url', 'onb.links.archive', false)}
      <div role="alert" className={error ? css.alert : 'sr-only'}>
        {error}
      </div>
      <button type="submit" className={ui.btnPrimary} disabled={busy} aria-busy={busy}>
        {busy ? t('onb.links.checking') : t('onb.links.check')}
      </button>
    </form>
  );
}

const STEPS: CopyKey[] = ['onb.step.1', 'onb.step.2', 'onb.step.3', 'onb.step.4', 'onb.step.5'];

/** /onboarding: steps 1–5 (docs/09 §6.10). Step 6, the first sync, arrives with M5. */
export function Onboarding() {
  const me = useMe();
  const isOwner = me.data?.user.role === 'Owner';
  const ws = useAdminWorkspace(!!isOwner);
  const linked = !!me.data?.workspace.configured;
  // A linked workspace opens on the last step until a step is picked.
  const [picked, setStep] = useState<number | null>(null);
  const step = picked ?? (linked ? 4 : 0);
  const [copied, setCopied] = useState(false);
  if (me.isLoading) return <Shell>{null}</Shell>;
  if (!me.data) return <Navigate to="/signin" replace />;
  if (!isOwner) return <Navigate to="/app" replace />;
  const sa = ws.data?.service_account ?? '…';
  return (
    <Shell>
      <h1 className={css.h1}>{t('onb.title')}</h1>
      <div className={css.columns}>
        <ol className={css.checks} aria-label={t('onb.title')}>
          {STEPS.map((k, i) => (
            <li key={k} className={i < step || (i < 4 && linked) ? css.checkOk : css.checkNo}>
              <span aria-hidden="true">{i < step || (i < 4 && linked) ? '✓' : `${i + 1}`}</span>
              <button
                type="button"
                className={ui.linkBtn}
                aria-current={i === step ? 'step' : undefined}
                onClick={() => setStep(i)}
              >
                {t(k)}
              </button>
            </li>
          ))}
        </ol>
        <section className={css.panel} aria-label={t(STEPS[step]!)}>
          <h2 className={css.h3}>{t(STEPS[step]!)}</h2>
          {step === 0 && (
            <>
              <p className={css.help}>{t('onb.template.help')}</p>
              <a className={ui.btnSecondary} href="/samples/Drishti-Workspace-Template.xlsx" download>
                <Icon name="download" /> {t('try.template')}
              </a>
            </>
          )}
          {step === 1 && <p className={css.help}>{t('onb.folders.help')}</p>}
          {step === 2 && (
            <>
              <p className={css.help}>{t('onb.share.help')}</p>
              <p className={css.itemName}>{sa}</p>
              <button
                type="button"
                className={ui.btnSecondary}
                onClick={() => {
                  void navigator.clipboard?.writeText(sa);
                  setCopied(true);
                }}
              >
                {copied ? t('onb.share.copied') : t('onb.share.copy')}
              </button>
            </>
          )}
          {step === 3 && <LinksForm onSaved={() => setStep(4)} />}
          {step === 4 && (
            <>
              <p className={css.help}>{t('onb.shopify.help')}</p>
              <p className={css.help}>{t('onb.next_sync')}</p>
              <Link className={ui.btnPrimary} to="/app">
                {t('onb.finish')}
              </Link>
            </>
          )}
          {step < 3 && (
            <button type="button" className={ui.btnPrimary} onClick={() => setStep(step + 1)}>
              {t('onb.next')} <Icon name="arrowRight" />
            </button>
          )}
        </section>
      </div>
    </Shell>
  );
}

function SyncButton({ wide }: { wide?: boolean }) {
  const sync = useSync();
  const toast = useToast();
  return (
    <>
      <button
        type="button"
        className={wide ? ui.btnPrimary : css.sideRefresh}
        disabled={sync.busy}
        aria-busy={sync.busy}
        onClick={async () => {
          if (await sync.run()) toast(t('app.sync.done'));
        }}
      >
        <Icon name="refresh" />{' '}
        {sync.step
          ? t(`app.sync.step.${sync.step}`, { done: sync.progress.done, total: sync.progress.total })
          : t('app.sync.now')}
      </button>
      <div role="alert" className={sync.error ? css.alert : 'sr-only'}>
        {sync.error}
      </div>
    </>
  );
}

/** Before the first sync: what to do next (set up, or sync now). */
function StartPage({ me }: { me: Me }) {
  const signOut = useSignOut();
  const { user, workspace } = me;
  const canSync = user.role === 'Owner' || user.role === 'Analyst';
  return (
    <Shell>
      <section className={css.hero}>
        <span className={css.chip}>
          {user.name} · {user.role}
        </span>
        <h1 className={css.h1}>{workspace.name}</h1>
        <p className={css.lead}>{workspace.configured ? t('app.waiting_sync') : t('app.not_configured')}</p>
      </section>
      <div className={css.row}>
        {workspace.configured && canSync && <SyncButton wide />}
        {user.role === 'Owner' && (
          <Link
            className={workspace.configured ? ui.btnSecondary : ui.btnPrimary}
            to={workspace.configured ? '/admin' : '/onboarding'}
          >
            {workspace.configured ? t('app.admin') : t('app.setup')}
          </Link>
        )}
        <button type="button" className={ui.linkBtn} onClick={() => void signOut()}>
          {t('auth.sign_out')}
        </button>
      </div>
    </Shell>
  );
}

/** /app: the signed-in workspace — the eight screens on the workspace's latest sync (docs/09 §6). */
export function WorkspaceLayout() {
  const me = useMe();
  const snap = useWorkspaceSnapshot(!!me.data);
  const signOut = useSignOut();
  const { theme } = useTheme();
  useEffect(() => {
    seedActions([], 'workspace');
  }, []);
  if (me.isLoading || (me.data && snap.isLoading))
    return (
      <div className="dr-root" data-theme={theme}>
        <div className={css.loading} role="status">
          <span className={ui.spinner} aria-hidden="true" /> {t('try.loading')}
        </div>
      </div>
    );
  if (!me.data) return <Navigate to="/signin" replace />;
  if (!snap.data) return <StartPage me={me.data} />;
  const { user, workspace } = me.data;
  const canSync = user.role === 'Owner' || user.role === 'Analyst';
  return (
    <Stage>
      <ToastProvider>
        <WorkspaceProvider base="/app" demo users={[{ email: user.email, role: user.role, name: user.name }]}>
          <FrameGrid>
            <Sidebar
              base="/app"
              workspaceName={workspace.name}
              demo
              note={`${user.name} · ${user.role}`}
              snapshot={snap.data}
              menu={
                <>
                  {user.role === 'Owner' && (
                    <Link role="menuitem" className={frame.menuItem} to="/admin">
                      {t('app.admin')}
                    </Link>
                  )}
                  <Link role="menuitem" className={frame.menuItem} to="/try">
                    {t('home.cta.try')}
                  </Link>
                  <Link role="menuitem" className={frame.menuItem} to="/">
                    {t('ui.workspace.menu.home')}
                  </Link>
                  <button type="button" role="menuitem" className={frame.menuItem} onClick={() => void signOut()}>
                    {t('auth.sign_out')}
                  </button>
                </>
              }
              footer={
                <div className={css.sideFoot}>
                  <p className={frame.footer}>{t('app.sync.last', { when: ago(snap.data.generated_at) })}</p>
                  {canSync && <SyncButton />}
                </div>
              }
            />
            <Outlet context={snap.data} />
          </FrameGrid>
        </WorkspaceProvider>
      </ToastProvider>
    </Stage>
  );
}

interface UserRow {
  email: string;
  name: string | null;
  role: string;
  active: number;
  last_seen_at: string | null;
}

/** /admin (Owner): workspace links, users, usage, audit, sessions (docs/04 §4). */
export function Admin() {
  const me = useMe();
  const qc = useQueryClient();
  const isOwner = me.data?.user.role === 'Owner';
  const users = useQuery({
    queryKey: ['admin-users'],
    enabled: !!isOwner,
    queryFn: () => api<{ items: UserRow[] }>('/api/admin/users'),
  });
  const audit = useQuery({
    queryKey: ['admin-audit'],
    enabled: !!isOwner,
    queryFn: () => api<{ items: { at: string; actor: string; verb: string; object: string }[] }>('/api/admin/audit'),
  });
  const [msg, setMsg] = useState('');
  if (me.isLoading) return <Shell>{null}</Shell>;
  if (!me.data) return <Navigate to="/signin" replace />;
  if (!isOwner) return <Navigate to="/app" replace />;
  const act = async (path: string, body?: unknown, done?: CopyKey) => {
    setMsg('');
    try {
      await api(path, { method: 'POST', ...(body ? { body: JSON.stringify(body) } : {}) });
      await qc.invalidateQueries();
      if (done) setMsg(t(done));
    } catch (e) {
      setMsg(errorText(e));
    }
  };
  return (
    <Shell>
      <nav className={css.crumbs}>
        <Link to="/app">
          <Icon name="arrowLeft" /> {t('app.back')}
        </Link>
      </nav>
      <h1 className={css.h1}>{t('admin.title')}</h1>
      <div role="status" className={msg ? css.notes : 'sr-only'}>
        {msg}
      </div>
      <div className={css.columns}>
        <div className={css.col}>
          <section className={css.panel} aria-labelledby="adm-ws">
            <h2 id="adm-ws" className={css.h3}>
              {t('admin.workspace')}
            </h2>
            <LinksForm />
          </section>
          <section className={css.panel} aria-labelledby="adm-sessions">
            <h2 id="adm-sessions" className={css.h3}>
              {t('admin.sessions')}
            </h2>
            <button
              type="button"
              className={ui.btnSecondary}
              onClick={() => void act('/api/admin/sessions/revoke', { all: true }, 'admin.sessions.done')}
            >
              {t('admin.sessions.revoke_all')}
            </button>
          </section>
        </div>
        <div className={css.col}>
          <section className={css.panel} aria-labelledby="adm-users">
            <div className={css.panelHead}>
              <h2 id="adm-users" className={css.h3}>
                {t('admin.users')}
              </h2>
              <button
                type="button"
                className={ui.btnSecondary}
                onClick={() => void act('/api/admin/users/reload', undefined, 'admin.users.reloaded')}
              >
                <Icon name="refresh" /> {t('admin.users.reload')}
              </button>
            </div>
            <ul className={css.list}>
              {(users.data?.items ?? []).map((u) => (
                <li key={u.email} className={css.item}>
                  <span className={css.itemBody}>
                    <span className={css.itemName}>
                      {u.name ?? u.email} · {u.role}
                    </span>
                    <span className={css.metaSoft}>
                      {u.email}
                      {u.active ? '' : ` · ${t('admin.users.inactive')}`}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
          <section className={css.panel} aria-labelledby="adm-audit">
            <h2 id="adm-audit" className={css.h3}>
              {t('admin.audit')}
            </h2>
            <ul className={css.list}>
              {(audit.data?.items ?? []).slice(0, 20).map((a, i) => (
                <li key={`${a.at}-${i}`} className={css.item}>
                  <span className={css.itemBody}>
                    <span className={css.itemName}>
                      {a.actor} · {a.verb} {a.object}
                    </span>
                    <span className={css.metaSoft}>{a.at.slice(0, 16).replace('T', ' ')}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </Shell>
  );
}
