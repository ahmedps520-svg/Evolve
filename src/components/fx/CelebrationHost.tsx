import { AnimatePresence, m } from 'framer-motion';
import { useEffect, useMemo, useRef } from 'react';
import { ACHIEVEMENT_MAP } from '@/data/achievements';
import { getCategory } from '@/data/categories';
import { COSMETIC_MAP } from '@/data/cosmetics';
import { RARITY_LABEL, RARITY_VAR } from '@/data/difficulty';
import { effectColors, prefersReducedMotion } from '@/lib/celebrate';
import { formatDay, toDateKey } from '@/lib/date';
import { formatMinutes, formatNumber } from '@/lib/format';
import { createRng } from '@/lib/random';
import { useGameStore, useGame } from '@/store/gameStore';
import { useUI, type Celebration } from '@/store/uiStore';
import { CosmeticPreview } from '@/components/game/Cosmetic';
import { CoinIcon, LevelBadge, StreakFlame } from '@/components/game/Hud';
import { Button } from '@/components/ui/Button';
import { NumberTicker } from '@/components/ui/Display';
import { Icon } from '@/components/ui/Icon';
import { useFocusTrap } from '@/components/ui/Overlay';
import { rankFor } from '@/components/game/rank';

const LEVEL_LINES = [
  'Your progress is becoming visible.',
  'Small steps. Real gains.',
  'Consistency compounds.',
  'You’re not who you were yesterday.',
  'Another level of you.',
  'Keep going — it shows.',
  'The work is working.',
];

function Backdrop({ tone }: { tone: string }) {
  const reduced = prefersReducedMotion();
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-[#04050a]/88 backdrop-blur-md" />
      <div className="absolute top-1/2 left-1/2 size-[140vmax] -translate-x-1/2 -translate-y-1/2 opacity-60" style={{ background: `radial-gradient(circle, color-mix(in oklab, ${tone} 34%, transparent) 0%, transparent 42%)` }} />
      {!reduced && (
        <div
          className="animate-spin-slow absolute top-1/2 left-1/2 size-[130vmax] -translate-x-1/2 -translate-y-1/2 opacity-[0.22]"
          style={{ background: `repeating-conic-gradient(from 0deg, ${tone} 0deg 4deg, transparent 4deg 18deg)`, maskImage: 'radial-gradient(circle, black 0%, transparent 55%)', WebkitMaskImage: 'radial-gradient(circle, black 0%, transparent 55%)', animationDuration: '40s' }}
        />
      )}
    </div>
  );
}

function Shell({ children, tone, label, onClose }: { children: React.ReactNode; tone: string; label: string; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, true);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <m.div className="fixed inset-0 z-[80] grid place-items-center p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.25 } }}>
      <Backdrop tone={tone} />
      <div ref={ref} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1} className="relative w-full max-w-sm text-center outline-none">
        {children}
      </div>
    </m.div>
  );
}

function Divider({ tone }: { tone: string }) {
  return (
    <m.div className="mx-auto my-5 h-px w-full max-w-[16rem]" style={{ background: `linear-gradient(90deg, transparent, ${tone}, transparent)` }} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.7, delay: 0.25 }} aria-hidden />
  );
}

function Reward({ icon, children, delay }: { icon: React.ReactNode; children: React.ReactNode; delay: number }) {
  return (
    <m.li className="flex items-center justify-center gap-2 font-display text-sm font-semibold tracking-[0.14em] text-fg uppercase" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
      {icon}
      {children}
    </m.li>
  );
}

function LevelUp({ c, onClose }: { c: Extract<Celebration, { type: 'levelUp' }>; onClose: () => void }) {
  const burst = useUI((s) => s.burst);
  const state = useGameStore((s) => s.state);
  const line = useMemo(() => LEVEL_LINES[Math.floor(createRng(`lvl${c.to}`)() * LEVEL_LINES.length)], [c.to]);
  useEffect(() => {
    if (prefersReducedMotion() || !state.settings.intenseEffects) return;
    const t = setTimeout(() => burst({ x: window.innerWidth / 2, y: window.innerHeight * 0.36, style: 'fx:sparks', colors: effectColors(state), power: 1.8 }), 380);
    return () => clearTimeout(t);
  }, []);
  return (
    <Shell tone="var(--accent)" label={`Level up! You reached level ${c.to}`} onClose={onClose}>
      <m.p className="hud-label !text-[12px] !tracking-[0.5em] !text-accent-ink" initial={{ opacity: 0, letterSpacing: '1em' }} animate={{ opacity: 1, letterSpacing: '0.5em' }} transition={{ duration: 0.6 }}>
        Level up
      </m.p>
      <m.div className="mx-auto mt-6 w-fit" initial={{ scale: 0.4, opacity: 0, rotate: -12 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 220, damping: 14, delay: 0.15 }}>
        <div className="relative">
          <span className="absolute inset-[-18%] animate-pulse-ring rounded-full border-2 border-accent" aria-hidden />
          <LevelBadge level={c.to} size={124} />
        </div>
      </m.div>
      <h2 className="mt-6 font-display text-4xl font-bold tracking-[0.06em] text-fg">
        LEVEL <NumberTicker value={c.to} />
      </h2>
      <Divider tone="var(--accent)" />
      <m.p className="text-[15px] text-muted" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
        {line}
      </m.p>
      <ul className="mt-6 space-y-2.5">
        <Reward icon={<Icon name="chevrons-up" size={17} className="text-accent-ink" />} delay={0.65}>
          +{c.to - c.from} level{c.to - c.from > 1 ? 's' : ''}
        </Reward>
        {c.coins > 0 && (
          <Reward icon={<CoinIcon size={17} />} delay={0.78}>
            +{formatNumber(c.coins)} coins
          </Reward>
        )}
        {c.unlocks.length > 0 && (
          <Reward icon={<Icon name="lock-open" size={17} className="text-legendary" />} delay={0.9}>
            New reward{c.unlocks.length > 1 ? 's' : ''} unlocked
          </Reward>
        )}
      </ul>
      {c.unlocks.length > 0 && (
        <m.div className="mt-4 flex flex-wrap justify-center gap-3" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.05 }}>
          {c.unlocks.slice(0, 4).map((id) => (
            <div key={id} className="w-20 rounded-2xl border border-line bg-surface/80 p-2">
              <div className="grid h-14 place-items-center">
                <CosmeticPreview itemId={id} size={48} />
              </div>
              <p className="mt-1 truncate text-[11px] text-muted">{COSMETIC_MAP[id]?.name}</p>
            </div>
          ))}
        </m.div>
      )}
      <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }}>
        <Button variant="primary" cta size="lg" block className="mt-8" onClick={onClose} data-autofocus>
          Continue
        </Button>
      </m.div>
    </Shell>
  );
}

function AchievementBig({ c, onClose }: { c: Extract<Celebration, { type: 'achievement' }>; onClose: () => void }) {
  const def = ACHIEVEMENT_MAP[c.achievementId];
  if (!def) return null;
  const tone = RARITY_VAR[def.rarity];
  return (
    <Shell tone={tone} label={`Achievement unlocked: ${def.name}`} onClose={onClose}>
      <p className="hud-label !tracking-[0.4em]" style={{ color: tone }}>
        {RARITY_LABEL[def.rarity]} achievement
      </p>
      <m.div className="relative mx-auto mt-7 grid size-28 place-items-center" initial={{ scale: 0.3, rotate: 90, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 14 }}>
        <svg viewBox="0 0 40 44" className="absolute inset-0 h-full w-full" style={{ color: tone, filter: `drop-shadow(0 0 22px ${tone})` }} aria-hidden>
          <path d="M20 1.5 37.3 11.5v21L20 42.5 2.7 32.5v-21z" fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeWidth="1.6" />
        </svg>
        <Icon name={def.icon} size={44} style={{ color: tone }} className="relative" />
      </m.div>
      <h2 className="mt-6 font-display text-3xl font-bold tracking-[0.04em] text-fg uppercase">{def.name}</h2>
      <p className="mt-2 text-muted">{def.description}</p>
      <Divider tone={tone} />
      <ul className="space-y-2.5">
        {def.xpReward > 0 && <Reward icon={<Icon name="sparkles" size={17} className="text-accent-ink" />} delay={0.4}>+{formatNumber(def.xpReward)} XP</Reward>}
        {def.coinReward > 0 && <Reward icon={<CoinIcon size={17} />} delay={0.5}>+{formatNumber(def.coinReward)} coins</Reward>}
      </ul>
      <Button variant="primary" cta size="lg" block className="mt-8" onClick={onClose} data-autofocus>
        Continue
      </Button>
    </Shell>
  );
}

const LOOT_ICON: Record<string, string> = { boss: 'swords', bounty: 'target', event: 'calendar-heart', goal: 'goal', challenge: 'handshake' };

function Loot({ c, onClose }: { c: Extract<Celebration, { type: 'loot' }>; onClose: () => void }) {
  const tone = c.tone === 'boss' ? 'var(--danger)' : c.tone === 'challenge' ? 'var(--coin)' : c.tone === 'event' ? 'var(--rarity-epic)' : 'var(--accent)';
  return (
    <Shell tone={tone} label={`${c.title}: ${c.subtitle}`} onClose={onClose}>
      <m.div className="relative mx-auto grid size-24 place-items-center" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 13 }}>
        <span className="absolute inset-0 animate-pulse-ring rounded-full border" style={{ borderColor: tone }} aria-hidden />
        <span className="absolute inset-2 rounded-full" style={{ background: `radial-gradient(circle, color-mix(in oklab, ${tone} 35%, transparent), transparent 70%)` }} aria-hidden />
        <Icon name={LOOT_ICON[c.tone] ?? 'gift'} size={42} style={{ color: tone }} className="relative" />
      </m.div>
      <h2 className="mt-6 font-display text-3xl font-bold tracking-[0.06em] text-fg uppercase">{c.title}</h2>
      <p className="mt-2 text-muted">{c.subtitle}</p>
      <Divider tone={tone} />
      <ul className="space-y-2.5">
        {c.xp > 0 && <Reward icon={<Icon name="sparkles" size={17} className="text-accent-ink" />} delay={0.35}>+{formatNumber(c.xp)} XP</Reward>}
        {c.coins > 0 && <Reward icon={<CoinIcon size={17} />} delay={0.45}>+{formatNumber(c.coins)} coins</Reward>}
      </ul>
      {c.items.length > 0 && (
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          {c.items.map((id) => (
            <div key={id} className="w-20 rounded-2xl border border-line bg-surface/80 p-2">
              <div className="grid h-14 place-items-center">
                <CosmeticPreview itemId={id} size={48} />
              </div>
              <p className="mt-1 truncate text-[11px] text-muted">{COSMETIC_MAP[id]?.name}</p>
            </div>
          ))}
        </div>
      )}
      <Button variant="primary" cta size="lg" block className="mt-8" onClick={onClose} data-autofocus>
        Collect
      </Button>
    </Shell>
  );
}

export function DailySummary({ dateKey, heading, onClose }: { dateKey: string; heading: string; onClose: () => void }) {
  const transactions = useGame((s) => s.transactions);
  const activities = useGame((s) => s.activities);
  const achievements = useGame((s) => s.achievements);
  const goal = useGame((s) => s.profile?.dailyGoal ?? 400);
  const streak = useGame((s) => s.profile?.currentStreak ?? 0);
  const journalOn = useGame((s) => s.settings.journal);
  const openSheet = useUI((s) => s.openSheet);

  const data = useMemo(() => {
    const xp = transactions.filter((t) => t.currency === 'xp' && t.dateKey === dateKey).reduce((n, t) => n + t.amount, 0);
    const quests = transactions.filter((t) => t.currency === 'xp' && t.source === 'quest' && t.dateKey === dateKey).length;
    const byCat = new Map<string, number>();
    for (const a of activities) if (a.dateKey === dateKey) byCat.set(a.category, (byCat.get(a.category) ?? 0) + a.duration);
    const unlocked = achievements.filter((a) => toDateKey(a.unlockedAt) === dateKey).length;
    const goalMet = transactions.some((t) => t.source === 'daily_goal' && t.dateKey === dateKey);
    return { xp, quests, categories: [...byCat.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4), unlocked, goalMet };
  }, [transactions, activities, achievements, dateKey]);
  const rank = rankFor(data.xp, goal);

  return (
    <Shell tone="var(--accent)" label={`${heading} summary`} onClose={onClose}>
      <p className="hud-label !tracking-[0.4em] !text-accent-ink">{heading}</p>
      <p className="mt-1 text-sm text-muted">{formatDay(dateKey, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
      <div className="mt-6 font-display text-6xl font-bold text-fg">
        +<NumberTicker value={data.xp} />
        <span className="ml-2 text-2xl text-muted">XP</span>
      </div>
      <p className="mt-2 font-display text-sm font-semibold tracking-[0.2em] uppercase" style={{ color: rank.color }}>
        {rank.label}
      </p>
      <Divider tone="var(--accent)" />
      <dl className="grid grid-cols-2 gap-3 text-left">
        <div className="rounded-2xl border border-line bg-surface/70 p-3.5">
          <dt className="hud-label">Quests</dt>
          <dd className="mt-1 font-display text-2xl font-bold text-fg">{data.quests}</dd>
        </div>
        <div className="rounded-2xl border border-line bg-surface/70 p-3.5">
          <dt className="hud-label">Streak</dt>
          <dd className="mt-1">
            <StreakFlame streak={streak} size="lg" />
          </dd>
        </div>
        {data.categories.map(([cat, minutes]) => (
          <div key={cat} className="rounded-2xl border border-line bg-surface/70 p-3.5">
            <dt className="hud-label">{getCategory(cat).name}</dt>
            <dd className="mt-1 font-display text-xl font-bold text-fg">{formatMinutes(minutes)}</dd>
          </div>
        ))}
        <div className="rounded-2xl border border-line bg-surface/70 p-3.5">
          <dt className="hud-label">Achievements</dt>
          <dd className="mt-1 font-display text-2xl font-bold text-fg">{data.unlocked}</dd>
        </div>
        <div className="rounded-2xl border border-line bg-surface/70 p-3.5">
          <dt className="hud-label">Daily goal</dt>
          <dd className="mt-1 flex items-center gap-1.5 font-display text-base font-bold text-fg">
            <Icon name={data.goalMet ? 'badge-check' : 'target'} size={18} className={data.goalMet ? 'text-success' : 'text-muted'} />
            {data.goalMet ? 'Reached' : `${Math.round((data.xp / goal) * 100)}%`}
          </dd>
        </div>
      </dl>
      <div className="mt-7 flex gap-3">
        {journalOn && (
          <Button
            variant="secondary"
            block
            icon="notebook-pen"
            onClick={() => {
              onClose();
              openSheet({ type: 'journal', dateKey });
            }}
          >
            Journal
          </Button>
        )}
        <Button variant="primary" cta block onClick={onClose} data-autofocus>
          Continue
        </Button>
      </div>
    </Shell>
  );
}

export function CelebrationHost() {
  const current = useUI((s) => s.celebrations[0]);
  const finish = useUI((s) => s.finishCelebration);
  return (
    <AnimatePresence mode="wait">
      {current?.type === 'levelUp' && <LevelUp key={current.id} c={current} onClose={finish} />}
      {current?.type === 'achievement' && <AchievementBig key={current.id} c={current} onClose={finish} />}
      {current?.type === 'loot' && <Loot key={current.id} c={current} onClose={finish} />}
      {current?.type === 'summary' && <DailySummary key={current.id} dateKey={current.dateKey} heading={current.heading} onClose={finish} />}
    </AnimatePresence>
  );
}
