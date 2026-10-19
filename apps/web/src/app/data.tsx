import { snapshotSchema, type Snapshot } from '@drishti/shared';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

// Demo data loading (docs/09 §7). The demo reads static files; ?fixture=design loads the hand-built design
// snapshot used by the visual suite (docs/12 §5).

export const isDesignFixture = () => new URLSearchParams(window.location.search).get('fixture') === 'design';

const demoWorkspaceSchema = z.object({
  users: z.array(z.object({ email: z.string(), role: z.string(), name: z.string() })),
  actions: z.array(z.record(z.string(), z.unknown())),
});
export type DemoWorkspace = z.infer<typeof demoWorkspaceSchema>;

async function getJson(url: string) {
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return res.json();
}

export function useSnapshot() {
  const design = isDesignFixture();
  return useQuery({
    queryKey: ['snapshot', design ? 'design' : 'demo'],
    queryFn: async (): Promise<Snapshot> => snapshotSchema.parse(await getJson(design ? '/demo/design-snapshot.json' : '/demo/snapshot.json')),
    staleTime: Infinity,
  });
}

export function useDemoWorkspace() {
  const design = isDesignFixture();
  return useQuery({
    queryKey: ['demo-workspace', design ? 'design' : 'demo'],
    queryFn: async (): Promise<DemoWorkspace> =>
      demoWorkspaceSchema.parse(await getJson(design ? '/demo/design-workspace.json' : '/demo/workspace.json')),
    staleTime: Infinity,
  });
}
