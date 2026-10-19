import type { AspectId, Review, ReviewAspect } from '../facts/types';

// Lexicon tagging (docs/08-METHODS.md §8.1–8.2, pass 1). English + Hinglish keywords per aspect; sentiment from a
// polarity lexicon with negation (3-token window) and the star rating as a prior. The AI pass arrives in M8.

export const ASPECTS: AspectId[] = [
  'pump_packaging',
  'gentle',
  'results',
  'texture',
  'fragrance',
  'value',
  'delivery',
  'oxidation',
  'size_claim',
  'authenticity',
];

const KEYWORDS: Record<AspectId, RegExp> = {
  pump_packaging: /\b(pump|dispenser|nozzle|stuck|cap|packaging|pump kharab|kaam nahi)\b/i,
  gentle: /\b(gentle|sensitive|sting|stung|stings|irritat\w*|redness|soothing|calm|mild|burn\w*|rash|no reaction)\b/i,
  results:
    /\b(results?|difference|glow\w*|bright\w*|spots?|pigment\w*|did anything|visible|fade[ds]?|works wonders)\b/i,
  texture: /\b(texture|watery|sticky|absorbs?|greasy|lightweight|thick|runny|non-sticky)\b/i,
  fragrance: /\b(smell\w*|fragrance|scent\w*|odou?r)\b/i,
  value: /\b(expensive|cheap\w*|price\w*|value|worth|affordable|costly|quantity|₹\d+)/i,
  delivery: /\b(deliver\w*|arrived|late|seal|courier|shipping|box|transit|wet)\b/i,
  oxidation: /\b(orange|colou?r changed|oxidi[sz]\w*|turned dark|darken\w*)\b/i,
  size_claim: /\b(smaller|bigger|size|looks bigger|tiny bottle|less quantity)\b/i,
  authenticity: /\b(fake|original|authentic|duplicate|counterfeit|nakli)\b/i,
};

const POSITIVE =
  /\b(love\w*|great|good|smooth\w*|gentle|absorbs|works|glow\w*|brighter|soft|calm\w*|worth|amazing|best|happy|nice|fresh|light)\b/gi;
const NEGATIVE =
  /\b(hate|stuck|broke\w*|leak\w*|late|expensive|watery|sticky|stung|sting\w*|orange|open|wet|problem|stopped|smaller|fake|bad|worse|worst|irritat\w*|burn\w*|rash|greasy|nothing|kharab|disappoint\w*|waste|pour)\b/gi;
const NEGATION = /\b(no|not|never|without|isn't|wasn't|don't|didn't|nahi)\b/i;

/** Sentences of a review. */
function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|,\s*(?:but|however)\s+|;\s*/i)
    .map((s) => s.trim())
    .filter(Boolean);
}

function polarity(sentence: string): number {
  const tokens = sentence.toLowerCase().split(/\s+/);
  let score = 0;
  const scan = (re: RegExp, sign: number) => {
    for (const m of sentence.matchAll(re)) {
      const at = sentence.slice(0, m.index).split(/\s+/).length - 1;
      const window = tokens.slice(Math.max(0, at - 3), at).join(' ');
      score += NEGATION.test(window) ? -sign : sign;
    }
  };
  scan(POSITIVE, 1);
  scan(NEGATIVE, -1);
  return score;
}

/** Aspect tags for one review (lexicon pass). */
export function tagReview(review: Pick<Review, 'text' | 'rating'>): ReviewAspect[] {
  const prior = review.rating <= 2 ? -1 : review.rating >= 4 ? 1 : 0;
  const found = new Map<AspectId, number>();
  for (const s of sentences(review.text)) {
    const p = polarity(s);
    for (const aspect of ASPECTS) {
      if (!KEYWORDS[aspect].test(s)) continue;
      const sentiment = p > 0 ? 1 : p < 0 ? -1 : prior;
      // Star rating is a prior: 1–2★ stays negative unless positive words dominate; 4–5★ the reverse.
      const s2 = prior === -1 && p <= 0 ? -1 : prior === 1 && p >= 0 && sentiment !== -1 ? 1 : sentiment;
      found.set(aspect, (found.get(aspect) ?? 0) + s2);
    }
  }
  return [...found].map(([aspect, v]) => ({
    aspect,
    sentiment: (v > 0 ? 1 : v < 0 ? -1 : 0) as -1 | 0 | 1,
    source: 'lexicon',
  }));
}

/** Tags every review in place (returns the same array). */
export function tagReviews<T extends Review>(reviews: T[]): T[] {
  for (const r of reviews) if (!r.aspects.length) r.aspects = tagReview(r);
  return reviews;
}
