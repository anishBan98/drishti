import { formatShortDate, t, type Snapshot, type Suggestion } from '@drishti/shared';
import { useState } from 'react';
import { ActionCards } from '../components/Actions';
import { Header, Main, SummaryStrip } from '../components/Frame';
import { InsightCard } from '../components/Insight';
import ui from '../components/ui.module.css';
import { screenSuggestion, useQuickAction } from '../lib/quick-action';
import css from './screens.module.css';

type Source = Snapshot['sources'][number];
const STATUS_TONE: Record<Source['status'], string> = {
  ok: ui.good!,
  received: ui.good!,
  late: ui.bad!,
  never: ui.neutral!,
  error: ui.bad!,
};
const PRIVACY_KEY = 'drishti-privacy';

function statusText(s: Source) {
  return s.status === 'late' ? t('ui.data.status.late', { n: s.late_days }) : t(`ui.data.status.${s.status}`);
}

const addDays = (d: string, n: number) =>
  new Date(Date.parse(`${d}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

/** Actions per source (docs/10 §3 "Data"): late sources get upload and reminder; others a sync. */
function sourceActions(s: Source, through: string): Suggestion[] {
  if (s.status === 'late' || s.status === 'never') {
    const from = s.last_received_at ? addDays(s.last_received_at, 1) : through;
    return [
      screenSuggestion(
        'upload_file',
        `source=${s.id}`,
        t('ui.data.sg.upload.title'),
        t('ui.data.sg.upload.why', { from: formatShortDate(from), to: formatShortDate(through), name: s.label }),
        { source: s.id },
      ),
      screenSuggestion(
        'source_reminder',
        `source=${s.id}`,
        t('ui.data.sg.remind.title'),
        t('ui.data.sg.remind.why'),
        { source: s.id, time: '09:00' },
        { source: s.label },
      ),
    ];
  }
  return [
    screenSuggestion(
      'sync_now',
      `source=${s.id}`,
      t('ui.data.sg.sync.title', { name: s.label }),
      t('ui.data.sg.sync.why'),
      { source: s.id },
    ),
  ];
}

export function DataSources({ snapshot }: { snapshot: Snapshot }) {
  const run = useQuickAction(t('nav.data'));
  const [selected, setSelected] = useState(
    () => (snapshot.sources.find((s) => s.status === 'late') ?? snapshot.sources[0])?.id ?? '',
  );
  const [privacy, setPrivacy] = useState(() => {
    try {
      return localStorage.getItem(PRIVACY_KEY) !== 'off';
    } catch {
      return true;
    }
  });
  const s = snapshot.sources.find((x) => x.id === selected) ?? snapshot.sources[0]!;
  const late = snapshot.sources.filter((x) => x.status === 'late' || x.status === 'never');
  const cols = '1.35fr 1.4fr 0.8fr 0.9fr';
  const togglePrivacy = () => {
    const next = !privacy;
    setPrivacy(next);
    try {
      localStorage.setItem(PRIVACY_KEY, next ? 'on' : 'off');
    } catch {
      /* storage unavailable */
    }
  };
  return (
    <Main>
      <Header title={t('nav.data')} subtitle={t('data.subtitle')}>
        <button
          type="button"
          className={ui.pill}
          onClick={() => run(sourceActions(late[0] ?? s, snapshot.data_through)[0]!)}
        >
          {t('ui.data.upload')}
        </button>
        <button
          type="button"
          className={ui.primaryPill}
          onClick={() =>
            run(
              screenSuggestion(
                'request_files',
                'all',
                t('action.request_files.run'),
                late.map((x) => x.label).join(', '),
                { sources: late.map((x) => x.id) },
              ),
            )
          }
        >
          {t('ui.data.request')}
        </button>
      </Header>
      <SummaryStrip verdict={snapshot.data.verdict} kpis={snapshot.data.kpis} />
      <div className={ui.body}>
        <section aria-label={t('ui.data.sources')} className={`${ui.panel} ${css.tablePanel}`}>
          <div className={css.tableHead}>
            <h2 className={ui.h2}>{t('ui.data.sources')}</h2>
            <span className={ui.headNote}>{t('ui.select_hint.source')}</span>
          </div>
          <div className={css.gridHead} style={{ gridTemplateColumns: cols }}>
            <span>{t('ui.data.col.source')}</span>
            <span>{t('ui.data.col.how')}</span>
            <span>{t('ui.data.col.often')}</span>
            <span>{t('ui.data.col.status')}</span>
          </div>
          <div className={css.rows}>
            {snapshot.sources.map((x) => (
              <button
                key={x.id}
                type="button"
                aria-pressed={x.id === selected}
                className={css.gridRowBtn}
                style={{ gridTemplateColumns: cols }}
                onClick={() => setSelected(x.id)}
              >
                <span className={css.b}>{x.label}</span>
                <span style={{ color: 'var(--ink-2)', fontSize: 14 }}>{x.method}</span>
                <span style={{ color: 'var(--ink-2)', fontSize: 14 }}>{x.cadence}</span>
                <span
                  className={`${ui.chip} ${STATUS_TONE[x.status]}`}
                  style={{ justifySelf: 'start', fontSize: 13, fontWeight: 700 }}
                >
                  <span className={ui.chipDot} style={{ background: 'currentColor' }} />
                  {statusText(x)}
                </span>
              </button>
            ))}
          </div>
        </section>
        <div className={ui.rightCol}>
          <InsightCard
            title={t('ui.data.how_we_get', { name: s.label })}
            badge={s.cadence}
            headline={s.how}
            cells={[
              { label: t('ui.data.cell.feeds'), value: s.feeds },
              { label: t('ui.data.cell.last'), value: s.last_received_at ? formatShortDate(s.last_received_at) : '—' },
            ]}
          >
            <p className={ui.evidence}>{t('ui.data.rule', { rule: s.rule })}</p>
          </InsightCard>
          <ActionCards
            suggestions={sourceActions(s, snapshot.data_through)}
            screen="data"
            forName={s.label}
            footer={
              <div className={css.switchRow}>
                <div>
                  <div className={css.b}>{t('data.privacy')}</div>
                  <div className={css.footNote}>{t('data.privacy.detail')}</div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={privacy}
                  aria-label={t('data.privacy')}
                  className={css.switch}
                  onClick={togglePrivacy}
                >
                  <span className={css.knob} />
                </button>
              </div>
            }
          />
        </div>
      </div>
    </Main>
  );
}
