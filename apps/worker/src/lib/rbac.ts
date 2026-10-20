import type { MiddlewareHandler } from 'hono';
import type { AppEnv } from '../env';
import { apiError } from './errors';
import { csrfOk, findSession, sessionIdFrom, type Role, type SessionUser } from './session';

// Roles and capabilities (docs/04 §2), enforced per route by requireRole() (docs/12 API-03).

export const ROLES: Role[] = ['Owner', 'Approver', 'Analyst', 'Editor', 'Viewer'];

export const CAPABILITY: Record<string, Role[]> = {
  view: ['Owner', 'Approver', 'Analyst', 'Editor', 'Viewer'],
  run_actions: ['Owner', 'Approver', 'Analyst', 'Editor'],
  approve: ['Owner', 'Approver'],
  tests: ['Owner', 'Approver', 'Analyst'],
  sync: ['Owner', 'Analyst'],
  upload: ['Owner', 'Analyst', 'Editor'],
  rules: ['Owner', 'Approver', 'Analyst', 'Editor'],
  capture_token: ['Owner', 'Approver', 'Analyst', 'Editor'],
  admin: ['Owner'],
  usage: ['Owner', 'Approver', 'Analyst'],
  delete_data: ['Owner'],
};
export type Capability = keyof typeof CAPABILITY;

/** The role a capability needs at minimum, for the ROLE_FORBIDDEN message ("Analyst and above can."). */
const lowest = (cap: Capability) => [...CAPABILITY[cap]!].sort((a, b) => ROLES.indexOf(b) - ROLES.indexOf(a))[0]!;

declare module 'hono' {
  interface ContextVariableMap {
    user: SessionUser;
  }
}

/** Signed-in user with a capability; non-GET requests also need the CSRF header. */
export function requireRole(cap: Capability): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const raw = sessionIdFrom(c);
    const user = raw ? await findSession(c.env.DB, raw) : null;
    if (!user) return apiError(c, 401, 'AUTH_SESSION_EXPIRED');
    if (c.req.method !== 'GET' && c.req.method !== 'HEAD' && !csrfOk(c)) return apiError(c, 403, 'CSRF_INVALID');
    if (!CAPABILITY[cap]!.includes(user.role)) return apiError(c, 403, 'ROLE_FORBIDDEN', { role_needed: lowest(cap) });
    c.set('user', user);
    await next();
  };
}
