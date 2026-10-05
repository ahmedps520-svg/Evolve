import type { Achievement, AchievementCondition, AchievementDef, DateKey, DayStats, GameState } from '@/types';
import { ACHIEVEMENTS } from '@/data/achievements';
import { addDays, weekStart } from '@/lib/date';
import { buildDayStats, computeTotals, type Totals } from './analysis';
import { currentStreak, streakHistory } from './streaks';

/** Everything condition checks need, computed once per evaluation pass. */
export interface AchievementContext {
  state: GameState;
  totals: Totals;
  days: Map<DateKey, DayStats>;
  streak: number;
  longestStreak: number;
  today: DateKey;
}

export function buildAchievementContext(state: GameState, today: DateKey): AchievementContext {
  const totals = computeTotals(state);
  const days = buildDayStats(state.transactions, state.activities, state.meta.restDays);
  const streak = currentStreak(days, today);
  const { longest } = streakHistory(days, today);
  return { state, totals, days, streak, longestStreak: Math.max(longest, state.profile?.longestStreak ?? 0), today };
}

/** Was there a full week (Mon–Sun or Sun–Sat) where every day was active or a rest day? */
function hasPerfectWeek(ctx: AchievementContext): boolean {
  const weekStartsOn = ctx.state.settings.weekStartsOn;
  const starts = new Set<DateKey>();
  for (const [key, d] of ctx.days) if (d.active) starts.add(weekStart(key, weekStartsOn));
  for (const start of starts) {
    let ok = true;
    for (let i = 0; i < 7 && ok; i++) {
      const k = addDays(start, i);
      if (k > ctx.today) ok = false;
      const d = ctx.days.get(k);
      if (!d || !(d.active || d.rest)) ok = false;
    }
    if (ok) return true;
  }
  return false;
}

/** Current / target progress for a condition. Unlocked when current >= target. */
export function conditionProgress(condition: AchievementCondition, ctx: AchievementContext): { current: number; target: number } {
  const t = ctx.totals;
  const s = ctx.state;
  const sumBy = (rec: Record<string, number>, keys: string[]) => keys.reduce((acc, k) => acc + (rec[k] ?? 0), 0);
  switch (condition.type) {
    case 'onboarded':
      return { current: s.meta.onboardedAt ? 1 : 0, target: 1 };
    case 'questsCompleted':
      return { current: t.questsCompleted, target: condition.count };
    case 'questBeforeHour':
      return { current: t.earlyQuest ? 1 : 0, target: 1 };
    case 'streak':
      return { current: Math.max(ctx.streak, ctx.longestStreak), target: condition.days };
    case 'categoryXP':
      return { current: sumBy(t.categoryXP, condition.categories), target: condition.xp };
    case 'categoryCount':
      return { current: sumBy(t.categoryCount, condition.categories), target: condition.count };
    case 'categoryMinutes':
      return { current: sumBy(t.categoryMinutes, condition.categories), target: condition.minutes };
    case 'level':
      return { current: s.profile?.level ?? 1, target: condition.level };
    case 'totalXP':
      return { current: s.profile?.totalXP ?? 0, target: condition.xp };
    case 'activitiesLogged':
      return { current: t.activitiesLogged, target: condition.count };
    case 'focusSessions':
      return { current: t.focusSessions, target: condition.count };
    case 'dailyGoals':
      return { current: t.dailyGoals, target: condition.count };
    case 'weeklyCompleted':
      return { current: t.weeklyCompleted, target: condition.count };
    case 'goalsCompleted':
      return { current: s.goals.filter((g) => g.status === 'completed').length, target: condition.count };
    case 'milestones':
      return { current: s.goals.reduce((n, g) => n + g.milestones.filter((m) => m.completed).length, 0), target: condition.count };
    case 'restDays':
      return { current: s.meta.restDays.length, target: condition.count };
    case 'journalEntries':
      return { current: s.journal.filter((j) => j.text.trim() || j.photoIds.length).length, target: condition.count };
    case 'categoriesInDay':
      return { current: t.maxCategoriesInDay, target: condition.count };
    case 'distinctCategories':
      return { current: t.distinctCategories, target: condition.count };
    case 'customQuests':
      return { current: s.meta.customQuestsCreated, target: condition.count };
    case 'generatorUsed':
      return { current: Math.min(1, s.meta.generatorUses), target: 1 };
    case 'momentum':
      return { current: s.meta.peakMomentum >= condition.multiplier ? 1 : 0, target: 1 };
    case 'comeback':
      return { current: s.meta.streakResets > 0 ? ctx.streak : 0, target: condition.days };
    case 'healthySleep':
      return { current: t.healthySleep, target: condition.count };
    case 'perfectWeek':
      return { current: hasPerfectWeek(ctx) ? 1 : 0, target: 1 };
    case 'itemsOwned':
      return { current: s.meta.purchases.length, target: condition.count };
    case 'partyMembers':
      return { current: s.party.length, target: condition.count };
    case 'challengesFinished':
      return { current: s.challenges.filter((c) => c.status !== 'active').length, target: condition.count };
    case 'eventsCompleted':
      return { current: Object.values(s.meta.events).filter((e) => e.completedAt).length, target: condition.count };
    case 'totalMinutes':
      return { current: t.totalMinutes, target: condition.minutes };
  }
}

export function isConditionMet(def: AchievementDef, ctx: AchievementContext): boolean {
  const p = conditionProgress(def.condition, ctx);
  return p.current >= p.target;
}

/** All achievements merged with unlock state and progress (for the UI). */
export function listAchievements(state: GameState, today: DateKey): Achievement[] {
  const ctx = buildAchievementContext(state, today);
  const unlocked = new Map(state.achievements.map((r) => [r.id, r.unlockedAt]));
  return ACHIEVEMENTS.filter((a) => !a.social || state.settings.social.enabled || unlocked.has(a.id)).map((def) => {
    const progress = conditionProgress(def.condition, ctx);
    const at = unlocked.get(def.id) ?? null;
    return {
      ...def,
      unlocked: at !== null,
      unlockedAt: at,
      progress: { current: Math.min(progress.current, progress.target), target: progress.target },
    };
  });
}
