import { useQuery, useQueryClient } from '@tanstack/react-query';

// Signed-in workspace (docs/05 §7, docs/07 §3): the session cookie is HttpOnly; non-GET calls send the CSRF cookie's
// value back as X-CSRF-Token (double submit).

export interface Me {
  user: { email: string; name: string; role: 'Owner' | 'Approver' | 'Analyst' | 'Editor' | 'Viewer' };
  workspace: {
    name: string;
    configured: boolean;
    onboarding: { sheet: boolean; inbox: boolean; outbox: boolean; shopify: boolean; first_sync: boolean };
  };
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public body?: unknown,
  ) {
    super(message);
  }
}

const csrf = () => /(?:^|;\s*)drishti-csrf=([^;]+)/.exec(document.cookie)?.[1] ?? '';

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? 'GET').toUpperCase();
  const res = await fetch(path, {
    ...init,
    credentials: 'same-origin',
    headers: {
      ...(init.body ? { 'content-type': 'application/json' } : {}),
      ...(method !== 'GET' ? { 'x-csrf-token': decodeURIComponent(csrf()) } : {}),
      ...init.headers,
    },
  });
  if (res.status === 204) return undefined as T;
  const body = (await res.json().catch(() => null)) as { error?: { code: string; message: string } } | null;
  if (!res.ok)
    throw new ApiError(res.status, body?.error?.code ?? 'INTERNAL', body?.error?.message ?? res.statusText, body);
  return body as T;
}

/** The signed-in user and workspace, or null when signed out. */
export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      try {
        return await api<Me>('/api/me');
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) return null;
        throw e;
      }
    },
    staleTime: 60_000,
    retry: false,
  });
}

export function useSignOut() {
  const qc = useQueryClient();
  return async () => {
    await api('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    qc.setQueryData(['me'], null);
  };
}
