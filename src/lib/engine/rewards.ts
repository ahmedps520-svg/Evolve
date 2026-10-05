import type { CategoryId, CoinSource, DateKey, GameMeta, XPSource } from '@/types';
import { CATEGORY_CURVE, calculateLevel, sanitizeCurve } from '@/lib/xp';
import { uid } from '@/lib/id';
import { COSMETICS } from '@/data/cosmetics';
import { PRODUCTIVE_SOURCES, hasSourceOnDay, xpOnDay } from './analysis';
import type { EngineContext } from './context';

export const DAILY_GOAL_BONUS_XP = 50;
export const DAILY_GOAL_COINS = 20;
export const REST_DAY_XP = 15;
export const STARTER_COINS = 100;

/** Level-up payout: 50 coins, with a bigger purse every tenth level. */
export function levelCoins(level: number): number {
  return level % 10 === 0 ? 150 : 50;
}

/* ───────────── Momentum (combo) ───────────── */

/** Productive actions within this window of each other build momentum. */
export const MOMENTUM_WINDOW_MS = 2 * 60 * 60 * 1000;
const MOMENTUM_STEPS = [1, 1, 1.05, 1.1, 1.15];

/** 1 action → 1.0×, 2 → 1.05×, 3 → 1.10×, 4+ → 1.15× (capped — grinding is never rewarded further). */
export function momentumMultiplier(count: number): number {
  return MOMENTUM_STEPS[Math.min(4, Math.max(0, count))];
}

export function currentMomentum(meta: GameMeta, now: number, enabled: boolean): { count: number; multiplier: number; expiresAt: number } {
  if (!enabled || !meta.momentum.lastAt || now - meta.momentum.lastAt > MOMENTUM_WINDOW_MS || now < meta.momentum.lastAt) {
    return { count: 0, multiplier: 1, expiresAt: 0 };
  }
  return {
    count: meta.momentum.count,
    multiplier: momentumMultiplier(meta.momentum.count),
    expiresAt: meta.momentum.lastAt + MOMENTUM_WINDOW_MS,
  };
}

/** Register a productive action and return the multiplier that applies to it. */
export function bumpMomentum(ctx: EngineContext, at: number): number {
  if (!ctx.state.settings.xp.momentum) return 1;
  const { count, lastAt } = ctx.meta.momentum;
  const chained = lastAt > 0 && at >= lastAt && at - lastAt <= MOMENTUM_WINDOW_MS;
  const next = chained ? Math.min(count + 1, 99) : 1;
  const multiplier = momentumMultiplier(next);
  ctx.setMeta({ momentum: { count: next, lastAt: at }, peakMomentum: Math.max(ctx.meta.peakMomentum, multiplier) });
  if (next >= 2) ctx.emit({ type: 'momentum', count: next, multiplier });
  return multiplier;
}

/* ───────────── XP & coins ───────────── */

export interface AwardOptions {
  category?: CategoryId | null;
  refId?: string | null;
  dateKey?: DateKey;
  timestamp?: number;
  linked?: boolean;
}

function categoryXPCache(ctx: EngineContext): Map<CategoryId, number> {
  const cache = ctx.cache.categoryXP as Map<CategoryId, number> | undefined;
  if (cache) return cache;
  const map = new Map<CategoryId, number>();
  for (const tx of ctx.state.transactions) {
    if (tx.currency !== 'xp' || !tx.category) continue;
    if (!PRODUCTIVE_SOURCES.has(tx.source) && tx.source !== 'momentum') continue;
    map.set(tx.category, (map.get(tx.category) ?? 0) + tx.amount);
  }
  ctx.cache.categoryXP = map;
  return map;
}

/** Record an XP gain, update totals, and handle (category) level-ups. Returns the amount awarded. */
export function awardXP(ctx: EngineContext, amount: number, source: XPSource, label: string, opts: AwardOptions = {}): number {
  const value = Math.round(amount);
  if (!ctx.state.profile || !Number.isFinite(value) || value <= 0) return 0;
  const category = opts.category ?? null;

  // Prime the per-category cache before this transaction lands, so level-up detection sees "before".
  const catCache = category ? categoryXPCache(ctx) : null;

  ctx.push('transactions', {
    id: uid('tx_'),
    currency: 'xp',
    amount: value,
    source,
    label,
    category,
    refId: opts.refId ?? null,
    timestamp: opts.timestamp ?? ctx.now,
    dateKey: opts.dateKey ?? ctx.today,
    ...(opts.linked ? { linked: true } : {}),
  });
  ctx.setProfile({ totalXP: ctx.profile.totalXP + value });
  ctx.emit({ type: 'xp', amount: value, source, label, category });
  applyLevel(ctx);

  if (category && catCache && (PRODUCTIVE_SOURCES.has(source) || source === 'momentum')) {
    const before = catCache.get(category) ?? 0;
    const after = before + value;
    catCache.set(category, after);
    const lb = calculateLevel(before, CATEGORY_CURVE);
    const la = calculateLevel(after, CATEGORY_CURVE);
    if (la > lb) ctx.emit({ type: 'categoryLevelUp', category, level: la });
  }
  return value;
}

/** Remove XP (used when undoing a milestone or deleting a logged activity). */
export function revokeXP(ctx: EngineContext, predicate: (tx: { refId: string | null; source: string; currency: string }) => boolean): number {
  let removed = 0;
  ctx.remove('transactions', (tx) => {
    if (tx.currency === 'xp' && predicate(tx)) {
      removed += tx.amount;
      return true;
    }
    return false;
  });
  if (removed && ctx.state.profile) {
    ctx.setProfile({ totalXP: Math.max(0, ctx.profile.totalXP - removed) });
    applyLevel(ctx);
    delete ctx.cache.categoryXP;
  }
  return removed;
}

export function awardCoins(ctx: EngineContext, amount: number, source: CoinSource, label: string, refId: string | null = null): number {
  const value = Math.round(amount);
  if (!ctx.state.profile || !Number.isFinite(value) || value === 0) return 0;
  ctx.push('transactions', {
    id: uid('tx_'),
    currency: 'coins',
    amount: value,
    source,
    label,
    category: null,
    refId,
    timestamp: ctx.now,
    dateKey: ctx.today,
  });
  ctx.setProfile({ coins: Math.max(0, ctx.profile.coins + value) });
  if (value > 0) ctx.emit({ type: 'coins', amount: value, label });
  return value;
}

/** Recalculate the level from total XP. Level-ups pay coins once per level, ever. */
export function applyLevel(ctx: EngineContext): void {
  const profile = ctx.profile;
  const curve = sanitizeCurve(ctx.state.settings.xp.curve);
  const next = calculateLevel(profile.totalXP, curve);
  const prev = profile.level;
  if (next === prev) return;
  ctx.setProfile({ level: next });
  // A steeper curve can lower the level. XP is never lost, so we simply recalculate.
  if (next < prev) return;

  let coins = 0;
  for (let l = prev + 1; l <= next; l++) if (l > ctx.meta.maxLevelRewarded) coins += levelCoins(l);
  const unlocks = COSMETICS.filter(
    (c) => c.unlock.type === 'level' && c.unlock.level > prev && c.unlock.level <= next && !ctx.meta.inventory.includes(c.id),
  ).map((c) => c.id);
  if (unlocks.length) ctx.setMeta({ inventory: [...ctx.meta.inventory, ...unlocks] });
  ctx.setMeta({ maxLevelRewarded: Math.max(ctx.meta.maxLevelRewarded, next) });
  if (coins) awardCoins(ctx, coins, 'level', `Reached Level ${next}`);
  ctx.emit({ type: 'levelUp', from: prev, to: next, coins, unlocks });
}

/* ───────────── Daily goal ───────────── */

export function checkDailyGoal(ctx: EngineContext, dateKey: DateKey = ctx.today): void {
  const profile = ctx.state.profile;
  if (!profile) return;
  const txs = ctx.state.transactions;
  if (hasSourceOnDay(txs, dateKey, 'daily_goal')) return;
  if (xpOnDay(txs, dateKey) < profile.dailyGoal) return;
  awardXP(ctx, DAILY_GOAL_BONUS_XP, 'daily_goal', 'Daily goal complete', { dateKey });
  awardCoins(ctx, DAILY_GOAL_COINS, 'daily_goal', 'Daily goal complete');
  ctx.emit({ type: 'dailyGoal', xp: DAILY_GOAL_BONUS_XP, coins: DAILY_GOAL_COINS });
}
