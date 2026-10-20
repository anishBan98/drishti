import { suggest } from '@drishti/engine';
import { t, type ActionType, type Suggestion } from '@drishti/shared';
import { useCallback } from 'react';
import { shortName, useWorkspace } from '../app/workspace';
import { useToast } from '../components/Toast';
import { runSuggestion } from './demo-actions';

/** Builds a suggestion for a screen-level button (no expected rupee value; docs/10 §3 data and task actions). */
export function screenSuggestion(
  type: ActionType,
  context: string,
  title: string,
  why: string,
  params: Record<string, unknown> = {},
  stepVars: Record<string, string | number> = {},
): Suggestion {
  return suggest(
    { type, context, title, why, impactLabel: '', confidence: 'high', params, stepVars },
    Number.MAX_SAFE_INTEGER,
  );
}

/** Header buttons run their action straight away (they are the confirm step) and log it to Actions. */
export function useQuickAction(screen: string) {
  const ws = useWorkspace();
  const toast = useToast();
  return useCallback(
    (s: Suggestion) => {
      runSuggestion(s, {
        screen,
        owner: shortName(ws.me.name),
        approver: shortName(ws.approver.name),
        snapshotName: '',
      });
      toast(`${s.title} · ${t('action.done_link')}`);
    },
    [screen, ws, toast],
  );
}
