import type { CurveConfig } from '@/types';

/**
 * The level curve — the single source of truth for XP requirements.
 *
 *   XP_REQUIRED(level) = round(offset + base × level ^ exponent)
 *
 * `XP_REQUIRED(level)` is the XP needed to advance from `level` to `level + 1`. Nothing in the UI
 * hard-codes requirements; everything goes through these functions.
 *
 * The default curve starts at 100 XP for Level 1 → 2 and grows every level, so early levels come
 * quickly while Level 100 remains a multi-year achievement (~3 years at 400 XP a day).
 */

export const DEFAULT_CURVE: CurveConfig = { offset: 40, base: 60, exponent: 1.1 };

/** Category (skill) levels advance on a gentler curve so specialisation feels rewarding. */
export const CATEGORY_CURVE: CurveConfig = { offset: 30, base: 25, exponent: 1.1 };

export const CURVE_PRESETS: { id: string; name: string; description: string; curve: CurveConfig }[] = [
  { id: 'relaxed', name: 'Relaxed', description: 'Frequent level-ups and gentle growth.', curve: { offset: 40, base: 50, exponent: 1.05 } },
  { id: 'standard', name: 'Standard', description: 'Balanced RPG pacing. Recommended.', curve: DEFAULT_CURVE },
  { id: 'steep', name: 'Steep', description: 'Every level is a real milestone.', curve: { offset: 50, base: 75, exponent: 1.25 } },
  { id: 'classic', name: 'Classic', description: '100 × level^1.35 — a long, old-school grind.', curve: { offset: 0, base: 100, exponent: 1.35 } },
];

export const MAX_LEVEL = 999;

export function sanitizeCurve(curve: Partial<CurveConfig> | undefined): CurveConfig {
  const offset = Number(curve?.offset ?? DEFAULT_CURVE.offset);
  const base = Number(curve?.base);
  const exponent = Number(curve?.exponent);
  return {
    offset: Number.isFinite(offset) ? Math.min(500, Math.max(0, Math.round(offset))) : DEFAULT_CURVE.offset,
    base: Number.isFinite(base) ? Math.min(500, Math.max(10, Math.round(base))) : DEFAULT_CURVE.base,
    exponent: Number.isFinite(exponent) ? Math.min(2, Math.max(1, Math.round(exponent * 100) / 100)) : DEFAULT_CURVE.exponent,
  };
}

export function sameCurve(a: CurveConfig, b: CurveConfig): boolean {
  return a.offset === b.offset && a.base === b.base && a.exponent === b.exponent;
}

/** XP required to go from `level` to `level + 1`. */
export function calculateRequiredXP(level: number, curve: CurveConfig = DEFAULT_CURVE): number {
  const l = Math.max(1, Math.floor(level));
  return Math.max(1, Math.round((curve.offset ?? 0) + curve.base * Math.pow(l, curve.exponent)));
}

/** Human-readable formula, e.g. "round(40 + 60 × level^1.1)". */
export function describeCurve(curve: CurveConfig): string {
  return curve.offset ? `round(${curve.offset} + ${curve.base} × level^${curve.exponent})` : `round(${curve.base} × level^${curve.exponent})`;
}

const cumulativeCache = new Map<string, number[]>();

/** cumulative[l] = total XP required to *reach* level l (cumulative[1] = 0). */
function cumulativeTable(curve: CurveConfig): number[] {
  const key = `${curve.offset ?? 0}:${curve.base}:${curve.exponent}`;
  let table = cumulativeCache.get(key);
  if (!table) {
    table = [0, 0];
    for (let l = 1; l < MAX_LEVEL; l++) table.push(table[l] + calculateRequiredXP(l, curve));
    cumulativeCache.set(key, table);
  }
  return table;
}

/** Total XP needed to reach `level` from zero. */
export function totalXPForLevel(level: number, curve: CurveConfig = DEFAULT_CURVE): number {
  const table = cumulativeTable(curve);
  const l = Math.min(MAX_LEVEL, Math.max(1, Math.floor(level)));
  return table[l];
}

/** Level reached with `totalXP` (binary search over the cumulative table). */
export function calculateLevel(totalXP: number, curve: CurveConfig = DEFAULT_CURVE): number {
  const table = cumulativeTable(curve);
  const xp = Math.max(0, totalXP);
  let lo = 1;
  let hi = MAX_LEVEL;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (table[mid] <= xp) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

export interface XPProgress {
  level: number;
  /** XP earned inside the current level. */
  current: number;
  /** XP needed for the current level → next. */
  required: number;
  /** 0–1 */
  percent: number;
  toNext: number;
  totalXP: number;
}

export function calculateXPProgress(totalXP: number, curve: CurveConfig = DEFAULT_CURVE): XPProgress {
  const level = calculateLevel(totalXP, curve);
  const floor = totalXPForLevel(level, curve);
  const required = calculateRequiredXP(level, curve);
  const current = Math.max(0, Math.round(totalXP - floor));
  return {
    level,
    current,
    required,
    percent: level >= MAX_LEVEL ? 1 : Math.min(1, current / required),
    toNext: Math.max(0, required - current),
    totalXP,
  };
}
