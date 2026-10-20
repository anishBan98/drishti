import type { Snapshot } from '@drishti/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { buildFrom } from '../sandbox/companies';
import { api, ApiError } from './session';

// Sync, compact version (docs/05 §6): fetch the Workspace Sheet and Inbox files through the Worker, run the engine
// in this browser, and save the snapshot for the whole workspace.

interface SyncSource {
  id: string;
  name: string;
  kind: 'sheet' | 'file';
}

/** The workspace's latest snapshot, or null before the first sync. */
export function useWorkspaceSnapshot(enabled: boolean) {
  return useQuery({
    queryKey: ['workspace-snapshot'],
    enabled,
    retry: false,
    staleTime: 60_000,
    queryFn: async () => {
      try {
        return await api<Snapshot>('/api/snapshot');
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) return null;
        throw e;
      }
    },
  });
}

export type SyncStep = 'list' | 'download' | 'build' | 'save';

export function useSync() {
  const qc = useQueryClient();
  const [step, setStep] = useState<SyncStep | null>(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState('');
  const run = async () => {
    setError('');
    try {
      setStep('list');
      const { items } = await api<{ items: SyncSource[] }>('/api/sync/sources');
      setStep('download');
      setProgress({ done: 0, total: items.length });
      const files: { id: string; name: string; bytes: ArrayBuffer }[] = [];
      for (const it of items) {
        const res = await fetch(`/api/sync/file/${encodeURIComponent(it.id)}`, { credentials: 'same-origin' });
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: { code: string; message: string } } | null;
          throw new ApiError(res.status, body?.error?.code ?? 'INTERNAL', body?.error?.message ?? res.statusText);
        }
        const name = decodeURIComponent(res.headers.get('x-file-name') ?? it.name);
        files.push({ id: it.id, name, bytes: await res.arrayBuffer() });
        setProgress((p) => ({ ...p, done: p.done + 1 }));
      }
      setStep('build');
      // Customer IDs are hashed with a key tied to this workspace's Sheet (docs/05 §10).
      const built = await buildFrom(`ws:${items[0]?.id ?? 'workspace'}`, files);
      if (!built.ok) throw new Error(built.error);
      setStep('save');
      await api('/api/snapshot', {
        method: 'PUT',
        body: JSON.stringify(built.snapshot),
        headers: { 'x-files-parsed': String(files.length) },
      });
      qc.setQueryData(['workspace-snapshot'], built.snapshot);
      await qc.invalidateQueries({ queryKey: ['me'] });
      setStep(null);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStep(null);
      return false;
    }
  };
  return { run, step, progress, error, busy: step !== null };
}
