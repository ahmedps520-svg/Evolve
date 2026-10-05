/** Read-only analytics for the Progress screens. Everything derives from the ledger and activity log. */
import type { AttributeId, CategoryId, DateKey, DayStats, GameState, XPSource } from '@/types';
import { ATTRIBUTES } from '@/data/attributes';
import { CATEGORIES, CATEGORY_MAP } from '@/data/categories';
import { addDays, dayRange, diffDays, hourOf, monthKey, weekStart, weekday } from '@/lib/date';
import { PRODUCTIVE_SOURCES } from '@/lib/engine/analysis';
import { CATEGORY_CURVE, calculateLevel, calculateXPProgress } from '@/lib/xp';

export type RangeId = '7d' | '30d' | '90d' | '1y' | 'all';
export const RANGES: { id: RangeId; label: string; days: number | null }[] = [
  { id: '7d', label: '7 days', days: 7 },
  { id: '30d', label: '30 days', days: 30 },
  { id: '90d', label: '90 days', days: 90 },
  { id: '1y', label: '1 year', days: 365 },
  { id: 'all', label: 'All time', days: null },
];

export function firstDay(days: Map<DateKey, DayStats>, fallback: DateKey): DateKey {
  let min = fallback;
  for (const k of days.keys()) if (k < min) min = k;
  return min;
}

export function rangeBounds(range: RangeId, today: DateKey, earliest: DateKey): { from: DateKey; to: DateKey } {
  const def = RANGES.find((r) => r.id === range)!;
  const from = def.days ? addDays(today, -(def.days - 1)) : earliest < today ? earliest : addDays(today, -6);
  return { from, to: today };
}

export interface DayPoint {
  dateKey: DateKey;
  xp: number;
  minutes: number;
  quests: number;
  goalMet: boolean;
  rest: boolean;
  active: boolean;
}

export function dailySeries(days: Map<DateKey, DayStats>, from: DateKey, to: DateKey): DayPoint[] {
  return dayRange(from, to).map((k) => {
    const d = days.get(k);
    return { dateKey: k, xp: d?.xp ?? 0, minutes: d?.minutes ?? 0, quests: d?.quests ?? 0, goalMet: !!d?.goalMet, rest: !!d?.rest, active: !!d?.active };
  });
}

export interface Bucket {
  key: string;
  label: string;
  xp: number;
  minutes: number;
  quests: number;
  from: DateKey;
  to: DateKey;
}

/** Group days into weeks or months (used for long ranges and the weekly/monthly XP charts). */
export function bucketSeries(points: DayPoint[], by: 'week' | 'month', weekStartsOn: 0 | 1): Bucket[] {
  const out = new Map<string, Bucket>();
  for (const p of points) {
    const key = by === 'week' ? weekStart(p.dateKey, weekStartsOn) : monthKey(p.dateKey);
    let b = out.get(key);
    if (!b) {
      b = { key, label: key, xp: 0, minutes: 0, quests: 0, from: p.dateKey, to: p.dateKey };
      out.set(key, b);
    }
    b.xp += p.xp;
    b.minutes += p.minutes;
    b.quests += p.quests;
    b.to = p.dateKey;
  }
  return [...out.values()];
}

export interface CategoryShare {
  category: CategoryId;
  xp: number;
  minutes: number;
  sessions: number;
}

export function categoryDistribution(state: Pick<GameState, 'transactions' | 'activities'>, from: DateKey, to: DateKey): CategoryShare[] {
  const map = new Map<CategoryId, CategoryShare>();
  const get = (c: CategoryId) => {
    let v = map.get(c);
    if (!v) map.set(c, (v = { category: c, xp: 0, minutes: 0, sessions: 0 }));
    return v;
  };
  for (const tx of state.transactions) {
    if (tx.currency !== 'xp' || !tx.category || tx.dateKey < from || tx.dateKey > to) continue;
    if (!PRODUCTIVE_SOURCES.has(tx.source) && tx.source !== 'momentum') continue;
    get(tx.category).xp += tx.amount;
    if (tx.source === 'quest' && !tx.linked) get(tx.category).sessions += 1;
  }
  for (const a of state.activities) {
    if (a.dateKey < from || a.dateKey > to) continue;
    const v = get(a.category);
    v.minutes += a.duration;
    v.sessions += 1;
  }
  return [...map.values()].filter((v) => v.xp > 0 || v.minutes > 0).sort((a, b) => b.xp - a.xp || b.minutes - a.minutes);
}

export function attributeDistribution(shares: CategoryShare[]): { attribute: AttributeId; xp: number; minutes: number }[] {
  return ATTRIBUTES.map((a) => {
    const own = shares.filter((s) => CATEGORY_MAP[s.category].attribute === a.id);
    return { attribute: a.id, xp: own.reduce((n, s) => n + s.xp, 0), minutes: own.reduce((n, s) => n + s.minutes, 0) };
  });
}

/** Average XP per weekday, ordered from the configured first day of the week. */
export function weekdayAverages(points: DayPoint[], weekStartsOn: 0 | 1): { weekday: number; avg: number; total: number; days: number }[] {
  const acc = Array.from({ length: 7 }, (_, i) => ({ weekday: i, total: 0, days: 0, avg: 0 }));
  for (const p of points) {
    const w = weekday(p.dateKey);
    acc[w].total += p.xp;
    acc[w].days += 1;
  }
  for (const a of acc) a.avg = a.days ? Math.round(a.total / a.days) : 0;
  return [...acc.slice(weekStartsOn), ...acc.slice(0, weekStartsOn)];
}

/** XP earned by hour of day (activities and quest completions). */
export function hourlyDistribution(state: Pick<GameState, 'transactions'>, from: DateKey, to: DateKey): number[] {
  const hours = new Array<number>(24).fill(0);
  for (const tx of state.transactions) {
    if (tx.currency !== 'xp' || tx.dateKey < from || tx.dateKey > to) continue;
    if (!PRODUCTIVE_SOURCES.has(tx.source) && tx.source !== 'momentum') continue;
    hours[hourOf(tx.timestamp)] += tx.amount;
  }
  return hours;
}

export function questCompletion(state: Pick<GameState, 'quests' | 'transactions'>, from: DateKey, to: DateKey): { completed: number; expired: number; rate: number } {
  const completed = state.transactions.filter((t) => t.currency === 'xp' && t.source === 'quest' && t.dateKey >= from && t.dateKey <= to).length;
  const expired = state.quests.filter((q) => q.status === 'expired' && q.dueDate && q.dueDate >= from && q.dueDate <= to).length;
  return { completed, expired, rate: completed + expired ? completed / (completed + expired) : 0 };
}

export interface XPBreakdown {
  total: number;
  today: number;
  week: number;
  month: number;
  sources: { id: string; label: string; xp: number }[];
}

const SOURCE_GROUPS: { id: string; label: string; sources: XPSource[] }[] = [
  { id: 'activities', label: 'Activities', sources: ['activity'] },
  { id: 'quests', label: 'Quests', sources: ['quest'] },
  { id: 'achievements', label: 'Achievements', sources: ['achievement'] },
  { id: 'goals', label: 'Goals & milestones', sources: ['goal', 'milestone'] },
  { id: 'bonuses', label: 'Bonuses', sources: ['momentum', 'daily_goal', 'weekly', 'event', 'rest', 'challenge'] },
];

export function xpBreakdown(state: Pick<GameState, 'transactions'>, today: DateKey, weekStartsOn: 0 | 1): XPBreakdown {
  const ws = weekStart(today, weekStartsOn);
  const mk = monthKey(today);
  const out: XPBreakdown = { total: 0, today: 0, week: 0, month: 0, sources: SOURCE_GROUPS.map((g) => ({ id: g.id, label: g.label, xp: 0 })) };
  for (const tx of state.transactions) {
    if (tx.currency !== 'xp') continue;
    out.total += tx.amount;
    if (tx.dateKey === today) out.today += tx.amount;
    if (tx.dateKey >= ws && tx.dateKey <= today) out.week += tx.amount;
    if (monthKey(tx.dateKey) === mk) out.month += tx.amount;
    const gi = SOURCE_GROUPS.findIndex((g) => g.sources.includes(tx.source as XPSource));
    if (gi >= 0) out.sources[gi].xp += tx.amount;
  }
  return out;
}

export interface CategoryLevel {
  category: CategoryId;
  xp: number;
  level: number;
  percent: number;
  toNext: number;
  minutes: number;
}

export function categoryLevels(state: Pick<GameState, 'transactions' | 'activities'>): CategoryLevel[] {
  const xp = new Map<CategoryId, number>();
  const minutes = new Map<CategoryId, number>();
  for (const tx of state.transactions) {
    if (tx.currency !== 'xp' || !tx.category) continue;
    if (!PRODUCTIVE_SOURCES.has(tx.source) && tx.source !== 'momentum') continue;
    xp.set(tx.category, (xp.get(tx.category) ?? 0) + tx.amount);
  }
  for (const a of state.activities) minutes.set(a.category, (minutes.get(a.category) ?? 0) + a.duration);
  return CATEGORIES.map((c) => {
    const value = xp.get(c.id) ?? 0;
    const p = calculateXPProgress(value, CATEGORY_CURVE);
    return { category: c.id, xp: value, level: p.level, percent: p.percent, toNext: p.toNext, minutes: minutes.get(c.id) ?? 0 };
  })
    .filter((c) => c.xp > 0 || c.minutes > 0)
    .sort((a, b) => b.xp - a.xp);
}

export function attributeLevels(levels: CategoryLevel[]): { attribute: AttributeId; xp: number; level: number }[] {
  return ATTRIBUTES.map((a) => {
    const xp = levels.filter((l) => CATEGORY_MAP[l.category].attribute === a.id).reduce((n, l) => n + l.xp, 0);
    return { attribute: a.id, xp, level: calculateLevel(xp, CATEGORY_CURVE) };
  });
}

export function favoriteCategory(levels: CategoryLevel[]): CategoryId | null {
  if (!levels.length) return null;
  return [...levels].sort((a, b) => b.minutes - a.minutes || b.xp - a.xp)[0].category;
}

/** Active days this week and over the last few weeks. */
export function weeklyConsistency(days: Map<DateKey, DayStats>, today: DateKey, weekStartsOn: 0 | 1, weeks = 8): { thisWeek: number; elapsed: number; history: { weekKey: DateKey; active: number }[] } {
  const ws = weekStart(today, weekStartsOn);
  const history: { weekKey: DateKey; active: number }[] = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const key = addDays(ws, -7 * w);
    let active = 0;
    for (let i = 0; i < 7; i++) {
      const d = days.get(addDays(key, i));
      if (d?.active || d?.rest) active++;
    }
    history.push({ weekKey: key, active });
  }
  return { thisWeek: history[history.length - 1].active, elapsed: diffDays(ws, today) + 1, history };
}

/** Heatmap intensity 0–4: none, low, medium, high, daily goal reached. */
export function heatLevel(day: DayStats | undefined, goal: number): 0 | 1 | 2 | 3 | 4 {
  if (!day || day.xp <= 0) return 0;
  if (day.goalMet) return 4;
  const r = day.xp / Math.max(1, goal);
  if (r >= 0.66) return 3;
  if (r >= 0.33) return 2;
  return 1;
}
