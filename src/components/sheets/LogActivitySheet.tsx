import { useEffect, useMemo, useState } from 'react';
import type { CategoryId } from '@/types';
import { getCategory } from '@/data/categories';
import { addDays, parseClock, startOfDay, toDateKey } from '@/lib/date';
import { formatMinutes, formatNumber } from '@/lib/format';
import { currentMomentum, momentumMultiplier } from '@/lib/engine/rewards';
import { logActivity, previewActivityXP } from '@/lib/engine/gameEngine';
import { questsForToday } from '@/lib/engine/quests';
import { dispatch, useGame, useGameStore } from '@/store/gameStore';
import { fxFrom, type Sheet } from '@/store/uiStore';
import { Button } from '@/components/ui/Button';
import { Chip, Field, Input, Segmented, Stepper, TextArea, Toggle } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Sheet as SheetPanel } from '@/components/ui/Overlay';
import { CategoryPicker } from './CategoryPicker';

const PRESETS = [10, 15, 20, 30, 45, 60, 90];

type When = 'now' | 'earlier' | 'yesterday';

function clockNow(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function LogActivitySheet({ open, onClose, sheet }: { open: boolean; onClose: () => void; sheet?: Extract<Sheet, { type: 'log' }> }) {
  const [category, setCategory] = useState<CategoryId>('study');
  const [duration, setDuration] = useState(30);
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [when, setWhen] = useState<When>('now');
  const [time, setTime] = useState(clockNow);
  const [autoProgress, setAutoProgress] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const quests = useGame((s) => s.quests);
  const meta = useGame((s) => s.meta);
  const momentumOn = useGame((s) => s.settings.xp.momentum);

  useEffect(() => {
    if (!open) return;
    setCategory(sheet?.category ?? 'study');
    setDuration(sheet?.minutes ? Math.max(1, Math.round(sheet.minutes)) : 30);
    setLabel('');
    setAmount('');
    setNotes('');
    setShowNotes(false);
    setWhen('now');
    setTime(clockNow());
    setAutoProgress(true);
    setError(null);
  }, [open, sheet?.category, sheet?.minutes, sheet?.questId]);

  const cat = getCategory(category);
  const now = Date.now();
  const today = toDateKey(now);
  const timestamp = useMemo(() => {
    if (when === 'now') return now;
    const day = when === 'yesterday' ? addDays(today, -1) : today;
    return Math.min(now, startOfDay(day) + parseClock(time) * 60_000);
  }, [when, time, today, now]);

  const activities = useGame((s) => s.activities);
  const settings = useGame((s) => s.settings);
  const preview = previewActivityXP({ ...useGameStore.getState().state, activities, settings }, { category, duration, timestamp }, now);
  const live = when === 'now';
  const m = currentMomentum(meta, now, momentumOn);
  const nextMultiplier = live && momentumOn && duration >= 5 ? momentumMultiplier(m.count + 1) : 1;
  const bonus = nextMultiplier > 1 ? Math.round(preview.base * (nextMultiplier - 1)) : 0;

  const linkedQuest = sheet?.questId ? quests.find((q) => q.id === sheet.questId) : undefined;
  const matching = useMemo(
    () => (when === 'yesterday' ? [] : questsForToday(quests, today).filter((q) => !q.completed && q.status === 'active' && (linkedQuest ? q.id === linkedQuest.id : q.category === category && q.target?.unit === 'minutes'))),
    [quests, today, category, linkedQuest, when],
  );

  const submit = (target: EventTarget) => {
    setError(null);
    fxFrom(target);
    const res = dispatch(
      (s, n) =>
        logActivity(
          s,
          {
            category,
            duration,
            label: label.trim() || null,
            notes,
            amount: amount === '' ? null : Number(amount),
            unit: cat.quantity?.unit ?? null,
            timestamp,
            questId: linkedQuest?.id ?? null,
            autoProgress,
          },
          n,
        ),
      { undoLabel: `${cat.name} log`, quietErrors: true },
    );
    if (res.error) setError(res.error);
    else onClose();
  };

  const capNote =
    preview.level === 'hard'
      ? `You’re past today’s healthy limit for ${cat.name.toLowerCase()} (${formatMinutes(cat.hardCap)}). Extra time is logged without XP — rest counts too.`
      : preview.level === 'soft'
        ? `After ${formatMinutes(cat.softCap)} of ${cat.name.toLowerCase()} in a day, extra time earns half XP.`
        : null;

  return (
    <SheetPanel
      open={open}
      onClose={onClose}
      title={linkedQuest ? 'Log progress' : 'Log activity'}
      description={linkedQuest ? <>For “{linkedQuest.title}”</> : 'Every real minute counts.'}
      footer={
        <Button variant="primary" cta size="lg" block onClick={(e) => submit(e.currentTarget)} icon="plus">
          Log {formatMinutes(duration)} · +{formatNumber(preview.base + bonus)} XP
        </Button>
      }
    >
      <div className="space-y-6">
        <Field label="Activity">
          <CategoryPicker value={category} onChange={setCategory} />
        </Field>

        <Field label="Duration" hint={`${cat.name}: ${settings.xp.activityRates[category] ?? cat.rate} XP per 10 minutes`}>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <Chip key={p} selected={duration === p} onClick={() => setDuration(p)}>
                  {formatMinutes(p)}
                </Chip>
              ))}
            </div>
            <Stepper value={duration} onChange={setDuration} min={1} max={480} step={5} label="Duration in minutes" suffix="min" />
          </div>
        </Field>

        {cat.quantity && (
          <Field label={cat.quantity.label} optional htmlFor="log-amount">
            <Input id="log-amount" type="number" inputMode="decimal" min={0} step={cat.quantity.unit === 'km' ? 0.1 : 1} value={amount} onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))} placeholder={cat.quantity.unit === 'km' ? 'e.g. 3.5' : 'e.g. 20'} />
          </Field>
        )}

        <Field label="What did you do?" optional htmlFor="log-label">
          <Input id="log-label" value={label} maxLength={60} onChange={(e) => setLabel(e.target.value)} placeholder={cat.examples[0]} />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {cat.examples.map((ex) => (
              <button key={ex} type="button" onClick={() => setLabel(ex)} className="h-8 rounded-full border border-line bg-surface-2 px-3 text-xs text-muted transition hover:border-line-strong hover:text-fg">
                {ex}
              </button>
            ))}
          </div>
        </Field>

        <Field label="When">
          <Segmented<When>
            label="When did you do it?"
            value={when}
            onChange={setWhen}
            options={[
              { value: 'now', label: 'Just now' },
              { value: 'earlier', label: 'Earlier today' },
              { value: 'yesterday', label: 'Yesterday' },
            ]}
          />
          {when !== 'now' && (
            <div className="mt-3 flex items-center gap-3">
              <label htmlFor="log-time" className="text-sm text-muted">
                Finished at
              </label>
              <Input id="log-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} className="max-w-36" />
            </div>
          )}
        </Field>

        {matching.length > 0 && (
          <div className="rounded-2xl border border-line bg-surface-2 p-3.5">
            <Toggle
              checked={autoProgress || !!linkedQuest}
              disabled={!!linkedQuest}
              onChange={setAutoProgress}
              label="Count toward quests"
              description={matching.map((q) => q.title).join(', ')}
            />
          </div>
        )}

        {showNotes ? (
          <Field label="Notes" optional htmlFor="log-notes">
            <TextArea id="log-notes" value={notes} maxLength={500} onChange={(e) => setNotes(e.target.value)} placeholder="How did it go?" />
          </Field>
        ) : (
          <button type="button" onClick={() => setShowNotes(true)} className="flex items-center gap-2 text-sm font-medium text-muted transition hover:text-fg">
            <Icon name="plus" size={16} /> Add notes
          </button>
        )}

        <div className="space-y-2 rounded-2xl border border-line bg-surface-2/60 p-4" aria-live="polite">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted">XP for this log</span>
            <span className="font-display text-lg font-bold text-accent-ink num">+{formatNumber(preview.base)} XP</span>
          </div>
          {bonus > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-muted">
                <Icon name="zap" size={14} className="text-coin" /> Momentum ×{nextMultiplier.toFixed(2)}
              </span>
              <span className="font-semibold text-coin num">+{formatNumber(bonus)}</span>
            </div>
          )}
          {capNote && (
            <p className="flex gap-2 text-[13px] leading-snug text-muted">
              <Icon name="heart-pulse" size={15} className="mt-0.5 shrink-0 text-success" />
              {capNote}
            </p>
          )}
        </div>

        {error && (
          <p className="flex items-center gap-2 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2.5 text-sm text-danger" role="alert">
            <Icon name="triangle-alert" size={15} /> {error}
          </p>
        )}
      </div>
    </SheetPanel>
  );
}
