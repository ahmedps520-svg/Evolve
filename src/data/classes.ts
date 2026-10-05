import type { AttributeId, CategoryId, ClassId } from '@/types';

export interface ClassDef {
  id: ClassId;
  name: string;
  motto: string;
  description: string;
  /** Flavor + mechanical note. Classes only shape suggestions and identity — never lock activities. */
  passive: string;
  attribute: AttributeId;
  sigil: string;
  /** Categories the quest board leans towards. */
  favored: CategoryId[];
}

export const CLASSES: ClassDef[] = [
  {
    id: 'scholar',
    name: 'Scholar',
    motto: 'Knowledge is the sharpest blade.',
    description: 'Thrives on study sessions, deep reading and learning new things.',
    passive: 'Insight — your quest board favors study, reading and learning.',
    attribute: 'int',
    sigil: 'tome',
    favored: ['study', 'reading', 'learning'],
  },
  {
    id: 'athlete',
    name: 'Athlete',
    motto: 'Strength is built one rep at a time.',
    description: 'Moves every day — training, running, sport and long walks.',
    passive: 'Vigor — your quest board favors movement and training.',
    attribute: 'str',
    sigil: 'bolt',
    favored: ['exercise', 'running', 'sports', 'walking'],
  },
  {
    id: 'creator',
    name: 'Creator',
    motto: 'Make something that did not exist this morning.',
    description: 'Turns ideas into things — art, writing, music and craft.',
    passive: 'Muse — your quest board favors creative work and practice.',
    attribute: 'crf',
    sigil: 'quill',
    favored: ['creative', 'writing', 'practice'],
  },
  {
    id: 'explorer',
    name: 'Explorer',
    motto: 'Curiosity is a compass.',
    description: 'Collects experiences — new skills, new places and new people.',
    passive: 'Wanderlust — your quest board draws from the widest range of categories.',
    attribute: 'cha',
    sigil: 'compass',
    favored: ['learning', 'walking', 'social', 'creative'],
  },
  {
    id: 'strategist',
    name: 'Strategist',
    motto: 'Every day is a plan, executed.',
    description: 'Masters focus, systems and getting the important things done.',
    passive: 'Foresight — your quest board favors deep work, coding and order.',
    attribute: 'dis',
    sigil: 'rook',
    favored: ['work', 'coding', 'cleaning', 'study'],
  },
  {
    id: 'balanced',
    name: 'Balanced',
    motto: 'A little of everything, every day.',
    description: 'Grows evenly — mind, body, craft and rest in harmony.',
    passive: 'Harmony — your quest board rotates evenly through your goals.',
    attribute: 'spr',
    sigil: 'equinox',
    favored: [],
  },
];

export const CLASS_MAP = Object.fromEntries(CLASSES.map((c) => [c.id, c])) as Record<ClassId, ClassDef>;

export function isClassId(value: unknown): value is ClassId {
  return typeof value === 'string' && value in CLASS_MAP;
}
