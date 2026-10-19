# 04 · Admin: Roles, Approvals, Settings, Audit and Handover

## 1. Roles

| Role | Who | Summary |
| --- | --- | --- |
| Owner | CMO or the deployer; `OWNER_EMAIL` is always Owner | Everything, including connectors, secrets status, user roles, deletion |
| Approver | Heads who sign off spend and price | Approve or decline; run any action |
| Analyst | Marketing analyst | Sync, upload, re-run models, run data and test actions, all screens |
| Editor | Marketers, category, CRM | Run actions in their areas, assign, create rules, capture |
| Viewer | QA, finance, leadership readers | Read all screens and the Actions log |

Roles come from the Users tab of the Workspace Sheet (loaded at each sync) plus the bootstrap Owner. A role change takes effect at the next sync or immediately when an Owner clicks "Reload users" in Admin.

## 2. Permission matrix

| Capability | Owner | Approver | Analyst | Editor | Viewer |
| --- | --- | --- | --- | --- | --- |
| View all screens, Actions log | ✓ | ✓ | ✓ | ✓ | ✓ |
| Switch theme, privacy mode (own view) | ✓ | ✓ | ✓ | ✓ | ✓ |
| Run prepare / task / draft / rule actions | ✓ | ✓ | ✓ | ✓ | |
| Run execute actions below threshold | ✓ | ✓ | ✓ | ✓ | |
| Run execute actions above threshold | via approval | ✓ (not own request) | via approval | via approval | |
| Approve / decline | ✓ | ✓ | | | |
| Undo | ✓ | ✓ | own actions | own actions | |
| Launch and stop tests | ✓ | ✓ | ✓ | | |
| Sync now, upload, re-run grouping | ✓ | | ✓ | upload only | |
| Create rules | ✓ | ✓ | ✓ | ✓ | |
| Extension capture token | ✓ | ✓ | ✓ | ✓ | |
| Admin: workspace links, connectors, sessions, usage, audit, export | ✓ | usage | usage | | |
| Delete workspace data | ✓ | | | | |

Enforced in the Worker by a `requireRole()` middleware per route and per action type (`roles` in each action definition). UI hides or disables controls with a tooltip naming the role needed.

## 3. Approvals

- Threshold: `approval_threshold_inr` (Settings; default ₹10,00,000 per month of money effect).
- Separation: the requester cannot approve their own above-threshold action; Owners can approve others' but their own above-threshold requests need another Approver or Owner. If the workspace has only one Owner and no Approvers, the Owner may self-approve with a typed reason (logged).
- Expiry: 7 days. Reminder at day 3 and day 6.
- Every decision is in `approvals` and `audit_log`.

## 4. Admin screen (`/admin`, Owner)

Sections, each a simple panel (follows the same design tokens; not in the eight showcase screens):

1. **Workspace:** name, Sheet URL, Inbox, Outbox, Archive folder URLs with live access check (green tick or the sharing fix), service account email with a Copy button.
2. **Connectors:** Shopify (store domain, token, Test, status), Meta (ad account ID, token, Test) Phase 2, Slack (webhook URL, Send test), Google Calendar (calendar ID, Test). Tokens are write-only fields (never displayed again).
3. **Users:** read-only list from the Sheet with roles and last seen; "Reload users"; "Revoke sessions" per user or all.
4. **Usage:** last 14 days of requests, KV writes, D1 writes, AI neurons, Sheets calls vs free limits; estimated Actions minutes.
5. **Audit log:** filterable by actor, verb, object; export CSV to Outbox.
6. **Data:** Export everything (facts and logs as CSV to Outbox); Delete workspace data.
7. **Extension:** active capture tokens with last used; revoke.

## 5. Settings (from the Workspace Sheet)

Settings live in the Settings tab so non-technical owners edit them in a familiar place; the Admin screen shows the effective values and validation errors (invalid values fall back to defaults with a warning on Data sources).

| Key | Default | Effect |
| --- | --- | --- |
| brand_name | — | Sidebar workspace name |
| timezone | Asia/Kolkata | Day boundaries |
| week_starts_on | Monday | This week window |
| approval_threshold_inr | 1000000 | Approvals |
| sync_every_hours | 6 | Scheduled sync frequency (3, 6, 12, 24) |
| target_cac_inr, target_ltv_to_cac, target_reply_rate | 850, 3, 0.6 | Chips and colours |
| category_label | — | Market subtitle |
| privacy_mode_default | on | Privacy mode default |
| team_calendar_id | — | Calendar executor |
| qa_owner, supply_owner, ads_owner | — | Default owners for task actions (emails) |
| segment_names | — | JSON map to rename customer types |
| ai_polish | off | Narrative polish by AI |
| roas_good_per100, roas_bad_per100 | 250, 160 | Colour thresholds on Impact |

## 6. Secrets and rotation

| Secret | Rotate when | How |
| --- | --- | --- |
| `GOOGLE_SA_JSON` | yearly or on leak | Create a new key on the service account; `wrangler secret put GOOGLE_SA_JSON`; update GitHub secret; delete the old key in Google Cloud |
| `SESSION_SECRET` | on leak | `wrangler secret put`; all users signed out |
| `SYNC_SECRET` | yearly | Update Worker and GitHub together (Worker accepts old and new for 1 hour via `SYNC_SECRET_PREV`) |
| `DATA_KEY` | on leak only | Run `pnpm rotate:data-key` (decrypts tokens with the old key, re-encrypts with the new; hashed customer keys are re-derived at the next full sync) |
| `GITHUB_DISPATCH_TOKEN` | before expiry (fine-grained PATs expire; set 1 year) | New PAT with Actions read/write on this repo only; `wrangler secret put` |
| `CLOUDFLARE_API_TOKEN` | yearly | New token with Workers Scripts edit, D1 edit, KV edit, Workers AI read; update GitHub secret |
| Shopify, Meta, Slack tokens | per platform policy | Admin → Connectors |

## 7. Data retention, export and deletion

- Retention defaults in `06-DATA-MODEL.md` §3; facts are kept for 24 months then trimmed by the sync job (oldest months first).
- **Export:** Admin → Export everything writes every fact table, the Actions log, tests, rules and audit as CSV into `Drishti Outbox/Export-YYYYMMDD/`.
- **Delete workspace data:** Owner types `DELETE <workspace name>`. The Worker deletes all KV keys with the workspace prefix, all D1 rows for the workspace except an audit entry "workspace deleted", revokes sessions and tokens, and posts a checklist to remove the service account's access from the Sheet and folders (Drishti never deletes the brand's own Google files).
- A person asking to remove their review or capture data: captures are deleted by ID from Admin; reviews are the brand's own platform data and are removed by re-syncing after the brand removes them at source.

## 8. Demo administration

- Demo snapshot is rebuilt on every deploy from `sample-data/demo`.
- Demo usage events are counted separately (`events.demo = 1`) for the showcase KRA.
- A Settings flag `demo_enabled` (Worker var) can turn `/demo` off for a brand's private deployment.

## 9. Club handover (PreQL)

The showcase deployment belongs to the club, not an individual:

1. GitHub repo under the PreQL organisation (free) with at least two admins from different batches.
2. Cloudflare account on a club email (free, no card) with two members.
3. Google Cloud project owned by the club email; service account keys rotated at handover.
4. Handover checklist each year (April): rotate secrets (§6), update `OWNER_EMAIL`, transfer the Shopify development store, review `13-STRATEGY-AND-KRAS.md` targets, re-run the end-to-end suite on production, and record the handover in the audit log via Admin → "Record handover".
