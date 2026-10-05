import type { AchievementDef, Rarity } from '@/types';
import { RARITY_REWARDS } from './difficulty';
import { CREATIVE_CATEGORIES, FITNESS_CATEGORIES } from './categories';

type Def = Omit<AchievementDef, 'xpReward' | 'coinReward'> & { xpReward?: number; coinReward?: number };

const defs: Def[] = [
  /* ── Common ── */
  { id: 'journey_begins', name: 'The Journey Begins', description: 'Create your character.', icon: 'sparkles', rarity: 'common', condition: { type: 'onboarded' }, xpReward: 0, coinReward: 0 },
  { id: 'first_step', name: 'First Step', description: 'Complete your first quest.', icon: 'footprints', rarity: 'common', condition: { type: 'questsCompleted', count: 1 } },
  { id: 'field_notes', name: 'Field Notes', description: 'Log your first activity.', icon: 'notebook-pen', rarity: 'common', condition: { type: 'activitiesLogged', count: 1 } },
  { id: 'in_the_zone', name: 'In the Zone', description: 'Finish a focus session.', icon: 'timer', rarity: 'common', condition: { type: 'focusSessions', count: 1 } },
  { id: 'quest_architect', name: 'Quest Architect', description: 'Create your own quest.', icon: 'pencil-ruler', rarity: 'common', condition: { type: 'customQuests', count: 1 } },
  { id: 'reflection', name: 'Reflection', description: 'Write your first journal entry.', icon: 'notebook-text', rarity: 'common', condition: { type: 'journalEntries', count: 1 } },
  { id: 'recharge', name: 'Recharge', description: 'Take a rest day. Recovery is part of progress.', icon: 'battery-charging', rarity: 'common', condition: { type: 'restDays', count: 1 } },
  { id: 'master_plan', name: 'Master Plan', description: 'Turn a goal into quests with the quest generator.', icon: 'wand-sparkles', rarity: 'common', condition: { type: 'generatorUsed' } },
  { id: 'rising', name: 'Rising', description: 'Reach Level 5.', icon: 'trending-up', rarity: 'common', condition: { type: 'level', level: 5 } },

  /* ── Uncommon ── */
  { id: 'early_riser', name: 'Early Riser', description: 'Complete a quest between 5 and 8 AM.', icon: 'sunrise', rarity: 'uncommon', condition: { type: 'questBeforeHour', hour: 8 } },
  { id: 'kindling', name: 'Kindling', description: 'Reach a 3-day streak.', icon: 'flame-kindling', rarity: 'uncommon', condition: { type: 'streak', days: 3 } },
  { id: 'target_acquired', name: 'Target Acquired', description: 'Reach your daily goal for the first time.', icon: 'crosshair', rarity: 'uncommon', condition: { type: 'dailyGoals', count: 1 } },
  { id: 'adventurer', name: 'Adventurer', description: 'Complete 10 quests.', icon: 'scroll-text', rarity: 'uncommon', condition: { type: 'questsCompleted', count: 10 } },
  { id: 'well_rounded', name: 'Well-Rounded', description: 'Earn XP in 3 different categories in one day.', icon: 'shapes', rarity: 'uncommon', condition: { type: 'categoriesInDay', count: 3 } },
  { id: 'momentum', name: 'Momentum', description: 'Reach the maximum ×1.15 momentum bonus.', icon: 'zap', rarity: 'uncommon', condition: { type: 'momentum', multiplier: 1.15 }, secret: true },
  { id: 'stepping_stone', name: 'Stepping Stone', description: 'Complete a goal milestone.', icon: 'milestone', rarity: 'uncommon', condition: { type: 'milestones', count: 1 } },
  { id: 'double_digits', name: 'Double Digits', description: 'Reach Level 10.', icon: 'chevrons-up', rarity: 'uncommon', condition: { type: 'level', level: 10 } },
  { id: 'bookworm', name: 'Bookworm', description: 'Read for 10 hours in total.', icon: 'book-open-text', rarity: 'uncommon', condition: { type: 'categoryMinutes', categories: ['reading'], minutes: 600 } },
  { id: 'well_rested', name: 'Well Rested', description: 'Log a healthy 7–9 hours of sleep five times.', icon: 'moon-star', rarity: 'uncommon', condition: { type: 'healthySleep', count: 5 }, secret: true },
  { id: 'bounty_hunter', name: 'Bounty Hunter', description: 'Complete a weekly challenge.', icon: 'swords', rarity: 'uncommon', condition: { type: 'weeklyCompleted', count: 1 } },
  { id: 'still_mind', name: 'Still Mind', description: 'Meditate 10 times.', icon: 'flower-2', rarity: 'uncommon', condition: { type: 'categoryCount', categories: ['meditation'], count: 10 } },
  { id: 'party_up', name: 'Party Up', description: 'Add a friend to your party.', icon: 'users', rarity: 'uncommon', condition: { type: 'partyMembers', count: 1 }, social: true },

  /* ── Rare ── */
  { id: 'consistent', name: 'Consistent', description: 'Maintain a 7-day streak.', icon: 'flame', rarity: 'rare', condition: { type: 'streak', days: 7 } },
  { id: 'scholar', name: 'Scholar', description: 'Earn 1,000 XP from studying.', icon: 'graduation-cap', rarity: 'rare', condition: { type: 'categoryXP', categories: ['study'], xp: 1000 } },
  { id: 'athlete', name: 'Athlete', description: 'Earn 1,000 XP from exercise.', icon: 'dumbbell', rarity: 'rare', condition: { type: 'categoryXP', categories: FITNESS_CATEGORIES, xp: 1000 } },
  { id: 'creator', name: 'Creator', description: 'Complete 25 creative activities.', icon: 'palette', rarity: 'rare', condition: { type: 'categoryCount', categories: CREATIVE_CATEGORIES, count: 25 } },
  { id: 'code_smith', name: 'Code Smith', description: 'Earn 1,000 XP from coding.', icon: 'code-xml', rarity: 'rare', condition: { type: 'categoryXP', categories: ['coding'], xp: 1000 } },
  { id: 'veteran', name: 'Veteran', description: 'Complete 50 quests.', icon: 'shield', rarity: 'rare', condition: { type: 'questsCompleted', count: 50 } },
  { id: 'goal_crusher', name: 'Goal Crusher', description: 'Complete a long-term goal.', icon: 'goal', rarity: 'rare', condition: { type: 'goalsCompleted', count: 1 } },
  { id: 'perfect_week', name: 'Perfect Week', description: 'Show up all seven days of a week — rest days count.', icon: 'calendar-check', rarity: 'rare', condition: { type: 'perfectWeek' }, secret: true },
  { id: 'dependable', name: 'Dependable', description: 'Reach your daily goal 10 times.', icon: 'badge-check', rarity: 'rare', condition: { type: 'dailyGoals', count: 10 } },
  { id: 'comeback', name: 'Comeback', description: 'Build a 3-day streak after a reset.', icon: 'rotate-ccw', rarity: 'rare', condition: { type: 'comeback', days: 3 }, secret: true },
  { id: 'polymath', name: 'Polymath', description: 'Earn XP in 8 different categories.', icon: 'atom', rarity: 'rare', condition: { type: 'distinctCategories', count: 8 } },
  { id: 'quarter_century', name: 'Quarter Century', description: 'Reach Level 25.', icon: 'medal', rarity: 'rare', condition: { type: 'level', level: 25 } },
  { id: 'time_well_spent', name: 'Time Well Spent', description: 'Log 50 hours of activity.', icon: 'hourglass', rarity: 'rare', condition: { type: 'totalMinutes', minutes: 3000 } },
  { id: 'kindred', name: 'Kindred Spirit', description: 'Log 10 social activities.', icon: 'heart-handshake', rarity: 'rare', condition: { type: 'categoryCount', categories: ['social'], count: 10 } },
  { id: 'collector', name: 'Collector', description: 'Buy 5 items from the reward shop.', icon: 'gem', rarity: 'rare', condition: { type: 'itemsOwned', count: 5 } },
  { id: 'seasoned', name: 'Seasoned', description: 'Complete a special event.', icon: 'calendar-heart', rarity: 'rare', condition: { type: 'eventsCompleted', count: 1 } },
  { id: 'good_game', name: 'Good Game', description: 'Finish a friend challenge, win or lose.', icon: 'handshake', rarity: 'rare', condition: { type: 'challengesFinished', count: 1 }, social: true },

  /* ── Epic ── */
  { id: 'dedicated', name: 'Dedicated', description: 'Maintain a 30-day streak.', icon: 'flame', rarity: 'epic', condition: { type: 'streak', days: 30 } },
  { id: 'champion', name: 'Champion', description: 'Complete 100 quests.', icon: 'trophy', rarity: 'epic', condition: { type: 'questsCompleted', count: 100 } },
  { id: 'ten_thousand', name: 'Ten Thousand', description: 'Earn 10,000 total XP.', icon: 'star', rarity: 'epic', condition: { type: 'totalXP', xp: 10_000 } },
  { id: 'boss_slayer', name: 'Boss Slayer', description: 'Complete 10 weekly challenges.', icon: 'sword', rarity: 'epic', condition: { type: 'weeklyCompleted', count: 10 } },
  { id: 'sage', name: 'Sage', description: 'Earn 10,000 XP from studying and learning.', icon: 'library', rarity: 'epic', condition: { type: 'categoryXP', categories: ['study', 'learning'], xp: 10_000 } },
  { id: 'devoted', name: 'Devoted', description: 'Log 250 hours of activity.', icon: 'clock', rarity: 'epic', condition: { type: 'totalMinutes', minutes: 15_000 } },
  { id: 'halfway', name: 'Halfway to Legend', description: 'Reach Level 50.', icon: 'castle', rarity: 'epic', condition: { type: 'level', level: 50 } },

  /* ── Legendary ── */
  { id: 'unbreakable', name: 'Unbreakable', description: 'Maintain a 100-day streak.', icon: 'mountain-snow', rarity: 'legendary', condition: { type: 'streak', days: 100 } },
  { id: 'ascendant', name: 'Ascendant', description: 'Earn 100,000 total XP.', icon: 'rocket', rarity: 'legendary', condition: { type: 'totalXP', xp: 100_000 } },
  { id: 'legend_of_the_board', name: 'Legend of the Board', description: 'Complete 500 quests.', icon: 'crown', rarity: 'legendary', condition: { type: 'questsCompleted', count: 500 } },
  { id: 'visionary', name: 'Visionary', description: 'Complete 5 long-term goals.', icon: 'telescope', rarity: 'legendary', condition: { type: 'goalsCompleted', count: 5 } },

  /* ── Mythic ── */
  { id: 'century', name: 'Century', description: 'Reach Level 100.', icon: 'gem', rarity: 'mythic', condition: { type: 'level', level: 100 } },
  { id: 'eternal', name: 'Eternal', description: 'Maintain a 365-day streak.', icon: 'infinity', rarity: 'mythic', condition: { type: 'streak', days: 365 } },
];

function withRewards(def: Def): AchievementDef {
  const r = RARITY_REWARDS[def.rarity as Rarity];
  return { ...def, xpReward: def.xpReward ?? r.xp, coinReward: def.coinReward ?? r.coins };
}

export const ACHIEVEMENTS: AchievementDef[] = defs.map(withRewards);
export const ACHIEVEMENT_MAP = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a])) as Record<string, AchievementDef>;

/** The achievement every new player starts with. */
export const STARTER_ACHIEVEMENT = 'journey_begins';
