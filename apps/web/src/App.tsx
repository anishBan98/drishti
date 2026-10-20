import { t, type Snapshot } from '@drishti/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, type ComponentType } from 'react';
import { createBrowserRouter, Navigate, Outlet, RouterProvider } from 'react-router';
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
    <WorkspaceProvider base="/demo" demo users={workspace.data?.users ?? []}>
      <FrameGrid>
        <Sidebar base="/demo" workspaceName={name} demo snapshot={snapshot.data} />
        {snapshot.data && workspace.data ? (
          <Outlet context={snapshot.data} />
        ) : (
          <main style={{ display: 'grid', placeItems: 'center' }}>
            <p className={ui.empty}>
              {snapshot.isError || workspace.isError ? t('error.SNAPSHOT_SCHEMA_MISMATCH') : ''}
            </p>
          </main>
        )}
      </FrameGrid>
    </WorkspaceProvider>
  );
}

const screen = (C: ComponentType<{ snapshot: Snapshot }>) =>
  function Screen() {
    const { data } = useSnapshot();
    return data ? <C snapshot={data} /> : null;
  };

const router = createBrowserRouter([
  { path: '/', Component: Home },
  {
    path: '/demo',
    Component: DemoLayout,
    children: [
      { index: true, Component: screen(ThisWeek) },
      { path: 'actions', Component: screen(Actions) },
      { path: 'performance', Component: screen(Performance) },
      { path: 'impact', Component: screen(Impact) },
      { path: 'market', Component: screen(Market) },
      { path: 'customers', Component: screen(Customers) },
      { path: 'voice', Component: screen(Voice) },
      { path: 'data', Component: screen(DataSources) },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <Stage>
          <ToastProvider>
            <RouterProvider router={router} />
          </ToastProvider>
        </Stage>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export { Outlet };
