import type { CategoryId, DateKey, GameDifficulty, Profile, Quest, QuestDifficulty, QuestKind, RepeatSchedule } from '@/types';
import { addDays, isWeekday, weekday } from '@/lib/date';
import { uid } from '@/lib/id';
import { createRng, pickWeighted } from '@/lib/random';
import { CATEGORIES } from '@/data/categories';
import { CLASS_MAP } from '@/data/classes';
import { GAME_DIFFICULTY_MAP } from '@/data/difficulty';
import { categoriesForFocus } from '@/data/focusAreas';
import { DEFAULT_STARTERS, QUEST_TEMPLATES, STARTER_BY_FOCUS, TEMPLATE_MAP, type QuestTemplate } from '@/data/questTemplates';

/* ───────────── Scheduling ───────────── */

export function isScheduledOn(schedule: RepeatSchedule, key: DateKey): boolean {
  switch (schedule.type) {
    case 'none':
    case 'daily':
      return true;
    case 'weekdays':
      return isWeekday(key);
    case 'weekly':
      return schedule.days.includes(weekday(key));
  }
}

export function isRepeating(q: Pick<Quest, 'repeatSchedule'>): boolean {
  return q.repeatSchedule.type !== 'none';
}

/** Most recent scheduled day strictly before `key` (within a week). */
export function previousScheduledDay(schedule: RepeatSchedule, key: DateKey): DateKey | null {
  for (let i = 1; i <= 7; i++) {
    const k = addDays(key, -i);
    if (isScheduledOn(schedule, k)) return k;
  }
  return null;
}

/** Next scheduled day on or after `key`. */
export function nextScheduledDay(schedule: RepeatSchedule, key: DateKey): DateKey | null {
  for (let i = 0; i <= 7; i++) {
    const k = addDays(key, i);
    if (isScheduledOn(schedule, k)) return k;
  }
  return null;
}

/** Is this quest something the player can work on today? */
export function isQuestAvailable(q: Quest, today: DateKey): boolean {
  if (q.status !== 'active') return false;
  if (q.kind === 'daily') return q.dueDate === today;
  if (isRepeating(q)) return isScheduledOn(q.repeatSchedule, today);
  return true;
}

/** Quests shown on today's board, in display order (open first, completed last). */
export function questsForToday(quests: Quest[], today: DateKey): Quest[] {
  return quests
    .filter((q) => {
      if (q.status === 'archived' || q.status === 'expired') return false;
      if (q.kind === 'daily') return q.dueDate === today;
      if (isRepeating(q)) return q.status === 'active' && isScheduledOn(q.repeatSchedule, today);
      // One-off quests stay on the board until done; completed ones linger for the day they were finished.
      return q.status === 'active' || (q.completedAt !== null && q.periodKey === today);
    })
    .sort((a, b) => Number(a.completed) - Number(b.completed) || a.order - b.order || a.createdAt - b.createdAt);
}

export function questTarget(q: Quest): number {
  return q.target?.amount ?? 1;
}

export function questPercent(q: Quest): number {
  if (q.completed) return 1;
  return Math.min(1, q.progress / questTarget(q));
}

/* ───────────── Building quests ───────────── */

export function tierForXP(xp: number): QuestDifficulty {
  if (xp <= 35) return 'easy';
  if (xp <= 85) return 'medium';
  if (xp <= 175) return 'hard';
  if (xp <= 375) return 'epic';
  return 'legendary';
}

const roundTo = (n: number, step: number) => Math.round(n / step) * step;

export function blankQuest(partial: Partial<Quest> & Pick<Quest, 'title' | 'category'>, now: number): Quest {
  return {
    id: uid('q_'),
    kind: 'custom',
    description: '',
    difficulty: 'medium',
    xpReward: 50,
    coinReward: 0,
    target: null,
    progress: 0,
    completed: false,
    status: 'active',
    createdAt: now,
    completedAt: null,
    repeatSchedule: { type: 'none' },
    timerMinutes: null,
    periodKey: null,
    dueDate: null,
    goalId: null,
    templateId: null,
    streak: 0,
    bestStreak: 0,
    lastCompletedKey: null,
    completionCount: 0,
    rerolled: false,
    order: now,
    ...partial,
  };
}

export function questFromTemplate(
  template: QuestTemplate,
  opts: { difficulty: GameDifficulty; kind: QuestKind; now: number; dateKey: DateKey; order: number; dueDate: DateKey | null },
): Quest {
  const scale = template.fixed ? 1 : GAME_DIFFICULTY_MAP[opts.difficulty].questScale;
  const amount =
    template.unit === 'minutes'
      ? Math.max(5, roundTo(template.amount * scale, 5))
      : template.fixed
        ? template.amount
        : Math.max(1, roundTo(template.amount * scale, template.amount >= 10 ? 5 : 1));
  const xp = Math.max(10, roundTo(template.xp * (template.fixed ? GAME_DIFFICULTY_MAP[opts.difficulty].questScale ** 0.5 : scale), 5));
  return blankQuest(
    {
      kind: opts.kind,
      title: template.title,
      description: template.description.replace('{n}', String(amount)),
      category: template.category,
      difficulty: tierForXP(xp),
      xpReward: xp,
      target: { amount, unit: template.unit },
      timerMinutes: template.timer && template.unit === 'minutes' ? amount : null,
      templateId: template.id,
      dueDate: opts.dueDate,
      periodKey: opts.dateKey,
      order: opts.order,
    },
    opts.now,
  );
}

/** The first three quests a new player receives, shaped by their chosen goals. */
export function starterQuests(profile: Profile, now: number, dateKey: DateKey): Quest[] {
  const ids: string[] = [];
  for (const f of profile.focusAreas) {
    const id = STARTER_BY_FOCUS[f];
    if (id && !ids.includes(id)) ids.push(id);
  }
  for (const id of DEFAULT_STARTERS) if (!ids.includes(id)) ids.push(id);
  return ids.slice(0, 3).map((id, i) =>
    questFromTemplate(TEMPLATE_MAP[id], { difficulty: profile.difficulty, kind: 'starter', now, dateKey, order: i, dueDate: null }),
  );
}

/** Weighted category pool for daily quests, based on goals and class. */
function categoryWeights(profile: Profile, avoid: Set<CategoryId>): Map<CategoryId, number> {
  const focus = new Set(categoriesForFocus(profile.focusAreas));
  const cls = CLASS_MAP[profile.classId];
  const favored = new Set(cls?.favored ?? []);
  const weights = new Map<CategoryId, number>();
  for (const c of CATEGORIES) {
    // Sleep and catch-all quests only appear when the player asked for them.
    if ((c.id === 'sleep' || c.id === 'custom') && !focus.has(c.id)) continue;
    let w = profile.classId === 'explorer' ? 1 : 0.12;
    if (focus.has(c.id)) w += 3;
    if (favored.has(c.id)) w += 1.5;
    if (avoid.has(c.id)) w *= 0.45;
    weights.set(c.id, w);
  }
  return weights;
}

/**
 * Today's daily quests. Deterministic for a given player and day, so regenerating (after a reload,
 * on another tab, after an import) always yields the same board.
 */
export function generateDailyQuests(
  profile: Profile,
  dateKey: DateKey,
  now: number,
  previous: Quest[] = [],
  count = GAME_DIFFICULTY_MAP[profile.difficulty].dailyQuests,
): Quest[] {
  const rng = createRng(`${profile.id}:${dateKey}:daily`);
  const yesterday = addDays(dateKey, -1);
  const recent = previous.filter((q) => q.kind === 'daily' && q.dueDate === yesterday);
  const avoidCats = new Set(recent.map((q) => q.category));
  const avoidTemplates = new Set(recent.map((q) => q.templateId));

  const weights = categoryWeights(profile, avoidCats);
  const chosen: CategoryId[] = [];
  while (chosen.length < count && weights.size) {
    const entries = [...weights.entries()];
    const [cat] = pickWeighted(rng, entries, ([, w]) => w);
    chosen.push(cat);
    weights.delete(cat);
  }

  let hasTimer = false;
  return chosen.map((cat, i) => {
    let pool = QUEST_TEMPLATES.filter((t) => t.category === cat);
    // Guarantee the last quest of the day is runnable in Focus Mode if none were so far.
    if (i === chosen.length - 1 && !hasTimer && pool.some((t) => t.timer)) pool = pool.filter((t) => t.timer);
    const template = pickWeighted(rng, pool, (t) => (avoidTemplates.has(t.id) ? 0.3 : 1));
    if (template.timer) hasTimer = true;
    return questFromTemplate(template, { difficulty: profile.difficulty, kind: 'daily', now, dateKey, order: i, dueDate: dateKey });
  });
}

/** A fresh daily quest that is different from everything currently on the board. */
export function rerollDailyQuest(profile: Profile, quest: Quest, board: Quest[], dateKey: DateKey, now: number): Quest | null {
  const rng = createRng(`${profile.id}:${dateKey}:reroll:${quest.id}`);
  const usedTemplates = new Set(board.map((q) => q.templateId));
  const usedCats = new Set(board.filter((q) => q.id !== quest.id).map((q) => q.category));
  const weights = categoryWeights(profile, new Set());
  const pool = QUEST_TEMPLATES.filter((t) => !usedTemplates.has(t.id) && weights.has(t.category));
  if (!pool.length) return null;
  const template = pickWeighted(rng, pool, (t) => (weights.get(t.category) ?? 0.1) * (usedCats.has(t.category) ? 0.4 : 1));
  const next = questFromTemplate(template, { difficulty: profile.difficulty, kind: 'daily', now, dateKey, order: quest.order, dueDate: dateKey });
  return { ...next, rerolled: true };
}
