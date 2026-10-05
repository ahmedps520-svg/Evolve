import { useMemo, useState } from 'react';
import { addDays, formatDay } from '@/lib/date';
import { formatNumber } from '@/lib/format';
import { streakHistory } from '@/lib/engine/streaks';
import { updateSettings } from '@/lib/engine/gameEngine';
import { useDayStats, useToday } from '@/hooks/useGameData';
import { dispatch, useGame } from '@/store/gameStore';
import { useUI } from '@/store/uiStore';
import { MOODS, Photo } from '@/components/sheets/JournalSheet';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Display';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';

export default function Journal() {
  const enabled = useGame((s) => s.settings.journal);
  const journal = useGame((s) => s.journal);
  const days = useDayStats();
  const today = useToday();
  const openSheet = useUI((s) => s.openSheet);
  const [limit, setLimit] = useState(21);
  const [expanded, setExpanded] = useState<string | null>(null);
  const streaks = useMemo(() => streakHistory(days, today).series, [days, today]);

  const entries = useMemo(() => {
    const keys = new Set<string>(journal.map((j) => j.dateKey));
    for (const [k, d] of days) if (d.xp > 0 || d.rest) keys.add(k);
    return [...keys].filter((k) => k <= today).sort((a, b) => (a < b ? 1 : -1));
  }, [journal, days, today]);

  if (!enabled) {
    return (
      <EmptyState
        icon="notebook-text"
        title="The journal is turned off."
        message="Turn it on to reflect on your days, add photos and build a timeline of your adventure."
        action={{ label: 'Turn on journal', icon: 'notebook-pen', onClick: () => dispatch((s, now) => updateSettings(s, { journal: true }, now)) }}
      />
    );
  }

  const todayEntry = journal.find((j) => j.dateKey === today);
  const byDate = new Map(journal.map((j) => [j.dateKey, j]));

  return (
    <div className="space-y-6">
      <button type="button" onClick={() => openSheet({ type: 'journal', dateKey: today })} className="card group flex w-full items-center gap-4 p-5 text-left transition hover:border-line-strong">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent/14 text-accent-ink">
          <Icon name="notebook-pen" size={22} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-base font-bold tracking-wide text-fg">{todayEntry ? 'Edit today’s entry' : 'How did today go?'}</span>
          <span className="block truncate text-sm text-muted">{todayEntry?.text || 'A few lines is enough. Add a photo if you like.'}</span>
        </span>
        <Icon name="chevron-right" size={18} className="text-muted transition group-hover:translate-x-0.5" />
      </button>

      {entries.length === 0 ? (
        <EmptyState icon="history" title="Your history starts today." message="Days you play — and the notes you write — appear here as a timeline." />
      ) : (
        <ol className="relative space-y-4 before:absolute before:top-2 before:bottom-2 before:left-[15px] before:w-px before:bg-line" aria-label="Timeline">
          {entries.slice(0, limit).map((k) => {
            const d = days.get(k);
            const entry = byDate.get(k);
            const mood = MOODS.find((m) => m.value === entry?.mood);
            const isOpen = expanded === k;
            return (
              <li key={k} className="relative pl-11">
                <span className={cn('absolute top-5 left-[9px] size-[13px] rounded-full border-2 border-bg', d?.goalMet ? 'bg-accent' : d?.rest && !d.active ? 'bg-success' : 'bg-surface-4')} aria-hidden />
                <article className="card p-4 sm:p-5">
                  <header className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="font-display text-sm font-bold tracking-[0.16em] text-fg uppercase">{k === today ? 'Today' : k === addDays(today, -1) ? 'Yesterday' : formatDay(k, { month: 'long', day: 'numeric' })}</h3>
                    {mood && (
                      <span className="flex items-center gap-1.5 text-xs text-muted">
                        <Icon name={mood.icon} size={14} /> {mood.label}
                      </span>
                    )}
                  </header>
                  <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[13px] text-muted">
                    <span className="font-display font-bold text-accent-ink">+{formatNumber(d?.xp ?? 0)} XP</span>
                    <span>{d?.quests ?? 0} quests</span>
                    {(streaks.get(k) ?? 0) > 0 && (
                      <span className="flex items-center gap-1">
                        <Icon name="flame" size={13} className="text-[#fb923c]" /> {streaks.get(k)}-day streak
                      </span>
                    )}
                    {d?.goalMet && <span className="text-success">Goal reached</span>}
                    {d?.rest && !d.active && <span className="text-success">Rest day</span>}
                  </p>
                  {entry?.text && (
                    <button type="button" onClick={() => setExpanded(isOpen ? null : k)} className="mt-3 block w-full text-left">
                      <p className={cn('text-[15px] leading-relaxed whitespace-pre-line text-fg', !isOpen && 'line-clamp-3')}>{entry.text}</p>
                    </button>
                  )}
                  {entry && entry.photoIds.length > 0 && (
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {entry.photoIds.map((id) => (
                        <Photo key={id} id={id} className="aspect-square w-full rounded-xl" alt={`Photo from ${formatDay(k)}`} />
                      ))}
                    </div>
                  )}
                  <div className="mt-3">
                    <Button variant="ghost" size="sm" icon={entry ? 'pencil' : 'notebook-pen'} className="-ml-2" onClick={() => openSheet({ type: 'journal', dateKey: k })}>
                      {entry ? 'Edit entry' : 'Write about this day'}
                    </Button>
                  </div>
                </article>
              </li>
            );
          })}
        </ol>
      )}
      {entries.length > limit && (
        <Button variant="secondary" block onClick={() => setLimit((l) => l + 21)}>
          Show older days
        </Button>
      )}
    </div>
  );
}
