// Copy deck: every user-facing string, keyed (docs/09-FRONTEND.md §10).
// Placeholders use {name}; fill them with t(key, vars).
export const copy = {
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
} as const;

export type CopyKey = keyof typeof copy;

/** Look up a copy-deck string and fill its {placeholders}. Unknown placeholders are left as is. */
export function t(key: CopyKey, vars: Record<string, string | number> = {}): string {
  return copy[key].replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match));
}
