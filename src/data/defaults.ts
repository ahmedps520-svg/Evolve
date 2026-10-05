import type { GameMeta, GameState, Settings } from '@/types';
import { DEFAULT_CURVE } from '@/lib/xp';
import { DEFAULT_ACTIVITY_RATES } from './categories';
import { DEFAULT_ITEMS } from './cosmetics';
import { DEFAULT_QUEST_XP } from './difficulty';

export const SCHEMA_VERSION = 1;
export const APP_NAME = 'Evolve';

export function defaultSettings(): Settings {
  return {
    theme: 'dark',
    accent: 'electric',
    highContrast: false,
    motion: 'system',
    intenseEffects: true,
    // Off by default: browsers restrict audio until the user interacts, and many people play muted.
    sound: { enabled: false, volume: 0.6 },
    haptics: true,
    notifications: {
      enabled: false,
      dailyReminder: true,
      reminderTime: '18:00',
      levelProximity: true,
      weeklyDeadline: true,
      streakMilestones: true,
      quietHours: { enabled: true, start: '22:00', end: '08:00' },
    },
    xp: {
      curve: { ...DEFAULT_CURVE },
      questXP: { ...DEFAULT_QUEST_XP },
      activityRates: { ...DEFAULT_ACTIVITY_RATES },
      momentum: true,
    },
    weekStartsOn: 1,
    social: {
      enabled: false,
      anonymous: false,
      share: { level: true, totalXP: true, weeklyXP: true, quests: true, achievements: true, streak: true },
    },
    journal: true,
  };
}

export function defaultMeta(): GameMeta {
  return {
    schemaVersion: SCHEMA_VERSION,
    onboardedAt: null,
    lastSeenDate: null,
    restDays: [],
    maxLevelRewarded: 1,
    inventory: [...DEFAULT_ITEMS],
    purchases: [],
    momentum: { count: 0, lastAt: 0 },
    peakMomentum: 1,
    rerolls: { dateKey: '', count: 0 },
    streakReset: null,
    streakResets: 0,
    lastSummaryDate: null,
    generatorUses: 0,
    customQuestsCreated: 0,
    events: {},
    notificationLog: {},
    dismissed: [],
  };
}

export function emptyState(): GameState {
  return {
    profile: null,
    settings: defaultSettings(),
    meta: defaultMeta(),
    quests: [],
    activities: [],
    transactions: [],
    achievements: [],
    goals: [],
    journal: [],
    party: [],
    challenges: [],
    weeklies: [],
    session: null,
  };
}
