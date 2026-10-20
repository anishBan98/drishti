import { t, type Snapshot } from '@drishti/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, type ComponentType } from 'react';
import {
  createBrowserRouter,
  Navigate,
  Outlet,
  RouterProvider,
  useOutletContext,
  type RouteObject,
} from 'react-router';
import { useDemoWorkspace, useSnapshot } from './app/data';
import { Stage } from './app/stage';
import { ThemeProvider } from './app/theme';
import { WorkspaceProvider } from './app/workspace';
import { FrameGrid, Sidebar } from './components/Frame';
import { ToastProvider } from './components/Toast';
import { seedActions, type DemoAction } from './lib/demo-actions';
import { Actions } from './screens/Actions';
import { Customers } from './screens/Customers';
import { DataSources } from './screens/DataSources';
import { Home } from './screens/Home';
import { Impact } from './screens/Impact';
import { Market } from './screens/Market';
import { Performance } from './screens/Performance';
import { ThisWeek } from './screens/ThisWeek';
import { Voice } from './screens/Voice';
import { TryHome, TryManage } from './screens/Try';
import { Admin, Onboarding, SignIn, WorkspaceLayout } from './screens/Account';
import { TryLayout } from './sandbox/TryLayout';
import ui from './components/ui.module.css';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } });

/** The demo: fictional data, simulated actions, no login (docs/02 J0). */
function DemoLayout() {
  const snapshot = useSnapshot();
  const workspace = useDemoWorkspace();
  useEffect(() => {
    if (workspace.data) seedActions(workspace.data.actions as unknown as DemoAction[]);
  }, [workspace.data]);
  const name = snapshot.data?.workspace.name ?? '';
  return (
    <Stage>
      <ToastProvider>
        <WorkspaceProvider base="/demo" demo users={workspace.data?.users ?? []}>
          <FrameGrid>
            <Sidebar base="/demo" workspaceName={name} demo snapshot={snapshot.data} />
            {snapshot.data && workspace.data ? (
              <Outlet context={snapshot.data} />
            ) : snapshot.isError || workspace.isError ? (
              <main style={{ display: 'grid', placeItems: 'center', alignContent: 'center', gap: 16 }}>
                <p className={ui.empty} role="alert">
                  {t('ui.demo.error')}
                </p>
                <button
                  type="button"
                  className={ui.btnPrimary}
                  onClick={() => {
                    if (snapshot.isError) void snapshot.refetch();
                    if (workspace.isError) void workspace.refetch();
                  }}
                >
                  {t('ui.retry')}
                </button>
              </main>
            ) : (
              <main aria-busy="true">
                <p className="sr-only" role="status">
                  {t('ui.demo.loading')}
                </p>
                {/* Skeleton in the frame's shapes, so nothing jumps when the data arrives (docs/09 §7). */}
                <div className={ui.skeleton} aria-hidden="true">
                  <div className={ui.skelBlock} style={{ width: '40%' }} />
                  <div className={ui.skelRow} style={{ gridTemplateColumns: '1.6fr repeat(6, 1fr)' }}>
                    {Array.from({ length: 7 }, (_, i) => (
                      <div key={i} className={ui.skelBlock} />
                    ))}
                  </div>
                  <div className={ui.skelRow} style={{ gridTemplateColumns: '1.9fr 1fr' }}>
                    <div className={ui.skelBlock} />
                    <div className={ui.skelBlock} />
                  </div>
                </div>
              </main>
            )}
          </FrameGrid>
        </WorkspaceProvider>
      </ToastProvider>
    </Stage>
  );
}

/** A screen reads the snapshot its layout passes down: the demo's, or a sandbox company's. */
const screen = (C: ComponentType<{ snapshot: Snapshot }>) =>
  function Screen() {
    const data = useOutletContext<Snapshot | undefined>();
    return data ? <C snapshot={data} /> : null;
  };

/** The eight screens under a base path; a mistyped link lands on This week. */
const screens = (base: string): RouteObject[] => [
  { index: true, Component: screen(ThisWeek) },
  { path: 'actions', Component: screen(Actions) },
  { path: 'performance', Component: screen(Performance) },
  { path: 'impact', Component: screen(Impact) },
  { path: 'market', Component: screen(Market) },
  { path: 'customers', Component: screen(Customers) },
  { path: 'voice', Component: screen(Voice) },
  { path: 'data', Component: screen(DataSources) },
  { path: '*', element: <Navigate to={base} replace /> },
];

const router = createBrowserRouter([
  { path: '/', Component: Home },
  {
    path: '/demo',
    Component: DemoLayout,
    children: screens('/demo'),
  },
  // Sandbox: your own companies (docs/09 §6.12).
  { path: '/try', Component: TryHome },
  { path: '/try/:id/manage', Component: TryManage },
  { path: '/try/:id', Component: TryLayout, children: screens('..') },
  // Signed-in workspace (docs/09 §6.10, docs/04 §4).
  { path: '/signin', Component: SignIn },
  { path: '/app', Component: WorkspaceLayout, children: screens('/app') },
  { path: '/onboarding', Component: Onboarding },
  { path: '/admin', Component: Admin },
  { path: '*', element: <Navigate to="/" replace /> },
]);

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <RouterProvider router={router} />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export { Outlet };
