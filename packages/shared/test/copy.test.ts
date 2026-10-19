import { describe, expect, it } from 'vitest';
import { copy, t } from '../src/copy';

describe('copy deck', () => {
  it('has the tagline from docs/09 §10', () => {
    expect(copy['app.tagline']).toBe('See what really worked.');
  });

  it('fills placeholders', () => {
    expect(t('week.bridge.caption', { pct: 86 })).toBe('Explains 86% of the change');
    expect(t('nav.footer', { when: 'today, 7:10 am' })).toBe(
      'Your data stays in your own accounts. Synced today, 7:10 am.',
    );
  });

  it('leaves unknown placeholders untouched', () => {
    expect(t('market.subtitle', { category: 'Face serums' })).toBe(
      'Face serums on Amazon, Flipkart and Nykaa. {n} products on your watchlist.',
    );
  });

  it('has no empty strings', () => {
    for (const [key, value] of Object.entries(copy)) expect(value.trim(), key).not.toBe('');
  });
});
