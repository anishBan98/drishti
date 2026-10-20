import { formatShortDate, t } from '@drishti/shared';

/** "just now", "5 min ago", "3 h ago", else the date ("12 Oct"). */
export function ago(iso: string | undefined, now = Date.now()): string {
  if (!iso) return '';
  const mins = Math.floor((now - Date.parse(iso)) / 60_000);
  if (mins < 1) return t('time.just_now');
  if (mins < 60) return t('time.min_ago', { n: mins });
  if (mins < 24 * 60) return t('time.h_ago', { n: Math.floor(mins / 60) });
  return formatShortDate(iso.slice(0, 10));
}

export const sizeLabel = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
