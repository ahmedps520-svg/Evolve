import type { ChallengeMetric, FocusArea } from '@/types';
import { CREATIVE_CATEGORIES, FITNESS_CATEGORIES } from './categories';

export interface WeeklyDef {
  id: string;
  title: string;
  /** `{n}` is replaced with the target (formatted). */
  description: string;
  metric: ChallengeMetric;
  /** Target at NORMAL difficulty. */
  base: number;
  /** Displayed unit, e.g. "quests". For minute targets the UI shows hours when it reads better. */
  unitLabel: string;
  xp: number;
  coins: number;
  /** Only offered when the player focuses on one of these areas (empty = always eligible). */
  focus: FocusArea[];
  /** Upper bound after scaling (e.g. a week only has 7 days). */
  max?: number;
}

/** The boss is always the XP challenge: your weekly XP is the damage you deal. */
export const BOSS_DEF: WeeklyDef = {
  id: 'boss',
  title: 'Weekly Boss',
  description: 'Deal {n} damage — every XP you earn this week is a hit.',
  metric: { type: 'xp' },
  base: 2000,
  unitLabel: 'XP',
  xp: 300,
  coins: 100,
  focus: [],
};

export const WEEKLY_POOL: WeeklyDef[] = [
  { id: 'quests', title: 'Quest Marathon', description: 'Complete {n} quests.', metric: { type: 'quests' }, base: 12, unitLabel: 'quests', xp: 200, coins: 60, focus: [] },
  { id: 'active_days', title: 'Show Up', description: 'Be active on {n} different days.', metric: { type: 'activeDays' }, base: 5, unitLabel: 'days', xp: 180, coins: 60, focus: [], max: 7 },
  { id: 'daily_goals', title: 'On Target', description: 'Reach your daily goal {n} times.', metric: { type: 'dailyGoals' }, base: 3, unitLabel: 'goals', xp: 200, coins: 60, focus: [], max: 7 },
  { id: 'focus_sessions', title: 'Deep Focus', description: 'Complete {n} focus sessions.', metric: { type: 'focusSessions' }, base: 4, unitLabel: 'sessions', xp: 180, coins: 50, focus: [] },
  { id: 'variety', title: 'Jack of All Trades', description: 'Earn XP in {n} different categories.', metric: { type: 'distinctCategories' }, base: 5, unitLabel: 'categories', xp: 180, coins: 50, focus: [], max: 10 },
  { id: 'study_sessions', title: 'Study Circle', description: 'Complete {n} study sessions of 15+ minutes.', metric: { type: 'sessions', categories: ['study', 'learning'], minMinutes: 15 }, base: 8, unitLabel: 'sessions', xp: 220, coins: 70, focus: ['studying', 'learning'] },
  { id: 'move_days', title: 'Keep Moving', description: 'Exercise on {n} different days.', metric: { type: 'categoryDays', categories: FITNESS_CATEGORIES }, base: 4, unitLabel: 'days', xp: 220, coins: 70, focus: ['fitness'], max: 6 },
  { id: 'reading_minutes', title: 'Page Turner', description: 'Read for {n} this week.', metric: { type: 'minutes', categories: ['reading'] }, base: 150, unitLabel: 'min', xp: 200, coins: 60, focus: ['reading'] },
  { id: 'learning_minutes', title: 'Lifelong Learner', description: 'Spend {n} learning.', metric: { type: 'minutes', categories: ['learning', 'coding', 'study'] }, base: 300, unitLabel: 'min', xp: 240, coins: 70, focus: ['learning', 'studying', 'productivity'] },
  { id: 'creative_minutes', title: 'Creative Spark', description: 'Spend {n} creating.', metric: { type: 'minutes', categories: CREATIVE_CATEGORIES }, base: 180, unitLabel: 'min', xp: 220, coins: 70, focus: ['creativity'] },
  { id: 'mindful_days', title: 'Inner Calm', description: 'Meditate on {n} different days.', metric: { type: 'categoryDays', categories: ['meditation'] }, base: 4, unitLabel: 'days', xp: 180, coins: 60, focus: ['sleep', 'personal'], max: 7 },
  { id: 'social_sessions', title: 'Fellowship', description: 'Log {n} social activities.', metric: { type: 'sessions', categories: ['social'], minMinutes: 10 }, base: 3, unitLabel: 'activities', xp: 180, coins: 60, focus: ['social'] },
  { id: 'tidy_minutes', title: 'Order from Chaos', description: 'Spend {n} cleaning and organizing.', metric: { type: 'minutes', categories: ['cleaning'] }, base: 90, unitLabel: 'min', xp: 180, coins: 50, focus: ['organization'] },
  { id: 'deep_work_minutes', title: 'Flow State', description: 'Log {n} of deep work.', metric: { type: 'minutes', categories: ['work'] }, base: 300, unitLabel: 'min', xp: 240, coins: 70, focus: ['productivity'] },
];

export const WEEKLY_DEF_MAP = Object.fromEntries([BOSS_DEF, ...WEEKLY_POOL].map((d) => [d.id, d])) as Record<string, WeeklyDef>;

export interface BossDef {
  id: string;
  name: string;
  lore: string;
  icon: string;
}

export const BOSSES: BossDef[] = [
  { id: 'procrastinator', name: 'The Procrastinator', lore: 'It feeds on “later”.', icon: 'hourglass' },
  { id: 'doomscroll', name: 'Doomscroll Wyrm', lore: 'Endless, hungry, always one more swipe.', icon: 'smartphone' },
  { id: 'inertia', name: 'Inertia Golem', lore: 'Heavy to start. Unstoppable once moving.', icon: 'mountain' },
  { id: 'snooze', name: 'The Snooze Specter', lore: 'Whispers “five more minutes”.', icon: 'alarm-clock-off' },
  { id: 'chaos', name: 'Chaos Hydra', lore: 'Cut one task and two more appear.', icon: 'tornado' },
  { id: 'excuse', name: 'The Excuse Engine', lore: 'Runs entirely on reasons not to.', icon: 'cog' },
  { id: 'fog', name: 'Brain Fog Wraith', lore: 'Clouds your focus. Fades with action.', icon: 'cloud-fog' },
  { id: 'perfection', name: 'Perfection Phantom', lore: 'Insists nothing is ever ready.', icon: 'ghost' },
];

export const BOSS_MAP = Object.fromEntries(BOSSES.map((b) => [b.id, b])) as Record<string, BossDef>;
