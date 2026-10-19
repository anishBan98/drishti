import { t, type Suggestion } from '@drishti/shared';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { shortName, useWorkspace } from '../app/workspace';
import { actionForSuggestion, assign, confirmHandoff, runSuggestion, useActions, type DemoAction } from '../lib/demo-actions';
import { impactTone } from '../lib/display';
import { download } from '../lib/outputs';
import { screenHref, type ScreenId } from './Frame';
import { useToast } from './Toast';
import css from './actions.module.css';
import ui from './ui.module.css';

// Where a suggestion's evidence lives (docs/10 §3 "Screen(s)").
const EVIDENCE_SCREEN: Record<string, ScreenId> = {
  amazon_coupon: 'market',
  price_alert: 'market',
  listing_update: 'market',
  qa_hold: 'voice',
  reply_drafts: 'voice',
  restock_request: 'performance',
  qc_ads_pause: 'impact',
  budget_shift: 'impact',
  budget_change: 'impact',
  geo_test: 'impact',
  creator_budget: 'impact',
  shopify_discount_cap: 'customers',
  cod_otp: 'customers',
  audience_export: 'customers',
};

function ImpactTag({ label }: { label: string }) {
  if (!label) return null;
  return <span className={`${css.tag} ${css[impactTone(label)]}`}>{label}</span>;
}

/** Run → confirm → running → result, for one suggestion (docs/09 §5.1). */
function ActionControls({ s, screen, evidence }: { s: Suggestion; screen: ScreenId; evidence?: boolean }) {
  const ws = useWorkspace();
  const navigate = useNavigate();
  const toast = useToast();
  const actions = useActions();
  const action = actionForSuggestion(actions, s.id);
  const [confirming, setConfirming] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const viewInActions = (
    <Link to={screenHref(ws.base, 'actions') + (action ? `?id=${action.id}` : '')} className={ui.linkBtn}>
      {t('action.done_link')}
    </Link>
  );

  const run = () => {
    setConfirming(false);
    runSuggestion(s, { screen: t(`nav.${screen}`), owner: shortName(ws.me.name), approver: shortName(ws.approver.name), snapshotName: '' });
  };

  let state: JSX.Element;
  if (!action) {
    state = confirming ? (
      <div className={css.confirm} data-testid="confirm">
        <span className={css.confirmLead}>{t('action.confirm.lead')}</span>
        <ol className={css.steps}>
          {s.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        {s.impactLabel && <span className={css.note}>{t('ui.action.expected', { value: s.impactLabel })}</span>}
        {s.needsApproval && <span className={css.warnNote}>{t('ui.action.approval_note')}</span>}
        <div className={css.buttons}>
          <button type="button" className={ui.btnPrimary} onClick={run}>
            {t('action.run')}
          </button>
          <button type="button" className={ui.btnSecondary} onClick={() => setConfirming(false)}>
            {t('action.cancel')}
          </button>
        </div>
      </div>
    ) : (
      <div className={css.buttons}>
        <button type="button" className={ui.btnPrimary} onClick={() => setConfirming(true)}>
          {s.runLabel}
        </button>
        <button type="button" className={ui.btnSecondary} aria-expanded={assigning} onClick={() => setAssigning((a) => !a)}>
          {t('action.assign.run')}
        </button>
        {evidence && EVIDENCE_SCREEN[s.type] && (
          <button type="button" className={ui.linkBtn} onClick={() => navigate(screenHref(ws.base, EVIDENCE_SCREEN[s.type]!))}>
            {t('ui.evidence')}
          </button>
        )}
      </div>
    );
  } else {
    state = <ActionProgress action={action} viewInActions={viewInActions} />;
  }

  return (
    <>
      {state}
      {assigning && !action && (
        <AssignPicker
          onSave={(owner, due) => {
            setAssigning(false);
            assign(undefined, s, owner, due, t(`nav.${screen}`));
            toast(t('ui.action.assigned', { name: owner, date: due }));
          }}
          onCancel={() => setAssigning(false)}
        />
      )}
    </>
  );
}

export function ActionProgress({ action, viewInActions }: { action: DemoAction; viewInActions?: JSX.Element }) {
  const toast = useToast();
  const outputs = action.outputs.length > 0 && (
    <div className={css.outputs}>
      {action.outputs.map((o) => (
        <button
          key={o.label}
          type="button"
          className={css.outputBtn}
          onClick={() => {
            download(o);
            if (o.filename) toast(t('ui.toast.downloaded', { file: o.filename }));
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
  const steps = (
    <ol className={css.steps} data-testid="steps">
      {action.steps.map((st, i) => (
        <li key={i} className={st.done ? css.stepDone : undefined}>
          {st.text}
        </li>
      ))}
    </ol>
  );
  switch (action.status) {
    case 'running':
      return (
        <div className={css.confirm}>
          <div className={css.buttons}>
            <button type="button" className={ui.btnPrimary} disabled aria-busy="true">
              <span className={ui.spinner} aria-hidden="true" />
              {t('ui.action.working')}
            </button>
          </div>
          {steps}
        </div>
      );
    case 'awaiting_approval':
      return (
        <div className={css.buttons}>
          <span className={css.waitChip}>{t('action.waiting_approval', { name: action.approver ?? '' })}</span>
          {viewInActions}
        </div>
      );
    case 'waiting_on_user':
      return (
        <div className={css.confirm}>
          {steps}
          {outputs}
          <div className={css.buttons}>
            <button type="button" className={ui.btnPrimary} onClick={() => confirmHandoff(action.id)}>
              {t('action.handoff.confirm')}
            </button>
            {viewInActions}
          </div>
        </div>
      );
    case 'failed':
      return <span className={css.failed}>{t('action.failed', { reason: t('error.INTERNAL', { request_id: action.id }) })}</span>;
    case 'undone':
      return <span className={css.greyPill}>{t('ui.action.undone')}</span>;
    case 'declined':
      return <span className={css.greyPill}>{t('status.declined')}</span>;
    default:
      return (
        <div className={css.buttons} data-testid="done">
          <span className={css.donePill}>✓ {doneLabel(action)}</span>
          {outputs}
          {viewInActions}
        </div>
      );
  }
}

function doneLabel(a: DemoAction): string {
  if (a.type === 'assign') return t('ui.action.assigned', { name: a.owner, date: a.due ?? '' });
  const key = `action.${a.type}.done`;
  return t(key as Parameters<typeof t>[0]);
}

export function AssignPicker({ onSave, onCancel }: { onSave: (owner: string, due: string) => void; onCancel: () => void }) {
  const ws = useWorkspace();
  const [owner, setOwner] = useState(shortName(ws.users[0]?.name ?? ws.me.name));
  const [due, setDue] = useState(() => new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10));
  return (
    <div className={css.assign} data-testid="assign-picker">
      <label>
        {t('ui.action.assign.title')}{' '}
        <select className={css.select} value={owner} onChange={(e) => setOwner(e.target.value)}>
          {ws.users.map((u) => (
            <option key={u.email} value={shortName(u.name)}>
              {shortName(u.name)} · {u.role}
            </option>
          ))}
        </select>
      </label>
      <label>
        {t('ui.action.assign.due')} <input type="date" className={css.date} value={due} onChange={(e) => setDue(e.target.value)} />
      </label>
      <button type="button" className={ui.btnPrimary} onClick={() => onSave(owner, due)}>
        {t('ui.action.assign.save')}
      </button>
      <button type="button" className={ui.btnSecondary} onClick={onCancel}>
        {t('action.cancel')}
      </button>
    </div>
  );
}

/** This week: accordion with one item open (docs/09 §5 ActionList). */
export function ActionList({ suggestions, screen }: { suggestions: Suggestion[]; screen: ScreenId }) {
  const ws = useWorkspace();
  const actions = useActions();
  const [open, setOpen] = useState(suggestions[0]?.id);
  const done = suggestions.filter((s) => actionForSuggestion(actions, s.id)).length;
  return (
    <section aria-label={t('ui.suggested')} className={css.panel}>
      <div className={css.head}>
        <h2 className={css.h2}>{t('ui.suggested')}</h2>
        <span className={css.headNote}>
          {t('ui.suggested.done_of', { done, n: suggestions.length })} · <Link to={screenHref(ws.base, 'actions')}>{t('ui.action_log')}</Link>
        </span>
      </div>
      <div className={css.list}>
        {suggestions.map((s) => {
          const isOpen = open === s.id;
          return (
            <div key={s.id} className={`${css.item} ${isOpen ? css.itemOpen : ''}`} data-suggestion={s.type}>
              <button type="button" aria-expanded={isOpen} className={css.row} onClick={() => setOpen(isOpen ? undefined : s.id)}>
                <span className={css.dot} style={{ background: impactTone(s.impactLabel) === 'bad' ? 'var(--lost)' : 'var(--added)' }} />
                <span className={css.rowTitle}>{s.title}</span>
                <ImpactTag label={s.impactLabel} />
              </button>
              {isOpen && (
                <div className={css.detail}>
                  <p className={css.why}>
                    {s.why} <span className={css.conf}>{t('ui.confidence.value', { value: t(`ui.confidence.${s.confidence}`) })}</span>
                  </p>
                  {s.evidence.length > 0 && (
                    <ul className={css.evidence}>
                      {s.evidence.map((e) => (
                        <li key={e.label}>{e.label}</li>
                      ))}
                    </ul>
                  )}
                  <ActionControls s={s} screen={screen} evidence />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** Other screens: two cards for the selected item, with a footer slot (docs/09 §6.3–6.8). */
export function ActionCards({ suggestions, screen, forName, footer }: { suggestions: Suggestion[]; screen: ScreenId; forName: string; footer?: JSX.Element }) {
  const ws = useWorkspace();
  return (
    <section aria-label={t('ui.suggested')} className={css.panel}>
      <div className={css.head}>
        <h2 className={css.h2}>{t('ui.suggested')}</h2>
        <span className={css.headNote}>
          {t('ui.suggested.for', { name: forName })} · <Link to={screenHref(ws.base, 'actions')}>{t('ui.action_log')}</Link>
        </span>
      </div>
      <div className={css.cards}>
        {suggestions.slice(0, 2).map((s) => (
          <div key={s.id} className={css.card} data-suggestion={s.type}>
            <div className={css.cardHead}>
              <h3 className={css.cardTitle}>{s.title}</h3>
              <ImpactTag label={s.impactLabel} />
            </div>
            <p className={css.why}>{s.why}</p>
            <ActionControls s={s} screen={screen} />
          </div>
        ))}
      </div>
      {footer}
    </section>
  );
}
