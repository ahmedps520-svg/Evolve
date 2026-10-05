import type { CategoryId, DateKey, QuestDifficulty, QuestKind, QuestTarget, QuestUnit, RepeatSchedule, Settings } from '@/types';
import { isCategoryId } from '@/data/categories';
import { QUEST_DIFFICULTY_MAP } from '@/data/difficulty';
import { isDateKey } from '@/lib/date';

export type Validated<T> = { ok: true; value: T } | { ok: false; error: string };

const QUEST_UNITS: QuestUnit[] = ['minutes', 'times', 'pages', 'km', 'reps'];

/** Upper bounds that keep targets realistic. */
export const TARGET_LIMITS: Record<QuestUnit, number> = {
  minutes: 480,
  times: 50,
  pages: 1000,
  km: 100,
  reps: 1000,
};

export const TITLE_MAX = 60;
export const DESCRIPTION_MAX = 240;

export interface QuestInput {
  title: string;
  description?: string;
  category: CategoryId;
  difficulty: QuestDifficulty;
  xpReward?: number | null;
  target?: QuestTarget | null;
  timerMinutes?: number | null;
  repeatSchedule?: RepeatSchedule;
  goalId?: string | null;
  kind?: QuestKind;
}

export interface CleanQuestInput {
  title: string;
  description: string;
  category: CategoryId;
  difficulty: QuestDifficulty;
  xpReward: number;
  target: QuestTarget | null;
  timerMinutes: number | null;
  repeatSchedule: RepeatSchedule;
  goalId: string | null;
}

export function clampQuestXP(difficulty: QuestDifficulty, xp: number): number {
  const d = QUEST_DIFFICULTY_MAP[difficulty];
  return Math.min(d.maxXP, Math.max(d.minXP, Math.round(xp)));
}

export function sanitizeSchedule(s: RepeatSchedule | undefined): RepeatSchedule {
  if (!s || typeof s !== 'object') return { type: 'none' };
  switch (s.type) {
    case 'daily':
    case 'weekdays':
    case 'none':
      return { type: s.type };
    case 'weekly': {
      const days = Array.from(new Set((Array.isArray(s.days) ? s.days : []).map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))).sort();
      return days.length ? { type: 'weekly', days } : { type: 'none' };
    }
    default:
      return { type: 'none' };
  }
}

export function sanitizeQuestInput(input: QuestInput, settings: Settings): Validated<CleanQuestInput> {
  const title = String(input.title ?? '').trim().replace(/\s+/g, ' ');
  if (!title) return { ok: false, error: 'Give your quest a name.' };
  if (title.length > TITLE_MAX) return { ok: false, error: `Keep the name under ${TITLE_MAX} characters.` };
  const description = String(input.description ?? '').trim().slice(0, DESCRIPTION_MAX);
  const category = isCategoryId(input.category) ? input.category : 'custom';
  const difficulty: QuestDifficulty = input.difficulty in QUEST_DIFFICULTY_MAP ? input.difficulty : 'medium';

  const rawXP = input.xpReward ?? settings.xp.questXP[difficulty] ?? QUEST_DIFFICULTY_MAP[difficulty].defaultXP;
  const xpReward = clampQuestXP(difficulty, Number.isFinite(Number(rawXP)) ? Number(rawXP) : QUEST_DIFFICULTY_MAP[difficulty].defaultXP);

  let target: QuestTarget | null = null;
  if (input.target) {
    const unit = QUEST_UNITS.includes(input.target.unit) ? input.target.unit : 'times';
    const raw = Number(input.target.amount);
    if (!Number.isFinite(raw) || raw <= 0) return { ok: false, error: 'Targets need to be greater than zero.' };
    const amount = unit === 'km' ? Math.round(raw * 10) / 10 : Math.round(raw);
    if (amount > TARGET_LIMITS[unit]) return { ok: false, error: `That target is a bit much — try ${TARGET_LIMITS[unit]} ${unit} or less.` };
    target = { amount: Math.max(unit === 'km' ? 0.1 : 1, amount), unit };
  }

  let timerMinutes: number | null = null;
  if (input.timerMinutes != null && input.timerMinutes !== 0) {
    const t = Math.round(Number(input.timerMinutes));
    if (!Number.isFinite(t) || t < 5 || t > 240) return { ok: false, error: 'Timers can run from 5 to 240 minutes.' };
    timerMinutes = t;
    // A timed quest measures minutes; make the target match the timer.
    if (!target || target.unit !== 'minutes') target = { amount: t, unit: 'minutes' };
  }

  return {
    ok: true,
    value: {
      title,
      description,
      category,
      difficulty,
      xpReward,
      target,
      timerMinutes,
      repeatSchedule: sanitizeSchedule(input.repeatSchedule),
      goalId: input.goalId ?? null,
    },
  };
}

export interface GoalInput {
  title: string;
  description?: string;
  target?: string;
  category?: CategoryId | null;
  deadline?: DateKey | null;
  milestones?: { id?: string; title: string; xpReward?: number }[];
}

export const MILESTONE_DEFAULT_XP = 75;
export const MAX_MILESTONES = 12;

export function sanitizeGoalInput(input: GoalInput): Validated<Required<Omit<GoalInput, 'milestones'>> & { milestones: { id?: string; title: string; xpReward: number }[] }> {
  const title = String(input.title ?? '').trim().replace(/\s+/g, ' ');
  if (!title) return { ok: false, error: 'Name your goal.' };
  if (title.length > 80) return { ok: false, error: 'Keep the goal name under 80 characters.' };
  const milestones = (input.milestones ?? [])
    .map((m) => ({ id: m.id, title: String(m.title ?? '').trim().slice(0, 80), xpReward: Math.min(300, Math.max(10, Math.round(Number(m.xpReward ?? MILESTONE_DEFAULT_XP)) || MILESTONE_DEFAULT_XP)) }))
    .filter((m) => m.title);
  if (milestones.length > MAX_MILESTONES) return { ok: false, error: `Up to ${MAX_MILESTONES} milestones per goal.` };
  const deadline = input.deadline && isDateKey(input.deadline) ? input.deadline : null;
  return {
    ok: true,
    value: {
      title,
      description: String(input.description ?? '').trim().slice(0, 400),
      target: String(input.target ?? '').trim().slice(0, 120),
      category: input.category && isCategoryId(input.category) ? input.category : null,
      deadline,
      milestones,
    },
  };
}
