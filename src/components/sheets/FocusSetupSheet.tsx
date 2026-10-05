import { useEffect, useState } from 'react';
import type { CategoryId } from '@/types';
import { getCategory } from '@/data/categories';
import { formatMinutes, formatNumber } from '@/lib/format';
import { navigate } from '@/lib/router';
import { startSession, activityRate } from '@/lib/engine/gameEngine';
import { dispatch, useGame } from '@/store/gameStore';
import type { Sheet } from '@/store/uiStore';
import { Button } from '@/components/ui/Button';
import { Chip, Field, Input, Stepper } from '@/components/ui/Field';
import { Sheet as SheetPanel } from '@/components/ui/Overlay';
import { CategoryPicker } from './CategoryPicker';

const PRESETS = [15, 25, 45, 60, 90];

export default function FocusSetupSheet({ open, onClose, sheet }: { open: boolean; onClose: () => void; sheet: Extract<Sheet, { type: 'focus' }> }) {
  const quest = useGame((s) => (sheet.questId ? s.quests.find((q) => q.id === sheet.questId) : undefined));
  const settings = useGame((s) => s.settings);
  const running = useGame((s) => s.session);
  const [category, setCategory] = useState<CategoryId>('study');
  const [minutes, setMinutes] = useState(25);
  const [label, setLabel] = useState('');

  useEffect(() => {
    if (!open) return;
    setCategory(quest?.category ?? sheet.category ?? 'study');
    const remaining = quest?.target?.unit === 'minutes' ? Math.ceil(quest.target.amount - quest.progress) : 0;
    setMinutes(remaining >= 5 ? Math.min(180, remaining) : 25);
    setLabel(quest?.title ?? '');
  }, [open, quest, sheet.category]);

  const xp = Math.round((activityRate(settings, category) * minutes) / 10);

  const start = () => {
    const res = dispatch((s, now) => startSession(s, { questId: quest?.id ?? null, category, label: label.trim() || getCategory(category).name, minutes }, now));
    if (!res.error) {
      onClose();
      navigate('/focus');
    }
  };

  return (
    <SheetPanel
      open={open}
      onClose={onClose}
      title="Focus session"
      description="A distraction-free timer. XP is claimed when you finish."
      footer={
        running ? (
          <Button variant="primary" cta size="lg" block icon="timer" onClick={() => { onClose(); navigate('/focus'); }}>
            Return to running session
          </Button>
        ) : (
          <Button variant="primary" cta size="lg" block icon="play" onClick={start}>
            Start {formatMinutes(minutes)} · ~{formatNumber(xp)} XP
          </Button>
        )
      }
    >
      <div className="space-y-6">
        {quest && (
          <p className="rounded-2xl border border-line bg-surface-2 px-4 py-3 text-sm text-muted">
            Linked to <span className="font-semibold text-fg">{quest.title}</span> — finishing the session counts toward it.
          </p>
        )}
        <Field label="Focus on" htmlFor="focus-label">
          <Input id="focus-label" value={label} maxLength={60} onChange={(e) => setLabel(e.target.value)} placeholder={`e.g. ${getCategory(category).examples[0]}`} />
        </Field>
        {!quest && (
          <Field label="Category">
            <CategoryPicker value={category} onChange={setCategory} />
          </Field>
        )}
        <Field label="Length" hint="Sessions under 5 minutes don’t earn XP.">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <Chip key={p} selected={minutes === p} onClick={() => setMinutes(p)}>
                  {formatMinutes(p)}
                </Chip>
              ))}
            </div>
            <Stepper value={minutes} onChange={setMinutes} min={5} max={180} step={5} label="Session length in minutes" suffix="min" />
          </div>
        </Field>
      </div>
    </SheetPanel>
  );
}
