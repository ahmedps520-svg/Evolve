import type { Activity, CategoryId, ChallengeMetric, DateKey, DayStats, GameState, Transaction } from '@/types';
import { CATEGORY_IDS } from '@/data/categories';
import { hourOf } from '@/lib/date';

/** XP sources that represent real-world effort (drive streaks and "active" days). */
export const PRODUCTIVE_SOURCES = new Set<string>(['quest', 'activity']);
/** Reward payouts that never count toward challenge metrics (prevents rewards feeding rewards). */
const REWARD_PAYOUTS = new Set<string>(['weekly', 'event', 'challenge']);

export function emptyDay(dateKey: DateKey): DayStats {
  return { dateKey, xp: 0, quests: 0, activities: 0, minutes: 0, minutesByCategory: {}, xpByCategory: {}, goalMet: false, rest: false, active: false };
}

/** Per-day aggregates built from the ledger and activity log. */
export function buildDayStats(transactions: Transaction[], activities: Activity[], restDays: DateKey[]): Map<DateKey, DayStats> {
  const days = new Map<DateKey, DayStats>();
  const day = (key: DateKey) => {
    let d = days.get(key);
    if (!d) {
      d = emptyDay(key);
      days.set(key, d);
    }
    return d;
  };

  for (const tx of transactions) {
    if (tx.currency !== 'xp') continue;
    const d = day(tx.dateKey);
    d.xp += tx.amount;
    if (tx.category && (PRODUCTIVE_SOURCES.has(tx.source) || tx.source === 'momentum')) {
      d.xpByCategory[tx.category] = (d.xpByCategory[tx.category] ?? 0) + tx.amount;
    }
    if (tx.source === 'quest') {
      d.quests += 1;
      d.active = true;
    } else if (tx.source === 'daily_goal') {
      d.goalMet = true;
    }
  }

  for (const a of activities) {
    const d = day(a.dateKey);
    d.activities += 1;
    d.minutes += a.duration;
    d.minutesByCategory[a.category] = (d.minutesByCategory[a.category] ?? 0) + a.duration;
    d.active = true;
  }

  for (const key of restDays) day(key).rest = true;
  return days;
}

export interface Totals {
  totalXP: number;
  questsCompleted: number;
  activitiesLogged: number;
  focusSessions: number;
  dailyGoals: number;
  weeklyCompleted: number;
  totalMinutes: number;
  categoryXP: Record<CategoryId, number>;
  categoryMinutes: Record<CategoryId, number>;
  /** Sessions per category: activity logs plus stand-alone quest completions. */
  categoryCount: Record<CategoryId, number>;
  distinctCategories: number;
  healthySleep: number;
  xpBySource: Record<string, number>;
  coinsEarned: number;
  coinsSpent: number;
  earlyQuest: boolean;
  maxCategoriesInDay: number;
}

const zeroByCategory = () => Object.fromEntries(CATEGORY_IDS.map((c) => [c, 0])) as Record<CategoryId, number>;

export function computeTotals(state: Pick<GameState, 'transactions' | 'activities'>): Totals {
  const t: Totals = {
    totalXP: 0,
    questsCompleted: 0,
    activitiesLogged: state.activities.length,
    focusSessions: 0,
    dailyGoals: 0,
    weeklyCompleted: 0,
    totalMinutes: 0,
    categoryXP: zeroByCategory(),
    categoryMinutes: zeroByCategory(),
    categoryCount: zeroByCategory(),
    distinctCategories: 0,
    healthySleep: 0,
    xpBySource: {},
    coinsEarned: 0,
    coinsSpent: 0,
    earlyQuest: false,
    maxCategoriesInDay: 0,
  };
  const categoriesByDay = new Map<DateKey, Set<CategoryId>>();
  const mark = (key: DateKey, c: CategoryId) => {
    let s = categoriesByDay.get(key);
    if (!s) categoriesByDay.set(key, (s = new Set()));
    s.add(c);
  };

  for (const tx of state.transactions) {
    if (tx.currency === 'coins') {
      if (tx.amount >= 0) t.coinsEarned += tx.amount;
      else t.coinsSpent -= tx.amount;
      continue;
    }
    t.totalXP += tx.amount;
    t.xpBySource[tx.source] = (t.xpBySource[tx.source] ?? 0) + tx.amount;
    if (tx.category && (PRODUCTIVE_SOURCES.has(tx.source) || tx.source === 'momentum')) t.categoryXP[tx.category] += tx.amount;
    if (tx.source === 'quest') {
      t.questsCompleted += 1;
      if (tx.category && !tx.linked) {
        t.categoryCount[tx.category] += 1;
        mark(tx.dateKey, tx.category);
      }
      const h = hourOf(tx.timestamp);
      if (h >= 5 && h < 8) t.earlyQuest = true;
    } else if (tx.source === 'daily_goal') t.dailyGoals += 1;
    else if (tx.source === 'weekly') t.weeklyCompleted += 1;
  }

  const sleepDays = new Set<DateKey>();
  for (const a of state.activities) {
    t.totalMinutes += a.duration;
    t.categoryMinutes[a.category] += a.duration;
    t.categoryCount[a.category] += 1;
    if (a.source === 'focus') t.focusSessions += 1;
    if (a.category === 'sleep' && a.duration >= 420 && a.duration <= 540) sleepDays.add(a.dateKey);
    mark(a.dateKey, a.category);
  }
  t.healthySleep = sleepDays.size;
  t.distinctCategories = CATEGORY_IDS.filter((c) => t.categoryXP[c] > 0 || t.categoryMinutes[c] > 0).length;
  for (const s of categoriesByDay.values()) t.maxCategoriesInDay = Math.max(t.maxCategoriesInDay, s.size);
  return t;
}

/* ───────────── Targeted queries used by the engine ───────────── */

export function xpOnDay(transactions: Transaction[], dateKey: DateKey): number {
  let sum = 0;
  for (const tx of transactions) if (tx.currency === 'xp' && tx.dateKey === dateKey) sum += tx.amount;
  return sum;
}

export function minutesOnDay(activities: Activity[], dateKey: DateKey, category: CategoryId): number {
  let sum = 0;
  for (const a of activities) if (a.dateKey === dateKey && a.category === category) sum += a.duration;
  return sum;
}

export function hasSourceOnDay(transactions: Transaction[], dateKey: DateKey, source: string): boolean {
  return transactions.some((tx) => tx.currency === 'xp' && tx.dateKey === dateKey && tx.source === source);
}

export function isActiveDay(state: Pick<GameState, 'transactions' | 'activities'>, dateKey: DateKey): boolean {
  return (
    state.activities.some((a) => a.dateKey === dateKey) ||
    state.transactions.some((tx) => tx.dateKey === dateKey && tx.source === 'quest' && tx.currency === 'xp')
  );
}

/**
 * Progress for a challenge metric within an inclusive local-date range.
 * Shared by weekly challenges, special events and friend challenges.
 */
export function metricProgress(
  state: Pick<GameState, 'transactions' | 'activities'>,
  metric: ChallengeMetric,
  from: DateKey,
  to: DateKey,
): number {
  const inRange = (key: DateKey) => key >= from && key <= to;
  switch (metric.type) {
    case 'xp': {
      let sum = 0;
      for (const tx of state.transactions) {
        if (tx.currency === 'xp' && tx.amount > 0 && inRange(tx.dateKey) && !REWARD_PAYOUTS.has(tx.source)) sum += tx.amount;
      }
      return sum;
    }
    case 'quests':
      return state.transactions.filter((tx) => tx.currency === 'xp' && tx.source === 'quest' && inRange(tx.dateKey)).length;
    case 'dailyGoals':
      return state.transactions.filter((tx) => tx.currency === 'xp' && tx.source === 'daily_goal' && inRange(tx.dateKey)).length;
    case 'sessions': {
      const cats = new Set(metric.categories);
      return state.activities.filter((a) => cats.has(a.category) && a.duration >= metric.minMinutes && inRange(a.dateKey)).length;
    }
    case 'minutes': {
      const cats = new Set(metric.categories);
      let sum = 0;
      for (const a of state.activities) if (cats.has(a.category) && inRange(a.dateKey)) sum += a.duration;
      return sum;
    }
    case 'focusSessions':
      return state.activities.filter((a) => a.source === 'focus' && inRange(a.dateKey)).length;
    case 'categoryDays': {
      const cats = new Set(metric.categories);
      const days = new Set<DateKey>();
      for (const a of state.activities) if (cats.has(a.category) && inRange(a.dateKey)) days.add(a.dateKey);
      for (const tx of state.transactions) {
        if (tx.currency === 'xp' && tx.source === 'quest' && tx.category && cats.has(tx.category) && inRange(tx.dateKey)) days.add(tx.dateKey);
      }
      return days.size;
    }
    case 'activeDays': {
      const days = new Set<DateKey>();
      for (const a of state.activities) if (inRange(a.dateKey)) days.add(a.dateKey);
      for (const tx of state.transactions) if (tx.currency === 'xp' && tx.source === 'quest' && inRange(tx.dateKey)) days.add(tx.dateKey);
      return days.size;
    }
    case 'distinctCategories': {
      const cats = new Set<CategoryId>();
      for (const a of state.activities) if (inRange(a.dateKey)) cats.add(a.category);
      for (const tx of state.transactions) {
        if (tx.currency === 'xp' && tx.source === 'quest' && tx.category && inRange(tx.dateKey)) cats.add(tx.category);
      }
      return cats.size;
    }
  }
}
