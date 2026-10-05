import type { CategoryId, DateKey, DayStats } from '@/types';
import { addDays } from '@/lib/date';

/**
 * Streak rules
 * - A day counts when you complete a quest or log an activity.
 * - Today never breaks a streak — the day isn't over yet.
 * - Rest days bridge a streak: they don't add to it, and they don't break it.
 */

export const STREAK_MILESTONES = [3, 7, 14, 30, 50, 75, 100, 150, 200, 365];

export function computeStreak(
  isActive: (key: DateKey) => boolean,
  isRest: (key: DateKey) => boolean,
  today: DateKey,
  limit = 4000,
): number {
  let count = isActive(today) ? 1 : 0;
  let key = addDays(today, -1);
  for (let i = 0; i < limit; i++) {
    if (isActive(key)) count++;
    else if (!isRest(key)) break;
    key = addDays(key, -1);
  }
  return count;
}

export function currentStreak(days: Map<DateKey, DayStats>, today: DateKey): number {
  return computeStreak(
    (k) => days.get(k)?.active === true,
    (k) => days.get(k)?.rest === true,
    today,
  );
}

export function categoryStreak(days: Map<DateKey, DayStats>, categories: CategoryId[], today: DateKey): number {
  const hit = (k: DateKey) => {
    const d = days.get(k);
    if (!d) return false;
    return categories.some((c) => (d.minutesByCategory[c] ?? 0) > 0 || (d.xpByCategory[c] ?? 0) > 0);
  };
  return computeStreak(hit, (k) => days.get(k)?.rest === true, today);
}

export interface StreakRun {
  start: DateKey;
  end: DateKey;
  length: number;
}

/**
 * Walks history once. Returns every streak run, the longest length, and the streak value at the end
 * of each day (for the streak history chart).
 */
export function streakHistory(days: Map<DateKey, DayStats>, today: DateKey): { runs: StreakRun[]; longest: number; series: Map<DateKey, number> } {
  const series = new Map<DateKey, number>();
  const runs: StreakRun[] = [];
  if (!days.size) return { runs, longest: 0, series };
  const first = [...days.keys()].reduce((min, k) => (k < min ? k : min));
  let run = 0;
  let runStart: DateKey | null = null;
  let lastActive: DateKey | null = null;
  let longest = 0;
  for (let key = first; key <= today; key = addDays(key, 1)) {
    const d = days.get(key);
    if (d?.active) {
      if (run === 0) runStart = key;
      run++;
      lastActive = key;
      longest = Math.max(longest, run);
    } else if (!d?.rest && key !== today) {
      if (run > 0 && runStart && lastActive) runs.push({ start: runStart, end: lastActive, length: run });
      run = 0;
      runStart = null;
    }
    series.set(key, run);
  }
  if (run > 0 && runStart && lastActive) runs.push({ start: runStart, end: lastActive, length: run });
  return { runs, longest, series };
}

export function isStreakMilestone(n: number): boolean {
  return STREAK_MILESTONES.includes(n);
}
