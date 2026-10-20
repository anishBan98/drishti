import { CHANNELS, CHANNEL_SHORT, formatInr, formatRange, t, type Snapshot } from '@drishti/shared';
import { useState } from 'react';
import { ActionList } from '../components/Actions';
import { Header, Main, SummaryStrip } from '../components/Frame';
import { PillMenu } from '../components/PillMenu';
import { channelChip, lakh } from '../lib/display';
import ui from '../components/ui.module.css';
import css from './screens.module.css';

const crore = (v: number) => `₹${String(Math.round((v / 1e7) * 100) / 100)} Cr`;

export function Bridge({ bridge, channel }: { bridge: Snapshot['week']['bridge']; channel: string }) {
  const [a0, a1] = bridge.axis;
  const pos = (v: number) => ((v - a0) / (a1 - a0)) * 100;
  let run = bridge.prior;
  const rows = bridge.drivers.map((d) => {
    const from = run;
    run += d.value_lakh * 100_000;
    return { d, left: pos(Math.min(from, run)), width: Math.abs(pos(run) - pos(from)) };
  });
  const shown = channel === 'all' ? rows : rows.filter((r) => r.d.channel === channel);
  const mid = Math.round((a0 + a1) / 2 / 1e6) * 1e6;
  return (
    <section aria-label={t('week.bridge.title')} className={ui.panel}>
      <div className={ui.panelHead}>
        <h2 className={ui.h2}>
          {t('week.bridge.title')} <span className={ui.h2unit}>{t('ui.unit.lakh')}</span>
        </h2>
        <div className={ui.legend}>
          <span className={ui.legendItem}>
            <span className={ui.swatch} style={{ background: 'var(--lost)' }} />
            {t('ui.legend.lost')}
          </span>
          <span className={ui.legendItem}>
            <span className={ui.swatch} style={{ background: 'var(--added)' }} />
            {t('ui.legend.added')}
          </span>
        </div>
      </div>
      <div
        className={css.bridgeArea}
        role="img"
        aria-label={t('ui.bridge.aria', {
          prior: formatInr(bridge.prior, { compact: true }),
          now: formatInr(bridge.current, { compact: true }),
        })}
      >
        <div className={css.bridgeOverlay}>
          <div className={css.bridgeLine} style={{ left: `${pos(bridge.prior)}%` }} />
          <div className={css.bridgeLine} style={{ left: `${pos(bridge.current)}%` }} />
          {/* Labels sit outside the pair of lines so they never collide, whichever way the week moved. */}
          <div
            className={css.bridgeLabel}
            style={
              bridge.current < bridge.prior
                ? { left: `calc(${pos(bridge.prior)}% + 8px)` }
                : { right: `calc(${100 - pos(bridge.prior)}% + 8px)` }
            }
          >
            {t('ui.bridge.prior', { value: formatInr(bridge.prior, { compact: true }) })}
          </div>
          <div
            className={`${css.bridgeLabel} ${css.bridgeNow}`}
            style={
              bridge.current < bridge.prior
                ? { right: `calc(${100 - pos(bridge.current)}% + 8px)` }
                : { left: `calc(${pos(bridge.current)}% + 8px)` }
            }
          >
            {t('ui.bridge.now', { value: formatInr(bridge.current, { compact: true }) })}
          </div>
        </div>
        {shown.map(({ d, left, width }) => {
          const chip = channelChip(d.channel);
          const lost = d.value_lakh < 0;
          return (
            <div key={d.id} className={css.bridgeRow} data-driver={d.id}>
              <div className={css.bridgeName}>
                <span>{d.label}</span>
                <span className={ui.chip} style={{ background: chip.bg, color: chip.ink }}>
                  {chip.dot && <span className={ui.chipDot} style={{ background: chip.dot }} />}
                  {d.channel}
                </span>
              </div>
              <div className={css.bridgeTrack}>
                <div
                  className={css.bridgeBar}
                  title={`${d.method}. ${d.evidence.map((e) => e.label).join(' ')}`}
                  style={{ left: `${left}%`, width: `${width}%`, background: lost ? 'var(--lost)' : 'var(--added)' }}
                />
              </div>
              <div className={css.bridgeValue} style={{ color: lost ? 'var(--bad)' : 'var(--good)' }}>
                {lakh(d.value_lakh)}
              </div>
            </div>
          );
        })}
        <div className={css.bridgeAxis}>
          <div className={css.caption}>{t('week.bridge.caption', { pct: Math.round(bridge.explained_pct * 100) })}</div>
          <div className={css.axisLine}>
            <span className={css.axisTick} style={{ left: 0 }}>
              {crore(a0)}
            </span>
            <span className={css.axisTick} style={{ left: `${pos(mid)}%`, transform: 'translateX(-50%)' }}>
              {crore(mid)}
            </span>
            <span className={css.axisTick} style={{ right: 0 }}>
              {crore(a1)}
            </span>
          </div>
          <div />
        </div>
      </div>
    </section>
  );
}

export function ThisWeek({ snapshot }: { snapshot: Snapshot }) {
  const w = snapshot.week;
  const [channel, setChannel] = useState('all');
  const channelOptions = [
    { value: 'all', label: t('ui.filter.all_channels') },
    ...CHANNELS.map((c) => ({ value: CHANNEL_SHORT[c], label: CHANNEL_SHORT[c] })),
  ];
  return (
    <Main>
      <Header title={t('nav.week')} subtitle={t('week.subtitle', { range: formatRange(snapshot.windows.week) })}>
        <PillMenu
          label={t('ui.period.last_week')}
          options={[{ value: 'w', label: t('ui.period.last_week') }]}
          value="w"
          what={t('ui.filter.period')}
        />
        <PillMenu
          label={channelOptions.find((o) => o.value === channel)!.label}
          options={channelOptions}
          value={channel}
          onChange={setChannel}
        />
        <PillMenu
          label={t('ui.filter.all_products')}
          options={[{ value: 'all', label: t('ui.filter.all_products') }]}
          value="all"
          what={t('ui.filter.products')}
        />
      </Header>
      <SummaryStrip verdict={w.verdict} kpis={w.kpis} />
      <div className={ui.body}>
        <div className={css.weekLeft}>
          <Bridge bridge={w.bridge} channel={channel} />
          <section aria-label={`${t('week.working')}, ${t('week.attention')}`} className={css.highlights}>
            <div className={`${css.hl} ${css.hlGood}`}>
              <h2 className={css.hlTitle} style={{ color: 'var(--good)' }}>
                <span aria-hidden="true">▲</span>
                {t('week.working')}
              </h2>
              <div className={css.hlItems}>
                {w.working.map((x) => (
                  <div key={x.title} className={css.hlItem}>
                    <strong>{x.title}</strong>
                    {x.detail}
                  </div>
                ))}
              </div>
            </div>
            <div className={`${css.hl} ${css.hlBad}`}>
              <h2 className={css.hlTitle} style={{ color: 'var(--bad)' }}>
                <span aria-hidden="true">▼</span>
                {t('week.attention')}
              </h2>
              <div className={css.hlItems}>
                {w.attention.map((x) => (
                  <div key={x.title} className={css.hlItem}>
                    <strong>{x.title}</strong>
                    {x.detail}
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
        <div className={ui.rightCol}>
          <section aria-label={t('week.inference.title')} className={ui.insight}>
            <h2 className={ui.insightTitle}>{t('week.inference.title')}</h2>
            <p className={css.inference}>{w.inference}</p>
          </section>
          <ActionList suggestions={w.suggestions} screen="week" />
        </div>
      </div>
    </Main>
  );
}
