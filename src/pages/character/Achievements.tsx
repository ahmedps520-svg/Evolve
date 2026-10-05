import { useMemo, useState, type CSSProperties } from 'react';
import type { Achievement, Rarity } from '@/types';
import { RARITY_LABEL, RARITY_ORDER, RARITY_VAR } from '@/data/difficulty';
import { cn } from '@/lib/cn';
import { formatDay, toDateKey } from '@/lib/date';
import { formatNumber } from '@/lib/format';
import { useAchievements } from '@/hooks/useGameData';
import { CoinIcon } from '@/components/game/Hud';
import { RarityGem, RarityTag } from '@/components/game/Tags';
import { EmptyState, ProgressBar } from '@/components/ui/Display';
import { Segmented } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';

type Filter = 'all' | 'unlocked' | 'locked';

function AchievementEmblem({ a }: { a: Achievement }) {
  const color = RARITY_VAR[a.rarity];
  const hidden = a.secret && !a.unlocked;
  return (
    <span className={cn('relative grid size-14 shrink-0 place-items-center', !a.unlocked && 'opacity-55 grayscale')} style={{ color }} aria-hidden>
      <svg viewBox="0 0 40 44" className="absolute inset-0 h-full w-full">
        <path d="M20 1.5 37.3 11.5v21L20 42.5 2.7 32.5v-21z" fill="currentColor" fillOpacity={a.unlocked ? 0.16 : 0.06} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
      <Icon name={hidden ? 'circle-help' : a.icon} size={22} className={cn('relative', a.unlocked && a.rarity === 'mythic' && 'text-fg')} />
      {!a.unlocked && (
        <span className="absolute -right-0.5 -bottom-0.5 grid size-5 place-items-center rounded-full border border-line-strong bg-surface-3 text-muted">
          <Icon name="lock" size={11} />
        </span>
      )}
    </span>
  );
}

function AchievementCard({ a }: { a: Achievement }) {
  const hidden = a.secret && !a.unlocked;
  const color = RARITY_VAR[a.rarity];
  return (
    <li
      className={cn('card relative flex gap-4 overflow-hidden p-4', a.unlocked && RARITY_ORDER.indexOf(a.rarity) >= RARITY_ORDER.indexOf('epic') && 'rarity-glow')}
      style={a.unlocked ? ({ borderColor: `color-mix(in oklab, ${color} 38%, var(--line))`, '--rarity': color } as CSSProperties) : undefined}
      aria-label={`${hidden ? 'Secret achievement' : a.name}, ${RARITY_LABEL[a.rarity]}, ${a.unlocked ? 'unlocked' : 'locked'}`}
    >
      {a.unlocked && <span className="pointer-events-none absolute -top-10 -left-10 size-32 rounded-full opacity-50" style={{ background: `radial-gradient(circle, color-mix(in oklab, ${color} 30%, transparent), transparent 70%)` }} aria-hidden />}
      <AchievementEmblem a={a} />
      <div className="relative min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className={cn('font-display text-[15px] font-bold tracking-[0.08em] uppercase', a.unlocked ? 'text-fg' : 'text-muted')}>{hidden ? '???' : a.name}</h3>
        </div>
        <p className="mt-0.5 text-[13px] leading-snug text-muted">{hidden ? 'Secret achievement. Keep playing to discover it.' : a.description}</p>
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <RarityTag rarity={a.rarity} />
          {(a.xpReward > 0 || a.coinReward > 0) && (
            <span className="inline-flex items-center gap-2 text-xs text-muted">
              {a.xpReward > 0 && <span className="font-semibold text-accent-ink num">+{formatNumber(a.xpReward)} XP</span>}
              {a.coinReward > 0 && (
                <span className="inline-flex items-center gap-1 font-semibold text-coin num">
                  <CoinIcon size={12} />+{formatNumber(a.coinReward)}
                </span>
              )}
            </span>
          )}
        </div>
        {a.unlocked ? (
          <p className="mt-2.5 flex items-center gap-1.5 text-xs text-success">
            <Icon name="check" size={13} /> Unlocked {a.unlockedAt ? formatDay(toDateKey(a.unlockedAt), { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
          </p>
        ) : (
          !hidden &&
          a.progress.target > 1 && (
            <div className="mt-3">
              <ProgressBar value={a.progress.current} max={a.progress.target} color={color} height={5} label={`${a.name} progress`} />
              <p className="mt-1 text-[11.5px] text-muted num">
                {formatNumber(a.progress.current)} / {formatNumber(a.progress.target)}
              </p>
            </div>
          )
        )}
      </div>
    </li>
  );
}

export default function Achievements() {
  const list = useAchievements();
  const [filter, setFilter] = useState<Filter>('all');
  const [rarity, setRarity] = useState<Rarity | null>(null);

  const unlockedCount = list.filter((a) => a.unlocked).length;
  const byRarity = useMemo(
    () =>
      RARITY_ORDER.map((r) => ({
        rarity: r,
        total: list.filter((a) => a.rarity === r).length,
        unlocked: list.filter((a) => a.rarity === r && a.unlocked).length,
      })).filter((r) => r.total > 0),
    [list],
  );

  const shown = useMemo(() => {
    const ratio = (a: Achievement) => (a.progress.target ? a.progress.current / a.progress.target : 0);
    return list
      .filter((a) => (filter === 'unlocked' ? a.unlocked : filter === 'locked' ? !a.unlocked : true))
      .filter((a) => !rarity || a.rarity === rarity)
      .sort((a, b) => {
        if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
        if (a.unlocked) return (b.unlockedAt ?? 0) - (a.unlockedAt ?? 0);
        // Closest to unlocking first; secrets last.
        if (!!a.secret !== !!b.secret) return a.secret ? 1 : -1;
        return ratio(b) - ratio(a) || RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity);
      });
  }, [list, filter, rarity]);

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="hud-label">Collection</p>
            <p className="mt-1 font-display text-3xl font-bold text-fg num">
              {unlockedCount}
              <span className="text-lg text-muted"> / {list.length}</span>
            </p>
          </div>
          <p className="text-right text-sm text-muted">{Math.round((unlockedCount / Math.max(1, list.length)) * 100)}% complete</p>
        </div>
        <ProgressBar className="mt-3" value={unlockedCount} max={list.length} height={8} label="Achievements unlocked" />
        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Filter by rarity">
          {byRarity.map((r) => (
            <button
              key={r.rarity}
              type="button"
              aria-pressed={rarity === r.rarity}
              onClick={() => setRarity(rarity === r.rarity ? null : r.rarity)}
              className={cn(
                'inline-flex h-9 items-center gap-2 rounded-full border px-3 text-xs font-medium transition',
                rarity === r.rarity ? 'border-accent bg-accent/12 text-fg' : 'border-line bg-surface-2 text-muted hover:border-line-strong hover:text-fg',
              )}
            >
              <RarityGem rarity={r.rarity} size={10} />
              {RARITY_LABEL[r.rarity]}
              <span className="num text-faint">
                {r.unlocked}/{r.total}
              </span>
            </button>
          ))}
        </div>
      </div>

      <Segmented<Filter>
        label="Show achievements"
        value={filter}
        onChange={setFilter}
        size="sm"
        className="sm:max-w-sm"
        options={[
          { value: 'all', label: 'All' },
          { value: 'unlocked', label: 'Unlocked' },
          { value: 'locked', label: 'Locked' },
        ]}
      />

      {shown.length === 0 ? (
        filter === 'unlocked' ? (
          <EmptyState icon="award" title="Nothing unlocked yet." message="Every journey starts with the first quest." />
        ) : (
          <EmptyState icon="award" title="Nothing here." message={filter === 'locked' ? 'You’ve unlocked everything in this group. Legendary.' : 'No achievements match this filter.'} />
        )
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {shown.map((a) => (
            <AchievementCard key={a.id} a={a} />
          ))}
        </ul>
      )}
    </div>
  );
}
