import { useEffect, useMemo, useState } from 'react';
import type { CategoryId, QuestDifficulty, QuestUnit, RepeatSchedule } from '@/types';
import { QUEST_DIFFICULTIES, QUEST_DIFFICULTY_MAP } from '@/data/difficulty';
import { cn } from '@/lib/cn';
import { createQuest, updateQuest } from '@/lib/engine/gameEngine';
import { DESCRIPTION_MAX, TITLE_MAX, TARGET_LIMITS, clampQuestXP } from '@/lib/engine/validation';
import { dispatch, useGame } from '@/store/gameStore';
import type { Sheet } from '@/store/uiStore';
import { RarityGem } from '@/components/game/Tags';
import { Button } from '@/components/ui/Button';
import { Field, Input, Segmented, Select, Stepper, TextArea, Toggle } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Sheet as SheetPanel } from '@/components/ui/Overlay';
import { CategoryPicker } from './CategoryPicker';

const UNITS: { value: QuestUnit; label: string }[] = [
  { value: 'minutes', label: 'Minutes' },
  { value: 'times', label: 'Times' },
  { value: 'pages', label: 'Pages' },
  { value: 'km', label: 'Kilometres' },
  { value: 'reps', label: 'Reps' },
];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
type RepeatKind = RepeatSchedule['type'];

const EXAMPLES = ['Practice guitar', 'Clean my room', 'Finish science homework', 'Run 2 km', 'Read 20 pages', 'Code for 1 hour'];

export default function QuestFormSheet({ open, onClose, sheet }: { open: boolean; onClose: () => void; sheet: Extract<Sheet, { type: 'quest' }> }) {
  const existing = useGame((s) => (sheet.questId ? s.quests.find((q) => q.id === sheet.questId) : undefined));
  const questXP = useGame((s) => s.settings.xp.questXP);
  const allGoals = useGame((s) => s.goals);
  const goals = useMemo(() => allGoals.filter((g) => g.status === 'active'), [allGoals]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<CategoryId>('custom');
  const [difficulty, setDifficulty] = useState<QuestDifficulty>('medium');
  const [xp, setXp] = useState(50);
  const [xpTouched, setXpTouched] = useState(false);
  const [hasTarget, setHasTarget] = useState(false);
  const [amount, setAmount] = useState(30);
  const [unit, setUnit] = useState<QuestUnit>('minutes');
  const [timer, setTimer] = useState(false);
  const [repeat, setRepeat] = useState<RepeatKind>('none');
  const [days, setDays] = useState<number[]>([1, 3, 5]);
  const [goalId, setGoalId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const q = existing;
    const p = sheet.preset;
    setTitle(q?.title ?? p?.title ?? '');
    setDescription(q?.description ?? p?.description ?? '');
    setCategory(q?.category ?? p?.category ?? 'custom');
    const d = q?.difficulty ?? p?.difficulty ?? 'medium';
    setDifficulty(d);
    setXp(q?.xpReward ?? p?.xpReward ?? questXP[d]);
    setXpTouched(!!q);
    setHasTarget(!!(q?.target ?? p?.target));
    setAmount(q?.target?.amount ?? p?.target?.amount ?? 30);
    setUnit(q?.target?.unit ?? p?.target?.unit ?? 'minutes');
    setTimer(!!(q?.timerMinutes ?? p?.timerMinutes));
    setRepeat(q?.repeatSchedule.type ?? 'none');
    setDays(q?.repeatSchedule.type === 'weekly' ? q.repeatSchedule.days : [1, 3, 5]);
    setGoalId(q?.goalId ?? sheet.goalId ?? '');
    setError(null);
  }, [open, existing, sheet.preset, sheet.goalId, questXP]);

  const range = QUEST_DIFFICULTY_MAP[difficulty];
  const onDifficulty = (d: QuestDifficulty) => {
    setDifficulty(d);
    setXp((x) => (xpTouched ? clampQuestXP(d, x) : questXP[d]));
  };

  const submit = () => {
    const schedule: RepeatSchedule = repeat === 'weekly' ? { type: 'weekly', days } : { type: repeat } as RepeatSchedule;
    const input = {
      title,
      description,
      category,
      difficulty,
      xpReward: xp,
      target: hasTarget ? { amount, unit } : null,
      timerMinutes: hasTarget && unit === 'minutes' && timer ? amount : timer && !hasTarget ? 25 : null,
      repeatSchedule: schedule,
      goalId: goalId || null,
    };
    const res = existing
      ? dispatch((s, now) => updateQuest(s, existing.id, input, now), { quietErrors: true })
      : dispatch((s, now) => createQuest(s, { ...input, kind: 'custom' }, now), { quietErrors: true });
    if (res.error) setError(res.error);
    else onClose();
  };

  return (
    <SheetPanel
      open={open}
      onClose={onClose}
      title={existing ? 'Edit quest' : 'Create quest'}
      description={existing ? undefined : 'Turn anything into a quest — keep it realistic.'}
      size="lg"
      footer={
        <Button variant="primary" cta size="lg" block icon={existing ? 'check' : 'plus'} onClick={submit}>
          {existing ? 'Save changes' : `Create quest · +${xp} XP`}
        </Button>
      }
    >
      <div className="space-y-6">
        <Field label="Quest name" htmlFor="q-title" hint={`${title.length}/${TITLE_MAX}`}>
          <Input id="q-title" data-autofocus value={title} maxLength={TITLE_MAX} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Practice guitar" />
          {!existing && !title && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {EXAMPLES.map((ex) => (
                <button key={ex} type="button" onClick={() => setTitle(ex)} className="h-8 rounded-full border border-line bg-surface-2 px-3 text-xs text-muted transition hover:border-line-strong hover:text-fg">
                  {ex}
                </button>
              ))}
            </div>
          )}
        </Field>

        <Field label="Description" optional htmlFor="q-desc">
          <TextArea id="q-desc" value={description} maxLength={DESCRIPTION_MAX} onChange={(e) => setDescription(e.target.value)} placeholder="What does done look like?" className="min-h-20" />
        </Field>

        <Field label="Category">
          <CategoryPicker value={category} onChange={setCategory} />
        </Field>

        <Field label="Difficulty">
          <div role="radiogroup" aria-label="Difficulty" className="grid grid-cols-5 gap-1.5">
            {QUEST_DIFFICULTIES.map((d) => (
              <button
                key={d.id}
                type="button"
                role="radio"
                aria-checked={difficulty === d.id}
                onClick={() => onDifficulty(d.id)}
                className={cn('flex h-16 flex-col items-center justify-center gap-1.5 rounded-xl border text-[11.5px] font-semibold transition', difficulty === d.id ? 'border-line-strong bg-surface-4 text-fg' : 'border-line bg-surface-2 text-muted hover:text-fg')}
              >
                <RarityGem rarity={d.rarity} size={12} />
                {d.name}
              </button>
            ))}
          </div>
        </Field>

        <Field label="XP reward" hint={`${range.name} quests can award ${range.minXP}–${range.maxXP} XP. Keeping rewards honest keeps the game meaningful.`}>
          <Stepper
            value={xp}
            onChange={(v) => {
              setXpTouched(true);
              setXp(clampQuestXP(difficulty, v));
            }}
            min={range.minXP}
            max={range.maxXP}
            step={5}
            label="XP reward"
            suffix="XP"
          />
        </Field>

        <div className="space-y-1 rounded-2xl border border-line bg-surface-2/60 px-4 py-2">
          <Toggle checked={hasTarget} onChange={setHasTarget} label="Track a target" description="e.g. 30 minutes, 20 pages or 2 km." />
          {hasTarget && (
            <div className="grid grid-cols-2 gap-3 pt-2 pb-3">
              <Stepper value={amount} onChange={setAmount} min={unit === 'km' ? 0.5 : 1} max={TARGET_LIMITS[unit]} step={unit === 'minutes' ? 5 : unit === 'km' ? 0.5 : 1} label="Target amount" />
              <Select aria-label="Target unit" value={unit} onChange={(e) => setUnit(e.target.value as QuestUnit)}>
                {UNITS.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </Select>
            </div>
          )}
          {(!hasTarget || unit === 'minutes') && <Toggle checked={timer} onChange={setTimer} label="Focus timer" description={hasTarget ? 'Run this quest in Focus Mode.' : 'Adds a 25-minute timer to the quest.'} />}
        </div>

        <Field label="Repeat">
          <Segmented<RepeatKind>
            label="Repeat schedule"
            value={repeat}
            onChange={setRepeat}
            size="sm"
            options={[
              { value: 'none', label: 'Once' },
              { value: 'daily', label: 'Daily' },
              { value: 'weekdays', label: 'Weekdays' },
              { value: 'weekly', label: 'Pick days' },
            ]}
          />
          {repeat === 'weekly' && (
            <div className="mt-3 grid grid-cols-7 gap-1.5" role="group" aria-label="Days of the week">
              {DAYS.map((d, i) => {
                const on = days.includes(i);
                return (
                  <button key={d} type="button" aria-pressed={on} onClick={() => setDays((cur) => (on ? cur.filter((x) => x !== i) : [...cur, i].sort()))} className={cn('h-10 rounded-xl border text-xs font-semibold transition', on ? 'border-accent bg-accent/15 text-fg' : 'border-line bg-surface-2 text-muted')}>
                    {d}
                  </button>
                );
              })}
            </div>
          )}
        </Field>

        {goals.length > 0 && (
          <Field label="Part of a goal" optional htmlFor="q-goal">
            <Select id="q-goal" value={goalId} onChange={(e) => setGoalId(e.target.value)}>
              <option value="">No goal</option>
              {goals.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title}
                </option>
              ))}
            </Select>
          </Field>
        )}

        {error && (
          <p className="flex items-center gap-2 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2.5 text-sm text-danger" role="alert">
            <Icon name="triangle-alert" size={15} /> {error}
          </p>
        )}
      </div>
    </SheetPanel>
  );
}
