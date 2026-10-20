import { formatInr, formatPct, t, type Snapshot } from '@drishti/shared';

// "Spot the real rupee": four rounds built from the demo snapshot, one per thing Drishti does. Every number
// comes from the engine's snapshot; the game only picks which facts to ask about.

export interface GameOption {
  label: string;
  correct: boolean;
}

export interface GameRound {
  id: 'impact' | 'week' | 'customers' | 'market';
  path: string;
  skill: string;
  prompt: string;
  options: GameOption[];
  reveal: string;
}

/** Stable shuffle so the correct answer moves between rounds (no randomness in rendering). */
function order<T>(items: T[], seed: number): T[] {
  return items
    .map((x, i) => ({ x, k: (i * 7 + seed * 3) % 5 }))
    .sort((a, b) => a.k - b.k)
    .map((o) => o.x);
}

const rupee = (v: number) => `₹${v.toFixed(2)}`;

export function buildRounds(s: Snapshot): GameRound[] {
  const rounds: GameRound[] = [];

  const over = [...s.impact.channels]
    .filter((c) => c.claimed_per100 > c.real_per100)
    .sort((a, b) => b.claimed_per100 - b.real_per100 - (a.claimed_per100 - a.real_per100))[0];
  if (over) {
    const claimed = over.claimed_per100 / 100;
    const real = over.real_per100 / 100;
    rounds.push({
      id: 'impact',
      path: '/demo/impact',
      skill: t('home.game.skill.impact'),
      prompt: t('home.game.impact.q', { medium: over.label, claimed: rupee(claimed) }),
      options: order(
        [
          { label: rupee(real), correct: true },
          { label: rupee(claimed), correct: false },
          { label: rupee((claimed + real) / 2 + 0.4), correct: false },
        ],
        1,
      ),
      reveal: t('home.game.impact.a', { medium: over.label, real: rupee(real) }),
    });
  }

  const drivers = [...s.week.bridge.drivers].filter((d) => d.id !== 'unexplained');
  const down = s.week.bridge.current < s.week.bridge.prior;
  const sorted = drivers.sort((a, b) => (down ? a.value_lakh - b.value_lakh : b.value_lakh - a.value_lakh));
  if (sorted.length >= 3) {
    const top = sorted[0]!;
    rounds.push({
      id: 'week',
      path: '/demo',
      skill: t('home.game.skill.week'),
      prompt: t(down ? 'home.game.week.q_down' : 'home.game.week.q_up'),
      options: order(
        sorted.slice(0, 3).map((d, i) => ({ label: d.label, correct: i === 0 })),
        2,
      ),
      reveal: t('home.game.week.a', {
        driver: top.label,
        value: formatInr(Math.abs(top.value_lakh) * 100_000, { compact: true }),
      }),
    });
  }

  const problem = s.customers.segments.find((x) => x.kind === 'problem');
  const others = s.customers.segments.filter((x) => x.kind !== 'problem').slice(0, 2);
  // Skip the round while the grouping only has a placeholder name ("Type 5") for the problem group.
  if (problem && others.length === 2 && !/^Type \d+$/.test(problem.name)) {
    rounds.push({
      id: 'customers',
      path: '/demo/customers',
      skill: t('home.game.skill.customers'),
      prompt: t('home.game.customers.q'),
      options: order(
        [{ label: problem.name, correct: true }, ...others.map((o) => ({ label: o.name, correct: false }))],
        3,
      ),
      reveal: t('home.game.customers.a', {
        name: problem.name,
        buyers: formatPct(problem.buyers_pct, { whole: true }),
        revenue: formatPct(problem.revenue_pct, { whole: true }),
      }),
    });
  }

  const threat = s.market.products.find((p) => p.threat === 'High threat');
  const calm = s.market.products.filter((p) => !p.is_us && p.threat !== 'High threat').slice(0, 2);
  if (threat && calm.length === 2) {
    rounds.push({
      id: 'market',
      path: '/demo/market',
      skill: t('home.game.skill.market'),
      prompt: t('home.game.market.q'),
      options: order(
        [{ label: threat.label, correct: true }, ...calm.map((c) => ({ label: c.label, correct: false }))],
        4,
      ),
      reveal: threat.headline,
    });
  }
  return rounds;
}

export const XP_PER_ROUND = 100;
export const STREAK_BONUS = 50;

/** Level by points: three badges. */
export function levelFor(xp: number): { key: 'home.level.1' | 'home.level.2' | 'home.level.3'; next: number | null } {
  if (xp >= 400) return { key: 'home.level.3', next: null };
  if (xp >= 200) return { key: 'home.level.2', next: 400 };
  return { key: 'home.level.1', next: 200 };
}
