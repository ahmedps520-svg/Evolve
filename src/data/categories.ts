import type { AttributeId, CategoryId, QuestUnit } from '@/types';

export interface CategoryDef {
  id: CategoryId;
  name: string;
  /** Short uppercase tag shown on quest cards. */
  tag: string;
  icon: string;
  attribute: AttributeId;
  /** Default XP per 10 minutes. */
  rate: number;
  /**
   * Healthy daily limits in minutes. Past `softCap` XP is halved; past `hardCap` time is still logged
   * but earns no XP. This keeps the game from rewarding over-training, all-nighters or burnout.
   */
  softCap: number;
  hardCap: number;
  /** Optional quantity a log can carry (pages read, distance run). */
  quantity?: { unit: QuestUnit; label: string };
  /** Suggested labels for quick logging. */
  examples: string[];
}

export const CATEGORIES: CategoryDef[] = [
  { id: 'study', name: 'Study', tag: 'STUDY', icon: 'graduation-cap', attribute: 'int', rate: 10, softCap: 240, hardCap: 420, examples: ['Mathematics', 'Physics', 'Exam prep', 'Homework'] },
  { id: 'learning', name: 'Learning', tag: 'LEARN', icon: 'lightbulb', attribute: 'int', rate: 10, softCap: 240, hardCap: 420, examples: ['Online course', 'Language practice', 'Documentary', 'Tutorial'] },
  { id: 'coding', name: 'Coding', tag: 'CODE', icon: 'code-xml', attribute: 'int', rate: 10, softCap: 300, hardCap: 480, examples: ['Side project', 'Exercises', 'Documentation', 'Bug fixing'] },
  { id: 'reading', name: 'Reading', tag: 'READ', icon: 'book-open', attribute: 'int', rate: 8, softCap: 240, hardCap: 420, quantity: { unit: 'pages', label: 'Pages' }, examples: ['Novel', 'Non-fiction', 'Articles', 'Audiobook'] },
  { id: 'exercise', name: 'Exercise', tag: 'FITNESS', icon: 'dumbbell', attribute: 'str', rate: 12, softCap: 90, hardCap: 150, examples: ['Strength training', 'Yoga', 'HIIT', 'Mobility'] },
  { id: 'running', name: 'Running', tag: 'RUN', icon: 'sport-shoe', attribute: 'str', rate: 12, softCap: 75, hardCap: 140, quantity: { unit: 'km', label: 'Distance (km)' }, examples: ['Easy run', 'Intervals', 'Long run'] },
  { id: 'sports', name: 'Sports', tag: 'SPORT', icon: 'volleyball', attribute: 'str', rate: 12, softCap: 120, hardCap: 180, examples: ['Football', 'Basketball', 'Tennis', 'Swimming'] },
  { id: 'walking', name: 'Walking', tag: 'WALK', icon: 'footprints', attribute: 'str', rate: 5, softCap: 120, hardCap: 240, quantity: { unit: 'km', label: 'Distance (km)' }, examples: ['Walk outside', 'Hike', 'Walk to class'] },
  { id: 'meditation', name: 'Meditation', tag: 'MIND', icon: 'flower-2', attribute: 'spr', rate: 8, softCap: 60, hardCap: 120, examples: ['Breathing', 'Guided meditation', 'Stretch & breathe'] },
  { id: 'sleep', name: 'Sleep', tag: 'SLEEP', icon: 'moon', attribute: 'spr', rate: 1, softCap: 480, hardCap: 540, examples: ['Night sleep', 'Nap'] },
  { id: 'creative', name: 'Creative work', tag: 'CREATE', icon: 'palette', attribute: 'crf', rate: 10, softCap: 240, hardCap: 420, examples: ['Drawing', 'Design', 'Photography', 'Music production'] },
  { id: 'writing', name: 'Writing', tag: 'WRITE', icon: 'pen-line', attribute: 'crf', rate: 10, softCap: 240, hardCap: 420, examples: ['Journaling', 'Essay', 'Story', 'Blog post'] },
  { id: 'practice', name: 'Practice', tag: 'PRACTICE', icon: 'target', attribute: 'crf', rate: 10, softCap: 180, hardCap: 300, examples: ['Guitar', 'Piano', 'Chess', 'Public speaking'] },
  { id: 'social', name: 'Social', tag: 'SOCIAL', icon: 'users', attribute: 'cha', rate: 6, softCap: 180, hardCap: 300, examples: ['Call a friend', 'Family time', 'Volunteering', 'Meetup'] },
  { id: 'work', name: 'Deep work', tag: 'FOCUS', icon: 'briefcase-business', attribute: 'dis', rate: 10, softCap: 300, hardCap: 480, examples: ['Project work', 'Planning', 'Admin', 'Inbox zero'] },
  { id: 'cleaning', name: 'Cleaning', tag: 'CLEAN', icon: 'brush-cleaning', attribute: 'dis', rate: 6, softCap: 120, hardCap: 180, examples: ['Tidy room', 'Laundry', 'Dishes', 'Declutter'] },
  { id: 'custom', name: 'Custom', tag: 'CUSTOM', icon: 'shapes', attribute: 'dis', rate: 8, softCap: 180, hardCap: 300, examples: ['Cooking', 'Gardening', 'Budgeting', 'Errands'] },
];

export const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.id, c])) as Record<CategoryId, CategoryDef>;
export const CATEGORY_IDS = CATEGORIES.map((c) => c.id);

export function getCategory(id: CategoryId | string | null | undefined): CategoryDef {
  return (id && CATEGORY_MAP[id as CategoryId]) || CATEGORY_MAP.custom;
}

export function isCategoryId(value: unknown): value is CategoryId {
  return typeof value === 'string' && value in CATEGORY_MAP;
}

export const DEFAULT_ACTIVITY_RATES = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.rate])) as Record<CategoryId, number>;

/** Fitness spans several categories; streaks and achievements treat them as one. */
export const FITNESS_CATEGORIES: CategoryId[] = ['exercise', 'running', 'sports', 'walking'];
export const STUDY_CATEGORIES: CategoryId[] = ['study'];
export const CREATIVE_CATEGORIES: CategoryId[] = ['creative', 'writing', 'practice'];

/** Limits that keep a single log realistic (typos like "600 minutes" are clamped). */
export const MAX_LOG_MINUTES = 480;
export const MIN_LOG_MINUTES = 1;
