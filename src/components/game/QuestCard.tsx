import { AnimatePresence, m } from 'framer-motion';
import { memo, useEffect, useRef, useState, type MouseEvent } from 'react';
import type { Quest } from '@/types';
import { attributeColor } from '@/data/attributes';
import { getCategory } from '@/data/categories';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import { navigate } from '@/lib/router';
import { completeQuest, deleteQuest, progressQuest, rerollQuest, rerollsLeft, startSession } from '@/lib/engine/gameEngine';
import { dispatch, useGame } from '@/store/gameStore';
import { fxFrom, useUI } from '@/store/uiStore';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/Display';
import { Icon } from '@/components/ui/Icon';
import { Menu, type MenuItem } from '@/components/ui/Menu';
import { ConfirmDialog } from '@/components/ui/Overlay';
import { CategoryIcon, CategoryTag, DifficultyTag } from './Tags';

const UNIT_LABEL: Record<string, string> = { minutes: 'min', times: '', pages: 'pages', km: 'km', reps: 'reps' };

export function formatProgress(q: Quest): string {
  if (!q.target) return q.completed ? 'Done' : 'Not started';
  const unit = UNIT_LABEL[q.target.unit];
  const p = q.target.unit === 'km' ? q.progress.toFixed(1).replace(/\.0$/, '') : formatNumber(q.progress);
  const t = q.target.unit === 'km' ? String(q.target.amount) : formatNumber(q.target.amount);
  return `${p} / ${t}${unit ? ` ${unit}` : ''}`;
}

function repeatLabel(q: Quest): string | null {
  switch (q.repeatSchedule.type) {
    case 'daily':
      return 'Daily';
    case 'weekdays':
      return 'Weekdays';
    case 'weekly': {
      const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return q.repeatSchedule.days.map((d) => names[d]).join(' · ');
    }
    default:
      return null;
  }
}

function stepFor(q: Quest): number {
  if (!q.target) return 1;
  if (q.target.unit === 'km') return q.target.amount >= 5 ? 1 : 0.5;
  if (q.target.unit === 'pages' || q.target.unit === 'reps') return q.target.amount >= 40 ? 10 : 5;
  return 1;
}

export const QuestCard = memo(function QuestCard({ quest, className }: { quest: Quest; className?: string }) {
  const session = useGame((s) => s.session);
  const canReroll = useGame((s) => rerollsLeft(s, Date.now()) > 0);
  const goalTitle = useGame((s) => (quest.goalId ? (s.goals.find((g) => g.id === quest.goalId)?.title ?? null) : null));
  const openSheet = useUI((s) => s.openSheet);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const wasDone = useRef(quest.completed);

  useEffect(() => {
    if (quest.completed && !wasDone.current) {
      setCelebrate(true);
      const t = setTimeout(() => setCelebrate(false), 1100);
      wasDone.current = true;
      return () => clearTimeout(t);
    }
    wasDone.current = quest.completed;
  }, [quest.completed]);

  const cat = getCategory(quest.category);
  const color = attributeColor(cat.attribute);
  const target = quest.target;
  const minutes = target?.unit === 'minutes';
  const remaining = target ? Math.max(0, Math.round((target.amount - quest.progress) * 10) / 10) : 0;
  const sessionHere = !!session && session.questId === quest.id;
  const repeat = repeatLabel(quest);
  const editable = quest.kind === 'custom' || quest.kind === 'generated' || quest.kind === 'goal';

  const start = (e: MouseEvent) => {
    fxFrom(e.currentTarget);
    if (sessionHere) return navigate('/focus');
    const res = dispatch((s, now) => startSession(s, { questId: quest.id, category: quest.category, label: quest.title, minutes: Math.max(5, Math.ceil(remaining || quest.timerMinutes || 25)) }, now));
    if (!res.error) navigate('/focus');
  };
  const complete = (e: MouseEvent) => {
    fxFrom(e.currentTarget);
    dispatch((s, now) => completeQuest(s, quest.id, now), { undoLabel: 'Quest completion' });
  };
  const step = (e: MouseEvent) => {
    fxFrom(e.currentTarget);
    dispatch((s, now) => progressQuest(s, quest.id, stepFor(quest), now), { undoLabel: 'Quest progress' });
  };
  const log = () => openSheet({ type: 'log', category: quest.category, questId: quest.id, minutes: remaining || undefined });

  const menu: MenuItem[] = [];
  if (!quest.completed) {
    if (minutes && quest.timerMinutes) menu.push({ label: 'Log time instead', icon: 'notebook-pen', onSelect: log });
    if (!minutes && target) menu.push({ label: 'Mark complete', icon: 'check', onSelect: () => dispatch((s, now) => completeQuest(s, quest.id, now), { undoLabel: 'Quest completion' }) });
    if (minutes) menu.push({ label: 'Mark complete without logging', icon: 'check', onSelect: () => dispatch((s, now) => completeQuest(s, quest.id, now), { undoLabel: 'Quest completion' }) });
    if (!minutes) menu.push({ label: 'Start a focus session', icon: 'timer', onSelect: () => openSheet({ type: 'focus', questId: quest.id, category: quest.category }) });
    if (quest.kind === 'daily' && quest.progress === 0) menu.push({ label: 'Reroll quest', icon: 'dices', hint: canReroll ? '1 left' : 'Used', disabled: !canReroll, onSelect: () => dispatch((s, now) => rerollQuest(s, quest.id, now)) });
  }
  if (editable) {
    menu.push({ label: 'Edit quest', icon: 'pencil', onSelect: () => openSheet({ type: 'quest', questId: quest.id }) });
    menu.push({ label: 'Delete quest', icon: 'trash-2', danger: true, onSelect: () => setConfirmDelete(true) });
  }

  return (
    <m.article
      layout="position"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0, scale: celebrate ? [1, 1.025, 1] : 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className={cn('card relative overflow-hidden p-4 sm:p-5', quest.completed && 'bg-surface/70', className)}
      aria-label={`${quest.title}${quest.completed ? ', completed' : ''}`}
    >
      <AnimatePresence>
        {celebrate && (
          <m.span
            className="pointer-events-none absolute inset-0 rounded-[inherit]"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            style={{ boxShadow: `inset 0 0 0 1.5px ${color}, 0 0 40px -8px ${color}`, background: `linear-gradient(110deg, transparent 20%, color-mix(in oklab, ${color} 18%, transparent) 50%, transparent 80%)` }}
            aria-hidden
          />
        )}
      </AnimatePresence>

      <div className="flex gap-3.5">
        <CategoryIcon category={quest.category} size={44} className={cn(quest.completed && 'opacity-60')} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className={cn('text-[15.5px] leading-snug font-semibold text-fg', quest.completed && 'text-muted')}>{quest.title}</h3>
            <span className={cn('shrink-0 font-display text-[13px] font-bold tracking-wide whitespace-nowrap', quest.completed ? 'text-faint' : 'text-accent-ink')}>
              +{formatNumber(quest.xpReward)} XP
            </span>
          </div>
          {quest.description && <p className="mt-0.5 text-[13.5px] leading-snug text-muted">{quest.description}</p>}
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <CategoryTag category={quest.category} />
            <DifficultyTag difficulty={quest.difficulty} />
            {repeat && (
              <span className="inline-flex h-6 items-center gap-1 rounded-md px-1.5 text-[11.5px] text-muted">
                <Icon name="rotate-ccw" size={12} /> {repeat}
              </span>
            )}
            {quest.streak > 1 && (
              <span className="inline-flex h-6 items-center gap-1 rounded-md px-1.5 text-[11.5px] font-medium text-fg">
                <Icon name="flame" size={12} className="text-[#fb923c]" /> {quest.streak}
              </span>
            )}
            {goalTitle && (
              <span className="inline-flex h-6 max-w-[12rem] items-center gap-1 truncate rounded-md px-1.5 text-[11.5px] text-muted">
                <Icon name="goal" size={12} /> <span className="truncate">{goalTitle}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {target && !quest.completed && (
        <div className="mt-4 flex items-center gap-3">
          <ProgressBar value={quest.progress} max={target.amount} color={color} label={`${quest.title} progress`} />
          <span className="num shrink-0 text-xs font-medium text-muted">{formatProgress(quest)}</span>
        </div>
      )}

      <div className="mt-4 flex items-center gap-2">
        <AnimatePresence mode="popLayout" initial={false}>
          {quest.completed ? (
            <m.div
              key="done"
              layoutId={`quest-action-${quest.id}`}
              className="flex h-10 items-center gap-2 rounded-xl bg-success/12 px-3.5 text-sm font-semibold text-success"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden>
                <circle cx="12" cy="12" r="10" fill="currentColor" fillOpacity="0.2" />
                <m.path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.45, delay: 0.1 }} />
              </svg>
              <span className="font-display tracking-[0.1em] uppercase">{repeat ? 'Done today' : 'Completed'}</span>
            </m.div>
          ) : (
            <m.div key="action" layoutId={`quest-action-${quest.id}`} className="flex items-center gap-2">
              {sessionHere ? (
                <Button variant="primary" cta size="md" icon="timer" onClick={start}>
                  Resume
                </Button>
              ) : minutes && quest.timerMinutes ? (
                <Button variant="primary" cta size="md" icon="play" onClick={start}>
                  {quest.progress > 0 ? 'Continue' : 'Start'}
                </Button>
              ) : minutes ? (
                <Button variant="primary" cta size="md" icon="notebook-pen" onClick={log}>
                  Log
                </Button>
              ) : target && target.amount > 1 ? (
                <Button variant="primary" cta size="md" icon="plus" onClick={step}>
                  {stepFor(quest)} {UNIT_LABEL[target.unit] || ''}
                </Button>
              ) : (
                <Button variant="primary" cta size="md" icon="check" onClick={complete}>
                  Complete
                </Button>
              )}
              {minutes && quest.timerMinutes && !sessionHere && (
                <Button variant="ghost" size="md" icon="notebook-pen" onClick={log} aria-label={`Log time for ${quest.title}`}>
                  <span className="hidden sm:inline">Log</span>
                </Button>
              )}
            </m.div>
          )}
        </AnimatePresence>
        <div className="ml-auto">
          <Menu items={menu} label={`Options for ${quest.title}`} />
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          dispatch((s, now) => deleteQuest(s, quest.id, now));
          setConfirmDelete(false);
        }}
        title="Delete quest?"
        message={<>“{quest.title}” will be removed. XP you already earned from it stays yours.</>}
        confirmLabel="Delete"
        tone="danger"
      />
    </m.article>
  );
});
