import { formatInr, formatPct, formatShortDate, t, type Kpi, type Snapshot, type Verdict } from '@drishti/shared';
import { useSearchParams } from 'react-router';
import { Header, Main, SummaryStrip } from '../components/Frame';
import { PillMenu } from '../components/PillMenu';
import { useToast } from '../components/Toast';
import { useWorkspace, shortName } from '../app/workspace';
import { approve, confirmHandoff, decline, stageOf, undo, useActions, type DemoAction } from '../lib/demo-actions';
import { download } from '../lib/outputs';
import ui from '../components/ui.module.css';
import css from './actions.module.css';

/** The Actions tab of the Sheet as CSV (docs/06 §2 Actions columns). */
function actionsSheet(list: DemoAction[]) {
  const cols = [
    'action_id',
    'created_at',
    'screen',
    'type',
    'title',
    'owner',
    'status',
    'expected',
    'measured',
    'readout_date',
  ];
  const esc = (v: unknown) => (/[",\n]/.test(String(v ?? '')) ? `"${String(v).replace(/"/g, '""')}"` : String(v ?? ''));
  const rows = list.map((a) => [
    a.id,
    a.created_at,
    a.screen,
    a.type,
    a.title,
    a.owner,
    a.status,
    a.expected_label,
    a.measured_label ?? '',
    a.readout_date ?? '',
  ]);
  const content = [cols, ...rows].map((r) => r.map(esc).join(',')).join('\n') + '\n';
  return { kind: 'download' as const, label: 'csv', filename: 'drishti-actions.csv', mime: 'text/csv', content };
}

/** "+₹9 L/wk" → monthly rupees, for the summary (labels come from the engine's formatInr). */
export function monthlyFromLabel(label: string | undefined): number {
  const m = /([+−-])?₹([\d.,]+)\s*(Cr|L)?(?:\/(wk|mo))?/.exec(label ?? '');
  if (!m) return 0;
  const v = Number(m[2]!.replace(/,/g, '')) * (m[3] === 'Cr' ? 1e7 : m[3] === 'L' ? 1e5 : 1);
  return (m[1] === '−' || m[1] === '-' ? -v : v) * (m[4] === 'wk' ? 4.33 : 1);
}

const STATUS_TONE: Record<string, string> = {
  awaiting_approval: ui.warn!,
  waiting_on_user: ui.warn!,
  running: ui.blue!,
  measuring: ui.blue!,
  done: ui.good!,
  result: ui.good!,
  failed: ui.bad!,
  undone: ui.neutral!,
  declined: ui.neutral!,
  expired: ui.neutral!,
  suggested: ui.neutral!,
  scheduled: ui.neutral!,
  overdue: ui.bad!,
};
const STAGES = ['stage.suggested', 'stage.approved', 'stage.running', 'stage.measuring', 'stage.result'] as const;

const when = (iso?: string) =>
  iso
    ? new Date(iso)
        .toLocaleString('en-IN', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
          timeZone: 'Asia/Kolkata',
        })
        .replace(/\s(\w{3}),?/, ' $1,')
    : '';

function summary(actions: DemoAction[], today: string): { verdict: Verdict; kpis: Kpi[] } {
  // Declined, undone and expired actions no longer count; assignments are tasks for a person, not runs.
  const live = actions.filter((a) => !['declined', 'undone', 'expired', 'assigned'].includes(a.status));
  const waiting = live.filter((a) => a.status === 'awaiting_approval' || a.status === 'waiting_on_user');
  const run = live.filter((a) => a.status !== 'awaiting_approval');
  const expected = live.reduce((s, a) => s + Math.max(0, monthlyFromLabel(a.expected_label)), 0);
  const confirmed = live.reduce((s, a) => s + Math.max(0, monthlyFromLabel(a.measured_label)), 0);
  const measured = live.filter((a) => a.measured_progress !== undefined && a.measured_label);
  const hits = measured.filter((a) => (a.measured_progress ?? 0) >= 0.5).length;
  const hitRate = measured.length ? hits / measured.length : 0;
  const measuring = live.filter((a) => a.status === 'measuring');
  const next = measuring
    .map((a) => a.readout_date ?? '')
    .filter(Boolean)
    .sort()[0];
  const open = actions.filter((a) => !['declined', 'undone', 'expired'].includes(a.status));
  const overdue = open.filter((a) => (a.due && a.due < today && a.status !== 'done') || a.overdue);
  const first = waiting[0];
  const neutral = (
    id: string,
    label: Parameters<typeof t>[0],
    value: number,
    display: string,
    note: string,
    tone: Kpi['tone'] = 'neutral',
  ): Kpi => ({ id, label: t(label), value, display, note, tone });
  return {
    verdict: first
      ? {
          tone: 'warn',
          chip: t('ui.actions.summary.waiting', { n: waiting.length }),
          text: t('ui.actions.summary.waiting_text', { title: first.title }),
        }
      : { tone: 'good', chip: t('ui.actions.summary.none_waiting'), text: t('ui.actions.summary.ok_text') },
    kpis: [
      neutral(
        'run',
        'ui.actions.kpi.run',
        run.length,
        String(run.length),
        t('ui.actions.note.of_month', { n: live.length }),
      ),
      neutral(
        'expected',
        'ui.actions.kpi.expected',
        expected,
        formatInr(expected, { compact: true }),
        t('ui.actions.note.if_all'),
      ),
      neutral(
        'confirmed',
        'ui.actions.kpi.confirmed',
        confirmed,
        formatInr(confirmed, { compact: true }),
        `▲ ${t('ui.actions.note.measured')}`,
        'good',
      ),
      neutral(
        'hit_rate',
        'ui.actions.kpi.hit_rate',
        hitRate,
        measured.length ? formatPct(hitRate) : '—',
        t('ui.actions.note.target'),
        hitRate >= 0.6 ? 'good' : 'warn',
      ),
      neutral(
        'measuring',
        'ui.actions.kpi.measuring',
        measuring.length,
        String(measuring.length),
        next ? t('ui.actions.note.next', { date: formatShortDate(next) }) : t('ui.actions.note.none'),
      ),
      neutral(
        'overdue',
        'ui.actions.kpi.overdue',
        overdue.length,
        String(overdue.length),
        overdue[0]?.title ?? t('ui.actions.note.none'),
        overdue.length ? 'bad' : 'good',
      ),
    ],
  };
}

export function Actions({ snapshot }: { snapshot: Snapshot }) {
  const ws = useWorkspace();
  const toast = useToast();
  const actions = useActions();
  const [params, setParams] = useSearchParams();
  const today = snapshot.windows.d28[1];
  const selectedId = params.get('id') ?? actions[0]?.id;
  const a = actions.find((x) => x.id === selectedId) ?? actions[0];
  const s = summary(actions, today);
  const cols = '3fr 0.8fr 0.75fr 0.95fr 0.85fr 0.95fr';
  const stage = a ? stageOf(a) : 0;
  return (
    <Main>
      <Header title={t('actions.title')} subtitle={t('actions.subtitle')}>
        <PillMenu
          label={t('ui.period.month')}
          options={[{ value: 'm', label: t('ui.period.month') }]}
          value="m"
          what={t('ui.filter.period')}
        />
        <button
          type="button"
          className={ui.primaryPill}
          onClick={() => {
            download(actionsSheet(actions));
            toast(t('ui.toast.downloaded', { file: 'drishti-actions.csv' }));
          }}
        >
          {t('ui.actions.open_sheet')}
        </button>
      </Header>
      <SummaryStrip verdict={s.verdict} kpis={s.kpis} />
      <div className={ui.body}>
        <section aria-label={t('ui.actions.log')} className={`${ui.panel} ${css.log}`}>
          <div className={ui.panelHead}>
            <h2 className={ui.h2}>{t('ui.actions.log')}</h2>
            <span className={ui.headNote}>{t('ui.actions.log.note')}</span>
          </div>
          <div className={css.head} style={{ gridTemplateColumns: cols }}>
            <div>{t('ui.actions.col.action')}</div>
            <div>{t('ui.actions.col.from')}</div>
            <div>{t('ui.actions.col.owner')}</div>
            <div>{t('ui.actions.col.status')}</div>
            <div className={css.r}>{t('ui.actions.col.expected')}</div>
            <div className={css.r}>{t('ui.actions.col.measured')}</div>
          </div>
          <div className={css.rows}>
            {actions.length === 0 && <p className={ui.empty}>{t('ui.actions.empty')}</p>}
            {actions.slice(0, 9).map((x) => (
              <button
                key={x.id}
                type="button"
                aria-pressed={x.id === a?.id}
                className={css.row}
                style={{ gridTemplateColumns: cols }}
                onClick={() => setParams({ id: x.id })}
              >
                <span className={css.title}>
                  <span className={css.titleText}>
                    {x.title}
                    {x.demo && <span className={css.demoTag}>{t('ui.action.demo_tag')}</span>}
                  </span>
                  <span className={css.how}>{x.how}</span>
                </span>
                <span className={css.cell}>{x.screen}</span>
                <span className={css.cell}>{x.owner}</span>
                <span className={`${ui.tag} ${STATUS_TONE[x.status] ?? ui.neutral}`} style={{ justifySelf: 'start' }}>
                  {t(`status.${x.status}` as Parameters<typeof t>[0])}
                </span>
                <span className={`${css.cell} ${css.r}`}>{x.expected_label}</span>
                <span
                  className={`${css.cell} ${css.r}`}
                  style={{
                    fontWeight: 700,
                    color: x.status === 'overdue' ? 'var(--bad)' : x.measured_label ? 'var(--good)' : 'var(--muted)',
                  }}
                >
                  {x.measured_label ?? '—'}
                </span>
              </button>
            ))}
          </div>
        </section>
        <div className={ui.rightCol}>
          {a && (
            <section aria-label={a.title} className={ui.insight} style={{ gap: 12 }}>
              <div className={ui.insightHead}>
                <h2 className={ui.insightTitle}>{a.how}</h2>
                <span className={ui.insightBadge}>{a.screen}</span>
              </div>
              <p className={css.selTitle}>{a.title}</p>
              <ol aria-label={t('actions.lifecycle')} className={css.lifecycle}>
                {STAGES.map((k, i) => (
                  <li key={k} className={css.stage}>
                    <span
                      className={css.stageBar}
                      style={{ background: i <= stage ? '#5FE39A' : 'rgba(255,255,255,0.2)' }}
                    />
                    <span
                      className={css.stageLabel}
                      style={{
                        fontWeight: i === stage ? 700 : 500,
                        color: i <= stage ? '#fff' : 'var(--insight-muted)',
                      }}
                    >
                      {t(k)}
                    </span>
                  </li>
                ))}
              </ol>
              <div className={css.measured}>
                <div className={css.measuredLabel}>{t('ui.actions.measured_vs')}</div>
                <div className={css.measuredRow}>
                  <span className={css.measuredValue}>{a.measured_label ?? '—'}</span>
                  <span className={css.expected}>
                    {t('ui.actions.expected_short', { value: a.expected_label || '—' })}
                  </span>
                </div>
                <div className={css.track}>
                  <div
                    className={css.fill}
                    style={{ width: `${Math.min(100, Math.max(0, (a.measured_progress ?? 0) * 100))}%` }}
                  />
                </div>
                {a.readout_text ? (
                  <div className={css.readout}>{a.readout_text}</div>
                ) : (
                  a.readout_date && (
                    <div className={css.readout}>
                      {t('ui.actions.readout', { text: formatShortDate(a.readout_date) })}
                    </div>
                  )
                )}
              </div>
            </section>
          )}
          {a && (
            <section aria-label={t('ui.actions.did')} className={`${ui.panel} ${css.did}`}>
              <div className={ui.panelHead}>
                <h2 className={ui.h2}>{t('ui.actions.did')}</h2>
                <span className={ui.headNote}>{t('ui.actions.owner', { name: a.owner })}</span>
              </div>
              <ol className={css.steps} data-testid="did-steps">
                {a.steps.map((st, i) => (
                  <li key={i} className={css.step}>
                    <span className={st.done ? css.tick : css.todo}>{st.done ? '✓' : ''}</span>
                    <span style={{ color: st.done ? 'var(--ink)' : 'var(--muted)' }}>{st.text}</span>
                    <span className={css.at}>{st.done ? when(st.at) : ''}</span>
                  </li>
                ))}
              </ol>
              <div className={css.footer}>
                {a.status === 'awaiting_approval' && (
                  <>
                    <button
                      type="button"
                      className={ui.btnPrimary}
                      onClick={() => approve(a.id, shortName(ws.approver.name))}
                    >
                      {t('ui.actions.approve')}
                    </button>
                    <button type="button" className={ui.btnSecondary} onClick={() => decline(a.id)}>
                      {t('ui.actions.decline')}
                    </button>
                  </>
                )}
                {a.status === 'waiting_on_user' && (
                  <button type="button" className={ui.btnPrimary} onClick={() => confirmHandoff(a.id)}>
                    {t('action.handoff.confirm')}
                  </button>
                )}
                {a.undoable && (a.status === 'done' || a.status === 'measuring') && (
                  <button type="button" className={ui.btnSecondary} onClick={() => undo(a.id)}>
                    {t('ui.actions.undo')}
                  </button>
                )}
                {a.outputs.map((o) => (
                  <button key={o.label} type="button" className={ui.btnSecondary} onClick={() => download(o)}>
                    {t('ui.actions.open_output', { label: o.label })}
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </Main>
  );
}
