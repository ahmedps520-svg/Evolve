import type { CategoryId, FocusArea } from '@/types';

export interface FocusAreaDef {
  id: FocusArea;
  name: string;
  icon: string;
  categories: CategoryId[];
}

export const FOCUS_AREAS: FocusAreaDef[] = [
  { id: 'fitness', name: 'Fitness', icon: 'dumbbell', categories: ['exercise', 'running', 'walking', 'sports'] },
  { id: 'studying', name: 'Studying', icon: 'graduation-cap', categories: ['study'] },
  { id: 'reading', name: 'Reading', icon: 'book-open', categories: ['reading'] },
  { id: 'productivity', name: 'Productivity', icon: 'briefcase-business', categories: ['work', 'coding'] },
  { id: 'creativity', name: 'Creativity', icon: 'palette', categories: ['creative', 'writing', 'practice'] },
  { id: 'learning', name: 'Learning', icon: 'lightbulb', categories: ['learning', 'coding'] },
  { id: 'organization', name: 'Organization', icon: 'brush-cleaning', categories: ['cleaning', 'work'] },
  { id: 'social', name: 'Social', icon: 'users', categories: ['social'] },
  { id: 'sleep', name: 'Sleep', icon: 'moon', categories: ['sleep', 'meditation'] },
  { id: 'personal', name: 'Personal development', icon: 'sprout', categories: ['meditation', 'writing', 'learning'] },
  { id: 'other', name: 'Other', icon: 'shapes', categories: ['custom'] },
];

export const FOCUS_AREA_MAP = Object.fromEntries(FOCUS_AREAS.map((f) => [f.id, f])) as Record<FocusArea, FocusAreaDef>;

export function isFocusArea(value: unknown): value is FocusArea {
  return typeof value === 'string' && value in FOCUS_AREA_MAP;
}

export function categoriesForFocus(areas: FocusArea[]): CategoryId[] {
  const set = new Set<CategoryId>();
  for (const a of areas) for (const c of FOCUS_AREA_MAP[a]?.categories ?? []) set.add(c);
  return [...set];
}
