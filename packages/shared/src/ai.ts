// Workers AI models and the daily budget (docs/08 §11). AI only writes words; every number comes from code.

export const AI_MODELS = {
  /** Classification and short drafts. */
  small: '@cf/meta/llama-3.2-3b-instruct',
  /** Longer drafts. */
  large: '@cf/meta/llama-3.1-8b-instruct-fp8-fast',
} as const;

/** Neurons per 1,000 tokens (input, output), conservative estimates for the governor. */
export const AI_RATES: Record<keyof typeof AI_MODELS, { in: number; out: number }> = {
  small: { in: 4.6, out: 30.5 },
  large: { in: 4.1, out: 34.9 },
};

/** Daily neuron cap, under the free allocation of 10,000 (docs/08 §11.4). */
export const AI_DAILY_NEURONS = 8000;

export const estimateNeurons = (model: keyof typeof AI_MODELS, inChars: number, maxOutTokens: number) =>
  Math.ceil(((inChars / 4) * AI_RATES[model].in + maxOutTokens * AI_RATES[model].out) / 1000);

/** Numbers in a text, normalised (₹1,23,000 → 123000; 4.4% → 4.4). */
export const numbersIn = (text: string) =>
  (text.match(/\d[\d,]*(?:\.\d+)?/g) ?? []).map((n) => n.replace(/,/g, '')).filter((n) => n.length > 0);

/** The "keep every number" check (docs/08 §11.3): the draft may only use numbers that appear in the facts. */
export function onlyKnownNumbers(draft: string, facts: string): boolean {
  const known = new Set(numbersIn(facts));
  return numbersIn(draft).every((n) => known.has(n));
}
