import {
  CHANNELS,
  formatMonthYear,
  formatPct,
  round,
  t,
  type Channel,
  type CopyKey,
  type Snapshot,
} from '@drishti/shared';
import type { Context } from '../context';
import { salesByChannel } from '../kpi';
import { daysBetween } from '../windows';
import { kpi } from './common';

// Data sources (docs/11-CONNECTORS.md §1; design 08-data-sources). Freshness is computed from the facts:
// lag = days since the source's last data; daily sources are late when lag exceeds their SLA, and their
// late days count from yesterday; weekly sources count late days beyond their SLA.

interface SourceDef {
  id: string;
  cadence: 'live' | 'daily' | 'weekly' | 'monthly' | 'six_hourly';
  slaDays: number;
  /** Channels whose revenue depends on this source (for "Revenue covered"). */
  channels: Channel[];
  last: (ctx: Context) => string | undefined;
}

const maxDate = (dates: string[]) => dates.reduce((a, d) => (d > a ? d : a), '') || undefined;
const salesLast = (c: Channel) => (ctx: Context) =>
  maxDate(ctx.facts.sales_city_daily.filter((r) => r.channel === c).map((r) => r.date));
const spendLast =
  (...m: string[]) =>
  (ctx: Context) => {
    const per = m.map((x) => maxDate(ctx.facts.spend_city_daily.filter((r) => r.media === x).map((r) => r.date)) ?? '');
    return per.reduce((a, d) => (d < a ? d : a)) || undefined;
  };

export const SOURCES: SourceDef[] = [
  {
    id: 'shopify',
    cadence: 'live',
    slaDays: 1,
    channels: ['own_site'],
    last: (ctx) => maxDate(ctx.facts.orders_own_site.map((o) => o.date)),
  },
  { id: 'amazon_business_report', cadence: 'daily', slaDays: 2, channels: ['amazon'], last: salesLast('amazon') },
  {
    id: 'amazon_brand_analytics',
    cadence: 'weekly',
    slaDays: 9,
    channels: [],
    last: (ctx) => maxDate(ctx.facts.search_share_weekly.map((r) => r.week_ending)),
  },
  { id: 'amazon_ads', cadence: 'daily', slaDays: 2, channels: [], last: spendLast('amazon_ads') },
  { id: 'flipkart_sales', cadence: 'daily', slaDays: 2, channels: ['flipkart'], last: salesLast('flipkart') },
  { id: 'flipkart_ads', cadence: 'daily', slaDays: 2, channels: [], last: spendLast('flipkart_ads') },
  { id: 'nykaa_sales', cadence: 'weekly', slaDays: 9, channels: ['nykaa'], last: salesLast('nykaa') },
  {
    id: 'quick_commerce',
    cadence: 'daily',
    slaDays: 2,
    channels: ['quick_commerce'],
    last: salesLast('quick_commerce'),
  },
  { id: 'meta_google_ads', cadence: 'daily', slaDays: 2, channels: [], last: spendLast('meta', 'google') },
  {
    id: 'creators',
    cadence: 'weekly',
    slaDays: 8,
    channels: [],
    last: (ctx) => maxDate(ctx.ws.creators.map((c) => c.post_date)),
  },
  {
    id: 'watchlist_capture',
    cadence: 'six_hourly',
    slaDays: 1,
    channels: [],
    last: (ctx) => maxDate(ctx.facts.market_captures.map((c) => c.captured_at.slice(0, 10))),
  },
  {
    id: 'google_trends',
    cadence: 'weekly',
    slaDays: 9,
    channels: [],
    last: (ctx) => maxDate((ctx.facts.trends_weekly ?? []).map((r) => r.week)),
  },
  {
    id: 'costs',
    cadence: 'monthly',
    slaDays: 31,
    channels: [],
    last: (ctx) =>
      ctx.facts.products.length && ctx.facts.products.every((p) => p.unit_cost_inr > 0) && ctx.ws.channels.length
        ? ctx.w.d28[1]
        : undefined,
  },
];

export function buildSources(ctx: Context): Snapshot['sources'] {
  return SOURCES.map((s) => {
    const last = s.last(ctx);
    const lag = last ? daysBetween(last, ctx.w.today) : Infinity;
    const status = !last ? 'never' : lag > s.slaDays ? 'late' : 'ok';
    const late_days = !last
      ? 0
      : Math.max(0, lag - (s.cadence === 'weekly' || s.cadence === 'monthly' ? s.slaDays : 1));
    const k = (f: string) => t(`source.${s.id}.${f}` as CopyKey);
    return {
      id: s.id,
      label: k('label'),
      method: k('method'),
      cadence: t(`cadence.${s.cadence}` as CopyKey),
      status,
      late_days: status === 'late' ? late_days : 0,
      ...(last ? { last_received_at: last } : {}),
      feeds: k('feeds'),
      how:
        status === 'late' ? t('source.how.late', { label: k('label'), days: late_days, feeds: k('feeds') }) : k('how'),
      rule: k('rule'),
    };
  });
}

export function buildData(ctx: Context, sources: Snapshot['sources']): Snapshot['data'] {
  const ok = sources.filter((s) => s.status === 'ok' || s.status === 'received');
  const late = sources.filter((s) => s.status !== 'ok' && s.status !== 'received');
  const byChannel = salesByChannel(ctx.facts.sales_city_daily, ctx.w.d28);
  const total = CHANNELS.reduce((a, c) => a + byChannel[c].net_revenue_inr, 0);
  const covered = CHANNELS.filter((c) =>
    SOURCES.filter((s) => s.channels.includes(c)).every((s) => ok.some((o) => o.id === s.id)),
  ).reduce((a, c) => a + byChannel[c].net_revenue_inr, 0);
  const first = ctx.facts.sales_city_daily.reduce((a, r) => (r.date < a ? r.date : a), ctx.w.today);
  const months = Math.round(daysBetween(first, ctx.w.today) / 30.44);
  const rows = Object.values(ctx.facts).reduce((a, v) => a + (Array.isArray(v) ? v.length : 0), 0);
  const names = late.map((s) => s.label);
  return {
    verdict: late.length
      ? {
          tone: 'warn',
          chip: t(late.length === 1 ? 'verdict.one_gap' : 'verdict.gaps', { n: late.length }),
          text: t('data.verdict.gaps', {
            list: names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : names[0]!,
          }),
        }
      : { tone: 'good', chip: t('verdict.all_up_to_date'), text: t('data.verdict.ok') },
    kpis: [
      kpi('up_to_date', 'kpi.up_to_date', ok.length, t('data.of', { n: ok.length, total: sources.length }), {
        note: late.length ? t('note.need_file', { n: late.length }) : t('note.all_sources'),
        tone: late.length ? 'warn' : 'good',
      }),
      kpi(
        'revenue_covered',
        'kpi.revenue_covered',
        total ? covered / total : 0,
        formatPct(total ? covered / total : 0),
        { note: t('note.all_channels'), tone: 'neutral' },
      ),
      kpi('history', 'kpi.history', months, t('data.months', { n: months }), {
        note: t('note.since', { date: formatMonthYear(first) }),
        tone: 'neutral',
      }),
      kpi(
        'rows_stored',
        'kpi.rows_stored',
        rows,
        rows >= 1e6 ? `${round(rows / 1e6, 1)} M` : `${round(rows / 1e3, 1)}k`,
        { tone: 'neutral' },
      ),
      kpi('third_parties', 'kpi.third_parties', 0, t('data.none'), { note: t('note.your_accounts'), tone: 'good' }),
      kpi('cost', 'kpi.cost', 0, '₹0', { note: t('note.no_paid'), tone: 'good' }),
    ],
  };
}
