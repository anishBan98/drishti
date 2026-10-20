import { createContext, useContext, type ReactNode } from 'react';

// Who is using the screens and where they live. In the demo the visitor acts as the analyst ("You").
export interface WorkspaceUser {
  email: string;
  role: string;
  name: string;
}

export interface WorkspaceInfo {
  base: string;
  demo: boolean;
  users: WorkspaceUser[];
  me: WorkspaceUser;
  /** Who signs off over-threshold actions (first Owner or Approver). */
  approver: WorkspaceUser;
}

const fallbackUser: WorkspaceUser = { email: 'you@example.com', role: 'Analyst', name: 'You' };
const WorkspaceContext = createContext<WorkspaceInfo>({
  base: '/demo',
  demo: true,
  users: [fallbackUser],
  me: fallbackUser,
  approver: fallbackUser,
});

export function WorkspaceProvider({
  base,
  demo,
  users,
  children,
}: {
  base: string;
  demo: boolean;
  users: WorkspaceUser[];
  children: ReactNode;
}) {
  const me = users.find((u) => u.role === 'Analyst') ?? users[0] ?? fallbackUser;
  const approver = users.find((u) => u.role === 'Owner' || u.role === 'Approver') ?? me;
  return <WorkspaceContext.Provider value={{ base, demo, users, me, approver }}>{children}</WorkspaceContext.Provider>;
}

export const useWorkspace = () => useContext(WorkspaceContext);

/** "Priya (Category)" → "Priya". */
export const shortName = (name: string) => name.replace(/\s*\(.*\)\s*$/, '');
