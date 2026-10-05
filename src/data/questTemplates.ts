import type { CategoryId, FocusArea, QuestUnit } from '@/types';

/**
 * Daily quest templates. `amount` and `xp` are tuned for NORMAL difficulty; Casual and Hardcore scale
 * them. Every template is deliberately modest — a quest should fit into a normal day.
 */
export interface QuestTemplate {
  id: string;
  category: CategoryId;
  title: string;
  /** `{n}` is replaced with the (scaled) amount. */
  description: string;
  amount: number;
  unit: QuestUnit;
  xp: number;
  /** Timed quests can be run in Focus Mode. */
  timer: boolean;
  /** Habit quests (e.g. bedtime) are not scaled by difficulty. */
  fixed?: boolean;
}

export const QUEST_TEMPLATES: QuestTemplate[] = [
  // Intellect
  { id: 'study_session', category: 'study', title: 'Study Session', description: 'Pick one subject and study it for {n} minutes.', amount: 30, unit: 'minutes', xp: 100, timer: true },
  { id: 'study_review', category: 'study', title: 'Review & Recall', description: 'Review your notes for {n} minutes, then test yourself.', amount: 20, unit: 'minutes', xp: 60, timer: true },
  { id: 'study_problems', category: 'study', title: 'Problem Set', description: 'Work through practice problems for {n} minutes.', amount: 25, unit: 'minutes', xp: 80, timer: true },
  { id: 'learn_lesson', category: 'learning', title: 'New Lesson', description: 'Spend {n} minutes learning something new.', amount: 20, unit: 'minutes', xp: 60, timer: true },
  { id: 'learn_course', category: 'learning', title: 'Course Progress', description: 'Finish one lesson of a course you’re taking.', amount: 1, unit: 'times', xp: 60, timer: false, fixed: true },
  { id: 'code_session', category: 'coding', title: 'Build Something Small', description: 'Code for {n} minutes on a project you care about.', amount: 30, unit: 'minutes', xp: 100, timer: true },
  { id: 'code_exercise', category: 'coding', title: 'Coding Kata', description: 'Solve one small programming exercise.', amount: 1, unit: 'times', xp: 60, timer: false, fixed: true },
  { id: 'code_docs', category: 'coding', title: 'Read the Docs', description: 'Read documentation for {n} minutes.', amount: 15, unit: 'minutes', xp: 40, timer: true },
  { id: 'read', category: 'reading', title: 'Read', description: 'Read for {n} minutes.', amount: 15, unit: 'minutes', xp: 50, timer: true },
  { id: 'read_pages', category: 'reading', title: 'Page Turner', description: 'Read {n} pages of your current book.', amount: 20, unit: 'pages', xp: 60, timer: false },

  // Strength
  { id: 'move', category: 'exercise', title: 'Move', description: 'Complete {n} minutes of physical activity.', amount: 20, unit: 'minutes', xp: 80, timer: true },
  { id: 'strength', category: 'exercise', title: 'Strength Circuit', description: 'Do a {n}-minute strength workout at your own pace.', amount: 25, unit: 'minutes', xp: 90, timer: true },
  { id: 'mobility', category: 'exercise', title: 'Mobility Break', description: 'Stretch or do mobility work for {n} minutes.', amount: 10, unit: 'minutes', xp: 35, timer: true },
  { id: 'run', category: 'running', title: 'Easy Run', description: 'Run for {n} minutes at a conversational pace.', amount: 20, unit: 'minutes', xp: 80, timer: true },
  { id: 'walk', category: 'walking', title: 'Get Outside', description: 'Take a {n}-minute walk.', amount: 20, unit: 'minutes', xp: 40, timer: true },
  { id: 'sport', category: 'sports', title: 'Game Time', description: 'Play a sport for {n} minutes.', amount: 30, unit: 'minutes', xp: 80, timer: true },

  // Spirit
  { id: 'meditate', category: 'meditation', title: 'Still Mind', description: 'Meditate or breathe slowly for {n} minutes.', amount: 10, unit: 'minutes', xp: 40, timer: true },
  { id: 'wind_down', category: 'sleep', title: 'Wind Down', description: 'Put screens away 30 minutes before bed.', amount: 1, unit: 'times', xp: 40, timer: false, fixed: true },
  { id: 'lights_out', category: 'sleep', title: 'Lights Out', description: 'Get to bed on time for 7–9 hours of sleep.', amount: 1, unit: 'times', xp: 40, timer: false, fixed: true },

  // Craft
  { id: 'create', category: 'creative', title: 'Make Something', description: 'Spend {n} minutes on a creative project.', amount: 25, unit: 'minutes', xp: 70, timer: true },
  { id: 'sketch', category: 'creative', title: 'Daily Sketch', description: 'Draw, design or photograph one thing.', amount: 1, unit: 'times', xp: 50, timer: false, fixed: true },
  { id: 'write', category: 'writing', title: 'Write', description: 'Write for {n} minutes — anything counts.', amount: 20, unit: 'minutes', xp: 60, timer: true },
  { id: 'reflect', category: 'writing', title: 'Reflect', description: 'Write a few lines about how today went.', amount: 1, unit: 'times', xp: 30, timer: false, fixed: true },
  { id: 'practice', category: 'practice', title: 'Practice', description: 'Practice a skill for {n} minutes.', amount: 20, unit: 'minutes', xp: 60, timer: true },

  // Charisma
  { id: 'reach_out', category: 'social', title: 'Reach Out', description: 'Message or call someone you care about.', amount: 1, unit: 'times', xp: 40, timer: false, fixed: true },
  { id: 'quality_time', category: 'social', title: 'Quality Time', description: 'Spend {n} minutes with friends or family.', amount: 30, unit: 'minutes', xp: 50, timer: false },

  // Discipline
  { id: 'deep_work', category: 'work', title: 'Deep Work', description: 'Do {n} minutes of focused, distraction-free work.', amount: 45, unit: 'minutes', xp: 100, timer: true },
  { id: 'plan_day', category: 'work', title: 'Plan the Day', description: 'Write down your top three priorities.', amount: 1, unit: 'times', xp: 30, timer: false, fixed: true },
  { id: 'tidy', category: 'cleaning', title: 'Tidy Up', description: 'Clean or organize your space for {n} minutes.', amount: 15, unit: 'minutes', xp: 40, timer: true },
  { id: 'declutter', category: 'cleaning', title: 'Declutter', description: 'Clear one surface, drawer or folder.', amount: 1, unit: 'times', xp: 40, timer: false, fixed: true },
  { id: 'small_win', category: 'custom', title: 'Small Win', description: 'Finish one task you’ve been putting off.', amount: 1, unit: 'times', xp: 50, timer: false, fixed: true },
];

export const TEMPLATE_MAP = Object.fromEntries(QUEST_TEMPLATES.map((t) => [t.id, t])) as Record<string, QuestTemplate>;

/** Starter quest per focus area (the first quests a new player sees). */
export const STARTER_BY_FOCUS: Record<FocusArea, string> = {
  studying: 'study_session',
  fitness: 'move',
  reading: 'read',
  productivity: 'deep_work',
  creativity: 'create',
  learning: 'learn_lesson',
  organization: 'tidy',
  social: 'reach_out',
  sleep: 'wind_down',
  personal: 'meditate',
  other: 'small_win',
};

/** The classic trio from the product brief, used to fill any remaining starter slots. */
export const DEFAULT_STARTERS = ['study_session', 'move', 'read'];
