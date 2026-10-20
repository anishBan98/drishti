import { formatPct, formatShortDate, t, type Snapshot } from '@drishti/shared';
import { useState } from 'react';
import { ActionCards } from '../components/Actions';
import { Header, Main, SummaryStrip } from '../components/Frame';
import { InsightCard } from '../components/Insight';
import { PillMenu } from '../components/PillMenu';
import ui from '../components/ui.module.css';
import css from './screens.module.css';

const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');

export function Voice({ snapshot }: { snapshot: Snapshot }) {
  const v = snapshot.voice;
  const [selected, setSelected] = useState(
    () => (v.aspects.find((a) => a.tag === t('voice.tag.fix_now')) ?? v.aspects[0])?.id ?? '',
  );
  const a = v.aspects.find((x) => x.id === selected) ?? v.aspects[0]!;
  const half = (n: number) => `${(Math.min(100, Math.abs(n)) / 100) * 50}%`;
  const issueCols = '1.7fr 0.6fr 0.7fr 1fr 0.7fr';
  return (
    <Main>
      <Header title={t('nav.voice')} subtitle={t('ui.voice.subtitle')}>
        <PillMenu
          label={t('ui.filter.all_products')}
          options={[{ value: 'all', label: t('ui.filter.all_products') }]}
          value="all"
          what={t('ui.filter.products')}
        />
        <a
          className={ui.primaryPill}
          style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}
          href="/samples/reviews_export.csv"
          download
        >
          {t('ui.voice.read_all')}
        </a>
      </Header>
      <SummaryStrip verdict={v.verdict} kpis={v.kpis} />
      <div className={ui.body}>
        <div className={`${css.leftTwo} ${css.bottom248}`}>
          <section aria-label={t('ui.voice.title')} className={ui.panel} style={{ padding: '16px 22px 12px' }}>
            <div className={ui.panelHead}>
              <h2 className={ui.h2}>{t('ui.voice.title')}</h2>
              <div className={ui.legend}>
                <span className={ui.legendItem}>
                  <span className={ui.swatch} style={{ background: '#2A78D6' }} />
                  {t('ui.voice.legend.you')}
                </span>
                <span className={ui.legendItem}>
                  <span className={ui.swatch} style={{ background: 'var(--line-3)' }} />
                  {t('ui.voice.legend.category')}
                </span>
              </div>
            </div>
            <div className={css.divHead} aria-hidden="true">
              <span>{t('ui.voice.col.topic')}</span>
              <span style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{t('ui.voice.col.negative')}</span>
                <span>0</span>
                <span>{t('ui.voice.col.positive')}</span>
              </span>
              <span className={css.r}>{t('ui.voice.legend.you')}</span>
              <span className={css.r}>{t('ui.voice.legend.category')}</span>
            </div>
            <div className={css.rows}>
              {v.aspects.map((x) => (
                <button
                  key={x.id}
                  type="button"
                  aria-pressed={x.id === selected}
                  className={css.divRow}
                  onClick={() => setSelected(x.id)}
                >
                  <span className={css.divName}>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>{x.name}</span>
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                      {t('ui.mentions', { n: x.mentions.toLocaleString('en-IN') })}
                    </span>
                  </span>
                  <span
                    className={css.divTrack}
                    role="img"
                    aria-label={`${x.name}: you ${signed(x.us)}, category ${signed(x.category)}`}
                  >
                    <span className={css.divZero} />
                    <span
                      className={css.divYou}
                      style={{
                        background: x.us < 0 ? '#D03B3B' : '#2A78D6',
                        width: half(x.us),
                        left: x.us < 0 ? `calc(50% - ${half(x.us)})` : '50%',
                      }}
                    />
                    <span
                      className={css.divCat}
                      style={{
                        width: half(x.category),
                        left: x.category < 0 ? `calc(50% - ${half(x.category)})` : '50%',
                      }}
                    />
                  </span>
                  <span
                    className={`${css.r} ${css.b}`}
                    style={{ fontSize: 16, color: x.us < 0 ? 'var(--bad)' : 'var(--good)' }}
                  >
                    {signed(x.us)}
                  </span>
                  <span className={css.r} style={{ color: 'var(--muted)' }}>
                    {signed(x.category)}
                  </span>
                </button>
              ))}
            </div>
            <p className={css.footNote}>{t('voice.netsentiment.note')}</p>
          </section>
          <section aria-label={t('ui.voice.issues')} className={`${ui.panel} ${css.tablePanel}`}>
            <div className={css.tableHead}>
              <h2 className={ui.h2}>{t('ui.voice.issues')}</h2>
              <span className={ui.headNote}>{t('ui.voice.issues.note')}</span>
            </div>
            <div className={css.gridHead} style={{ gridTemplateColumns: issueCols }}>
              <span>{t('ui.voice.col.complaint')}</span>
              <span className={css.r}>{t('ui.voice.col.mentions')}</span>
              <span className={css.r}>{t('ui.voice.col.change')}</span>
              <span>{t('ui.voice.col.mostly')}</span>
              <span>{t('ui.voice.col.first')}</span>
            </div>
            <div className={css.rows}>
              {v.issues.map((i) => (
                <div key={i.title} className={css.gridRow} style={{ gridTemplateColumns: issueCols }}>
                  <span className={css.b}>{i.title}</span>
                  <span className={css.r}>{i.mentions}</span>
                  <span className={`${ui.tag} ${ui.bad} ${css.end}`}>
                    {i.is_new || i.change_pct === null ? t('ui.new') : `▲ ${formatPct(i.change_pct, { whole: true })}`}
                  </span>
                  <span>{i.platforms}</span>
                  <span>{formatShortDate(i.first_seen)}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
        <div className={ui.rightCol}>
          <InsightCard title={t('ui.means.colon', { name: a.name })} badge={a.tag} headline={a.headline}>
            <div className={css.quotes}>
              {a.quotes.map((q) => (
                <p key={q.text} className={ui.quote}>
                  “{q.text}” <span className={ui.quoteSrc}>{q.src}</span>
                </p>
              ))}
            </div>
          </InsightCard>
          <ActionCards suggestions={a.suggestions} screen="voice" forName={a.name} />
        </div>
      </div>
    </Main>
  );
}
