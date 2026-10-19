// Sales channels and ad media (docs/06 §1.1, §1.3) with display labels and fixed colours (docs/09 §2).

export const CHANNELS = ['own_site', 'amazon', 'quick_commerce', 'nykaa', 'flipkart'] as const;
export type Channel = (typeof CHANNELS)[number];

export const CHANNEL_LABEL: Record<Channel, string> = {
  own_site: 'Own site',
  amazon: 'Amazon',
  quick_commerce: 'Quick commerce',
  nykaa: 'Nykaa',
  flipkart: 'Flipkart',
};
export const CHANNEL_SHORT: Record<Channel, string> = { ...CHANNEL_LABEL, quick_commerce: 'Quick com.' };
export const CHANNEL_COLOR: Record<Channel, string> = {
  own_site: '#2A78D6',
  amazon: '#EB6834',
  quick_commerce: '#1BAF7A',
  nykaa: '#EDA100',
  flipkart: '#E87BA4',
};

export const MEDIA = ['meta', 'google', 'amazon_ads', 'flipkart_ads', 'qc_ads', 'creators'] as const;
export type Media = (typeof MEDIA)[number];
export const MEDIA_LABEL: Record<Media, string> = {
  meta: 'Meta',
  google: 'Google',
  amazon_ads: 'Amazon Ads',
  flipkart_ads: 'Flipkart Ads',
  qc_ads: 'Quick-commerce ads',
  creators: 'Creators',
};
/** Channel each medium mainly sells into (for bridge chips). */
export const MEDIA_CHANNEL: Record<Media, Channel> = {
  meta: 'own_site',
  google: 'own_site',
  amazon_ads: 'amazon',
  flipkart_ads: 'flipkart',
  qc_ads: 'quick_commerce',
  creators: 'own_site',
};
