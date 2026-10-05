/**
 * Smart quest generator — runs entirely on-device with simple rules.
 * It turns a goal ("I want to improve at coding") into a few small, realistic quests, and refuses to
 * build plans that cut sleep, skip meals or push past healthy limits.
 */
import type { CategoryId, GameDifficulty, QuestDifficulty, Settings } from '@/types';
import type { QuestInput } from '@/lib/engine/validation';

interface Template {
  title: string;
  description: string;
  category: CategoryId;
  difficulty: QuestDifficulty;
  /** Minutes for timed quests; omitted for one-off actions. */
  minutes?: number;
  pages?: number;
}

interface Domain {
  id: string;
  label: string;
  match: RegExp;
  /** Pull a nicer subject out of the text (e.g. the language name). */
  subject?: (text: string) => string | null;
  templates: Template[];
}

const cap = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());
const LANGS = /\b(spanish|french|german|italian|japanese|chinese|mandarin|cantonese|korean|arabic|portuguese|russian|hindi|urdu|turkish|dutch|swedish|norwegian|danish|greek|hebrew|polish|vietnamese|thai|indonesian|swahili|bengali|persian|farsi|ukrainian|latin)\b/;
const SUBJECTS = /\b(math(?:s|ematics)?|physics|chemistry|biology|history|geography|economics|statistics|calculus|algebra|geometry|literature|philosophy|psychology|computer science|accounting|law|medicine|anatomy)\b/;
const INSTRUMENTS = /\b(guitar|piano|violin|drums|bass|ukulele|cello|flute|saxophone|trumpet|keyboard|singing|vocals)\b/;
const CODE_TOPICS = /\b(javascript|typescript|python|java|kotlin|swift|rust|go|golang|c\+\+|c#|ruby|php|react|sql|web development|algorithms|data structures)\b/;

const DOMAINS: Domain[] = [
  {
    id: 'language',
    label: 'Language learning',
    match: /\b(language|vocab|vocabulary|fluent|fluency|conversational)\b|\b(spanish|french|german|italian|japanese|chinese|mandarin|korean|arabic|portuguese|russian|hindi|turkish|dutch|greek|hebrew|polish|vietnamese|thai|ukrainian|latin)\b/,
    subject: (t) => (LANGS.exec(t)?.[1] ? cap(LANGS.exec(t)![1]) : null),
    templates: [
      { title: 'Learn 10 new {S} words', description: 'Add them to flashcards and say each out loud.', category: 'learning', difficulty: 'easy' },
      { title: 'Complete one {S} lesson', description: 'One lesson from your course or app, start to finish.', category: 'learning', difficulty: 'medium' },
      { title: 'Listen to {S} for {m} minutes', description: 'A podcast, show or song — focus on understanding.', category: 'learning', difficulty: 'medium', minutes: 15 },
      { title: 'Write 5 sentences in {S}', description: 'About your day. Mistakes are part of it.', category: 'learning', difficulty: 'medium' },
    ],
  },
  {
    id: 'coding',
    label: 'Coding',
    match: /\b(cod(e|ing)|program(ming|mer)?|developer|software|javascript|typescript|python|java|rust|golang|react|leetcode|algorithms?|web dev(elopment)?|app)\b/,
    subject: (t) => (CODE_TOPICS.exec(t)?.[1] ? cap(CODE_TOPICS.exec(t)![1]) : null),
    templates: [
      { title: 'Code for {m} minutes', description: 'Work on {s} — a project you actually care about.', category: 'coding', difficulty: 'medium', minutes: 20 },
      { title: 'Complete one small programming exercise', description: 'One kata or practice problem. Keep it small.', category: 'coding', difficulty: 'medium' },
      { title: 'Read documentation for {m} minutes', description: 'Pick one API or concept and read the official docs.', category: 'coding', difficulty: 'easy', minutes: 15 },
      { title: 'Build one tiny feature', description: 'Something you can finish today — then ship it.', category: 'coding', difficulty: 'hard' },
    ],
  },
  {
    id: 'music',
    label: 'Music practice',
    match: /\b(guitar|piano|violin|drums|bass|ukulele|cello|flute|saxophone|trumpet|sing(ing)?|vocals|music|instrument)\b/,
    subject: (t) => INSTRUMENTS.exec(t)?.[1] ?? null,
    templates: [
      { title: 'Practice {S} for {m} minutes', description: 'Slow and clean beats fast and messy.', category: 'practice', difficulty: 'medium', minutes: 20 },
      { title: 'Learn one new chord, scale or technique', description: 'Repeat it until it feels easy.', category: 'practice', difficulty: 'medium' },
      { title: 'Play one song start to finish', description: 'No stopping for mistakes.', category: 'practice', difficulty: 'easy' },
      { title: 'Record yourself playing', description: 'Listen back once and note one thing to improve.', category: 'practice', difficulty: 'hard' },
    ],
  },
  {
    id: 'writing',
    label: 'Writing',
    match: /\b(writ(e|ing)|novel|blog|essay|poem|poetry|story|stories|screenplay|author|journal(ing)?)\b/,
    templates: [
      { title: 'Write for {m} minutes', description: 'Don’t edit while you draft. Just keep going.', category: 'writing', difficulty: 'medium', minutes: 20 },
      { title: 'Write 300 words', description: 'A paragraph, a scene, a post — anything counts.', category: 'writing', difficulty: 'medium' },
      { title: 'Outline your next piece', description: 'Five bullet points is enough.', category: 'writing', difficulty: 'easy' },
      { title: 'Read in your genre for {m} minutes', description: 'Notice one thing the author does well.', category: 'reading', difficulty: 'easy', minutes: 15 },
    ],
  },
  {
    id: 'reading',
    label: 'Reading',
    match: /\b(read(ing)?|books?|pages|literature)\b/,
    templates: [
      { title: 'Read for {m} minutes', description: 'Phone in another room.', category: 'reading', difficulty: 'medium', minutes: 20 },
      { title: 'Read {p} pages', description: 'Of your current book.', category: 'reading', difficulty: 'medium', pages: 20 },
      { title: 'Summarize what you read in 3 sentences', description: 'Explaining it locks it in.', category: 'writing', difficulty: 'easy' },
      { title: 'Choose your next book', description: 'Have it ready before you finish this one.', category: 'reading', difficulty: 'easy' },
    ],
  },
  {
    id: 'art',
    label: 'Art & design',
    match: /\b(draw(ing)?|sketch(ing)?|paint(ing)?|art|illustrat\w*|design|photograph\w*|animation)\b/,
    templates: [
      { title: 'Sketch for {m} minutes', description: 'Quantity over quality today.', category: 'creative', difficulty: 'medium', minutes: 20 },
      { title: 'Draw something from real life', description: 'An object, a plant, a person — observe first.', category: 'creative', difficulty: 'medium' },
      { title: 'Study one artist’s work for {m} minutes', description: 'Pick one piece and figure out why it works.', category: 'creative', difficulty: 'easy', minutes: 10 },
      { title: 'Finish one small piece', description: 'Small and finished beats big and abandoned.', category: 'creative', difficulty: 'hard' },
    ],
  },
  {
    id: 'running',
    label: 'Running',
    match: /\b(run(ning|ner)?|marathon|5k|10k|half marathon|jog(ging)?)\b/,
    templates: [
      { title: 'Easy run for {m} minutes', description: 'Conversational pace — you should be able to talk.', category: 'running', difficulty: 'medium', minutes: 20 },
      { title: 'Mobility for {m} minutes', description: 'Hips, calves and ankles. Your future self says thanks.', category: 'exercise', difficulty: 'easy', minutes: 10 },
      { title: 'Walk for {m} minutes', description: 'Active recovery counts too.', category: 'walking', difficulty: 'easy', minutes: 20 },
      { title: 'Plan this week’s runs', description: 'Three runs, with rest days between hard ones.', category: 'running', difficulty: 'easy' },
    ],
  },
  {
    id: 'sleep',
    label: 'Better sleep',
    match: /\b(sleep(ing)?|bed ?time|insomnia|wake up|waking up|morning routine|well rested)\b/,
    templates: [
      { title: 'Screens off 30 minutes before bed', description: 'Swap the phone for a book or stretching.', category: 'sleep', difficulty: 'medium' },
      { title: 'Go to bed at your target time', description: 'Aim for 7–9 hours.', category: 'sleep', difficulty: 'medium' },
      { title: 'Get {m} minutes of morning daylight', description: 'A short walk outside sets your body clock.', category: 'walking', difficulty: 'easy', minutes: 10 },
      { title: 'No caffeine after 2 PM', description: 'Your evening self will sleep better.', category: 'sleep', difficulty: 'easy' },
    ],
  },
  {
    id: 'calm',
    label: 'Calm & focus',
    match: /\b(stress(ed)?|anxi\w*|calm(er)?|meditat\w*|mindful\w*|relax\w*|mental health|overwhelm\w*|peace)\b/,
    templates: [
      { title: 'Meditate for {m} minutes', description: 'Follow your breath. Wandering is normal.', category: 'meditation', difficulty: 'easy', minutes: 10 },
      { title: 'Walk {m} minutes without your phone', description: 'Notice five things you can see and hear.', category: 'walking', difficulty: 'easy', minutes: 15 },
      { title: 'Write down three good things from today', description: 'Small ones count the most.', category: 'writing', difficulty: 'easy' },
      { title: 'Do a 5-minute breathing exercise', description: 'Inhale 4, hold 4, exhale 6.', category: 'meditation', difficulty: 'easy' },
    ],
  },
  {
    id: 'fitness',
    label: 'Fitness',
    match: /\b(fit(ness)?|gym|work ?out|exercis\w*|strength|strong(er)?|muscle|lift(ing)?|weights?|health(y|ier)?|lose weight|weight loss|cardio|yoga|stretch(ing)?|flexib\w*|mobility|push-?ups?|abs|active)\b/,
    templates: [
      { title: 'Move for {m} minutes', description: 'Any movement you enjoy — at your own pace.', category: 'exercise', difficulty: 'medium', minutes: 20 },
      { title: 'Do 3 sets of bodyweight exercises', description: 'Squats, push-ups, lunges. Stop well before exhaustion.', category: 'exercise', difficulty: 'medium' },
      { title: 'Stretch for {m} minutes', description: 'Slow breathing, no bouncing.', category: 'exercise', difficulty: 'easy', minutes: 10 },
      { title: 'Take a {m}-minute walk', description: 'Outside if you can.', category: 'walking', difficulty: 'easy', minutes: 20 },
    ],
  },
  {
    id: 'study',
    label: 'Studying',
    match: /\b(stud(y|ying)|exams?|tests?|school|class(es)?|homework|grades?|university|college|revis(e|ion)|math(s|ematics)?|physics|chemistry|biology|history|economics|statistics|calculus|sat|gre|gmat|ielts|toefl)\b/,
    subject: (t) => SUBJECTS.exec(t)?.[1] ?? null,
    templates: [
      { title: 'Study {s} for {m} minutes', description: 'One subject, no multitasking.', category: 'study', difficulty: 'hard', minutes: 30 },
      { title: 'Review your notes for {m} minutes', description: 'Then close them and recall what you can.', category: 'study', difficulty: 'medium', minutes: 15 },
      { title: 'Do 10 practice problems', description: 'Check answers only at the end.', category: 'study', difficulty: 'medium' },
      { title: 'Teach one concept out loud', description: 'If you can explain it simply, you know it.', category: 'study', difficulty: 'easy' },
    ],
  },
  {
    id: 'productivity',
    label: 'Productivity',
    match: /\b(productiv\w*|procrastinat\w*|focus(ed)?|organi[sz]ed|disciplin\w*|habits?|routine|time management|get things done|deep work|lazy|motivat\w*)\b/,
    templates: [
      { title: 'Deep work for {m} minutes', description: 'One task, notifications off.', category: 'work', difficulty: 'hard', minutes: 45 },
      { title: 'Plan tomorrow’s top three tasks', description: 'Write them down before you finish today.', category: 'work', difficulty: 'easy' },
      { title: 'Finish one task you’ve been avoiding', description: 'Start with the smallest next step.', category: 'work', difficulty: 'medium' },
      { title: 'Do a {m}-minute focus sprint', description: 'Timer on. Then take a real break.', category: 'work', difficulty: 'medium', minutes: 25 },
    ],
  },
  {
    id: 'cleaning',
    label: 'Organization',
    match: /\b(clean(ing)?|tidy|declutter\w*|organi[sz]\w*|messy|laundry|chores?|my room|house|apartment)\b/,
    templates: [
      { title: 'Tidy for {m} minutes', description: 'Set a timer and stop when it rings.', category: 'cleaning', difficulty: 'easy', minutes: 15 },
      { title: 'Declutter one drawer or shelf', description: 'Keep, donate or recycle.', category: 'cleaning', difficulty: 'easy' },
      { title: 'Do one load of laundry', description: 'Wash, dry, fold, put away.', category: 'cleaning', difficulty: 'medium' },
      { title: 'Clear your desk', description: 'Start tomorrow with a clean surface.', category: 'cleaning', difficulty: 'easy' },
    ],
  },
  {
    id: 'social',
    label: 'Connection',
    match: /\b(friends?|social(ize)?|lonely|people|network(ing)?|family|relationships?|confiden\w*|connect\w*|shy)\b/,
    templates: [
      { title: 'Message a friend you miss', description: 'Just ask how they’re doing.', category: 'social', difficulty: 'easy' },
      { title: 'Call a family member', description: 'Even ten minutes matters.', category: 'social', difficulty: 'easy' },
      { title: 'Spend {m} minutes with someone in person', description: 'Phones away.', category: 'social', difficulty: 'medium', minutes: 30 },
      { title: 'Plan a meetup', description: 'Pick a date, invite one person.', category: 'social', difficulty: 'medium' },
    ],
  },
  {
    id: 'finance',
    label: 'Money',
    match: /\b(money|budget(ing)?|sav(e|ing)|invest\w*|debt|financ\w*|spending)\b/,
    templates: [
      { title: 'Track today’s spending', description: 'Every purchase, however small.', category: 'custom', difficulty: 'easy' },
      { title: 'Review your subscriptions', description: 'Cancel one you don’t use.', category: 'custom', difficulty: 'medium' },
      { title: 'Set one savings goal', description: 'An amount and a date.', category: 'custom', difficulty: 'easy' },
      { title: 'Learn about personal finance for {m} minutes', description: 'One article or video on a topic you don’t know.', category: 'learning', difficulty: 'easy', minutes: 15 },
    ],
  },
  {
    id: 'cooking',
    label: 'Cooking',
    match: /\b(cook(ing)?|meal prep|recipes?|nutrition|eat (healthier|better|well))\b/,
    templates: [
      { title: 'Cook one meal from scratch', description: 'Simple is perfect.', category: 'custom', difficulty: 'medium' },
      { title: 'Plan three meals for the week', description: 'Write a shopping list for them.', category: 'custom', difficulty: 'easy' },
      { title: 'Try one new recipe', description: 'Something with a vegetable you rarely eat.', category: 'custom', difficulty: 'medium' },
      { title: 'Prep tomorrow’s lunch', description: 'Future you will be grateful.', category: 'custom', difficulty: 'easy' },
    ],
  },
];

const GENERIC: Template[] = [
  { title: 'Spend {m} minutes on {s}', description: 'Focused time, no distractions.', category: 'custom', difficulty: 'medium', minutes: 20 },
  { title: 'Break {s} into 3 small steps', description: 'Write them down. Make the first one tiny.', category: 'custom', difficulty: 'easy' },
  { title: 'Find one great resource about {s}', description: 'A book, course, video or person to learn from.', category: 'learning', difficulty: 'easy' },
  { title: 'Take one small action toward {s}', description: 'Something you can finish today.', category: 'custom', difficulty: 'medium' },
];

/** Plans that would harm the player. We never generate quests for these. */
const UNSAFE: { match: RegExp; note: string; domain: string }[] = [
  {
    match: /\b(hurt|harm|punish|cut)\s+(myself|me)\b|\bself[- ]?harm\b|\bkill myself\b|\bend it all\b/,
    note: 'It sounds like things might be really hard right now. Please reach out to someone you trust or a local crisis line — you deserve support. Evolve won’t turn this into quests.',
    domain: 'none',
  },
  {
    match: /\b(no|less|without|skip(ping)?|stop)\s+(sleep|sleeping)\b|\ball[- ]?nighters?\b|\bstay(ing)? up all night\b|\bsleep (only )?([0-4]|less than [0-5]) ?(h|hours?)\b/,
    note: 'Evolve won’t build plans that cut sleep — rest is when progress sticks. Here’s a sustainable plan instead.',
    domain: 'sleep',
  },
  {
    match: /\b(starv\w*|stop eating|not eat(ing)?|skip(ping)? (meals?|breakfast|lunch|dinner|eating)|eat (nothing|very little)|\d{3} calories|lose \d+ ?(kg|kilos?|lbs?|pounds) (in|within) (a|one|\d+) (days?|weeks?)|crash diet|water fast)\b/,
    note: 'Evolve won’t build plans around skipping meals or extreme weight loss. Here’s a gentle, sustainable plan instead.',
    domain: 'fitness',
  },
  {
    match: /\b(study|studying|work|working|code|coding|train|training|exercise|run|running)\s+(for\s+)?(1[0-9]|2[0-4]|[89])\+?\s*(h|hours?)\b|\b(no breaks|without (a )?breaks?|every waking hour|24\/7)\b/,
    note: 'That’s more than a healthy day can hold. Evolve caps XP past healthy limits — here’s a plan that builds momentum without burnout.',
    domain: '',
  },
];

export interface GeneratorResult {
  topic: string;
  quests: QuestInput[];
  note: string | null;
  blocked: boolean;
}

function extractSubject(text: string): string | null {
  const m = /(?:improve (?:at|my)|get better at|better at|learn(?:ing)?(?: how to)?|practice|practicing|study(?:ing)?|master|start(?:ing)?|get into|work on|improve|become (?:a|an)?)\s+(.+?)(?:[.,!?;]| so | because | and then |$)/.exec(text);
  let subject = m?.[1] ?? text;
  subject = subject
    .replace(/^(my|the|a|an|to|some|more|how to)\s+/g, '')
    .replace(/\s+(skills?|more|better|again|every day|daily|regularly)$/g, '')
    .trim();
  if (!subject || subject.length < 2) return null;
  return subject.length > 32 ? `${subject.slice(0, 30).trim()}…` : subject;
}

const MINUTE_SCALE: Record<GameDifficulty, number> = { casual: 0.7, normal: 1, hardcore: 1.4 };

function fill(t: Template, subject: string, difficulty: GameDifficulty, settings: Settings): QuestInput {
  const minutes = t.minutes ? Math.min(90, Math.max(5, Math.round((t.minutes * MINUTE_SCALE[difficulty]) / 5) * 5)) : null;
  const pages = t.pages ? Math.max(5, Math.round((t.pages * MINUTE_SCALE[difficulty]) / 5) * 5) : null;
  const S = subject.replace(/^\w/, (c) => c.toUpperCase());
  const replace = (s: string) =>
    s
      .replaceAll('{S}', S)
      .replaceAll('{s}', subject)
      .replaceAll('{m}', String(minutes ?? ''))
      .replaceAll('{p}', String(pages ?? ''));
  return {
    title: replace(t.title).slice(0, 60),
    description: replace(t.description),
    category: t.category,
    difficulty: t.difficulty,
    xpReward: settings.xp.questXP[t.difficulty],
    target: minutes ? { amount: minutes, unit: 'minutes' } : pages ? { amount: pages, unit: 'pages' } : null,
    timerMinutes: minutes,
  };
}

/** Turn a free-text goal into a handful of small, realistic quests. */
export function generateQuestsFromGoal(input: string, difficulty: GameDifficulty, settings: Settings): GeneratorResult {
  const text = input.toLowerCase().replace(/\s+/g, ' ').trim();
  if (text.length < 3) return { topic: '', quests: [], note: 'Describe what you’d like to get better at.', blocked: false };

  for (const rule of UNSAFE) {
    if (!rule.match.test(text)) continue;
    if (rule.domain === 'none') return { topic: '', quests: [], note: rule.note, blocked: true };
    const domain = DOMAINS.find((d) => d.id === rule.domain) ?? DOMAINS.find((d) => d.match.test(text)) ?? DOMAINS.find((d) => d.id === 'productivity')!;
    const subject = domain.subject?.(text) ?? domain.label.toLowerCase();
    return { topic: domain.label, quests: domain.templates.map((t) => fill(t, subject, difficulty, settings)), note: rule.note, blocked: true };
  }

  const domain = DOMAINS.find((d) => d.match.test(text));
  if (domain) {
    const subject = domain.subject?.(text) ?? extractSubject(text) ?? domain.label.toLowerCase();
    return { topic: domain.label, quests: domain.templates.map((t) => fill(t, subject, difficulty, settings)), note: null, blocked: false };
  }
  const subject = extractSubject(text) ?? 'your goal';
  return { topic: 'Your goal', quests: GENERIC.map((t) => fill(t, subject, difficulty, settings)), note: null, blocked: false };
}

export const GENERATOR_EXAMPLES = [
  'I want to improve at coding',
  'Learn Spanish before my trip',
  'Get better at guitar',
  'Read more books',
  'Sleep better',
  'Be less stressed',
];
