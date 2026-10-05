import type { DateKey, GameState, Profile, WeeklyChallenge, WeeklyState } from '@/types';
import { addDays, diffDays, weekEnd, weekStart } from '@/lib/date';
import { uid } from '@/lib/id';
import { createRng, pick, pickWeighted } from '@/lib/random';
import { GAME_DIFFICULTY_MAP } from '@/data/difficulty';
import { BOSS_DEF, BOSSES, WEEKLY_POOL, type WeeklyDef } from '@/data/weekly';
import { formatMinutes, formatNumber } from '@/lib/format';
import { metricProgress } from './analysis';

function niceRound(n: number): number {
  if (n >= 1000) return Math.round(n / 100) * 100;
  if (n >= 100) return Math.round(n / 10) * 10;
  if (n >= 20) return Math.round(n / 5) * 5;
  return Math.max(1, Math.round(n));
}

export function formatTarget(def: Pick<WeeklyDef, 'unitLabel'>, target: number): string {
  if (def.unitLabel === 'min') return target >= 60 ? formatMinutes(target) : `${target} minutes`;
  return formatNumber(target);
}

function buildChallenge(def: WeeklyDef, profile: Profile, bossId: string | null): WeeklyChallenge {
  const scale = GAME_DIFFICULTY_MAP[profile.difficulty].weeklyScale;
  let target = def.metric.type === 'xp' ? niceRound(def.base * scale) : niceRound(def.base * scale);
  if (def.max) target = Math.min(def.max, target);
  // Keep rewards proportional to effort, but never below a meaningful floor.
  const rewardScale = Math.max(0.7, Math.min(1.4, scale));
  return {
    id: uid('wc_'),
    defId: def.id,
    bossId,
    title: def.title,
    description: def.description.replace('{n}', formatTarget(def, target)),
    metric: def.metric,
    target,
    unitLabel: def.unitLabel,
    xpReward: Math.round((def.xp * rewardScale) / 10) * 10,
    coinReward: Math.round((def.coins * rewardScale) / 5) * 5,
    readyAt: null,
    claimed: false,
    claimedAt: null,
  };
}

/**
 * This week's challenges: one boss (the XP challenge) and two bounties chosen for the player's goals.
 * Seeded per player and week, so they are stable across reloads and devices.
 */
export function generateWeekly(profile: Profile, weekKey: DateKey, now: number): WeeklyState {
  const rng = createRng(`${profile.id}:${weekKey}:weekly`);
  const focus = new Set(profile.focusAreas);
  const eligible = WEEKLY_POOL.filter((d) => !d.focus.length || d.focus.some((f) => focus.has(f)));
  const picks: WeeklyDef[] = [];
  const pool = [...eligible];
  while (picks.length < 2 && pool.length) {
    const def = pickWeighted(rng, pool, (d) => (d.focus.length ? 2.2 : 1));
    picks.push(def);
    pool.splice(pool.indexOf(def), 1);
  }
  const boss = pick(rng, BOSSES);
  return {
    id: weekKey,
    weekKey,
    createdAt: now,
    challenges: [buildChallenge(BOSS_DEF, profile, boss.id), ...picks.map((d) => buildChallenge(d, profile, null))],
  };
}

export function weekRange(weekKey: DateKey): { from: DateKey; to: DateKey } {
  return { from: weekKey, to: addDays(weekKey, 6) };
}

export function currentWeekKey(today: DateKey, weekStartsOn: 0 | 1): DateKey {
  return weekStart(today, weekStartsOn);
}

export function daysLeftInWeek(today: DateKey, weekStartsOn: 0 | 1): number {
  return diffDays(today, weekEnd(today, weekStartsOn)) + 1;
}

export function challengeProgress(state: Pick<GameState, 'transactions' | 'activities'>, weekKey: DateKey, challenge: WeeklyChallenge): number {
  const { from, to } = weekRange(weekKey);
  return metricProgress(state, challenge.metric, from, to);
}
