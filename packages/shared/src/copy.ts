import { actionCopy } from './copy-actions';
import { screenCopy } from './copy-screens';
import { uiCopy } from './copy-ui';

// Copy deck: every user-facing string, keyed (docs/09-FRONTEND.md §10).
// Placeholders use {name}; fill them with t(key, vars).
const baseCopy = {
  'app.name': 'PreQL Presents Drishti',
  'app.tagline': 'See what really worked.',
  'app.by': 'by PreQL',

  'nav.week': 'This week',
  'nav.actions': 'Actions',
  'nav.performance': 'Performance',
  'nav.impact': 'Impact and ROI',
  'nav.market': 'Market',
  'nav.customers': 'Customers',
  'nav.voice': 'Customer voice',
  'nav.data': 'Data sources',
  'nav.footer': 'Your data stays in your own accounts. Synced {when}.',

  'demo.workspace': 'Demo, fictional data',

  'theme.light': 'Light',
  'theme.dark': 'Dark',

  'week.subtitle': '{range}, against the week before',
  'week.bridge.title': 'What moved sales',
  'week.bridge.caption': 'Explains {pct}% of the change',
  'week.working': 'Working',
  'week.attention': 'Needs attention',
  'week.inference.title': 'What this means',

  'actions.title': 'Actions',
  'actions.subtitle': 'Every button you pressed, what Drishti did, and whether it paid off.',
  'actions.did': 'What Drishti did',
  'actions.lifecycle': 'Suggested, Approved, Running, Measuring, Result',

  'action.confirm.lead': 'This will:',
  'action.run': 'Run',
  'action.cancel': 'Cancel',
  'action.done_link': 'View in Actions',
  'action.handoff.confirm': "I've done it",
  'action.waiting_approval': 'Waiting for approval from {name}',
  'action.failed': "Couldn't finish: {reason}",

  'impact.subtitle': 'Last 28 days. Real sales = sales that would not have happened without the ad.',
  'impact.claim_vs_real.title': 'Sales per ₹100 of ad spend',

  'market.subtitle': '{category} on Amazon, Flipkart and Nykaa. {n} products on your watchlist.',
  'market.map.price': 'Where you sit: price against rating',
  'market.map.perception': 'Where you sit: how reviews describe you',

  'customers.method':
    'Grouped with k-means ({k} groups, {n} buying signals) on own-site buyers. Marketplaces do not share who bought, so they are left out.',

  'voice.netsentiment.note': 'Net sentiment = % positive minus % negative mentions of each topic.',

  'data.subtitle': 'Where every number comes from. Data stays in your own Google and Cloudflare accounts.',
  'data.privacy': 'Privacy mode',
  'data.privacy.detail': 'Hide customer names and phone numbers everywhere',

  'empty.no_data': 'No data yet. Connect your Sheet and run the first sync.',
  'stale.footer': 'Data is from {date}',

  'signin.title': 'Sign in to drishti.',
  'signin.body': 'See which rupee really worked, what rivals changed and what to do next.',
  'signin.demo': 'Or open the demo with fictional data',

  // Error messages (docs/03-EXCEPTIONS.md §3)
  'error.VALIDATION_FAILED': 'Some details are missing or invalid: {fields}.',
  'error.AUTH_TOKEN_INVALID': "Sign-in didn't work. Try again.",
  'error.AUTH_SESSION_EXPIRED': 'You were signed out. Sign in to continue.',
  'error.AUTH_NOT_INVITED': "You're not on this workspace yet. Ask an owner to add {email} to the Users tab.",
  'error.AUTH_EMAIL_UNVERIFIED': "Your Google email isn't verified.",
  'error.CSRF_INVALID': 'Please refresh the page and try again.',
  'error.ROLE_FORBIDDEN': "Your role can't do this. {role_needed} and above can.",
  'error.DEMO_READ_ONLY': "This is the demo. Changes aren't saved.",
  'error.NOT_FOUND': "We couldn't find that.",
  'error.SNAPSHOT_NONE': 'No data yet. Connect your Sheet and run the first sync.',
  'error.SYNC_ALREADY_RUNNING': 'A sync is already running (started {ago}).',
  'error.IDEMPOTENCY_MISMATCH': 'This request was already sent with different details. Refresh and try again.',
  'error.UPLOAD_TOO_LARGE': 'Files up to 20 MB, please. Split larger exports by month.',
  'error.UPLOAD_TYPE_UNSUPPORTED': 'Use CSV, XLSX or ZIP files.',
  'error.APPROVAL_REQUIRED': 'This is over ₹{threshold}, so it needs an approver. Sent to {approvers}.',
  'error.CONNECTOR_MISSING': "{connector} isn't connected. {fallback_text}",
  'error.UNDO_UNAVAILABLE': "This can't be undone from Drishti: {reason}.",
  'error.CAPTURE_NOT_ON_WATCHLIST': "This page isn't on your watchlist.",
  'error.DRIVE_NOT_SHARED': "Drishti can't open {folder}. Share it with {sa_email} as Editor.",
  'error.SHEET_NOT_SHARED': "Drishti can't open your Workspace Sheet. Share it with {sa_email} as Editor.",
  'error.SCHEMA_MISMATCH': '{file} is missing {columns}. Re-export with these columns or map them in the Mappings tab.',
  'error.FILE_UNRECOGNISED': "We couldn't tell what {file} is. Map its columns in the Mappings tab.",
  'error.ROBOTS_DISALLOWED': '{host} asks bots not to read this page. Use the extension instead.',
  'error.TEST_NOT_APPLIED': 'Test cities still have spend. Check the exclusions in {platform}.',
  'error.RATE_LIMITED': 'Too many requests. Try again in {seconds} seconds.',
  'error.EXECUTOR_FAILED': "Couldn't finish: {platform} didn't respond.",
  'error.SHOPIFY_TOKEN_INVALID': 'The Shopify connection needs attention. An owner can reconnect it in Admin.',
  'error.SHOPIFY_SCOPE_MISSING': 'The Shopify app needs the {scope} permission.',
  'error.META_PERMISSION': "The Meta connection can't change this ad set. Check the app's access.",
  'error.GITHUB_DISPATCH_FAILED': "Couldn't start a sync. An owner needs to renew the GitHub token.",
  'error.AI_UNAVAILABLE': "Drafting is unavailable right now. We'll try again later.",
  'error.FREE_TIER_LIMIT': 'Daily free limit nearly reached. This will run tomorrow.',
  'error.SNAPSHOT_SCHEMA_MISMATCH': 'Showing the last saved data while we update.',
  'error.ADAPTER_PARSE_FAILED': "Couldn't read the {field} on this page. You can type it.",
  'error.INTERNAL': 'Something went wrong on our side. Try again; if it repeats, tell your analyst (ref {request_id}).',
} as const;

export const copy = { ...baseCopy, ...actionCopy, ...screenCopy, ...uiCopy } as const;

export type CopyKey = keyof typeof copy;

/** Look up a copy-deck string and fill its {placeholders}. Unknown placeholders are left as is. */
export function t(key: CopyKey, vars: Record<string, string | number> = {}): string {
  return copy[key].replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match));
}
