import type { Channel } from '@drishti/shared';
import { parseBool, parseCsvObjects, parseDate, parseNumber } from '../csv';
import type { CreatorPost } from './types';

// Workspace Sheet tabs (docs/06-DATA-MODEL.md §2). In the demo they come from sample-data/workspace/*.csv;
// in a real workspace the sync job reads the same tabs with the Sheets API.

export interface Settings {
  brand_name: string;
  week_starts_on: 'monday' | 'sunday';
  approval_threshold_inr: number;
  sync_every_hours: number;
  target_cac_inr: number;
  target_ltv_to_cac: number;
  target_reply_rate: number;
  category_label: string;
  privacy_mode_default: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  brand_name: 'Your brand',
  week_starts_on: 'monday',
  approval_threshold_inr: 1_000_000,
  sync_every_hours: 6,
  target_cac_inr: 850,
  target_ltv_to_cac: 3,
  target_reply_rate: 0.6,
  category_label: 'Your category',
  privacy_mode_default: true,
};

export interface ChannelCost {
  channel: Channel;
  label: string;
  commission_pct: number;
  payment_fee_pct: number;
  shipping_per_order_inr: number;
  other_pct: number;
}

export interface WatchItem {
  watch_id: string;
  label: string;
  brand: string;
  platform: string;
  url: string;
  pack_ml: number;
  is_us: boolean;
  capture_method: 'extension' | 'site_json';
}

export interface PlannedTest {
  test_id: string;
  name: string;
  design: 'geo_holdout' | 'geo_boost' | 'pre_post';
  media: string;
  test_regions: string[];
  control_regions: string;
  start_date: string;
  end_date: string;
  status: string;
}

export interface CalendarEvent {
  start_date: string;
  end_date: string;
  event: string;
  channel: string;
  type: 'sale' | 'festival' | 'launch' | 'other';
}

export interface Target {
  kpi: string;
  period: string;
  target: number;
}

export interface Workspace {
  settings: Settings;
  channels: ChannelCost[];
  watchlist: WatchItem[];
  tests: PlannedTest[];
  calendar: CalendarEvent[];
  targets: Target[];
  creators: CreatorPost[];
}

export type ReadTab = (tab: string) => string | undefined;

const list = (v: string | undefined) =>
  (v ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

/** Reads the Sheet tabs; a missing tab falls back to defaults (settings) or an empty list. */
export function loadWorkspace(read: ReadTab): Workspace {
  const tab = (name: string) => {
    const text = read(name);
    return text ? parseCsvObjects(text).rows : [];
  };

  const settings = { ...DEFAULT_SETTINGS };
  for (const { key, value = '' } of tab('settings')) {
    const n = parseNumber(value);
    switch (key) {
      case 'brand_name':
      case 'category_label':
        if (value) settings[key] = value;
        break;
      case 'week_starts_on':
        settings.week_starts_on = /^sun/i.test(value) ? 'sunday' : 'monday';
        break;
      case 'approval_threshold_inr':
      case 'target_cac_inr':
      case 'target_ltv_to_cac':
      case 'target_reply_rate':
        if (n !== null) settings[key] = n;
        break;
      case 'sync_every_hours':
        if (n !== null && [3, 6, 12, 24].includes(n)) settings.sync_every_hours = n;
        break;
      case 'privacy_mode_default':
        settings.privacy_mode_default = value === '' ? true : /^(on|yes|true|1)$/i.test(value);
        break;
    }
  }

  return {
    settings,
    channels: tab('channels').map((r) => ({
      channel: r.channel as Channel,
      label: r.label ?? '',
      commission_pct: parseNumber(r.commission_pct) ?? 0,
      payment_fee_pct: parseNumber(r.payment_fee_pct) ?? 0,
      shipping_per_order_inr: parseNumber(r.shipping_per_order_inr) ?? 0,
      other_pct: parseNumber(r.other_pct) ?? 0,
    })),
    watchlist: tab('watchlist').map((r) => ({
      watch_id: r.watch_id ?? '',
      label: r.label ?? '',
      brand: r.brand ?? '',
      platform: r.platform ?? '',
      url: r.url ?? '',
      pack_ml: parseNumber(r.pack_ml) ?? 0,
      is_us: parseBool(r.is_us),
      capture_method: r.capture_method === 'site_json' ? 'site_json' : 'extension',
    })),
    tests: tab('tests').map((r) => ({
      test_id: r.test_id ?? '',
      name: r.name ?? '',
      design: (r.design as PlannedTest['design']) || 'geo_holdout',
      media: r.media ?? '',
      test_regions: list(r.test_regions),
      control_regions: r.control_regions ?? '',
      start_date: parseDate(r.start_date) ?? '',
      end_date: parseDate(r.end_date) ?? '',
      status: r.status ?? '',
    })),
    calendar: tab('calendar').map((r) => ({
      start_date: parseDate(r.start_date) ?? '',
      end_date: parseDate(r.end_date) ?? '',
      event: r.event ?? '',
      channel: r.channel ?? 'all',
      type: (r.type as CalendarEvent['type']) || 'other',
    })),
    targets: tab('targets').map((r) => ({
      kpi: r.kpi ?? '',
      period: r.period ?? '',
      target: parseNumber(r.target) ?? 0,
    })),
    creators: tab('creators').map((r) => ({
      post_date: parseDate(r.post_date) ?? '',
      creator: r.creator ?? '',
      handle: r.handle ?? '',
      platform: r.platform ?? '',
      followers: parseNumber(r.followers) ?? 0,
      audience_cities: list(r.audience_cities),
      cost_inr: Math.round(parseNumber(r.cost_inr) ?? 0),
      product_sku: r.product_sku ?? '',
      post_url: r.post_url ?? '',
      discount_code: r.discount_code ?? '',
    })),
  };
}
