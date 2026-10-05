import { useMemo, useState } from 'react';
import type { Transaction } from '@/types';
import { getCategory } from '@/data/categories';
import { cn } from '@/lib/cn';
import { formatDay, formatTime, relativeDay } from '@/lib/date';
import { formatMinutes, formatNumber, formatSigned } from '@/lib/format';
import { deleteActivity } from '@/lib/engine/gameEngine';
import { useToday } from '@/hooks/useGameData';
import { dispatch, useGame } from '@/store/gameStore';
import { CoinIcon } from '@/components/game/Hud';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Display';
import { Segmented } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { ConfirmDialog } from '@/components/ui/Overlay';

type Filter = 'all' | 'xp' | 'coins' | 'activities';

const SOURCE_ICON: Record<string, string> = {
  quest: 'check',
  activity: 'notebook-pen',
  achievement: 'award',
  daily_goal: 'target',
  weekly: 'swords',
  milestone: 'milestone',
  goal: 'goal',
  momentum: 'zap',
  event: 'calendar-heart',
  rest: 'battery-charging',
  challenge: 'handshake',
  level: 'chevrons-up',
  starter: 'gift',
  purchase: 'shopping-bag',
  adjustment: 'sliders-horizontal',
};

export default function History() {
  const transactions = useGame((s) => s.transactions);
  const activities = useGame((s) => s.activities);
  const today = useToday();
  const [filter, setFilter] = useState<Filter>('all');
  const [limit, setLimit] = useState(80);
  const [toDelete, setToDelete] = useState<string | null>(null);

  const rows = useMemo(() => {
    const list = transactions.filter((t) => (filter === 'xp' ? t.currency === 'xp' : filter === 'coins' ? t.currency === 'coins' : true));
    return [...list].sort((a, b) => b.timestamp - a.timestamp);
  }, [transactions, filter]);
  const acts = useMemo(() => [...activities].sort((a, b) => b.timestamp - a.timestamp), [activities]);

  const grouped = useMemo(() => {
    const out: { key: string; items: Transaction[] }[] = [];
    for (const t of rows.slice(0, limit)) {
      const last = out[out.length - 1];
      if (last && last.key === t.dateKey) last.items.push(t);
      else out.push({ key: t.dateKey, items: [t] });
    }
    return out;
  }, [rows, limit]);

  const target = activities.find((a) => a.id === toDelete);

  return (
    <div className="space-y-5">
      <Segmented<Filter>
        label="Filter history"
        value={filter}
        onChange={(f) => {
          setFilter(f);
          setLimit(80);
        }}
        size="sm"
        options={[
          { value: 'all', label: 'All' },
          { value: 'xp', label: 'XP' },
          { value: 'coins', label: 'Coins' },
          { value: 'activities', label: 'Activities' },
        ]}
        className="sm:max-w-md"
      />

      {filter === 'activities' ? (
        acts.length === 0 ? (
          <EmptyState icon="notebook-pen" title="No activities logged yet." message="Your history starts today." />
        ) : (
          <ul className="card divide-y divide-line">
            {acts.slice(0, limit).map((a) => {
              const cat = getCategory(a.category);
              return (
                <li key={a.id} className="flex items-center gap-3 px-4 py-3">
                  <Icon name={cat.icon} size={18} className="shrink-0 text-muted" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-fg">
                      {a.label || cat.name} · {formatMinutes(a.duration)}
                      {a.amount ? ` · ${a.amount} ${a.unit ?? ''}` : ''}
                    </p>
                    <p className="text-xs text-muted">
                      {relativeDay(a.dateKey, today)} {formatTime(a.timestamp)} {a.source === 'focus' && '· Focus session'} {a.capped && '· Healthy limit applied'}
                    </p>
                  </div>
                  <span className="font-display text-sm font-bold text-accent-ink num">+{formatNumber(a.xpEarned + a.bonusXP)}</span>
                  <button type="button" onClick={() => setToDelete(a.id)} aria-label={`Delete ${a.label || cat.name} log`} className="grid size-9 place-items-center rounded-lg text-faint transition hover:bg-surface-3 hover:text-danger">
                    <Icon name="trash-2" size={16} />
                  </button>
                </li>
              );
            })}
          </ul>
        )
      ) : grouped.length === 0 ? (
        <EmptyState icon="history" title="Nothing here yet." message="Every XP and coin you earn is recorded here." />
      ) : (
        <div className="space-y-5">
          {grouped.map((g) => (
            <section key={g.key} aria-label={formatDay(g.key)}>
              <h3 className="hud-label mb-2 px-1">{relativeDay(g.key, today)} · {formatDay(g.key, { month: 'long', day: 'numeric', year: 'numeric' })}</h3>
              <ul className="card divide-y divide-line">
                {g.items.map((t) => (
                  <li key={t.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface-3 text-muted">
                      <Icon name={SOURCE_ICON[t.source] ?? 'sparkle'} size={15} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-fg">{t.label}</p>
                      <p className="text-xs text-muted">
                        {formatTime(t.timestamp)}
                        {t.category && ` · ${getCategory(t.category).name}`}
                      </p>
                    </div>
                    {t.currency === 'xp' ? (
                      <span className={cn('font-display text-sm font-bold num', t.amount >= 0 ? 'text-accent-ink' : 'text-danger')}>{formatSigned(t.amount)} XP</span>
                    ) : (
                      <span className={cn('flex items-center gap-1 font-display text-sm font-bold num', t.amount >= 0 ? 'text-coin' : 'text-muted')}>
                        <CoinIcon size={14} />
                        {formatSigned(t.amount)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
      {(filter === 'activities' ? acts.length : rows.length) > limit && (
        <Button variant="secondary" block onClick={() => setLimit((l) => l + 120)}>
          Load more
        </Button>
      )}
      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={() => {
          if (toDelete) dispatch((s, now) => deleteActivity(s, toDelete, now));
          setToDelete(null);
        }}
        title="Delete this log?"
        message={target ? `${target.label || getCategory(target.category).name} (${formatMinutes(target.duration)}) and the ${formatNumber(target.xpEarned + target.bonusXP)} XP it earned will be removed. Quests and achievements stay as they are.` : ''}
        confirmLabel="Delete"
        tone="danger"
      />
    </div>
  );
}
