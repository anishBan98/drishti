import { AI_DAILY_NEURONS, AI_MODELS, estimateNeurons, onlyKnownNumbers } from '@drishti/shared';
import type { Env } from '../env';

// Workers AI with the daily budget governor (docs/08 §11.4) and the "keep every number" check (§11.3).

const today = () => new Date().toISOString().slice(0, 10);

/** Reserves neurons for one call; false when today's budget would be exceeded. */
async function reserve(env: Env, neurons: number): Promise<boolean> {
  const day = today();
  const row = await env.DB.prepare("SELECT value FROM usage_daily WHERE day = ? AND metric = 'ai_neurons'")
    .bind(day)
    .first<{ value: number }>();
  if ((row?.value ?? 0) + neurons > AI_DAILY_NEURONS) return false;
  await env.DB.prepare(
    "INSERT INTO usage_daily (day, metric, value) VALUES (?, 'ai_neurons', ?) ON CONFLICT(day, metric) DO UPDATE SET value = value + excluded.value",
  )
    .bind(day, neurons)
    .run();
  return true;
}

const SUMMARY_SYSTEM =
  'You write the summary of a short business brief for an Indian D2C brand. Use only the facts given. ' +
  'Write two short paragraphs in plain Indian English, under 110 words in total. Do not add any number that is not ' +
  'in the facts. No headings, no lists, no other text.';

/**
 * A two-paragraph summary written from bullet facts (docs/08 §11.3), or null when AI is unavailable, over budget,
 * or the draft used a number that is not in the facts.
 */
export async function draftSummary(env: Env, facts: string): Promise<string | null> {
  if (!env.AI || !facts.trim()) return null;
  const maxOut = 220;
  if (!(await reserve(env, estimateNeurons('large', facts.length + SUMMARY_SYSTEM.length, maxOut)))) return null;
  try {
    const res = (await env.AI.run(
      AI_MODELS.large as Parameters<Ai['run']>[0],
      {
        messages: [
          { role: 'system', content: SUMMARY_SYSTEM },
          { role: 'user', content: facts.slice(0, 4000) },
        ],
        max_tokens: maxOut,
      } as never,
    )) as { response?: string };
    const text = res.response?.trim();
    if (!text || !onlyKnownNumbers(text, facts)) return null;
    return text;
  } catch {
    return null;
  }
}
