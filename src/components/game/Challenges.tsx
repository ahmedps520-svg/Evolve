import { m } from 'framer-motion';
import { useEffect, useState, type ReactNode } from 'react';
import type { WeeklyChallenge } from '@/types';
import { COSMETIC_MAP } from '@/data/cosmetics';
import { BOSS_MAP } from '@/data/weekly';
import { cn } from '@/lib/cn';
import { formatDay } from '@/lib/date';
import { formatClock, formatMinutes, formatNumber } from '@/lib/format';
import { href } from '@/lib/router';
import { claimEvent, claimWeekly } from '@/lib/engine/gameEngine';
import { currentMomentum } from '@/lib/engine/rewards';
import type { ActiveEvent } from '@/lib/engine/specialEvents';
import { useNow } from '@/hooks/useGameData';
import { dispatch, useGame } from '@/store/gameStore';
import { fxFrom, useUI } from '@/store/uiStore';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/Display';
import { Icon } from '@/components/ui/Icon';
import { CoinIcon } from './Hud';

export function formatChallengeValue(c: Pick<WeeklyChallenge, 'unitLabel'>, value: number): string {
  if (c.unitLabel === 'min') return formatMinutes(value);
  return formatNumber(value);
}

/* ───────────── Weekly boss ───────────── */

export function BossCard({ challenge, progress, daysLeft, compact, linkTo }: { challenge: WeeklyChallenge; progress: number; daysLeft: number; compact?: boolean; linkTo?: string }) {
  const boss = BOSS_MAP[challenge.bossId ?? ''] ?? { name: 'Weekly Boss', lore: '', icon: 'swords' };
  const dealt = Math.min(progress, challenge.target);
  const hp = Math.max(0, challenge.target - dealt);
  const defeated = dealt >= challenge.target;
  const content = (
    <>
      <div className="flex items-center gap-3.5">
        <div className="relative grid size-14 shrink-0 place-items-center">
          <svg viewBox="0 0 40 44" className="absolute inset-0 h-full w-full text-danger" aria-hidden>
            <path d="M20 1.5 37.3 11.5v21L20 42.5 2.7 32.5v-21z" fill="currentColor" fillOpacity={defeated ? 0.08 : 0.14} stroke="currentColor" strokeOpacity={defeated ? 0.4 : 0.85} strokeWidth="1.8" />
          </svg>
          <Icon name={defeated ? 'swords' : boss.icon} size={24} className={cn('relative', defeated ? 'text-muted' : 'text-danger')} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="hud-label !text-danger">{defeated ? 'Boss defeated' : 'Weekly boss'}</p>
          <h3 className="font-display text-[17px] leading-snug font-bold tracking-wide text-balance text-fg">{boss.name}</h3>
          {!compact && boss.lore && <p className="text-[13px] text-muted">{boss.lore}</p>}
        </div>
        <span className="shrink-0 self-start rounded-lg border border-line bg-surface-2 px-2 py-1 text-[11px] font-medium text-muted">{daysLeft === 1 ? 'Last day' : `${daysLeft} days left`}</span>
      </div>
      <div className="mt-4">
        <div className="mb-1.5 flex items-baseline justify-between text-xs">
          <span className="font-display font-semibold tracking-[0.12em] text-muted uppercase">HP</span>
          <span className="num text-muted">
            <span className="font-semibold text-fg">{formatNumber(hp)}</span> / {formatNumber(challenge.target)}
          </span>
        </div>
        <div className="relative h-3 overflow-hidden rounded-full bg-surface-4" role="progressbar" aria-label={`${boss.name} health`} aria-valuemin={0} aria-valuemax={challenge.target} aria-valuenow={hp}>
          <m.div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{ background: 'linear-gradient(90deg, #ff5d6c, #fb923c)', boxShadow: '0 0 14px -2px #ff5d6c' }}
            initial={false}
            animate={{ width: `${(hp / challenge.target) * 100}%` }}
            transition={{ type: 'spring', stiffness: 80, damping: 18 }}
          />
        </div>
        <p className="mt-2 text-xs text-muted">Every XP you earn this week is a hit. {defeated ? '' : `${formatNumber(hp)} to go.`}</p>
      </div>
    </>
  );
  if (linkTo) {
    return (
      <a href={href(linkTo)} className="card block p-4 transition hover:border-line-strong sm:p-5">
        {content}
      </a>
    );
  }
  return <div className="card p-4 sm:p-5">{content}</div>;
}

/* ───────────── Claim button (shared by bounties, boss and events) ───────────── */

function ClaimRow({ xp, coins, ready, claimed, onClaim, progressLabel, progress, target, color = 'var(--accent)' }: { xp: number; coins: number; ready: boolean; claimed: boolean; onClaim: (target: EventTarget) => void; progressLabel: string; progress: number; target: number; color?: string }) {
  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center gap-3">
        <ProgressBar value={Math.min(progress, target)} max={target} color={ready || claimed ? 'var(--success)' : color} label="Challenge progress" />
        <span className="num shrink-0 text-xs font-medium text-muted">{progressLabel}</span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-3 text-[13px]">
          <span className="font-display font-bold text-accent-ink">+{formatNumber(xp)} XP</span>
          <span className="flex items-center gap-1 font-display font-semibold text-coin">
            <CoinIcon size={14} />+{formatNumber(coins)}
          </span>
        </span>
        {claimed ? (
          <span className="flex items-center gap-1.5 font-display text-xs font-semibold tracking-[0.12em] text-success uppercase">
            <Icon name="check" size={14} /> Claimed
          </span>
        ) : ready ? (
          <Button variant="primary" size="sm" cta icon="gift" onClick={(e) => onClaim(e.currentTarget)} className="animate-[pulse-glow_2s_ease-in-out_infinite]">
            Claim
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function ChallengeCard({ challenge, progress }: { challenge: WeeklyChallenge; progress: number }) {
  const ready = progress >= challenge.target;
  return (
    <article className={cn('card p-4 sm:p-5', ready && !challenge.claimed && 'border-success/40')}>
      <div className="flex items-start gap-3.5">
        <span className="grid size-11 shrink-0 place-items-center rounded-[14px] border border-line bg-surface-2 text-accent-ink">
          <Icon name={challenge.bossId ? 'swords' : 'target'} size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="hud-label">{challenge.bossId ? 'Weekly boss' : 'Bounty'}</p>
          <h3 className="font-display text-base font-bold tracking-wide text-fg">{challenge.title}</h3>
          <p className="mt-0.5 text-[13px] text-muted">{challenge.description}</p>
        </div>
      </div>
      <ClaimRow
        xp={challenge.xpReward}
        coins={challenge.coinReward}
        ready={ready}
        claimed={challenge.claimed}
        progress={progress}
        target={challenge.target}
        progressLabel={`${formatChallengeValue(challenge, Math.min(progress, challenge.target))} / ${formatChallengeValue(challenge, challenge.target)}`}
        onClaim={(t) => {
          fxFrom(t);
          dispatch((s, now) => claimWeekly(s, challenge.id, now));
        }}
      />
    </article>
  );
}

export function BossClaim({ challenge, progress }: { challenge: WeeklyChallenge; progress: number }) {
  const ready = progress >= challenge.target;
  if (!ready && !challenge.claimed) return null;
  return (
    <ClaimRow
      xp={challenge.xpReward}
      coins={challenge.coinReward}
      ready={ready}
      claimed={challenge.claimed}
      progress={progress}
      target={challenge.target}
      color="var(--danger)"
      progressLabel="Defeated"
      onClaim={(t) => {
        fxFrom(t);
        dispatch((s, now) => claimWeekly(s, challenge.id, now));
      }}
    />
  );
}

/* ───────────── Special event ───────────── */

export function EventCard({ ev, progress, compact }: { ev: ActiveEvent; progress: number; compact?: boolean }) {
  const record = useGame((s) => s.meta.events[ev.key]);
  const done = !!record?.completedAt;
  const claimed = !!record?.claimedAt;
  const reward = ev.def.rewards.itemIds.map((id) => COSMETIC_MAP[id]?.name).filter(Boolean);
  return (
    <article className="card relative overflow-hidden p-4 sm:p-5">
      <div className="pointer-events-none absolute -top-16 -right-10 size-48 rounded-full" style={{ background: 'radial-gradient(circle, color-mix(in oklab, var(--rarity-epic) 30%, transparent), transparent 70%)' }} aria-hidden />
      <div className="relative flex items-start gap-3.5">
        <span className="grid size-12 shrink-0 place-items-center rounded-[14px] border border-epic/40 bg-epic/12 text-epic">
          <Icon name={ev.def.sigil} size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="hud-label !text-epic">{ev.def.tagline}</p>
          <h3 className="font-display text-lg font-bold tracking-[0.06em] text-fg uppercase">{ev.def.name}</h3>
          <p className="mt-0.5 text-[13px] text-muted">{ev.def.description}</p>
          {!compact && (
            <p className="mt-1.5 text-xs text-faint">
              Ends {formatDay(ev.end, { month: 'long', day: 'numeric' })}
              {reward.length > 0 && <> · Rewards: {reward.join(', ')}</>}
            </p>
          )}
        </div>
      </div>
      <div className="relative">
        <ClaimRow
          xp={ev.def.rewards.xp}
          coins={ev.def.rewards.coins}
          ready={done && !claimed}
          claimed={claimed}
          progress={done ? ev.def.target : progress}
          target={ev.def.target}
          color="var(--rarity-epic)"
          progressLabel={done ? 'Complete' : `${formatNumber(Math.min(progress, ev.def.target))} / ${formatNumber(ev.def.target)} ${ev.def.unitLabel}${ev.def.window === 'week' ? ' this week' : ''}`}
          onClaim={(t) => {
            fxFrom(t);
            dispatch((s, now) => claimEvent(s, ev.key, now));
          }}
        />
      </div>
    </article>
  );
}

/* ───────────── Momentum ───────────── */

export function MomentumMeter() {
  const meta = useGame((s) => s.meta);
  const enabled = useGame((s) => s.settings.xp.momentum);
  const pulse = useUI((s) => s.momentumPulse);
  const now = useNow(1000);
  const [flash, setFlash] = useState(0);
  useEffect(() => {
    if (pulse) setFlash((f) => f + 1);
  }, [pulse]);
  const mo = currentMomentum(meta, now, enabled);
  if (mo.count < 2) return null;
  const left = Math.max(0, mo.expiresAt - now);
  const pct = left / (2 * 60 * 60 * 1000);
  return (
    <m.div key={flash} initial={flash ? { scale: 1.04 } : false} animate={{ scale: 1 }} className="flex items-center gap-3 rounded-2xl border border-coin/30 bg-coin/8 px-4 py-3" role="status">
      <Icon name="zap" size={20} className="shrink-0 text-coin" style={{ filter: 'drop-shadow(0 0 6px var(--coin))' }} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="font-display text-sm font-bold tracking-[0.1em] text-fg uppercase">Momentum ×{mo.multiplier.toFixed(2)}</p>
          <span className="num text-xs text-muted">{formatClock(left)}</span>
        </div>
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface-4">
          <div className="h-full rounded-full bg-coin transition-[width] duration-1000 ease-linear" style={{ width: `${pct * 100}%` }} />
        </div>
        <p className="mt-1.5 text-[12px] text-muted">{mo.multiplier >= 1.15 ? 'Max bonus reached — keep a healthy pace.' : 'Another activity soon raises your bonus.'}</p>
      </div>
    </m.div>
  );
}

/* ───────────── Stat tile ───────────── */

export function StatTile({ label, value, sub, icon, className, children }: { label: string; value?: ReactNode; sub?: ReactNode; icon?: string; className?: string; children?: ReactNode }) {
  return (
    <div className={cn('card flex flex-col justify-between gap-2 p-4', className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="hud-label">{label}</p>
        {icon && <Icon name={icon} size={16} className="text-faint" />}
      </div>
      {value !== undefined && <div className="font-display text-2xl leading-none font-bold text-fg">{value}</div>}
      {children}
      {sub && <p className="text-xs text-muted">{sub}</p>}
    </div>
  );
}
