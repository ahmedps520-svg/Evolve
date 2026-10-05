/**
 * Core domain types for Evolve.
 *
 * Conventions:
 * - Timestamps are epoch milliseconds.
 * - `DateKey` is a *local* calendar date (`YYYY-MM-DD`) captured in the user's timezone at the moment
 *   something happened. It is stored alongside timestamps so that travelling across timezones never
 *   moves past activity to a different day (and never breaks a streak by accident).
 */

export type ID = string;
/** Local calendar date, `YYYY-MM-DD`. */
export type DateKey = string;
/** Local calendar month, `YYYY-MM`. */
export type MonthKey = string;

/* ───────────────────────── Taxonomy ───────────────────────── */

export type CategoryId =
  | 'study'
  | 'exercise'
  | 'reading'
  | 'coding'
  | 'writing'
  | 'cleaning'
  | 'meditation'
  | 'creative'
  | 'learning'
  | 'walking'
  | 'running'
  | 'sports'
  | 'practice'
  | 'sleep'
  | 'work'
  | 'social'
  | 'custom';

/** Character attributes. Each groups several categories and owns one categorical color slot. */
export type AttributeId = 'int' | 'str' | 'spr' | 'crf' | 'cha' | 'dis';

export type QuestDifficulty = 'easy' | 'medium' | 'hard' | 'epic' | 'legendary';
export type GameDifficulty = 'casual' | 'normal' | 'hardcore';
export type ClassId = 'scholar' | 'athlete' | 'creator' | 'explorer' | 'strategist' | 'balanced';
export type FocusArea =
  | 'fitness'
  | 'studying'
  | 'reading'
  | 'productivity'
  | 'creativity'
  | 'learning'
  | 'organization'
  | 'social'
  | 'sleep'
  | 'personal'
  | 'other';
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';
export type AccentId = 'electric' | 'cyan' | 'emerald' | 'amber' | 'crimson' | 'violet' | 'aurum' | 'synth' | 'mono';
export type QuestUnit = 'minutes' | 'times' | 'pages' | 'km' | 'reps';

/* ───────────────────────── Profile & settings ───────────────────────── */

export interface AvatarConfig {
  sigil: string;
  background: string;
  frame: string;
  aura: string;
}

/** The player. (`User` in the product spec.) */
export interface Profile {
  id: ID;
  name: string;
  avatar: AvatarConfig;
  classId: ClassId;
  /** Cached from `totalXP` via the level curve; recomputed whenever XP changes. */
  level: number;
  totalXP: number;
  coins: number;
  currentStreak: number;
  longestStreak: number;
  dailyGoal: number;
  difficulty: GameDifficulty;
  focusAreas: FocusArea[];
  titleId: string | null;
  badgeId: string | null;
  xpEffect: string;
  uiEffect: string;
  /** Anonymous display name used when sharing, e.g. `Player_4821`. */
  playerTag: string;
  createdAt: number;
}

export interface CurveConfig {
  /** XP for level 1 → 2. */
  base: number;
  /** Growth exponent: XP_REQUIRED(level) = round(base × level^exponent). */
  exponent: number;
}

export interface XPSettings {
  curve: CurveConfig;
  /** Suggested XP per quest difficulty. */
  questXP: Record<QuestDifficulty, number>;
  /** XP per 10 minutes for each activity category. */
  activityRates: Record<CategoryId, number>;
  momentum: boolean;
}

export interface NotificationSettings {
  enabled: boolean;
  dailyReminder: boolean;
  /** `HH:MM`, local time. */
  reminderTime: string;
  levelProximity: boolean;
  weeklyDeadline: boolean;
  streakMilestones: boolean;
  quietHours: { enabled: boolean; start: string; end: string };
}

export interface SocialSettings {
  enabled: boolean;
  /** Share the anonymous player tag instead of the real name. */
  anonymous: boolean;
  share: {
    level: boolean;
    totalXP: boolean;
    weeklyXP: boolean;
    quests: boolean;
    achievements: boolean;
    streak: boolean;
  };
}

export interface Settings {
  theme: 'dark' | 'light' | 'system';
  accent: AccentId;
  highContrast: boolean;
  /** `system` follows the OS; `reduced` always reduces; `full` always animates. */
  motion: 'system' | 'reduced' | 'full';
  /** Particles, screen flashes and cinematic level-ups. */
  intenseEffects: boolean;
  sound: { enabled: boolean; volume: number };
  haptics: boolean;
  notifications: NotificationSettings;
  xp: XPSettings;
  /** 0 = Sunday, 1 = Monday. */
  weekStartsOn: 0 | 1;
  social: SocialSettings;
  journal: boolean;
}

/* ───────────────────────── Quests ───────────────────────── */

export interface QuestTarget {
  amount: number;
  unit: QuestUnit;
}

export type RepeatSchedule =
  | { type: 'none' }
  | { type: 'daily' }
  | { type: 'weekdays' }
  /** Days of week, 0 = Sunday … 6 = Saturday. */
  | { type: 'weekly'; days: number[] };

export type QuestKind = 'daily' | 'starter' | 'custom' | 'generated' | 'goal' | 'event';
export type QuestStatus = 'active' | 'completed' | 'expired' | 'archived';

export interface Quest {
  id: ID;
  kind: QuestKind;
  title: string;
  description: string;
  category: CategoryId;
  difficulty: QuestDifficulty;
  xpReward: number;
  coinReward: number;
  target: QuestTarget | null;
  progress: number;
  /** Completed for the current period (repeating quests reset each period). */
  completed: boolean;
  status: QuestStatus;
  createdAt: number;
  completedAt: number | null;
  repeatSchedule: RepeatSchedule;
  /** Optional focus-timer length in minutes. */
  timerMinutes: number | null;
  /** The day the current progress belongs to (repeating & daily quests). */
  periodKey: DateKey | null;
  /** Daily quests belong to a single day and quietly expire after it. */
  dueDate: DateKey | null;
  goalId: ID | null;
  templateId: string | null;
  /** Consecutive scheduled periods completed (repeating quests). */
  streak: number;
  bestStreak: number;
  lastCompletedKey: DateKey | null;
  completionCount: number;
  rerolled: boolean;
  order: number;
}

/* ───────────────────────── Activities & ledger ───────────────────────── */

export interface Activity {
  id: ID;
  category: CategoryId;
  /** Optional custom label, e.g. "Guitar practice". */
  label: string | null;
  /** Minutes. */
  duration: number;
  /** Base XP granted after healthy limits (excludes momentum bonus). */
  xpEarned: number;
  bonusXP: number;
  timestamp: number;
  dateKey: DateKey;
  notes: string;
  amount: number | null;
  unit: QuestUnit | null;
  source: 'manual' | 'focus';
  questId: ID | null;
  /** True when a daily healthy limit reduced the XP for this entry. */
  capped: boolean;
}

export type XPSource =
  | 'quest'
  | 'activity'
  | 'achievement'
  | 'daily_goal'
  | 'weekly'
  | 'milestone'
  | 'goal'
  | 'momentum'
  | 'event'
  | 'rest'
  | 'challenge'
  | 'adjustment';

export type CoinSource =
  | 'starter'
  | 'level'
  | 'achievement'
  | 'daily_goal'
  | 'weekly'
  | 'event'
  | 'challenge'
  | 'goal'
  | 'purchase'
  | 'adjustment';

/** Every XP or coin change is recorded as a transaction. */
export interface Transaction {
  id: ID;
  currency: 'xp' | 'coins';
  amount: number;
  source: XPSource | CoinSource;
  label: string;
  category: CategoryId | null;
  refId: ID | null;
  timestamp: number;
  dateKey: DateKey;
  /** Quest XP earned by logging an activity (the activity itself is already counted as a session). */
  linked?: boolean;
}

/* ───────────────────────── Achievements ───────────────────────── */

export type AchievementCondition =
  | { type: 'onboarded' }
  | { type: 'questsCompleted'; count: number }
  | { type: 'questBeforeHour'; hour: number }
  | { type: 'streak'; days: number }
  | { type: 'categoryXP'; categories: CategoryId[]; xp: number }
  | { type: 'categoryCount'; categories: CategoryId[]; count: number }
  | { type: 'categoryMinutes'; categories: CategoryId[]; minutes: number }
  | { type: 'level'; level: number }
  | { type: 'totalXP'; xp: number }
  | { type: 'activitiesLogged'; count: number }
  | { type: 'focusSessions'; count: number }
  | { type: 'dailyGoals'; count: number }
  | { type: 'weeklyCompleted'; count: number }
  | { type: 'goalsCompleted'; count: number }
  | { type: 'milestones'; count: number }
  | { type: 'restDays'; count: number }
  | { type: 'journalEntries'; count: number }
  | { type: 'categoriesInDay'; count: number }
  | { type: 'distinctCategories'; count: number }
  | { type: 'customQuests'; count: number }
  | { type: 'generatorUsed' }
  | { type: 'momentum'; multiplier: number }
  | { type: 'comeback'; days: number }
  | { type: 'healthySleep'; count: number }
  | { type: 'perfectWeek' }
  | { type: 'itemsOwned'; count: number }
  | { type: 'partyMembers'; count: number }
  | { type: 'challengesFinished'; count: number }
  | { type: 'eventsCompleted'; count: number }
  | { type: 'totalMinutes'; minutes: number };

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: Rarity;
  condition: AchievementCondition;
  xpReward: number;
  coinReward: number;
  /** Hidden until unlocked. */
  secret?: boolean;
  /** Social achievements are hidden while social mode is off. */
  social?: boolean;
}

export interface AchievementRecord {
  id: string;
  unlockedAt: number;
}

/** Definition merged with the player's unlock state. */
export interface Achievement extends AchievementDef {
  unlocked: boolean;
  unlockedAt: number | null;
  progress: { current: number; target: number };
}

/* ───────────────────────── Goals ───────────────────────── */

export interface Milestone {
  id: ID;
  title: string;
  xpReward: number;
  completed: boolean;
  completedAt: number | null;
}

export interface Goal {
  id: ID;
  title: string;
  description: string;
  /** What "done" looks like, e.g. "Reach conversational level". */
  target: string;
  category: CategoryId | null;
  deadline: DateKey | null;
  /** 0–100. Derived from milestones when there are any. */
  progress: number;
  milestones: Milestone[];
  createdAt: number;
  completedAt: number | null;
  status: 'active' | 'completed' | 'archived';
}

/* ───────────────────────── Journal ───────────────────────── */

export interface JournalEntry {
  id: ID;
  dateKey: DateKey;
  text: string;
  mood: 1 | 2 | 3 | 4 | 5 | null;
  photoIds: ID[];
  createdAt: number;
  updatedAt: number;
}

export interface MediaRecord {
  id: ID;
  blob: Blob;
  type: string;
  width: number;
  height: number;
  createdAt: number;
}

/* ───────────────────────── Social ───────────────────────── */

export interface PartyMember {
  id: ID;
  name: string;
  classId: ClassId | null;
  avatar: AvatarConfig | null;
  titleId: string | null;
  level: number | null;
  totalXP: number | null;
  weeklyXP: number | null;
  weekKey: DateKey | null;
  monthlyXP: number | null;
  monthKey: MonthKey | null;
  questsCompleted: number | null;
  achievements: number | null;
  streak: number | null;
  /** When the friend generated the card they shared. */
  cardAt: number;
  addedAt: number;
  updatedAt: number;
}

export interface FriendChallenge {
  id: ID;
  opponentId: ID;
  opponentName: string;
  metric: 'weekly_xp';
  weekKey: DateKey;
  reward: number;
  createdAt: number;
  status: 'active' | 'won' | 'lost' | 'tied';
  resolvedAt: number | null;
  myScore: number | null;
  theirScore: number | null;
}

/* ───────────────────────── Weekly challenges & events ───────────────────────── */

export type ChallengeMetric =
  | { type: 'xp' }
  | { type: 'quests' }
  | { type: 'sessions'; categories: CategoryId[]; minMinutes: number }
  | { type: 'categoryDays'; categories: CategoryId[] }
  | { type: 'minutes'; categories: CategoryId[] }
  | { type: 'activeDays' }
  | { type: 'dailyGoals' }
  | { type: 'focusSessions' }
  | { type: 'distinctCategories' };

export interface WeeklyChallenge {
  id: ID;
  defId: string;
  /** The weekly boss is the XP challenge, presented as a boss fight. */
  bossId: string | null;
  title: string;
  description: string;
  metric: ChallengeMetric;
  target: number;
  unitLabel: string;
  xpReward: number;
  coinReward: number;
  /** When progress first reached the target (drives a one-time "ready to claim" notice). */
  readyAt: number | null;
  claimed: boolean;
  claimedAt: number | null;
}

export interface WeeklyState {
  /** Same as `weekKey`, so weekly states persist like every other record. */
  id: DateKey;
  weekKey: DateKey;
  challenges: WeeklyChallenge[];
  createdAt: number;
}

export interface SpecialEventDef {
  id: string;
  name: string;
  tagline: string;
  description: string;
  /** Recurs yearly between these local dates (inclusive). */
  start: { month: number; day: number };
  end: { month: number; day: number };
  metric: ChallengeMetric;
  target: number;
  unitLabel: string;
  /** Measure progress within the current week or across the whole event. */
  window: 'week' | 'event';
  rewards: { xp: number; coins: number; itemIds: string[] };
  sigil: string;
}

export interface EventProgress {
  /** `${eventId}:${year}` */
  key: string;
  completedAt: number | null;
  claimedAt: number | null;
}

/* ───────────────────────── Cosmetics ───────────────────────── */

export type CosmeticSlot = 'sigil' | 'background' | 'frame' | 'aura' | 'xpEffect' | 'uiEffect' | 'theme' | 'title' | 'badge';

export type UnlockRule =
  | { type: 'default' }
  | { type: 'level'; level: number }
  | { type: 'achievement'; achievementId: string }
  | { type: 'shop'; price: number; minLevel?: number }
  | { type: 'event'; eventId: string };

export interface CosmeticItem {
  id: string;
  slot: CosmeticSlot;
  name: string;
  description: string;
  rarity: Rarity;
  unlock: UnlockRule;
}

/* ───────────────────────── Focus sessions ───────────────────────── */

export interface FocusSession {
  id: ID;
  questId: ID | null;
  category: CategoryId;
  label: string;
  targetMinutes: number;
  startedAt: number;
  /** Elapsed milliseconds banked before the current running segment. */
  accumulatedMs: number;
  /** Start of the current running segment; null while paused. */
  resumedAt: number | null;
  pauses: number;
  status: 'running' | 'paused' | 'complete';
  completedAt: number | null;
}

/* ───────────────────────── Meta & state ───────────────────────── */

export interface StreakResetNotice {
  previous: number;
  /** The first day that broke the chain. */
  brokenOn: DateKey;
  /** If set, the player may cover this single missed day with a rest day. */
  protectableDay: DateKey | null;
  seen: boolean;
}

export interface GameMeta {
  schemaVersion: number;
  onboardedAt: number | null;
  /** Last local day the engine processed a day rollover for. */
  lastSeenDate: DateKey | null;
  restDays: DateKey[];
  /** Highest level that has paid out level-up coins (prevents re-paying after curve changes). */
  maxLevelRewarded: number;
  /** Owned cosmetic item ids (purchased, unlocked or default). */
  inventory: string[];
  purchases: string[];
  momentum: { count: number; lastAt: number };
  peakMomentum: number;
  rerolls: { dateKey: DateKey; count: number };
  streakReset: StreakResetNotice | null;
  streakResets: number;
  lastSummaryDate: DateKey | null;
  generatorUses: number;
  customQuestsCreated: number;
  events: Record<string, EventProgress>;
  notificationLog: Record<string, string>;
  dismissed: string[];
}

export interface GameState {
  profile: Profile | null;
  settings: Settings;
  meta: GameMeta;
  quests: Quest[];
  activities: Activity[];
  transactions: Transaction[];
  achievements: AchievementRecord[];
  goals: Goal[];
  journal: JournalEntry[];
  party: PartyMember[];
  challenges: FriendChallenge[];
  weeklies: WeeklyState[];
  session: FocusSession | null;
}

/** Collections persisted as one record per item. */
export type CollectionKey =
  | 'quests'
  | 'activities'
  | 'transactions'
  | 'achievements'
  | 'goals'
  | 'journal'
  | 'party'
  | 'challenges'
  | 'weeklies';

/* ───────────────────────── Derived stats ───────────────────────── */

export interface DayStats {
  dateKey: DateKey;
  /** All XP earned that day. */
  xp: number;
  quests: number;
  activities: number;
  minutes: number;
  minutesByCategory: Partial<Record<CategoryId, number>>;
  xpByCategory: Partial<Record<CategoryId, number>>;
  goalMet: boolean;
  rest: boolean;
  /** Did something productive (a quest or an activity). Drives streaks. */
  active: boolean;
}

/* ───────────────────────── Engine events (drive celebrations) ───────────────────────── */

export type GameEvent =
  | { type: 'xp'; amount: number; source: XPSource; label: string; category: CategoryId | null }
  | { type: 'coins'; amount: number; label: string }
  | { type: 'levelUp'; from: number; to: number; coins: number; unlocks: string[] }
  | { type: 'categoryLevelUp'; category: CategoryId; level: number }
  | { type: 'achievement'; id: string }
  | { type: 'questComplete'; questId: ID; title: string; xp: number; coins: number }
  | { type: 'questProgress'; questId: ID; title: string; progress: number; target: number }
  | { type: 'dailyGoal'; xp: number; coins: number }
  | { type: 'weeklyReady'; challengeId: ID; title: string }
  | { type: 'weeklyClaimed'; challengeId: ID; title: string; xp: number; coins: number; boss: boolean }
  | { type: 'streak'; kind: 'increase' | 'milestone'; value: number }
  | { type: 'streakReset'; previous: number }
  | { type: 'milestone'; goalId: ID; title: string; xp: number }
  | { type: 'goalComplete'; goalId: ID; title: string; xp: number; coins: number }
  | { type: 'unlock'; itemId: string }
  | { type: 'momentum'; count: number; multiplier: number }
  | { type: 'healthyCap'; category: CategoryId; level: 'soft' | 'hard' }
  | { type: 'eventReady'; eventId: string }
  | { type: 'eventClaimed'; eventId: string; xp: number; coins: number }
  | { type: 'challengeResolved'; challengeId: ID; status: 'won' | 'lost' | 'tied'; coins: number; opponent: string }
  | { type: 'restDay'; dateKey: DateKey; xp: number }
  | { type: 'purchase'; itemId: string; price: number };
