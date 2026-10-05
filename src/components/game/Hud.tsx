import { AnimatePresence, m, useAnimationControls } from 'framer-motion';
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import { registerFxTarget, useUI } from '@/store/uiStore';
import { NumberTicker } from '@/components/ui/Display';
import { Icon } from '@/components/ui/Icon';

/* ───────────── Level badge: a hex crest with the level number ───────────── */

export function LevelBadge({ level, size = 40, className }: { level: number; size?: number; className?: string }) {
  const gid = `lvl${useId().replace(/:/g, '')}`;
  const digits = String(level).length;
  const fontSize = size * (digits >= 3 ? 0.3 : digits === 2 ? 0.38 : 0.44);
  return (
    <div className={cn('relative grid shrink-0 place-items-center', className)} style={{ width: size, height: size * 1.1 }} aria-label={`Level ${level}`} role="img">
      <svg viewBox="0 0 40 44" className="absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--accent-2)" />
            <stop offset="1" stopColor="var(--accent)" />
          </linearGradient>
        </defs>
        <path d="M20 1.5 37.3 11.5v21L20 42.5 2.7 32.5v-21z" fill="var(--surface-2)" stroke={`url(#${gid})`} strokeWidth="2" strokeLinejoin="round" />
        <path d="M20 6 33.4 13.8v16.4L20 38 6.6 30.2V13.8z" fill={`url(#${gid})`} fillOpacity="0.12" />
      </svg>
      <span className="relative font-display leading-none font-bold text-fg num" style={{ fontSize }}>
        {level}
      </span>
    </div>
  );
}

/* ───────────── XP bar: segmented, glowing, animates gains and level-ups ───────────── */

export function XPBar({ percent, level, className, height = 10, registerTarget = false, showTicks = true }: { percent: number; level: number; className?: string; height?: number; registerTarget?: boolean; showTicks?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const pulse = useUI((s) => s.hudPulse);
  const controls = useAnimationControls();
  const flash = useAnimationControls();
  const prevLevel = useRef(level);
  const mounted = useRef(false);

  useLayoutEffect(() => {
    if (!registerTarget || !ref.current) return;
    return registerFxTarget('xp', ref.current);
  }, [registerTarget]);

  useEffect(() => {
    const target = `${Math.max(0, Math.min(1, percent)) * 100}%`;
    if (!mounted.current) {
      mounted.current = true;
      controls.set({ width: target });
      return;
    }
    if (level > prevLevel.current) {
      // Fill to the brim, flash, then continue into the new level.
      void (async () => {
        await controls.start({ width: '100%', transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } });
        void flash.start({ opacity: [0, 0.9, 0], transition: { duration: 0.6 } });
        controls.set({ width: '0%' });
        await controls.start({ width: target, transition: { type: 'spring', stiffness: 90, damping: 20 } });
      })();
    } else {
      void controls.start({ width: target, transition: { type: 'spring', stiffness: 90, damping: 20, delay: 0.25 } });
    }
    prevLevel.current = level;
  }, [percent, level, controls, flash]);

  useEffect(() => {
    if (pulse) void flash.start({ opacity: [0, 0.55, 0], transition: { duration: 0.7, delay: 0.35 } });
  }, [pulse, flash]);

  return (
    <div
      ref={ref}
      className={cn('relative w-full overflow-hidden rounded-full bg-surface-4 shadow-[inset_0_1px_2px_rgb(0_0_0/0.35)]', className)}
      style={{ height }}
      role="progressbar"
      aria-label="Experience toward next level"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(percent * 100)}
    >
      <m.div className="xp-fill absolute inset-y-0 left-0 rounded-full" initial={false} animate={controls} />
      {showTicks && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent 0, transparent calc(10% - 1.5px), color-mix(in oklab, var(--bg) 70%, transparent) calc(10% - 1.5px), color-mix(in oklab, var(--bg) 70%, transparent) 10%)' }}
          aria-hidden
        />
      )}
      <m.div className="pointer-events-none absolute inset-0 rounded-full bg-white" initial={{ opacity: 0 }} animate={flash} aria-hidden />
    </div>
  );
}

/* ───────────── Coins ───────────── */

export function CoinIcon({ size = 18, className }: { size?: number; className?: string }) {
  const gid = `coin${useId().replace(/:/g, '')}`;
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffe9a8" />
          <stop offset="0.5" stopColor="#f5c451" />
          <stop offset="1" stopColor="#c48a12" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="10" fill={`url(#${gid})`} />
      <circle cx="12" cy="12" r="7.2" fill="none" stroke="#a8740c" strokeOpacity="0.55" strokeWidth="1.2" />
      <path d="M12 7.6 15.6 12 12 16.4 8.4 12z" fill="#a8740c" fillOpacity="0.75" />
    </svg>
  );
}

export function CoinBadge({ coins, className, registerTarget = false, size = 'md' }: { coins: number; className?: string; registerTarget?: boolean; size?: 'sm' | 'md' }) {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    if (!registerTarget || !ref.current) return;
    return registerFxTarget('coins', ref.current);
  }, [registerTarget]);
  return (
    <span ref={ref} className={cn('inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2 font-display font-semibold text-fg', size === 'sm' ? 'h-7 px-2 text-xs' : 'h-9 px-3 text-sm', className)} aria-label={`${formatNumber(coins)} coins`}>
      <CoinIcon size={size === 'sm' ? 14 : 17} />
      <NumberTicker value={coins} />
    </span>
  );
}

/* ───────────── Streak flame ───────────── */

export function streakColor(streak: number): string {
  if (streak <= 0) return 'var(--faint)';
  if (streak >= 100) return '#c084fc';
  if (streak >= 30) return '#60a5fa';
  if (streak >= 7) return '#fb7185';
  return '#fb923c';
}

export function StreakFlame({ streak, size = 'md', className, registerTarget = false }: { streak: number; size?: 'sm' | 'md' | 'lg'; className?: string; registerTarget?: boolean }) {
  const bump = useUI((s) => s.streakBump);
  const ref = useRef<HTMLSpanElement>(null);
  const [key, setKey] = useState(0);
  useEffect(() => {
    if (bump) setKey((k) => k + 1);
  }, [bump]);
  useLayoutEffect(() => {
    if (!registerTarget || !ref.current) return;
    return registerFxTarget('streak', ref.current);
  }, [registerTarget]);
  const color = streakColor(streak);
  const iconSize = size === 'lg' ? 26 : size === 'sm' ? 15 : 19;
  return (
    <span ref={ref} className={cn('inline-flex items-center gap-1 font-display font-bold num', size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-xs' : 'text-sm', className)} aria-label={`${streak}-day streak`}>
      <m.span key={key} initial={key ? { scale: 1.6, rotate: -12 } : false} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 400, damping: 12 }} className="inline-flex">
        <Icon name="flame" size={iconSize} style={{ color, filter: streak >= 7 ? `drop-shadow(0 0 6px ${color})` : undefined }} fill={streak > 0 ? color : 'none'} fillOpacity={0.25} />
      </m.span>
      <AnimatePresence mode="popLayout" initial={false}>
        <m.span key={streak} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }} transition={{ duration: 0.25 }}>
          {streak}
        </m.span>
      </AnimatePresence>
    </span>
  );
}
