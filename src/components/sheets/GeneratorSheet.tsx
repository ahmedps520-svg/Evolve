import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import { addGeneratedQuests } from '@/lib/engine/gameEngine';
import { GENERATOR_EXAMPLES, generateQuestsFromGoal, type GeneratorResult } from '@/lib/generator';
import { dispatch, useGame } from '@/store/gameStore';
import type { Sheet } from '@/store/uiStore';
import { CategoryTag, DifficultyTag } from '@/components/game/Tags';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Sheet as SheetPanel } from '@/components/ui/Overlay';

export default function GeneratorSheet({ open, onClose, sheet }: { open: boolean; onClose: () => void; sheet: Extract<Sheet, { type: 'generator' }> }) {
  const settings = useGame((s) => s.settings);
  const difficulty = useGame((s) => s.profile?.difficulty ?? 'normal');
  const allGoals = useGame((s) => s.goals);
  const goals = useMemo(() => allGoals.filter((g) => g.status === 'active'), [allGoals]);
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState<GeneratorResult | null>(null);
  const [selected, setSelected] = useState<boolean[]>([]);
  const [goalId, setGoalId] = useState('');

  const run = (text: string) => {
    const r = generateQuestsFromGoal(text, difficulty, settings);
    setResult(r);
    setSelected(r.quests.map(() => true));
  };

  useEffect(() => {
    if (!open) return;
    setPrompt(sheet.prompt ?? '');
    setGoalId(sheet.goalId ?? '');
    if (sheet.prompt) run(sheet.prompt);
    else {
      setResult(null);
      setSelected([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sheet.prompt, sheet.goalId]);

  const picks = result?.quests.filter((_, i) => selected[i]) ?? [];
  const add = () => {
    const res = dispatch((s, now) => addGeneratedQuests(s, picks, now, goalId || null));
    if (!res.error) onClose();
  };

  return (
    <SheetPanel
      open={open}
      onClose={onClose}
      title="Quest generator"
      description="Describe a goal. Get small, realistic quests."
      size="lg"
      footer={
        result && result.quests.length > 0 ? (
          <Button variant="primary" cta size="lg" block icon="plus" disabled={!picks.length} onClick={add}>
            Add {picks.length} quest{picks.length === 1 ? '' : 's'}
          </Button>
        ) : (
          <Button variant="primary" cta size="lg" block icon="wand-sparkles" disabled={prompt.trim().length < 3} onClick={() => run(prompt)}>
            Generate quests
          </Button>
        )
      }
    >
      <div className="space-y-5">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(prompt);
          }}
          className="space-y-3"
        >
          <Field label="What do you want to get better at?" htmlFor="gen-prompt">
            <div className="flex gap-2">
              <Input id="gen-prompt" data-autofocus value={prompt} maxLength={160} onChange={(e) => setPrompt(e.target.value)} placeholder="I want to improve at coding" />
              <Button type="submit" variant="secondary" icon="wand-sparkles" disabled={prompt.trim().length < 3} aria-label="Generate">
                <span className="hidden sm:inline">Generate</span>
              </Button>
            </div>
          </Field>
          {!result && (
            <div className="flex flex-wrap gap-1.5">
              {GENERATOR_EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => {
                    setPrompt(ex);
                    run(ex);
                  }}
                  className="h-8 rounded-full border border-line bg-surface-2 px-3 text-xs text-muted transition hover:border-line-strong hover:text-fg"
                >
                  {ex}
                </button>
              ))}
            </div>
          )}
        </form>

        {result?.note && (
          <div className={cn('flex gap-3 rounded-2xl border p-4 text-sm leading-relaxed', result.blocked ? 'border-warning/35 bg-warning/8 text-fg' : 'border-line bg-surface-2 text-muted')} role="status">
            <Icon name={result.blocked ? 'heart-pulse' : 'info'} size={18} className={cn('mt-0.5 shrink-0', result.blocked ? 'text-warning' : 'text-muted')} />
            <p>{result.note}</p>
          </div>
        )}

        {result && result.quests.length > 0 && (
          <div className="space-y-3">
            <p className="hud-label px-1">{result.topic}</p>
            <ul className="space-y-2.5">
              {result.quests.map((q, i) => (
                <li key={q.title}>
                  <label className={cn('flex cursor-pointer gap-3 rounded-2xl border p-4 transition', selected[i] ? 'border-accent/50 bg-accent/8' : 'border-line bg-surface-2')}>
                    <input type="checkbox" className="mt-1 size-5 shrink-0 accent-[var(--accent)]" checked={!!selected[i]} onChange={() => setSelected((cur) => cur.map((v, j) => (j === i ? !v : v)))} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-3">
                        <span className="font-semibold text-fg">{q.title}</span>
                        <span className="shrink-0 font-display text-sm font-bold text-accent-ink">+{formatNumber(q.xpReward ?? 0)} XP</span>
                      </span>
                      <span className="mt-0.5 block text-[13px] text-muted">{q.description}</span>
                      <span className="mt-2 flex flex-wrap gap-1.5">
                        <CategoryTag category={q.category} />
                        <DifficultyTag difficulty={q.difficulty} />
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            {goals.length > 0 && (
              <Field label="Link to a goal" optional htmlFor="gen-goal">
                <Select id="gen-goal" value={goalId} onChange={(e) => setGoalId(e.target.value)}>
                  <option value="">No goal</option>
                  {goals.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.title}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
            <button type="button" onClick={() => setResult(null)} className="flex items-center gap-1.5 text-sm font-medium text-muted transition hover:text-fg">
              <Icon name="rotate-ccw" size={14} /> Try a different goal
            </button>
          </div>
        )}

        <p className="flex items-center gap-2 text-xs text-faint">
          <Icon name="shield-check" size={13} /> Generated on your device. Nothing you type leaves it.
        </p>
      </div>
    </SheetPanel>
  );
}
