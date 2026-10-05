import type { GameDifficulty, QuestDifficulty, Rarity } from '@/types';

export interface GameDifficultyDef {
  id: GameDifficulty;
  name: string;
  tagline: string;
  /** Suggested daily XP target. */
  dailyGoal: number;
  /** Multiplier for suggested quest length (and therefore quest XP). */
  questScale: number;
  /** Shifts suggested quest difficulty by this many tiers. */
  tierShift: number;
  dailyQuests: number;
  /** Rest days that preserve a streak, per week. */
  restDaysPerWeek: number;
  /** Multiplier on weekly challenge targets. */
  weeklyScale: number;
  points: string[];
}

/** Difficulty changes targets and pacing — it never takes progress away. */
export const GAME_DIFFICULTIES: GameDifficultyDef[] = [
  {
    id: 'casual',
    name: 'Casual',
    tagline: 'Small steps, every day.',
    dailyGoal: 200,
    questScale: 0.6,
    tierShift: -1,
    dailyQuests: 3,
    restDaysPerWeek: 3,
    weeklyScale: 0.6,
    points: ['Shorter quests, lighter XP', '200 XP daily target', '3 rest days a week keep your streak'],
  },
  {
    id: 'normal',
    name: 'Normal',
    tagline: 'Steady, sustainable progress.',
    dailyGoal: 400,
    questScale: 1,
    tierShift: 0,
    dailyQuests: 3,
    restDaysPerWeek: 2,
    weeklyScale: 1,
    points: ['Balanced quests and XP', '400 XP daily target', '2 rest days a week keep your streak'],
  },
  {
    id: 'hardcore',
    name: 'Hardcore',
    tagline: 'Longer sessions, bigger rewards.',
    dailyGoal: 700,
    questScale: 1.5,
    tierShift: 1,
    dailyQuests: 4,
    restDaysPerWeek: 1,
    weeklyScale: 1.5,
    points: ['Longer quests, more XP each', '700 XP daily target', '1 rest day a week keeps your streak'],
  },
];

export const GAME_DIFFICULTY_MAP = Object.fromEntries(GAME_DIFFICULTIES.map((d) => [d.id, d])) as Record<GameDifficulty, GameDifficultyDef>;

export interface QuestDifficultyDef {
  id: QuestDifficulty;
  name: string;
  rarity: Rarity;
  defaultXP: number;
  /** Ceiling for user-defined XP on custom quests — prevents "Drink water: 500,000 XP". */
  maxXP: number;
  minXP: number;
}

export const QUEST_DIFFICULTIES: QuestDifficultyDef[] = [
  { id: 'easy', name: 'Easy', rarity: 'common', defaultXP: 20, minXP: 5, maxXP: 60 },
  { id: 'medium', name: 'Medium', rarity: 'uncommon', defaultXP: 50, minXP: 10, maxXP: 150 },
  { id: 'hard', name: 'Hard', rarity: 'rare', defaultXP: 100, minXP: 25, maxXP: 300 },
  { id: 'epic', name: 'Epic', rarity: 'epic', defaultXP: 250, minXP: 50, maxXP: 600 },
  { id: 'legendary', name: 'Legendary', rarity: 'legendary', defaultXP: 500, minXP: 100, maxXP: 1000 },
];

export const QUEST_DIFFICULTY_MAP = Object.fromEntries(QUEST_DIFFICULTIES.map((d) => [d.id, d])) as Record<QuestDifficulty, QuestDifficultyDef>;
export const QUEST_TIERS: QuestDifficulty[] = QUEST_DIFFICULTIES.map((d) => d.id);

export const DEFAULT_QUEST_XP = Object.fromEntries(QUEST_DIFFICULTIES.map((d) => [d.id, d.defaultXP])) as Record<QuestDifficulty, number>;

export function shiftTier(tier: QuestDifficulty, shift: number): QuestDifficulty {
  const i = QUEST_TIERS.indexOf(tier);
  return QUEST_TIERS[Math.min(QUEST_TIERS.length - 1, Math.max(0, i + shift))];
}

export const RARITY_ORDER: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];

export const RARITY_LABEL: Record<Rarity, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
  mythic: 'Mythic',
};

export const RARITY_VAR: Record<Rarity, string> = {
  common: 'var(--rarity-common)',
  uncommon: 'var(--rarity-uncommon)',
  rare: 'var(--rarity-rare)',
  epic: 'var(--rarity-epic)',
  legendary: 'var(--rarity-legendary)',
  mythic: 'var(--rarity-mythic)',
};

/** Default rewards for an achievement of a given rarity. */
export const RARITY_REWARDS: Record<Rarity, { xp: number; coins: number }> = {
  common: { xp: 25, coins: 10 },
  uncommon: { xp: 50, coins: 25 },
  rare: { xp: 100, coins: 50 },
  epic: { xp: 250, coins: 100 },
  legendary: { xp: 500, coins: 250 },
  mythic: { xp: 1000, coins: 500 },
};
