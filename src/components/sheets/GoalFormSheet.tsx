import { useEffect, useMemo, useState } from 'react';
import type { CategoryId } from '@/types';
import { CATEGORIES } from '@/data/categories';
import { addDays, toDateKey } from '@/lib/date';
import { createGoal, updateGoal } from '@/lib/engine/gameEngine';
import { MAX_MILESTONES, MILESTONE_DEFAULT_XP } from '@/lib/engine/validation';
import { dispatch, useGame } from '@/store/gameStore';
import { useUI, type Sheet } from '@/store/uiStore';
import { Button, IconButton } from '@/components/ui/Button';
import { Field, Input, Select, TextArea } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Sheet as SheetPanel } from '@/components/ui/Overlay';

interface DraftMilestone {
  id?: string;
  title: string;
  xpReward: number;
  completed?: boolean;
}

export default function GoalFormSheet({ open, onClose, sheet }: { open: boolean; onClose: () => void; sheet: Extract<Sheet, { type: 'goal' }> }) {
  const existing = useGame((s) => (sheet.goalId ? s.goals.find((g) => g.id === sheet.goalId) : undefined));
  const goals = useGame((s) => s.goals);
  const openSheet = useUI((s) => s.openSheet);
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<CategoryId | ''>('');
  const [deadline, setDeadline] = useState('');
  const [milestones, setMilestones] = useState<DraftMilestone[]>([]);
  const [error, setError] = useState<string | null>(null);
  const today = toDateKey();

  useEffect(() => {
    if (!open) return;
    setTitle(existing?.title ?? '');
    setTarget(existing?.target ?? '');
    setDescription(existing?.description ?? '');
    setCategory(existing?.category ?? '');
    setDeadline(existing?.deadline ?? '');
    setMilestones(existing?.milestones.map((m) => ({ id: m.id, title: m.title, xpReward: m.xpReward, completed: m.completed })) ?? [{ title: '', xpReward: MILESTONE_DEFAULT_XP }]);
    setError(null);
  }, [open, existing]);

  const canAdd = milestones.length < MAX_MILESTONES;
  const totalXP = useMemo(() => milestones.filter((m) => m.title.trim()).reduce((n, m) => n + m.xpReward, 0), [milestones]);

  const submit = () => {
    const input = { title, target, description, category: category || null, deadline: deadline || null, milestones: milestones.filter((m) => m.title.trim()) };
    const before = new Set(goals.map((g) => g.id));
    const res = existing ? dispatch((s, now) => updateGoal(s, existing.id, input, now), { quietErrors: true }) : dispatch((s, now) => createGoal(s, input, now), { quietErrors: true });
    if (res.error) return setError(res.error);
    onClose();
    if (!existing) {
      const created = res.state.goals.find((g) => !before.has(g.id));
      // Offer to turn the goal into quests once this sheet has closed — unless the player has moved on.
      const here = location.hash;
      if (created) setTimeout(() => location.hash === here && !useUI.getState().sheet && openSheet({ type: 'generator', goalId: created.id, prompt: created.title }), 280);
    }
  };

  return (
    <SheetPanel
      open={open}
      onClose={onClose}
      title={existing ? 'Edit goal' : 'New goal'}
      description="A long-term goal, broken into milestones."
      size="lg"
      footer={
        <Button variant="primary" cta size="lg" block icon={existing ? 'check' : 'goal'} onClick={submit}>
          {existing ? 'Save goal' : 'Create goal'}
        </Button>
      }
    >
      <div className="space-y-5">
        <Field label="Goal" htmlFor="g-title">
          <Input id="g-title" data-autofocus value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Learn Spanish" />
        </Field>
        <Field label="What does done look like?" optional htmlFor="g-target">
          <Input id="g-target" value={target} maxLength={120} onChange={(e) => setTarget(e.target.value)} placeholder="e.g. Reach conversational level" />
        </Field>
        <Field label="Why it matters" optional htmlFor="g-desc">
          <TextArea id="g-desc" value={description} maxLength={400} onChange={(e) => setDescription(e.target.value)} className="min-h-20" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category" optional htmlFor="g-cat">
            <Select id="g-cat" value={category} onChange={(e) => setCategory(e.target.value as CategoryId | '')}>
              <option value="">Any</option>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Deadline" optional htmlFor="g-deadline">
            <Input id="g-deadline" type="date" min={addDays(today, 1)} value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </Field>
        </div>

        <Field label="Milestones" hint={milestones.length ? `Completing them awards ${totalXP} XP, plus a bonus when the goal is done.` : 'Without milestones you can update progress manually.'}>
          <ul className="space-y-2">
            {milestones.map((m, i) => (
              <li key={m.id ?? `new-${i}`} className="flex items-center gap-2">
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-surface-3 font-display text-xs font-bold text-muted">{i + 1}</span>
                <Input aria-label={`Milestone ${i + 1}`} value={m.title} maxLength={80} disabled={m.completed} onChange={(e) => setMilestones((cur) => cur.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} placeholder={i === 0 ? 'e.g. Learn 100 words' : 'Next milestone'} className="h-11 flex-1" />
                <Select aria-label={`XP for milestone ${i + 1}`} value={m.xpReward} disabled={m.completed} onChange={(e) => setMilestones((cur) => cur.map((x, j) => (j === i ? { ...x, xpReward: Number(e.target.value) } : x)))} className="h-11 w-[6.5rem] text-sm">
                  {[25, 50, 75, 100, 150, 200, 300].map((v) => (
                    <option key={v} value={v}>
                      {v} XP
                    </option>
                  ))}
                </Select>
                <IconButton icon="trash-2" label={`Remove milestone ${i + 1}`} size="sm" disabled={m.completed} onClick={() => setMilestones((cur) => cur.filter((_, j) => j !== i))} />
              </li>
            ))}
          </ul>
          {canAdd && (
            <Button variant="ghost" size="sm" icon="plus" className="mt-2" onClick={() => setMilestones((cur) => [...cur, { title: '', xpReward: MILESTONE_DEFAULT_XP }])}>
              Add milestone
            </Button>
          )}
        </Field>

        {error && (
          <p className="flex items-center gap-2 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2.5 text-sm text-danger" role="alert">
            <Icon name="triangle-alert" size={15} /> {error}
          </p>
        )}
      </div>
    </SheetPanel>
  );
}
