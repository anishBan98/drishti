import { t, type CopyKey } from '@drishti/shared';
import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { AppEnv } from '../env';

export type ErrorCode = { [K in CopyKey]: K extends `error.${infer C}` ? C : never }[CopyKey];

// Error envelope from docs/07-API.md §1.2; the message comes from the copy deck (error.<code>).
export function apiError(
  c: Context<AppEnv>,
  status: ContentfulStatusCode,
  code: ErrorCode,
  vars: Record<string, string | number> = {},
  detail?: Record<string, unknown>,
) {
  const requestId = c.get('requestId');
  const message = t(`error.${code}`, { request_id: requestId, ...vars });
  return c.json({ error: { code, message, ...(detail ? { detail } : {}), request_id: requestId } }, status);
}
