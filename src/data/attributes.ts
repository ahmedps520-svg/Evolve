import type { AttributeId, CategoryId } from '@/types';
import { CATEGORIES } from './categories';

export interface AttributeDef {
  id: AttributeId;
  name: string;
  abbr: string;
  description: string;
  /** CSS custom property holding this attribute's validated categorical color. */
  colorVar: string;
  icon: string;
}

/** Order matters: it is the categorical slot order validated for color-vision deficiency. */
export const ATTRIBUTES: AttributeDef[] = [
  { id: 'int', name: 'Intellect', abbr: 'INT', description: 'Study, learning, coding and reading', colorVar: '--grp-int', icon: 'brain' },
  { id: 'str', name: 'Strength', abbr: 'STR', description: 'Exercise, running, sports and walking', colorVar: '--grp-str', icon: 'biceps-flexed' },
  { id: 'spr', name: 'Spirit', abbr: 'SPR', description: 'Meditation and rest', colorVar: '--grp-spr', icon: 'sparkle' },
  { id: 'crf', name: 'Craft', abbr: 'CRF', description: 'Creative work, writing and practice', colorVar: '--grp-crf', icon: 'pen-tool' },
  { id: 'cha', name: 'Charisma', abbr: 'CHA', description: 'Time with people', colorVar: '--grp-cha', icon: 'heart-handshake' },
  { id: 'dis', name: 'Discipline', abbr: 'DIS', description: 'Deep work, chores and personal tasks', colorVar: '--grp-dis', icon: 'shield-check' },
];

export const ATTRIBUTE_MAP = Object.fromEntries(ATTRIBUTES.map((a) => [a.id, a])) as Record<AttributeId, AttributeDef>;

export const ATTRIBUTE_CATEGORIES = Object.fromEntries(
  ATTRIBUTES.map((a) => [a.id, CATEGORIES.filter((c) => c.attribute === a.id).map((c) => c.id)]),
) as Record<AttributeId, CategoryId[]>;

export function attributeColor(id: AttributeId): string {
  return `var(${ATTRIBUTE_MAP[id].colorVar})`;
}
