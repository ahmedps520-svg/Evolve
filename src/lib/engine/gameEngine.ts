/**
 * gameEngine — the single place where game rules live.
 *
 * Every action is a pure function `(state, input, now) → { state, events }`. React components never
 * compute rewards themselves; they dispatch actions and render the resulting state, and the events
 * drive celebrations (XP floaters, level-ups, achievement toasts, sounds).
 */
import type {
  Activity,
  CategoryId,
  ClassId,
  CosmeticItem,
  DateKey,
  FocusArea,
  FocusSession,
  GameDifficulty,
  GameState,
  Goal,
  JournalEntry,
  PartyMember,
  Profile,
  Quest,
  QuestUnit,
  Settings,
} from '@/types';
import { ACHIEVEMENTS } from '@/data/achievements';
import { CATEGORY_MAP, MAX_LOG_MINUTES, getCategory, isCategoryId } from '@/data/categories';
import { CLASS_MAP, isClassId } from '@/data/classes';
import { COSMETICS, COSMETIC_MAP, themeAccent } from '@/data/cosmetics';
import { defaultMeta, emptyState } from '@/data/defaults';
import { GAME_DIFFICULTY_MAP, QUEST_DIFFICULTY_MAP } from '@/data/difficulty';
import { EVENT_MAP } from '@/data/events';
import { isFocusArea } from '@/data/focusAreas';
import { addDays, toDateKey, weekStart } from '@/lib/date';
import { makePlayerTag, uid } from '@/lib/id';
import { sanitizeCurve } from '@/lib/xp';
import { buildDayStats, metricProgress, minutesOnDay } from './analysis';
import { buildAchievementContext, isConditionMet } from './achievements';
import { EngineContext, type EngineResult } from './context';
import {
  blankQuest,
  generateDailyQuests,
  isQuestAvailable,
  isRepeating,
  isScheduledOn,
  previousScheduledDay,
  questTarget,
  questsForToday,
  rerollDailyQuest,
  starterQuests,
} from './quests';
import {
  REST_DAY_XP,
  STARTER_COINS,
  applyLevel,
  awardCoins,
  awardXP,
  bumpMomentum,
  checkDailyGoal,
  revokeXP,
} from './rewards';
import { currentStreak, isStreakMilestone } from './streaks';
import { MILESTONE_DEFAULT_XP, sanitizeGoalInput, sanitizeQuestInput, type GoalInput, type QuestInput } from './validation';
import { activeEvents, eventProgress } from './specialEvents';
import { challengeProgress, currentWeekKey, generateWeekly, weekRange } from './weekly';

export type { EngineResult } from './context';

const noop = (state: GameState, error?: string): EngineResult => (error ? { state, events: [], error } : { state, events: [] });

/* ════════════════════════════ Settling: the checks that run after every action ════════════════════════════ */

/** Recompute the daily streak. Emits increase/milestone events. */
export function updateStreak(ctx: EngineContext): void {
  const profile = ctx.state.profile;
  if (!profile) return;
  const days = buildDayStats(ctx.state.transactions, ctx.state.activities, ctx.meta.restDays);
  const value = currentStreak(days, ctx.today);
  const longest = Math.max(profile.longestStreak, value);
  if (value !== profile.currentStreak || longest !== profile.longestStreak) ctx.setProfile({ currentStreak: value, longestStreak: longest });
  if (value > profile.currentStreak) ctx.emit({ type: 'streak', kind: isStreakMilestone(value) ? 'milestone' : 'increase', value });
}

/** Unlock every achievement whose condition is now met, paying out its rewards. */
export function checkAchievements(ctx: EngineContext): void {
  if (!ctx.state.profile) return;
  const unlocked = new Set(ctx.state.achievements.map((a) => a.id));
  const pending = ACHIEVEMENTS.filter((a) => !unlocked.has(a.id));
  if (!pending.length) return;
  const actx = buildAchievementContext(ctx.state, ctx.today);
  for (const def of pending) {
    if (!isConditionMet(def, actx)) continue;
    ctx.push('achievements', { id: def.id, unlockedAt: ctx.now });
    ctx.emit({ type: 'achievement', id: def.id });
    if (def.xpReward) awardXP(ctx, def.xpReward, 'achievement', def.name, { refId: def.id });
    if (def.coinReward) awardCoins(ctx, def.coinReward, 'achievement', def.name, def.id);
  }
}

/** Grant cosmetics whose unlock rule (default / level / achievement) is now satisfied. */
export function syncUnlocks(ctx: EngineContext): void {
  const profile = ctx.state.profile;
  if (!profile) return;
  const owned = new Set(ctx.meta.inventory);
  const achieved = new Set(ctx.state.achievements.map((a) => a.id));
  const added: CosmeticItem[] = [];
  for (const item of COSMETICS) {
    if (owned.has(item.id)) continue;
    const u = item.unlock;
    if (u.type === 'default' || (u.type === 'level' && profile.level >= u.level) || (u.type === 'achievement' && achieved.has(u.achievementId))) {
      added.push(item);
    }
  }
  if (!added.length) return;
  ctx.setMeta({ inventory: [...ctx.meta.inventory, ...added.map((i) => i.id)] });
  for (const item of added) if (item.unlock.type !== 'default') ctx.emit({ type: 'unlock', itemId: item.id });
}

function currentWeekly(ctx: EngineContext) {
  const key = currentWeekKey(ctx.today, ctx.state.settings.weekStartsOn);
  return ctx.state.weeklies.find((w) => w.weekKey === key) ?? null;
}

export function ensureWeekly(ctx: EngineContext): void {
  if (!ctx.state.profile) return;
  const key = currentWeekKey(ctx.today, ctx.state.settings.weekStartsOn);
  if (ctx.state.weeklies.some((w) => w.weekKey === key)) return;
  ctx.push('weeklies', generateWeekly(ctx.profile, key, ctx.now));
  // Keep half a year of weekly history.
  const keep = addDays(key, -7 * 26);
  ctx.remove('weeklies', (w) => w.weekKey < keep);
}

function checkWeeklyReady(ctx: EngineContext): void {
  const wk = currentWeekly(ctx);
  if (!wk) return;
  let changed = false;
  const challenges = wk.challenges.map((c) => {
    if (c.readyAt || c.claimed) return c;
    if (challengeProgress(ctx.state, wk.weekKey, c) < c.target) return c;
    changed = true;
    ctx.emit({ type: 'weeklyReady', challengeId: c.id, title: c.title });
    return { ...c, readyAt: ctx.now };
  });
  if (changed) ctx.update('weeklies', wk.id, { challenges });
}

function checkEventsReady(ctx: EngineContext): void {
  for (const ev of activeEvents(ctx.today, ctx.state.settings.weekStartsOn)) {
    if (ctx.meta.events[ev.key]?.completedAt) continue;
    if (eventProgress(ctx.state, ev) < ev.def.target) continue;
    ctx.setMeta({ events: { ...ctx.meta.events, [ev.key]: { key: ev.key, completedAt: ctx.now, claimedAt: null } } });
    ctx.emit({ type: 'eventReady', eventId: ev.def.id });
  }
}

/** Run all follow-up checks until nothing new happens (rewards can cascade, e.g. achievement XP → level-up). */
function settle(ctx: EngineContext, extraDays: DateKey[] = []): void {
  if (!ctx.state.profile) return;
  const days = Array.from(new Set([ctx.today, ...extraDays]));
  for (let i = 0; i < 5; i++) {
    const before = ctx.events.length;
    for (const d of days) checkDailyGoal(ctx, d);
    updateStreak(ctx);
    checkWeeklyReady(ctx);
    checkEventsReady(ctx);
    checkAchievements(ctx);
    syncUnlocks(ctx);
    if (ctx.events.length === before) break;
  }
}

/* ════════════════════════════ Onboarding & day rollover ════════════════════════════ */

export interface OnboardingInput {
  name: string;
  focusAreas: FocusArea[];
  difficulty: GameDifficulty;
  classId: ClassId;
  sigil?: string;
}

export function sanitizeName(name: string): string {
  return String(name ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 24);
}

export function completeOnboarding(state: GameState, input: OnboardingInput, now: number): EngineResult {
  if (state.profile) return noop(state, 'Your character already exists.');
  const today = toDateKey(now);
  const difficulty: GameDifficulty = input.difficulty in GAME_DIFFICULTY_MAP ? input.difficulty : 'normal';
  const classId: ClassId = isClassId(input.classId) ? input.classId : 'balanced';
  const focusAreas = Array.from(new Set((input.focusAreas ?? []).filter(isFocusArea)));
  const sigil = input.sigil && COSMETIC_MAP[`sigil:${input.sigil}`] ? input.sigil : CLASS_MAP[classId].sigil;

  const profile: Profile = {
    id: uid('p_'),
    name: sanitizeName(input.name) || 'Adventurer',
    avatar: { sigil: `sigil:${sigil}`, background: 'bg:void', frame: 'frame:simple', aura: 'aura:none' },
    classId,
    level: 1,
    totalXP: 0,
    coins: 0,
    currentStreak: 0,
    longestStreak: 0,
    dailyGoal: GAME_DIFFICULTY_MAP[difficulty].dailyGoal,
    difficulty,
    focusAreas: focusAreas.length ? focusAreas : ['studying', 'fitness', 'reading'],
    titleId: 'title:novice',
    badgeId: null,
    xpEffect: 'xp:standard',
    uiEffect: 'fx:sparks',
    playerTag: makePlayerTag(),
    createdAt: now,
  };

  const fresh: GameState = { ...emptyState(), settings: state.settings, profile, meta: { ...defaultMeta(), onboardedAt: now, lastSeenDate: today } };
  const ctx = new EngineContext(fresh, now);
  awardCoins(ctx, STARTER_COINS, 'starter', 'Starter coins');
  for (const q of starterQuests(profile, now, today)) ctx.push('quests', q);
  ensureWeekly(ctx);
  settle(ctx);
  return ctx.result();
}

/** Number of rest days already used in the week containing `dateKey`. */
export function restDaysUsed(state: GameState, dateKey: DateKey): number {
  const ws = weekStart(dateKey, state.settings.weekStartsOn);
  const we = addDays(ws, 6);
  return state.meta.restDays.filter((d) => d >= ws && d <= we).length;
}

export function restAllowance(state: GameState): number {
  return state.profile ? GAME_DIFFICULTY_MAP[state.profile.difficulty].restDaysPerWeek : 0;
}

export function canTakeRestDay(state: GameState, dateKey: DateKey, now: number): { ok: true } | { ok: false; reason: string } {
  if (!state.profile) return { ok: false, reason: 'Create your character first.' };
  const today = toDateKey(now);
  if (dateKey !== today && dateKey !== addDays(today, -1)) return { ok: false, reason: 'Rest days can only be taken for today or yesterday.' };
  if (state.meta.restDays.includes(dateKey)) return { ok: false, reason: 'That day is already a rest day.' };
  const active = state.activities.some((a) => a.dateKey === dateKey) || state.transactions.some((t) => t.dateKey === dateKey && t.source === 'quest');
  if (active) return { ok: false, reason: dateKey === today ? 'You’ve already been active today — no rest day needed.' : 'You were active that day.' };
  const allowance = restAllowance(state);
  if (restDaysUsed(state, dateKey) >= allowance) {
    return { ok: false, reason: `You’ve used this week’s ${allowance} rest day${allowance === 1 ? '' : 's'}. They refresh next week.` };
  }
  return { ok: true };
}

function detectStreakBreak(ctx: EngineContext): void {
  const profile = ctx.profile;
  const days = buildDayStats(ctx.state.transactions, ctx.state.activities, ctx.meta.restDays);
  const value = currentStreak(days, ctx.today);
  if (profile.currentStreak <= 0 || value > 0) return;

  const ok = (k: DateKey) => days.get(k)?.active === true || days.get(k)?.rest === true;
  let lastGood: DateKey | null = null;
  for (let i = 1; i <= 400; i++) {
    const k = addDays(ctx.today, -i);
    if (ok(k)) {
      lastGood = k;
      break;
    }
  }
  const yesterday = addDays(ctx.today, -1);
  const brokenOn = lastGood ? addDays(lastGood, 1) : yesterday;
  // A single missed day (yesterday) can be covered by a rest day, if one is left this week.
  const protectable = brokenOn === yesterday && canTakeRestDay(ctx.state, yesterday, ctx.now).ok ? yesterday : null;
  ctx.setMeta({
    streakReset: { previous: profile.currentStreak, brokenOn, protectableDay: protectable, seen: false },
    streakResets: ctx.meta.streakResets + 1,
  });
  ctx.setProfile({ currentStreak: 0 });
  ctx.emit({ type: 'streakReset', previous: profile.currentStreak });
}

function rolloverQuests(ctx: EngineContext): void {
  const today = ctx.today;
  const pruneBefore = addDays(today, -30);
  for (const q of ctx.state.quests) {
    if (q.kind === 'daily' && q.dueDate && q.dueDate < today && q.status === 'active' && !q.completed) {
      ctx.update('quests', q.id, { status: 'expired' });
    } else if (isRepeating(q) && q.status === 'active' && isScheduledOn(q.repeatSchedule, today) && q.periodKey !== today) {
      const prev = previousScheduledDay(q.repeatSchedule, today);
      const alive = !!q.lastCompletedKey && !!prev && q.lastCompletedKey >= prev;
      ctx.update('quests', q.id, { progress: 0, completed: false, completedAt: null, periodKey: today, streak: alive ? q.streak : 0 });
    }
  }
  // Old daily quests are pruned; their XP lives on in the transaction history.
  ctx.remove('quests', (q) => q.kind === 'daily' && !!q.dueDate && q.dueDate < pruneBefore);
}

function ensureDailyQuests(ctx: EngineContext): void {
  const meta = ctx.meta;
  if (!meta.onboardedAt || toDateKey(meta.onboardedAt) === ctx.today) return; // day one uses starter quests
  if (ctx.state.quests.some((q) => q.kind === 'daily' && q.dueDate === ctx.today)) return;
  for (const q of generateDailyQuests(ctx.profile, ctx.today, ctx.now, ctx.state.quests)) ctx.push('quests', q);
}

function claimChallengeInternal(ctx: EngineContext, weekId: string, challengeId: string, auto: boolean): boolean {
  const wk = ctx.state.weeklies.find((w) => w.id === weekId);
  const c = wk?.challenges.find((x) => x.id === challengeId);
  if (!wk || !c || c.claimed) return false;
  if (challengeProgress(ctx.state, wk.weekKey, c) < c.target) return false;
  ctx.update('weeklies', wk.id, {
    challenges: wk.challenges.map((x) => (x.id === challengeId ? { ...x, claimed: true, claimedAt: ctx.now, readyAt: x.readyAt ?? ctx.now } : x)),
  });
  const label = c.bossId ? `Boss defeated${auto ? ' (auto-claimed)' : ''}` : `${c.title}${auto ? ' (auto-claimed)' : ''}`;
  const xp = awardXP(ctx, c.xpReward, 'weekly', label, { refId: c.id });
  const coins = awardCoins(ctx, c.coinReward, 'weekly', label, c.id);
  ctx.emit({ type: 'weeklyClaimed', challengeId: c.id, title: c.title, xp, coins, boss: !!c.bossId });
  return true;
}

function autoClaimPast(ctx: EngineContext): void {
  const current = currentWeekKey(ctx.today, ctx.state.settings.weekStartsOn);
  for (const wk of ctx.state.weeklies) {
    if (wk.weekKey >= current) continue;
    for (const c of wk.challenges) if (!c.claimed) claimChallengeInternal(ctx, wk.id, c.id, true);
  }
  // Completed events that have ended are claimed automatically — rewards are never lost.
  const live = new Set(activeEvents(ctx.today, ctx.state.settings.weekStartsOn).map((e) => e.key));
  for (const rec of Object.values(ctx.meta.events)) {
    if (rec.completedAt && !rec.claimedAt && !live.has(rec.key)) claimEventInternal(ctx, rec.key);
  }
}

function resolveChallenges(ctx: EngineContext): void {
  const current = currentWeekKey(ctx.today, ctx.state.settings.weekStartsOn);
  for (const c of ctx.state.challenges) {
    if (c.status !== 'active' || c.weekKey >= current) continue;
    const { from, to } = weekRange(c.weekKey);
    const mine = metricProgress(ctx.state, { type: 'xp' }, from, to);
    const member = ctx.state.party.find((p) => p.id === c.opponentId);
    const theirs = member && member.weekKey === c.weekKey && member.weeklyXP != null ? member.weeklyXP : null;
    const status = theirs === null || theirs === mine ? 'tied' : mine > theirs ? 'won' : 'lost';
    const coins = status === 'won' ? c.reward : status === 'tied' ? Math.round(c.reward / 2) : 50;
    ctx.update('challenges', c.id, { status, resolvedAt: ctx.now, myScore: mine, theirScore: theirs });
    awardCoins(ctx, coins, 'challenge', `Challenge vs ${c.opponentName}`, c.id);
    ctx.emit({ type: 'challengeResolved', challengeId: c.id, status, coins, opponent: c.opponentName });
  }
}

/**
 * Bring the world up to date: expire yesterday's dailies, roll repeating quests, deal the new daily
 * board and weekly challenges, resolve finished challenges and detect a broken streak.
 * Safe to call any time (idempotent); call it on launch and whenever the local date changes.
 */
export function syncDay(state: GameState, now: number): EngineResult {
  if (!state.profile) return noop(state);
  const ctx = new EngineContext(state, now);
  const isNewDay = ctx.meta.lastSeenDate !== ctx.today;
  if (isNewDay) {
    rolloverQuests(ctx);
    autoClaimPast(ctx);
    resolveChallenges(ctx);
    detectStreakBreak(ctx);
    const notice = ctx.meta.streakReset;
    if (notice?.protectableDay && notice.protectableDay !== addDays(ctx.today, -1)) {
      ctx.setMeta({ streakReset: { ...notice, protectableDay: null } });
    }
    ctx.setMeta({ lastSeenDate: ctx.today });
  }
  ensureDailyQuests(ctx);
  ensureWeekly(ctx);
  settle(ctx);
  return ctx.result();
}

/* ════════════════════════════ Activities ════════════════════════════ */

export interface ActivityInput {
  category: CategoryId;
  duration: number;
  label?: string | null;
  notes?: string;
  amount?: number | null;
  unit?: QuestUnit | null;
  timestamp?: number;
  questId?: string | null;
  source?: 'manual' | 'focus';
  /** Count this activity toward matching quests on today's board (default true). */
  autoProgress?: boolean;
}

/** XP for an activity after healthy daily limits: full rate to the soft cap, half to the hard cap, then none. */
export function healthyMinutes(before: number, duration: number, softCap: number, hardCap: number): { effective: number; level: 'none' | 'soft' | 'hard' } {
  const after = before + duration;
  const full = Math.max(0, Math.min(after, softCap) - before);
  const half = Math.max(0, Math.min(after, hardCap) - Math.max(before, softCap));
  const effective = full + half * 0.5;
  const level = after > hardCap ? 'hard' : after > softCap ? 'soft' : 'none';
  return { effective, level };
}

export function activityRate(settings: Settings, category: CategoryId): number {
  const raw = Number(settings.xp.activityRates[category]);
  return Number.isFinite(raw) ? Math.min(50, Math.max(0, raw)) : getCategory(category).rate;
}

/** Preview of the XP a log would earn (used by the log sheet before submitting). */
export function previewActivityXP(state: GameState, input: Pick<ActivityInput, 'category' | 'duration' | 'timestamp'>, now: number) {
  const cat = getCategory(input.category);
  const ts = input.timestamp ?? now;
  const dateKey = toDateKey(ts);
  const before = minutesOnDay(state.activities, dateKey, cat.id);
  const duration = Math.max(0, Math.min(MAX_LOG_MINUTES, Math.round(input.duration || 0)));
  const { effective, level } = healthyMinutes(before, duration, cat.softCap, cat.hardCap);
  const base = Math.round((activityRate(state.settings, cat.id) * effective) / 10);
  return { base, level, before, effective };
}

function progressQuestsFromActivity(ctx: EngineContext, activity: Activity, multiplier: number, auto: boolean): void {
  if (activity.dateKey !== ctx.today) return;
  if (!auto && !activity.questId) return;
  const board = questsForToday(ctx.state.quests, ctx.today).filter((q) => q.status === 'active' && !q.completed);
  for (const q of board) {
    const explicit = activity.questId === q.id;
    if (activity.questId && !explicit) continue;
    let delta = 0;
    if (q.target?.unit === 'minutes' && (explicit || q.category === activity.category)) delta = activity.duration;
    else if (q.target && activity.amount && q.target.unit === activity.unit && (explicit || q.category === activity.category)) delta = activity.amount;
    else if (explicit && (!q.target || q.target.unit === 'times')) delta = 1;
    if (!delta) continue;
    const target = questTarget(q);
    const progress = Math.min(target, Math.round((q.progress + delta) * 10) / 10);
    if (progress >= target) completeQuestInternal(ctx, q, { linked: true, multiplier });
    else {
      ctx.update('quests', q.id, { progress });
      ctx.emit({ type: 'questProgress', questId: q.id, title: q.title, progress, target });
    }
  }
}

function logActivityInternal(ctx: EngineContext, input: ActivityInput): { ok: true; activity: Activity } | { ok: false; error: string } {
  if (!ctx.state.profile) return { ok: false, error: 'Create your character first.' };
  if (!isCategoryId(input.category)) return { ok: false, error: 'Pick a category.' };
  const duration = Math.round(Number(input.duration));
  if (!Number.isFinite(duration) || duration < 1) return { ok: false, error: 'Log at least one minute.' };
  if (duration > MAX_LOG_MINUTES) return { ok: false, error: 'A single log can be up to 8 hours. Split longer sessions into parts.' };

  let ts = Number.isFinite(input.timestamp) ? Number(input.timestamp) : ctx.now;
  if (ts > ctx.now) ts = ctx.now;
  const dateKey = toDateKey(ts);
  const yesterday = addDays(ctx.today, -1);
  if (dateKey < yesterday) return { ok: false, error: 'You can log activities from today or yesterday.' };

  const cat = CATEGORY_MAP[input.category];
  const before = minutesOnDay(ctx.state.activities, dateKey, cat.id);
  const { effective, level } = healthyMinutes(before, duration, cat.softCap, cat.hardCap);
  const baseXP = Math.round((activityRate(ctx.state.settings, cat.id) * effective) / 10);
  // Momentum rewards live sessions only — not back-filled logs.
  const live = ctx.now - ts <= 15 * 60 * 1000;
  const multiplier = live && duration >= 5 ? bumpMomentum(ctx, ctx.now) : 1;
  const bonus = multiplier > 1 ? Math.round(baseXP * (multiplier - 1)) : 0;

  const amount = input.amount != null && Number.isFinite(Number(input.amount)) && Number(input.amount) > 0 ? Math.round(Number(input.amount) * 10) / 10 : null;
  const activity: Activity = {
    id: uid('a_'),
    category: cat.id,
    label: input.label ? String(input.label).trim().slice(0, 60) || null : null,
    duration,
    xpEarned: baseXP,
    bonusXP: bonus,
    timestamp: ts,
    dateKey,
    notes: String(input.notes ?? '').trim().slice(0, 500),
    amount,
    unit: amount ? (input.unit ?? cat.quantity?.unit ?? null) : null,
    source: input.source === 'focus' ? 'focus' : 'manual',
    questId: input.questId ?? null,
    capped: effective < duration,
  };
  ctx.push('activities', activity);
  const label = activity.label || cat.name;
  awardXP(ctx, baseXP, 'activity', label, { category: cat.id, refId: activity.id, dateKey, timestamp: ts });
  if (bonus) awardXP(ctx, bonus, 'momentum', `Momentum ×${multiplier.toFixed(2)}`, { category: cat.id, refId: activity.id, dateKey, timestamp: ts });
  if (level !== 'none') ctx.emit({ type: 'healthyCap', category: cat.id, level });
  progressQuestsFromActivity(ctx, activity, multiplier, input.autoProgress !== false);
  return { ok: true, activity };
}

export function logActivity(state: GameState, input: ActivityInput, now: number): EngineResult {
  const ctx = new EngineContext(state, now);
  const res = logActivityInternal(ctx, input);
  if (!res.ok) return noop(state, res.error);
  settle(ctx, [res.activity.dateKey]);
  return ctx.result();
}

/** Remove a logged activity and the XP it earned. Quests and achievements are left as they are. */
export function deleteActivity(state: GameState, activityId: string, now: number): EngineResult {
  const ctx = new EngineContext(state, now);
  const activity = state.activities.find((a) => a.id === activityId);
  if (!activity) return noop(state, 'That activity no longer exists.');
  ctx.remove('activities', (a) => a.id === activityId);
  revokeXP(ctx, (tx) => tx.refId === activityId);
  settle(ctx);
  return ctx.result();
}

/* ════════════════════════════ Quests ════════════════════════════ */

function completeQuestInternal(ctx: EngineContext, quest: Quest, opts: { linked?: boolean; multiplier?: number }): void {
  const repeating = isRepeating(quest);
  let streak = quest.streak;
  let bestStreak = quest.bestStreak;
  if (repeating) {
    const prev = previousScheduledDay(quest.repeatSchedule, ctx.today);
    streak = quest.lastCompletedKey && prev && quest.lastCompletedKey >= prev ? quest.streak + 1 : 1;
    bestStreak = Math.max(bestStreak, streak);
  }
  ctx.update('quests', quest.id, {
    progress: questTarget(quest),
    completed: true,
    completedAt: ctx.now,
    periodKey: ctx.today,
    status: repeating ? 'active' : 'completed',
    completionCount: quest.completionCount + 1,
    streak,
    bestStreak,
    lastCompletedKey: ctx.today,
  });
  const multiplier = opts.multiplier ?? bumpMomentum(ctx, ctx.now);
  const xp = awardXP(ctx, quest.xpReward, 'quest', quest.title, { category: quest.category, refId: quest.id, linked: opts.linked });
  const bonus = multiplier > 1 ? awardXP(ctx, Math.round(quest.xpReward * (multiplier - 1)), 'momentum', `Momentum ×${multiplier.toFixed(2)}`, { category: quest.category, refId: quest.id }) : 0;
  const coins = quest.coinReward ? awardCoins(ctx, quest.coinReward, 'event', quest.title, quest.id) : 0;
  ctx.emit({ type: 'questComplete', questId: quest.id, title: quest.title, xp: xp + bonus, coins });
}

function findAvailableQuest(state: GameState, questId: string, now: number): Quest | string {
  const q = state.quests.find((x) => x.id === questId);
  if (!q) return 'That quest no longer exists.';
  if (q.completed) return 'Quest already completed.';
  if (!isQuestAvailable(q, toDateKey(now))) return q.kind === 'daily' ? 'That daily quest has expired.' : 'This quest isn’t scheduled for today.';
  return q;
}

export function completeQuest(state: GameState, questId: string, now: number): EngineResult {
  const q = findAvailableQuest(state, questId, now);
  if (typeof q === 'string') return noop(state, q);
  const ctx = new EngineContext(state, now);
  completeQuestInternal(ctx, q, {});
  settle(ctx);
  return ctx.result();
}

/** Add (or remove, with a negative delta) progress on a count-based quest. */
export function progressQuest(state: GameState, questId: string, delta: number, now: number): EngineResult {
  const q = findAvailableQuest(state, questId, now);
  if (typeof q === 'string') return noop(state, q);
  if (!Number.isFinite(delta) || delta === 0) return noop(state);
  const ctx = new EngineContext(state, now);
  const target = questTarget(q);
  const progress = Math.max(0, Math.min(target, Math.round((q.progress + delta) * 10) / 10));
  if (progress >= target) completeQuestInternal(ctx, q, {});
  else {
    ctx.update('quests', q.id, { progress });
    ctx.emit({ type: 'questProgress', questId: q.id, title: q.title, progress, target });
  }
  settle(ctx);
  return ctx.result();
}

export function createQuest(state: GameState, input: QuestInput, now: number): EngineResult {
  if (!state.profile) return noop(state, 'Create your character first.');
  const v = sanitizeQuestInput(input, state.settings);
  if (!v.ok) return noop(state, v.error);
  const ctx = new EngineContext(state, now);
  const kind = input.kind ?? 'custom';
  const quest = blankQuest({ ...v.value, kind, periodKey: ctx.today, order: now }, now);
  ctx.push('quests', quest);
  if (kind === 'custom') ctx.setMeta({ customQuestsCreated: ctx.meta.customQuestsCreated + 1 });
  settle(ctx);
  return ctx.result();
}

export function updateQuest(state: GameState, questId: string, input: QuestInput, now: number): EngineResult {
  const q = state.quests.find((x) => x.id === questId);
  if (!q) return noop(state, 'That quest no longer exists.');
  const v = sanitizeQuestInput(input, state.settings);
  if (!v.ok) return noop(state, v.error);
  const ctx = new EngineContext(state, now);
  const target = v.value.target?.amount ?? 1;
  ctx.update('quests', questId, { ...v.value, progress: Math.min(q.progress, target) });
  return ctx.result();
}

export function deleteQuest(state: GameState, questId: string, now: number): EngineResult {
  const ctx = new EngineContext(state, now);
  if (!ctx.remove('quests', (q) => q.id === questId)) return noop(state, 'That quest no longer exists.');
  return ctx.result();
}

export const REROLLS_PER_DAY = 1;

export function rerollsLeft(state: GameState, now: number): number {
  const today = toDateKey(now);
  const used = state.meta.rerolls.dateKey === today ? state.meta.rerolls.count : 0;
  return Math.max(0, REROLLS_PER_DAY - used);
}

export function rerollQuest(state: GameState, questId: string, now: number): EngineResult {
  if (!state.profile) return noop(state);
  const q = state.quests.find((x) => x.id === questId);
  const today = toDateKey(now);
  if (!q || q.kind !== 'daily' || q.dueDate !== today) return noop(state, 'Only today’s daily quests can be rerolled.');
  if (q.completed || q.progress > 0) return noop(state, 'Quests in progress can’t be rerolled.');
  if (rerollsLeft(state, now) <= 0) return noop(state, 'You’ve used today’s reroll. A fresh one arrives tomorrow.');
  const board = state.quests.filter((x) => x.kind === 'daily' && x.dueDate === today);
  const next = rerollDailyQuest(state.profile, q, board, today, now);
  if (!next) return noop(state, 'No other quests are available right now.');
  const ctx = new EngineContext(state, now);
  ctx.remove('quests', (x) => x.id === questId);
  ctx.push('quests', next);
  ctx.setMeta({ rerolls: { dateKey: today, count: (state.meta.rerolls.dateKey === today ? state.meta.rerolls.count : 0) + 1 } });
  return ctx.result();
}

/** Add quests produced by the smart generator (optionally linked to a goal). */
export function addGeneratedQuests(state: GameState, inputs: QuestInput[], now: number, goalId: string | null = null): EngineResult {
  if (!state.profile) return noop(state);
  const ctx = new EngineContext(state, now);
  let added = 0;
  for (const input of inputs) {
    const v = sanitizeQuestInput({ ...input, goalId }, state.settings);
    if (!v.ok) continue;
    ctx.push('quests', blankQuest({ ...v.value, kind: goalId ? 'goal' : 'generated', periodKey: ctx.today, order: now + added }, now));
    added++;
  }
  if (!added) return noop(state, 'No quests were added.');
  ctx.setMeta({ generatorUses: ctx.meta.generatorUses + 1 });
  settle(ctx);
  return ctx.result();
}

/* ════════════════════════════ Rest days & streaks ════════════════════════════ */

export function takeRestDay(state: GameState, dateKey: DateKey, now: number): EngineResult {
  const check = canTakeRestDay(state, dateKey, now);
  if (!check.ok) return noop(state, check.reason);
  const ctx = new EngineContext(state, now);
  ctx.setMeta({ restDays: [...ctx.meta.restDays, dateKey].sort() });
  const xp = dateKey === ctx.today ? awardXP(ctx, REST_DAY_XP, 'rest', 'Rest day', { dateKey }) : 0;
  if (ctx.meta.streakReset?.protectableDay === dateKey) {
    ctx.setMeta({ streakReset: null, streakResets: Math.max(0, ctx.meta.streakResets - 1) });
  }
  ctx.emit({ type: 'restDay', dateKey, xp });
  settle(ctx);
  return ctx.result();
}

export function dismissStreakReset(state: GameState): EngineResult {
  if (!state.meta.streakReset) return noop(state);
  return { state: { ...state, meta: { ...state.meta, streakReset: null } }, events: [] };
}

/* ════════════════════════════ Weekly challenges & events ════════════════════════════ */

export function claimWeekly(state: GameState, challengeId: string, now: number): EngineResult {
  const wk = state.weeklies.find((w) => w.challenges.some((c) => c.id === challengeId));
  if (!wk) return noop(state, 'Challenge not found.');
  const ctx = new EngineContext(state, now);
  if (!claimChallengeInternal(ctx, wk.id, challengeId, false)) return noop(state, 'Finish the challenge to claim its reward.');
  settle(ctx);
  return ctx.result();
}

function claimEventInternal(ctx: EngineContext, key: string): boolean {
  const rec = ctx.meta.events[key];
  const def = EVENT_MAP[key.split(':')[0]];
  if (!rec?.completedAt || rec.claimedAt || !def) return false;
  ctx.setMeta({ events: { ...ctx.meta.events, [key]: { ...rec, claimedAt: ctx.now } } });
  const xp = awardXP(ctx, def.rewards.xp, 'event', `${def.name} complete`, { refId: key });
  const coins = awardCoins(ctx, def.rewards.coins, 'event', `${def.name} complete`, key);
  const fresh = def.rewards.itemIds.filter((id) => COSMETIC_MAP[id] && !ctx.meta.inventory.includes(id));
  if (fresh.length) ctx.setMeta({ inventory: [...ctx.meta.inventory, ...fresh] });
  ctx.emit({ type: 'eventClaimed', eventId: def.id, xp, coins });
  for (const id of fresh) ctx.emit({ type: 'unlock', itemId: id });
  return true;
}

export function claimEvent(state: GameState, key: string, now: number): EngineResult {
  const ctx = new EngineContext(state, now);
  if (!claimEventInternal(ctx, key)) return noop(state, 'Complete the event to claim its rewards.');
  settle(ctx);
  return ctx.result();
}

/* ════════════════════════════ Goals ════════════════════════════ */

export function goalProgress(goal: Goal): number {
  if (goal.status === 'completed') return 100;
  if (!goal.milestones.length) return goal.progress;
  return Math.round((100 * goal.milestones.filter((m) => m.completed).length) / goal.milestones.length);
}

export function goalBonusXP(goal: Pick<Goal, 'milestones'>): number {
  return Math.min(500, 150 + 50 * goal.milestones.length);
}

function completeGoalInternal(ctx: EngineContext, goal: Goal): void {
  ctx.update('goals', goal.id, { status: 'completed', completedAt: ctx.now, progress: 100 });
  const xp = awardXP(ctx, goalBonusXP(goal), 'goal', `Goal complete: ${goal.title}`, { refId: goal.id, category: goal.category });
  const coins = awardCoins(ctx, 100, 'goal', `Goal complete: ${goal.title}`, goal.id);
  ctx.emit({ type: 'goalComplete', goalId: goal.id, title: goal.title, xp, coins });
}

export function createGoal(state: GameState, input: GoalInput, now: number): EngineResult {
  if (!state.profile) return noop(state);
  const v = sanitizeGoalInput(input);
  if (!v.ok) return noop(state, v.error);
  const ctx = new EngineContext(state, now);
  const goal: Goal = {
    id: uid('g_'),
    title: v.value.title,
    description: v.value.description,
    target: v.value.target,
    category: v.value.category,
    deadline: v.value.deadline,
    progress: 0,
    milestones: v.value.milestones.map((m) => ({ id: uid('m_'), title: m.title, xpReward: m.xpReward, completed: false, completedAt: null })),
    createdAt: now,
    completedAt: null,
    status: 'active',
  };
  ctx.push('goals', goal);
  return ctx.result();
}

export function updateGoal(state: GameState, goalId: string, input: GoalInput, now: number): EngineResult {
  const goal = state.goals.find((g) => g.id === goalId);
  if (!goal) return noop(state, 'That goal no longer exists.');
  const v = sanitizeGoalInput(input);
  if (!v.ok) return noop(state, v.error);
  const ctx = new EngineContext(state, now);
  const existing = new Map(goal.milestones.map((m) => [m.id, m]));
  const milestones = v.value.milestones.map((m) => {
    const prev = m.id ? existing.get(m.id) : undefined;
    // Completed milestones keep their reward; editing never re-pays XP.
    return prev ? { ...prev, title: m.title, xpReward: prev.completed ? prev.xpReward : m.xpReward } : { id: uid('m_'), title: m.title, xpReward: m.xpReward, completed: false, completedAt: null };
  });
  ctx.update('goals', goalId, {
    title: v.value.title,
    description: v.value.description,
    target: v.value.target,
    category: v.value.category,
    deadline: v.value.deadline,
    milestones,
  });
  const updated = ctx.find('goals', goalId)!;
  if (updated.status === 'active' && milestones.length && milestones.every((m) => m.completed)) completeGoalInternal(ctx, updated);
  settle(ctx);
  return ctx.result();
}

export function deleteGoal(state: GameState, goalId: string, now: number): EngineResult {
  const ctx = new EngineContext(state, now);
  if (!ctx.remove('goals', (g) => g.id === goalId)) return noop(state, 'That goal no longer exists.');
  // Quests generated for the goal stay, but lose the link.
  for (const q of state.quests) if (q.goalId === goalId) ctx.update('quests', q.id, { goalId: null });
  return ctx.result();
}

export function toggleMilestone(state: GameState, goalId: string, milestoneId: string, now: number): EngineResult {
  const goal = state.goals.find((g) => g.id === goalId);
  const m = goal?.milestones.find((x) => x.id === milestoneId);
  if (!goal || !m) return noop(state, 'Milestone not found.');
  if (goal.status === 'completed') return noop(state, 'This goal is complete — its milestones are locked in.');
  const ctx = new EngineContext(state, now);
  const milestones = goal.milestones.map((x) => (x.id === milestoneId ? { ...x, completed: !x.completed, completedAt: x.completed ? null : now } : x));
  ctx.update('goals', goalId, { milestones });
  if (!m.completed) {
    const xp = awardXP(ctx, m.xpReward || MILESTONE_DEFAULT_XP, 'milestone', `Milestone: ${m.title}`, { refId: m.id });
    ctx.emit({ type: 'milestone', goalId, title: m.title, xp });
    const updated = ctx.find('goals', goalId)!;
    if (milestones.every((x) => x.completed)) completeGoalInternal(ctx, updated);
  } else {
    revokeXP(ctx, (tx) => tx.refId === m.id && tx.source === 'milestone');
  }
  settle(ctx);
  return ctx.result();
}

/** Manual progress for goals without milestones. Reaching 100% completes the goal. */
export function setGoalProgress(state: GameState, goalId: string, progress: number, now: number): EngineResult {
  const goal = state.goals.find((g) => g.id === goalId);
  if (!goal || goal.status !== 'active') return noop(state, 'That goal can’t be updated.');
  if (goal.milestones.length) return noop(state, 'Progress for this goal comes from its milestones.');
  const value = Math.max(0, Math.min(100, Math.round(progress)));
  const ctx = new EngineContext(state, now);
  ctx.update('goals', goalId, { progress: value });
  if (value >= 100) completeGoalInternal(ctx, ctx.find('goals', goalId)!);
  settle(ctx);
  return ctx.result();
}

/* ════════════════════════════ Journal ════════════════════════════ */

export interface JournalInput {
  dateKey: DateKey;
  text: string;
  mood: JournalEntry['mood'];
  photoIds: string[];
}

export function saveJournal(state: GameState, input: JournalInput, now: number): EngineResult {
  const ctx = new EngineContext(state, now);
  const text = String(input.text ?? '').slice(0, 5000);
  const mood = input.mood && input.mood >= 1 && input.mood <= 5 ? input.mood : null;
  const photoIds = (input.photoIds ?? []).slice(0, 6);
  const existing = state.journal.find((j) => j.dateKey === input.dateKey);
  if (existing) ctx.update('journal', existing.id, { text, mood, photoIds, updatedAt: now });
  else ctx.push('journal', { id: uid('j_'), dateKey: input.dateKey, text, mood, photoIds, createdAt: now, updatedAt: now });
  settle(ctx);
  return ctx.result();
}

export function deleteJournal(state: GameState, entryId: string, now: number): EngineResult {
  const ctx = new EngineContext(state, now);
  if (!ctx.remove('journal', (j) => j.id === entryId)) return noop(state);
  return ctx.result();
}

/* ════════════════════════════ Shop & customization ════════════════════════════ */

export function purchaseItem(state: GameState, itemId: string, now: number): EngineResult {
  const profile = state.profile;
  const item = COSMETIC_MAP[itemId];
  if (!profile || !item) return noop(state, 'Item not found.');
  if (state.meta.inventory.includes(itemId)) return noop(state, 'You already own this.');
  if (item.unlock.type !== 'shop') return noop(state, 'This item is earned, not bought.');
  if (item.unlock.minLevel && profile.level < item.unlock.minLevel) return noop(state, `Reach Level ${item.unlock.minLevel} to unlock this item.`);
  if (profile.coins < item.unlock.price) return noop(state, `You need ${item.unlock.price - profile.coins} more coins.`);
  const ctx = new EngineContext(state, now);
  awardCoins(ctx, -item.unlock.price, 'purchase', `Bought ${item.name}`, itemId);
  ctx.setMeta({ inventory: [...ctx.meta.inventory, itemId], purchases: [...ctx.meta.purchases, itemId] });
  ctx.emit({ type: 'purchase', itemId, price: item.unlock.price });
  settle(ctx);
  return ctx.result();
}

export function equipItem(state: GameState, itemId: string, now: number): EngineResult {
  const item = COSMETIC_MAP[itemId];
  if (!state.profile || !item) return noop(state, 'Item not found.');
  if (!state.meta.inventory.includes(itemId)) return noop(state, 'Unlock this item first.');
  const ctx = new EngineContext(state, now);
  const p = ctx.profile;
  switch (item.slot) {
    case 'sigil':
    case 'background':
    case 'frame':
    case 'aura':
      ctx.setProfile({ avatar: { ...p.avatar, [item.slot]: itemId } });
      break;
    case 'title':
      ctx.setProfile({ titleId: itemId });
      break;
    case 'badge':
      ctx.setProfile({ badgeId: p.badgeId === itemId ? null : itemId });
      break;
    case 'xpEffect':
      ctx.setProfile({ xpEffect: itemId });
      break;
    case 'uiEffect':
      ctx.setProfile({ uiEffect: itemId });
      break;
    case 'theme':
      ctx.state.settings = { ...ctx.state.settings, accent: themeAccent(itemId) };
      break;
  }
  return ctx.result();
}

export function unequipTitle(state: GameState): EngineResult {
  if (!state.profile) return noop(state);
  return { state: { ...state, profile: { ...state.profile, titleId: null } }, events: [] };
}

/* ════════════════════════════ Profile & settings ════════════════════════════ */

export interface ProfilePatch {
  name?: string;
  classId?: ClassId;
  focusAreas?: FocusArea[];
  difficulty?: GameDifficulty;
  dailyGoal?: number;
}

export const DAILY_GOAL_MIN = 50;
export const DAILY_GOAL_MAX = 3000;

export function updateProfile(state: GameState, patch: ProfilePatch, now: number): EngineResult {
  const p = state.profile;
  if (!p) return noop(state);
  const next: Partial<Profile> = {};
  if (patch.name !== undefined) {
    const name = sanitizeName(patch.name);
    if (!name) return noop(state, 'Your name can’t be empty.');
    next.name = name;
  }
  if (patch.classId !== undefined && isClassId(patch.classId)) next.classId = patch.classId;
  if (patch.focusAreas !== undefined) {
    const areas = Array.from(new Set(patch.focusAreas.filter(isFocusArea)));
    if (!areas.length) return noop(state, 'Choose at least one goal.');
    next.focusAreas = areas;
  }
  if (patch.difficulty !== undefined && patch.difficulty in GAME_DIFFICULTY_MAP && patch.difficulty !== p.difficulty) {
    next.difficulty = patch.difficulty;
    // Follow the new difficulty's suggested target unless the player customised it.
    if (patch.dailyGoal === undefined && p.dailyGoal === GAME_DIFFICULTY_MAP[p.difficulty].dailyGoal) next.dailyGoal = GAME_DIFFICULTY_MAP[patch.difficulty].dailyGoal;
  }
  if (patch.dailyGoal !== undefined) {
    const goal = Math.round(Number(patch.dailyGoal) / 10) * 10;
    if (!Number.isFinite(goal)) return noop(state, 'Enter a number for your daily goal.');
    next.dailyGoal = Math.min(DAILY_GOAL_MAX, Math.max(DAILY_GOAL_MIN, goal));
  }
  const ctx = new EngineContext(state, now);
  ctx.setProfile(next);
  settle(ctx);
  return ctx.result();
}

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? (T[K] extends unknown[] ? T[K] : DeepPartial<T[K]>) : T[K] };
export type SettingsPatch = DeepPartial<Settings>;

const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/;
const ACCENTS: Settings['accent'][] = ['electric', 'cyan', 'emerald', 'amber', 'crimson', 'violet', 'aurum', 'synth', 'mono'];

export function mergeSettings(current: Settings, patch: SettingsPatch): Settings {
  const s: Settings = {
    ...current,
    ...(patch as Partial<Settings>),
    sound: { ...current.sound, ...(patch.sound ?? {}) },
    notifications: {
      ...current.notifications,
      ...(patch.notifications ?? {}),
      quietHours: { ...current.notifications.quietHours, ...(patch.notifications?.quietHours ?? {}) },
    },
    xp: {
      ...current.xp,
      ...(patch.xp ?? {}),
      curve: { ...current.xp.curve, ...(patch.xp?.curve ?? {}) },
      questXP: { ...current.xp.questXP, ...(patch.xp?.questXP ?? {}) },
      activityRates: { ...current.xp.activityRates, ...(patch.xp?.activityRates ?? {}) },
    },
    social: { ...current.social, ...(patch.social ?? {}), share: { ...current.social.share, ...(patch.social?.share ?? {}) } },
  };
  // Sanitize everything a user (or an imported file) could have set.
  if (!['dark', 'light', 'system'].includes(s.theme)) s.theme = current.theme;
  if (!ACCENTS.includes(s.accent)) s.accent = current.accent;
  if (!['system', 'reduced', 'full'].includes(s.motion)) s.motion = current.motion;
  s.highContrast = !!s.highContrast;
  s.intenseEffects = !!s.intenseEffects;
  s.haptics = !!s.haptics;
  s.journal = !!s.journal;
  s.sound.enabled = !!s.sound.enabled;
  s.xp.momentum = !!s.xp.momentum;
  s.social.enabled = !!s.social.enabled;
  s.social.anonymous = !!s.social.anonymous;
  s.notifications.enabled = !!s.notifications.enabled;
  s.sound.volume = Math.min(1, Math.max(0, Number(s.sound.volume) || 0));
  s.xp.curve = sanitizeCurve(s.xp.curve);
  for (const d of Object.keys(s.xp.questXP) as (keyof typeof s.xp.questXP)[]) {
    const def = QUEST_DIFFICULTY_MAP[d];
    if (!def) continue;
    const v = Math.round(Number(s.xp.questXP[d]));
    s.xp.questXP[d] = Number.isFinite(v) ? Math.min(def.maxXP, Math.max(def.minXP, v)) : def.defaultXP;
  }
  for (const c of Object.keys(s.xp.activityRates) as CategoryId[]) {
    const v = Number(s.xp.activityRates[c]);
    s.xp.activityRates[c] = Number.isFinite(v) ? Math.min(50, Math.max(0, Math.round(v))) : getCategory(c).rate;
  }
  if (!CLOCK.test(s.notifications.reminderTime)) s.notifications.reminderTime = current.notifications.reminderTime;
  if (!CLOCK.test(s.notifications.quietHours.start)) s.notifications.quietHours.start = current.notifications.quietHours.start;
  if (!CLOCK.test(s.notifications.quietHours.end)) s.notifications.quietHours.end = current.notifications.quietHours.end;
  s.weekStartsOn = s.weekStartsOn === 0 ? 0 : 1;
  return s;
}

export function updateSettings(state: GameState, patch: SettingsPatch, now: number): EngineResult {
  const ctx = new EngineContext(state, now);
  const merged = mergeSettings(state.settings, patch);
  // Premium themes must be owned before they can be applied.
  if (!state.meta.inventory.includes(`theme:${merged.accent}`)) merged.accent = state.settings.accent;
  ctx.state.settings = merged;
  if (state.profile) {
    applyLevel(ctx);
    if (patch.weekStartsOn !== undefined) ensureWeekly(ctx);
    if (patch.xp?.momentum === false) ctx.setMeta({ momentum: { count: 0, lastAt: 0 } });
    settle(ctx);
  }
  return ctx.result();
}

/* ════════════════════════════ Social ════════════════════════════ */

export function addPartyMember(state: GameState, member: PartyMember, now: number): EngineResult {
  if (!state.profile) return noop(state);
  if (member.id === state.profile.id) return noop(state, 'That’s your own party code.');
  const ctx = new EngineContext(state, now);
  const existing = state.party.find((p) => p.id === member.id);
  if (existing) {
    if (member.cardAt < existing.cardAt) return noop(state, 'You already have a newer update from this friend.');
    ctx.update('party', member.id, { ...member, addedAt: existing.addedAt, updatedAt: now });
  } else {
    if (state.party.length >= 30) return noop(state, 'Your party is full (30 members).');
    ctx.push('party', { ...member, addedAt: now, updatedAt: now });
  }
  settle(ctx);
  return ctx.result();
}

export function removePartyMember(state: GameState, memberId: string, now: number): EngineResult {
  const ctx = new EngineContext(state, now);
  if (!ctx.remove('party', (p) => p.id === memberId)) return noop(state);
  ctx.remove('challenges', (c) => c.opponentId === memberId && c.status === 'active');
  return ctx.result();
}

export const CHALLENGE_REWARD = 250;

export function createChallenge(state: GameState, opponentId: string, now: number): EngineResult {
  const member = state.party.find((p) => p.id === opponentId);
  if (!state.profile || !member) return noop(state, 'Add this friend to your party first.');
  const weekKey = currentWeekKey(toDateKey(now), state.settings.weekStartsOn);
  if (state.challenges.some((c) => c.opponentId === opponentId && c.weekKey === weekKey)) return noop(state, `You already have a challenge with ${member.name} this week.`);
  const ctx = new EngineContext(state, now);
  ctx.push('challenges', {
    id: uid('c_'),
    opponentId,
    opponentName: member.name,
    metric: 'weekly_xp',
    weekKey,
    reward: CHALLENGE_REWARD,
    createdAt: now,
    status: 'active',
    resolvedAt: null,
    myScore: null,
    theirScore: null,
  });
  return ctx.result();
}

export function cancelChallenge(state: GameState, challengeId: string, now: number): EngineResult {
  const ctx = new EngineContext(state, now);
  if (!ctx.remove('challenges', (c) => c.id === challengeId && c.status === 'active')) return noop(state);
  return ctx.result();
}

/* ════════════════════════════ Focus sessions ════════════════════════════ */

/** Sessions shorter than this don't earn XP. */
export const MIN_FOCUS_MINUTES = 5;

export interface SessionInput {
  questId?: string | null;
  category: CategoryId;
  label: string;
  minutes: number;
}

export function startSession(state: GameState, input: SessionInput, now: number): EngineResult {
  if (!state.profile) return noop(state);
  if (state.session && state.session.status !== 'complete') return noop(state, 'A focus session is already running.');
  if (!isCategoryId(input.category)) return noop(state, 'Pick a category.');
  const minutes = Math.round(Number(input.minutes));
  if (!Number.isFinite(minutes) || minutes < MIN_FOCUS_MINUTES || minutes > 180) return noop(state, 'Focus sessions run from 5 to 180 minutes.');
  const session: FocusSession = {
    id: uid('s_'),
    questId: input.questId ?? null,
    category: input.category,
    label: String(input.label || getCategory(input.category).name).slice(0, 60),
    targetMinutes: minutes,
    startedAt: now,
    accumulatedMs: 0,
    resumedAt: now,
    pauses: 0,
    status: 'running',
    completedAt: null,
  };
  return { state: { ...state, session }, events: [] };
}

/**
 * Elapsed focus time, computed from timestamps (so it survives the app being backgrounded).
 * `suspicious` flags impossible readings — e.g. the device clock was moved — and blocks automatic XP.
 */
export function sessionElapsed(session: FocusSession, now: number): { ms: number; suspicious: boolean } {
  let suspicious = false;
  let running = 0;
  if (session.resumedAt !== null) {
    if (now < session.resumedAt) suspicious = true;
    running = Math.max(0, now - session.resumedAt);
  }
  const ms = session.accumulatedMs + running;
  if (now < session.startedAt || ms > now - session.startedAt + 5000) suspicious = true;
  return { ms, suspicious };
}

export function pauseSession(state: GameState, now: number): EngineResult {
  const s = state.session;
  if (!s || s.status !== 'running' || s.resumedAt === null) return noop(state);
  const { ms } = sessionElapsed(s, now);
  return { state: { ...state, session: { ...s, accumulatedMs: ms, resumedAt: null, status: 'paused', pauses: s.pauses + 1 } }, events: [] };
}

export function resumeSession(state: GameState, now: number): EngineResult {
  const s = state.session;
  if (!s || s.status !== 'paused') return noop(state);
  return { state: { ...state, session: { ...s, resumedAt: now, status: 'running' } }, events: [] };
}

/** Mark the timer as finished (target reached). XP is only granted when the player claims it. */
export function markSessionComplete(state: GameState, now: number): EngineResult {
  const s = state.session;
  if (!s || s.status === 'complete') return noop(state);
  const { ms } = sessionElapsed(s, now);
  return { state: { ...state, session: { ...s, accumulatedMs: ms, resumedAt: null, status: 'complete', completedAt: now } }, events: [] };
}

export function sessionClaimable(session: FocusSession, now: number): { minutes: number; ok: boolean; reason?: string } {
  const { ms, suspicious } = sessionElapsed(session, now);
  const minutes = Math.min(session.targetMinutes, Math.floor(ms / 60000));
  if (suspicious) return { minutes, ok: false, reason: 'The timer looked off (the device clock may have changed), so XP wasn’t awarded automatically. If you did the work, log it manually.' };
  if (minutes < MIN_FOCUS_MINUTES) return { minutes, ok: false, reason: `Sessions under ${MIN_FOCUS_MINUTES} minutes don’t earn XP — but every minute still counts.` };
  return { minutes, ok: true };
}

/** End the session. With `claim`, validated focus time is logged as an activity (and progresses the quest). */
export function finishSession(state: GameState, now: number, claim: boolean): EngineResult {
  const s = state.session;
  if (!s) return noop(state);
  const cleared: GameState = { ...state, session: null };
  if (!claim) return { state: cleared, events: [] };
  const check = sessionClaimable(s, now);
  if (!check.ok) return { state: cleared, events: [], error: check.reason };
  const ctx = new EngineContext(cleared, now);
  const res = logActivityInternal(ctx, {
    category: s.category,
    duration: check.minutes,
    label: s.label,
    source: 'focus',
    questId: s.questId && state.quests.some((q) => q.id === s.questId) ? s.questId : null,
    timestamp: now,
  });
  if (!res.ok) return { state: cleared, events: [], error: res.error };
  settle(ctx);
  return ctx.result();
}

/* ════════════════════════════ Misc meta ════════════════════════════ */

export function markSummaryShown(state: GameState, dateKey: DateKey): EngineResult {
  if (state.meta.lastSummaryDate === dateKey) return noop(state);
  return { state: { ...state, meta: { ...state.meta, lastSummaryDate: dateKey } }, events: [] };
}

export function dismissTip(state: GameState, id: string): EngineResult {
  if (state.meta.dismissed.includes(id)) return noop(state);
  return { state: { ...state, meta: { ...state.meta, dismissed: [...state.meta.dismissed, id] } }, events: [] };
}

export function recordNotification(state: GameState, type: string, key: string, now: number): EngineResult {
  const today = toDateKey(now);
  const log: Record<string, string> = {};
  // Keep only today's counter; older ones are noise.
  for (const [k, v] of Object.entries(state.meta.notificationLog)) if (!k.startsWith('count:') || k === `count:${today}`) log[k] = v;
  log[type] = key;
  log[`count:${today}`] = String(Number(log[`count:${today}`] ?? 0) + 1);
  return { state: { ...state, meta: { ...state.meta, notificationLog: log } }, events: [] };
}
