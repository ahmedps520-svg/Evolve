/**
 * Defensive normalization for anything read from storage or an imported backup.
 * Invalid records are dropped (and counted) instead of crashing the app; missing fields get defaults.
 */
import type {
  AchievementRecord,
  Activity,
  AvatarConfig,
  ChallengeMetric,
  FocusSession,
  FriendChallenge,
  GameMeta,
  GameState,
  Goal,
  JournalEntry,
  Milestone,
  PartyMember,
  Profile,
  Quest,
  QuestTarget,
  Settings,
  Transaction,
  WeeklyChallenge,
  WeeklyState,
} from '@/types';
import { ACHIEVEMENT_MAP } from '@/data/achievements';
import { isCategoryId } from '@/data/categories';
import { isClassId } from '@/data/classes';
import { COSMETIC_MAP, DEFAULT_ITEMS } from '@/data/cosmetics';
import { defaultMeta, defaultSettings, SCHEMA_VERSION } from '@/data/defaults';
import { GAME_DIFFICULTY_MAP, QUEST_DIFFICULTY_MAP } from '@/data/difficulty';
import { isFocusArea } from '@/data/focusAreas';
import { isDateKey, toDateKey } from '@/lib/date';
import { mergeSettings } from '@/lib/engine/gameEngine';
import { sanitizeSchedule } from '@/lib/engine/validation';
import { calculateLevel, sanitizeCurve } from '@/lib/xp';

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);
const num = (v: unknown, fallback = 0): number => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
const bool = (v: unknown, fallback = false): boolean => (typeof v === 'boolean' ? v : fallback);
const strOrNull = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);
const numOrNull = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const dateKey = (v: unknown, fallback: string): string => (isDateKey(v) ? v : fallback);
const dateKeyOrNull = (v: unknown): string | null => (isDateKey(v) ? v : null);
const id = (v: unknown): string | null => (typeof v === 'string' && v.length > 0 && v.length <= 128 ? v : null);

const QUEST_UNITS = new Set(['minutes', 'times', 'pages', 'km', 'reps']);
const QUEST_KINDS = new Set(['daily', 'starter', 'custom', 'generated', 'goal', 'event']);
const QUEST_STATUSES = new Set(['active', 'completed', 'expired', 'archived']);
const XP_SOURCES = new Set(['quest', 'activity', 'achievement', 'daily_goal', 'weekly', 'milestone', 'goal', 'momentum', 'event', 'rest', 'challenge', 'adjustment', 'starter', 'level', 'purchase']);

function avatar(v: unknown): AvatarConfig {
  const a = isObj(v) ? v : {};
  const pick = (key: string, fallback: string) => {
    const value = str(a[key]);
    return COSMETIC_MAP[value] ? value : fallback;
  };
  return { sigil: pick('sigil', 'sigil:spark'), background: pick('background', 'bg:void'), frame: pick('frame', 'frame:simple'), aura: pick('aura', 'aura:none') };
}

export function normalizeProfile(v: unknown): Profile | null {
  if (!isObj(v)) return null;
  const pid = id(v.id);
  const name = str(v.name).trim().slice(0, 24);
  if (!pid || !name) return null;
  const difficulty = str(v.difficulty) in GAME_DIFFICULTY_MAP ? (v.difficulty as Profile['difficulty']) : 'normal';
  const focus = Array.isArray(v.focusAreas) ? v.focusAreas.filter(isFocusArea) : [];
  const cosmetic = (value: unknown, fallback: string | null) => (typeof value === 'string' && COSMETIC_MAP[value] ? value : fallback);
  return {
    id: pid,
    name,
    avatar: avatar(v.avatar),
    classId: isClassId(v.classId) ? v.classId : 'balanced',
    level: Math.max(1, Math.floor(num(v.level, 1))),
    totalXP: Math.max(0, num(v.totalXP)),
    coins: Math.max(0, num(v.coins)),
    currentStreak: Math.max(0, Math.floor(num(v.currentStreak))),
    longestStreak: Math.max(0, Math.floor(num(v.longestStreak))),
    dailyGoal: Math.min(3000, Math.max(50, Math.round(num(v.dailyGoal, GAME_DIFFICULTY_MAP[difficulty].dailyGoal)))),
    difficulty,
    focusAreas: focus.length ? focus : ['studying', 'fitness', 'reading'],
    titleId: cosmetic(v.titleId, null),
    badgeId: cosmetic(v.badgeId, null),
    xpEffect: cosmetic(v.xpEffect, 'xp:standard') ?? 'xp:standard',
    uiEffect: cosmetic(v.uiEffect, 'fx:sparks') ?? 'fx:sparks',
    playerTag: str(v.playerTag).slice(0, 24) || `Player_${1000 + Math.floor(Math.random() * 9000)}`,
    createdAt: num(v.createdAt, Date.now()),
  };
}

function target(v: unknown): QuestTarget | null {
  if (!isObj(v)) return null;
  const amount = num(v.amount);
  const unit = str(v.unit);
  if (amount <= 0 || !QUEST_UNITS.has(unit)) return null;
  return { amount, unit: unit as QuestTarget['unit'] };
}

export function normalizeQuest(v: unknown): Quest | null {
  if (!isObj(v)) return null;
  const qid = id(v.id);
  const title = str(v.title).trim().slice(0, 80);
  if (!qid || !title) return null;
  const difficulty = str(v.difficulty) in QUEST_DIFFICULTY_MAP ? (v.difficulty as Quest['difficulty']) : 'medium';
  const d = QUEST_DIFFICULTY_MAP[difficulty];
  const t = target(v.target);
  return {
    id: qid,
    kind: QUEST_KINDS.has(str(v.kind)) ? (v.kind as Quest['kind']) : 'custom',
    title,
    description: str(v.description).slice(0, 300),
    category: isCategoryId(v.category) ? v.category : 'custom',
    difficulty,
    xpReward: Math.min(d.maxXP, Math.max(1, Math.round(num(v.xpReward, d.defaultXP)))),
    coinReward: Math.min(500, Math.max(0, Math.round(num(v.coinReward)))),
    target: t,
    progress: Math.max(0, Math.min(t?.amount ?? 1, num(v.progress))),
    completed: bool(v.completed),
    status: QUEST_STATUSES.has(str(v.status)) ? (v.status as Quest['status']) : 'active',
    createdAt: num(v.createdAt, Date.now()),
    completedAt: numOrNull(v.completedAt),
    repeatSchedule: sanitizeSchedule(v.repeatSchedule as Quest['repeatSchedule']),
    timerMinutes: numOrNull(v.timerMinutes),
    periodKey: dateKeyOrNull(v.periodKey),
    dueDate: dateKeyOrNull(v.dueDate),
    goalId: strOrNull(v.goalId),
    templateId: strOrNull(v.templateId),
    streak: Math.max(0, Math.floor(num(v.streak))),
    bestStreak: Math.max(0, Math.floor(num(v.bestStreak))),
    lastCompletedKey: dateKeyOrNull(v.lastCompletedKey),
    completionCount: Math.max(0, Math.floor(num(v.completionCount))),
    rerolled: bool(v.rerolled),
    order: num(v.order),
  };
}

export function normalizeActivity(v: unknown): Activity | null {
  if (!isObj(v)) return null;
  const aid = id(v.id);
  const timestamp = num(v.timestamp, NaN);
  const duration = Math.round(num(v.duration));
  if (!aid || !isCategoryId(v.category) || !Number.isFinite(timestamp) || duration < 1 || duration > 1440) return null;
  const unit = str(v.unit);
  return {
    id: aid,
    category: v.category,
    label: strOrNull(v.label),
    duration,
    xpEarned: Math.max(0, Math.round(num(v.xpEarned))),
    bonusXP: Math.max(0, Math.round(num(v.bonusXP))),
    timestamp,
    dateKey: dateKey(v.dateKey, toDateKey(timestamp)),
    notes: str(v.notes).slice(0, 500),
    amount: numOrNull(v.amount),
    unit: QUEST_UNITS.has(unit) ? (unit as Activity['unit']) : null,
    source: v.source === 'focus' ? 'focus' : 'manual',
    questId: strOrNull(v.questId),
    capped: bool(v.capped),
  };
}

export function normalizeTransaction(v: unknown): Transaction | null {
  if (!isObj(v)) return null;
  const tid = id(v.id);
  const timestamp = num(v.timestamp, NaN);
  const amount = num(v.amount, NaN);
  const currency = v.currency === 'coins' ? 'coins' : v.currency === 'xp' ? 'xp' : null;
  if (!tid || !currency || !Number.isFinite(timestamp) || !Number.isFinite(amount) || Math.abs(amount) > 1_000_000) return null;
  const source = XP_SOURCES.has(str(v.source)) ? (v.source as Transaction['source']) : 'adjustment';
  const tx: Transaction = {
    id: tid,
    currency,
    amount: Math.round(amount),
    source,
    label: str(v.label).slice(0, 120),
    category: isCategoryId(v.category) ? v.category : null,
    refId: strOrNull(v.refId),
    timestamp,
    dateKey: dateKey(v.dateKey, toDateKey(timestamp)),
  };
  if (v.linked === true) tx.linked = true;
  return tx;
}

export function normalizeAchievement(v: unknown): AchievementRecord | null {
  if (!isObj(v) || typeof v.id !== 'string' || !ACHIEVEMENT_MAP[v.id]) return null;
  return { id: v.id, unlockedAt: num(v.unlockedAt, Date.now()) };
}

function milestone(v: unknown): Milestone | null {
  if (!isObj(v)) return null;
  const mid = id(v.id);
  const title = str(v.title).trim().slice(0, 80);
  if (!mid || !title) return null;
  return { id: mid, title, xpReward: Math.min(300, Math.max(10, Math.round(num(v.xpReward, 75)))), completed: bool(v.completed), completedAt: numOrNull(v.completedAt) };
}

export function normalizeGoal(v: unknown): Goal | null {
  if (!isObj(v)) return null;
  const gid = id(v.id);
  const title = str(v.title).trim().slice(0, 80);
  if (!gid || !title) return null;
  const status = v.status === 'completed' || v.status === 'archived' ? v.status : 'active';
  return {
    id: gid,
    title,
    description: str(v.description).slice(0, 400),
    target: str(v.target).slice(0, 120),
    category: isCategoryId(v.category) ? v.category : null,
    deadline: dateKeyOrNull(v.deadline),
    progress: Math.max(0, Math.min(100, Math.round(num(v.progress)))),
    milestones: (Array.isArray(v.milestones) ? v.milestones : []).map(milestone).filter((m): m is Milestone => !!m).slice(0, 12),
    createdAt: num(v.createdAt, Date.now()),
    completedAt: numOrNull(v.completedAt),
    status,
  };
}

export function normalizeJournal(v: unknown): JournalEntry | null {
  if (!isObj(v)) return null;
  const jid = id(v.id);
  if (!jid || !isDateKey(v.dateKey)) return null;
  const mood = num(v.mood, 0);
  return {
    id: jid,
    dateKey: v.dateKey,
    text: str(v.text).slice(0, 5000),
    mood: mood >= 1 && mood <= 5 ? (Math.round(mood) as JournalEntry['mood']) : null,
    photoIds: (Array.isArray(v.photoIds) ? v.photoIds : []).filter((p): p is string => typeof p === 'string').slice(0, 6),
    createdAt: num(v.createdAt, Date.now()),
    updatedAt: num(v.updatedAt, Date.now()),
  };
}

export function normalizePartyMember(v: unknown): PartyMember | null {
  if (!isObj(v)) return null;
  const pid = id(v.id);
  const name = str(v.name).trim().slice(0, 24);
  if (!pid || !name) return null;
  const nOrNull = (x: unknown, max: number) => {
    const n = numOrNull(x);
    return n === null ? null : Math.max(0, Math.min(max, Math.round(n)));
  };
  return {
    id: pid,
    name,
    classId: isClassId(v.classId) ? v.classId : null,
    avatar: isObj(v.avatar) ? avatar(v.avatar) : null,
    titleId: typeof v.titleId === 'string' && COSMETIC_MAP[v.titleId] ? v.titleId : null,
    level: nOrNull(v.level, 999),
    totalXP: nOrNull(v.totalXP, 100_000_000),
    weeklyXP: nOrNull(v.weeklyXP, 1_000_000),
    weekKey: dateKeyOrNull(v.weekKey),
    monthlyXP: nOrNull(v.monthlyXP, 10_000_000),
    monthKey: typeof v.monthKey === 'string' && /^\d{4}-\d{2}$/.test(v.monthKey) ? v.monthKey : null,
    questsCompleted: nOrNull(v.questsCompleted, 1_000_000),
    achievements: nOrNull(v.achievements, 1000),
    streak: nOrNull(v.streak, 100_000),
    cardAt: num(v.cardAt, Date.now()),
    addedAt: num(v.addedAt, Date.now()),
    updatedAt: num(v.updatedAt, Date.now()),
  };
}

export function normalizeChallenge(v: unknown): FriendChallenge | null {
  if (!isObj(v)) return null;
  const cid = id(v.id);
  const opponentId = id(v.opponentId);
  if (!cid || !opponentId || !isDateKey(v.weekKey)) return null;
  const status = ['active', 'won', 'lost', 'tied'].includes(str(v.status)) ? (v.status as FriendChallenge['status']) : 'active';
  return {
    id: cid,
    opponentId,
    opponentName: str(v.opponentName, 'Friend').slice(0, 24),
    metric: 'weekly_xp',
    weekKey: v.weekKey,
    reward: Math.min(1000, Math.max(0, Math.round(num(v.reward, 250)))),
    createdAt: num(v.createdAt, Date.now()),
    status,
    resolvedAt: numOrNull(v.resolvedAt),
    myScore: numOrNull(v.myScore),
    theirScore: numOrNull(v.theirScore),
  };
}

function metric(v: unknown): ChallengeMetric | null {
  if (!isObj(v)) return null;
  const cats = Array.isArray(v.categories) ? v.categories.filter(isCategoryId) : [];
  switch (v.type) {
    case 'xp':
    case 'quests':
    case 'activeDays':
    case 'dailyGoals':
    case 'focusSessions':
    case 'distinctCategories':
      return { type: v.type };
    case 'sessions':
      return cats.length ? { type: 'sessions', categories: cats, minMinutes: Math.max(0, num(v.minMinutes, 15)) } : null;
    case 'categoryDays':
    case 'minutes':
      return cats.length ? { type: v.type, categories: cats } : null;
    default:
      return null;
  }
}

function weeklyChallenge(v: unknown): WeeklyChallenge | null {
  if (!isObj(v)) return null;
  const cid = id(v.id);
  const m = metric(v.metric);
  if (!cid || !m) return null;
  return {
    id: cid,
    defId: str(v.defId),
    bossId: strOrNull(v.bossId),
    title: str(v.title, 'Challenge').slice(0, 60),
    description: str(v.description).slice(0, 200),
    metric: m,
    target: Math.max(1, Math.round(num(v.target, 1))),
    unitLabel: str(v.unitLabel).slice(0, 20),
    xpReward: Math.min(2000, Math.max(0, Math.round(num(v.xpReward)))),
    coinReward: Math.min(1000, Math.max(0, Math.round(num(v.coinReward)))),
    readyAt: numOrNull(v.readyAt),
    claimed: bool(v.claimed),
    claimedAt: numOrNull(v.claimedAt),
  };
}

export function normalizeWeekly(v: unknown): WeeklyState | null {
  if (!isObj(v) || !isDateKey(v.weekKey)) return null;
  const challenges = (Array.isArray(v.challenges) ? v.challenges : []).map(weeklyChallenge).filter((c): c is WeeklyChallenge => !!c);
  if (!challenges.length) return null;
  return { id: v.weekKey, weekKey: v.weekKey, challenges, createdAt: num(v.createdAt, Date.now()) };
}

export function normalizeSession(v: unknown): FocusSession | null {
  if (!isObj(v)) return null;
  const sid = id(v.id);
  if (!sid || !isCategoryId(v.category)) return null;
  const status = v.status === 'paused' || v.status === 'complete' ? v.status : 'running';
  return {
    id: sid,
    questId: strOrNull(v.questId),
    category: v.category,
    label: str(v.label).slice(0, 60),
    targetMinutes: Math.min(180, Math.max(5, Math.round(num(v.targetMinutes, 25)))),
    startedAt: num(v.startedAt, Date.now()),
    accumulatedMs: Math.max(0, num(v.accumulatedMs)),
    resumedAt: numOrNull(v.resumedAt),
    pauses: Math.max(0, Math.floor(num(v.pauses))),
    status,
    completedAt: numOrNull(v.completedAt),
  };
}

export function normalizeSettings(v: unknown): Settings {
  return mergeSettings(defaultSettings(), (isObj(v) ? v : {}) as Partial<Settings>);
}

export function normalizeMeta(v: unknown): GameMeta {
  const d = defaultMeta();
  if (!isObj(v)) return d;
  const strings = (x: unknown) => (Array.isArray(x) ? x.filter((s): s is string => typeof s === 'string') : []);
  const inventory = Array.from(new Set([...DEFAULT_ITEMS, ...strings(v.inventory).filter((i) => COSMETIC_MAP[i])]));
  const momentum = isObj(v.momentum) ? { count: Math.max(0, Math.floor(num(v.momentum.count))), lastAt: num(v.momentum.lastAt) } : d.momentum;
  const rerolls = isObj(v.rerolls) ? { dateKey: str(v.rerolls.dateKey), count: Math.max(0, Math.floor(num(v.rerolls.count))) } : d.rerolls;
  const sr = isObj(v.streakReset) ? v.streakReset : null;
  const events: GameMeta['events'] = {};
  if (isObj(v.events)) {
    for (const [key, rec] of Object.entries(v.events)) {
      if (isObj(rec)) events[key] = { key, completedAt: numOrNull(rec.completedAt), claimedAt: numOrNull(rec.claimedAt) };
    }
  }
  const log: Record<string, string> = {};
  if (isObj(v.notificationLog)) for (const [k, val] of Object.entries(v.notificationLog)) if (typeof val === 'string') log[k] = val;
  return {
    schemaVersion: SCHEMA_VERSION,
    onboardedAt: numOrNull(v.onboardedAt),
    lastSeenDate: dateKeyOrNull(v.lastSeenDate),
    restDays: Array.from(new Set(strings(v.restDays).filter(isDateKey))).sort(),
    maxLevelRewarded: Math.max(1, Math.floor(num(v.maxLevelRewarded, 1))),
    inventory,
    purchases: strings(v.purchases).filter((i) => COSMETIC_MAP[i]),
    momentum,
    peakMomentum: Math.min(1.15, Math.max(1, num(v.peakMomentum, 1))),
    rerolls,
    streakReset:
      sr && isDateKey(sr.brokenOn)
        ? { previous: Math.max(0, num(sr.previous)), brokenOn: sr.brokenOn, protectableDay: dateKeyOrNull(sr.protectableDay), seen: bool(sr.seen) }
        : null,
    streakResets: Math.max(0, Math.floor(num(v.streakResets))),
    lastSummaryDate: dateKeyOrNull(v.lastSummaryDate),
    generatorUses: Math.max(0, Math.floor(num(v.generatorUses))),
    customQuestsCreated: Math.max(0, Math.floor(num(v.customQuestsCreated))),
    events,
    notificationLog: log,
    dismissed: strings(v.dismissed).slice(0, 200),
  };
}

function collection<T>(raw: unknown, normalize: (v: unknown) => T | null, keyOf: (t: T) => string): { items: T[]; skipped: number } {
  const list = Array.isArray(raw) ? raw : [];
  const seen = new Set<string>();
  const items: T[] = [];
  let skipped = 0;
  for (const entry of list) {
    const item = normalize(entry);
    if (!item || seen.has(keyOf(item))) {
      skipped++;
      continue;
    }
    seen.add(keyOf(item));
    items.push(item);
  }
  return { items, skipped };
}

export interface RawState {
  profile?: unknown;
  settings?: unknown;
  meta?: unknown;
  session?: unknown;
  quests?: unknown;
  activities?: unknown;
  transactions?: unknown;
  achievements?: unknown;
  goals?: unknown;
  journal?: unknown;
  party?: unknown;
  challenges?: unknown;
  weeklies?: unknown;
}

/**
 * Build a valid GameState from untrusted input. Totals are reconciled with the transaction ledger
 * (the source of truth), so XP, level and coins can never drift.
 */
export function normalizeState(raw: RawState): { state: GameState; skipped: number } {
  const byId = <T extends { id: string }>(t: T) => t.id;
  const quests = collection(raw.quests, normalizeQuest, byId);
  const activities = collection(raw.activities, normalizeActivity, byId);
  const transactions = collection(raw.transactions, normalizeTransaction, byId);
  const achievements = collection(raw.achievements, normalizeAchievement, byId);
  const goals = collection(raw.goals, normalizeGoal, byId);
  const journal = collection(raw.journal, normalizeJournal, (j) => j.dateKey);
  const party = collection(raw.party, normalizePartyMember, byId);
  const challenges = collection(raw.challenges, normalizeChallenge, byId);
  const weeklies = collection(raw.weeklies, normalizeWeekly, byId);
  const settings = normalizeSettings(raw.settings);
  const meta = normalizeMeta(raw.meta);
  let profile = normalizeProfile(raw.profile);

  if (profile) {
    let xp = 0;
    let coins = 0;
    for (const tx of transactions.items) {
      if (tx.currency === 'xp') xp += tx.amount;
      else coins += tx.amount;
    }
    const totalXP = Math.max(0, xp);
    profile = {
      ...profile,
      totalXP,
      coins: Math.max(0, coins),
      level: calculateLevel(totalXP, sanitizeCurve(settings.xp.curve)),
      titleId: profile.titleId && meta.inventory.includes(profile.titleId) ? profile.titleId : null,
      badgeId: profile.badgeId && meta.inventory.includes(profile.badgeId) ? profile.badgeId : null,
    };
    meta.maxLevelRewarded = Math.max(meta.maxLevelRewarded, profile.level);
    if (!meta.onboardedAt) meta.onboardedAt = profile.createdAt;
  }

  const skipped =
    quests.skipped + activities.skipped + transactions.skipped + achievements.skipped + goals.skipped + journal.skipped + party.skipped + challenges.skipped + weeklies.skipped;

  return {
    state: {
      profile,
      settings,
      meta,
      quests: quests.items,
      activities: activities.items.sort((a, b) => a.timestamp - b.timestamp),
      transactions: transactions.items.sort((a, b) => a.timestamp - b.timestamp),
      achievements: achievements.items,
      goals: goals.items,
      journal: journal.items,
      party: party.items,
      challenges: challenges.items,
      weeklies: weeklies.items.sort((a, b) => (a.weekKey < b.weekKey ? -1 : 1)),
      session: normalizeSession(raw.session),
    },
    skipped,
  };
}
