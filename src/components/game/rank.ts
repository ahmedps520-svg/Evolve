/**
 * Today's rank — a friendly read on the day relative to the daily goal. Ranks top out at the goal:
 * there is no reward for grinding far past it.
 */
export interface Rank {
  label: string;
  color: string;
  /** Next rank name, or null at the top. */
  next: string | null;
  /** XP needed to reach the next rank. */
  toNext: number;
}

const TIERS = [
  { at: 0, label: 'Warming up', color: 'var(--faint)' },
  { at: 0.0001, label: 'Rookie', color: 'var(--rarity-common)' },
  { at: 0.25, label: 'Steady', color: 'var(--rarity-uncommon)' },
  { at: 0.5, label: 'Strong', color: 'var(--rarity-rare)' },
  { at: 0.75, label: 'Heroic', color: 'var(--rarity-epic)' },
  { at: 1, label: 'Legendary', color: 'var(--rarity-legendary)' },
];

export function rankFor(xp: number, goal: number): Rank {
  const ratio = goal > 0 ? xp / goal : 0;
  let i = 0;
  for (let t = 0; t < TIERS.length; t++) if (ratio >= TIERS[t].at) i = t;
  const next = TIERS[i + 1];
  return {
    label: TIERS[i].label,
    color: TIERS[i].color,
    next: next ? next.label : null,
    toNext: next ? Math.max(1, Math.ceil(next.at * goal - xp)) : 0,
  };
}
