import { AnimatePresence, m, type PanInfo } from 'framer-motion';
import { memo, useEffect, useState } from 'react';
import { RARITY_LABEL, RARITY_VAR } from '@/data/difficulty';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import { useUI, type Toast } from '@/store/uiStore';
import { CoinIcon } from '@/components/game/Hud';
import { Icon } from '@/components/ui/Icon';

const KIND_ICON: Record<Toast['kind'], string> = {
  quest: 'check',
  achievement: 'award',
  info: 'info',
  success: 'sparkles',
  error: 'triangle-alert',
  streak: 'flame',
  unlock: 'lock-open',
  level: 'chevrons-up',
  rest: 'battery-charging',
  challenge: 'swords',
};

function toneFor(t: Toast): string {
  if (t.rarity) return RARITY_VAR[t.rarity];
  switch (t.kind) {
    case 'error':
      return 'var(--danger)';
    case 'quest':
    case 'success':
    case 'level':
      return 'var(--accent)';
    case 'streak':
      return '#fb923c';
    case 'rest':
      return 'var(--success)';
    case 'challenge':
      return 'var(--coin)';
    default:
      return 'var(--muted)';
  }
}

const ToastView = memo(function ToastView({ t }: { t: Toast }) {
  const dismiss = useUI((s) => s.dismissToast);
  const [paused, setPaused] = useState(false);
  const duration = t.duration ?? (t.action ? 6500 : t.kind === 'error' ? 5000 : 3800);

  useEffect(() => {
    if (paused) return;
    const id = setTimeout(() => dismiss(t.id), duration);
    return () => clearTimeout(id);
  }, [paused, duration, dismiss, t.id]);

  const tone = toneFor(t);
  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (Math.abs(info.offset.x) > 80 || info.offset.y < -40) dismiss(t.id);
  };

  return (
    <m.div
      layout
      initial={{ opacity: 0, y: -18, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.16 } }}
      transition={{ type: 'spring', stiffness: 460, damping: 34 }}
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.6}
      onDragEnd={onDragEnd}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      role={t.kind === 'error' ? 'alert' : 'status'}
      className="pointer-events-auto relative w-full overflow-hidden rounded-2xl border bg-surface-2/95 shadow-[0_18px_44px_-14px_rgb(0_0_0/0.7)] backdrop-blur-xl"
      style={{ borderColor: `color-mix(in oklab, ${tone} 38%, var(--line))` }}
    >
      <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: tone, boxShadow: `0 0 16px ${tone}` }} aria-hidden />
      <div className="flex items-center gap-3 py-3 pr-2 pl-4">
        <span
          className={cn('grid size-10 shrink-0 place-items-center rounded-xl', t.rarity === 'mythic' && 'mythic-sheen')}
          style={{ color: tone, background: `color-mix(in oklab, ${tone} 15%, transparent)` }}
          aria-hidden
        >
          <Icon name={t.icon ?? KIND_ICON[t.kind]} size={20} className={t.rarity === 'mythic' ? 'text-white' : ''} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="hud-label !text-[10.5px]" style={{ color: t.kind === 'error' ? tone : undefined }}>
            {t.title}
            {t.rarity && <span className="ml-1.5 text-faint">· {RARITY_LABEL[t.rarity]}</span>}
          </p>
          {t.message && <p className={cn('mt-0.5 text-sm font-medium text-fg', t.kind === 'error' ? 'line-clamp-3' : 'line-clamp-2')}>{t.message}</p>}
          {t.action && (
            <button
              type="button"
              onClick={() => {
                t.action!.run();
                dismiss(t.id);
              }}
              className="-ml-2 mt-1 h-8 rounded-lg px-2 font-display text-[11px] font-semibold tracking-[0.12em] text-accent-ink uppercase transition hover:bg-surface-4"
            >
              {t.action.label}
            </button>
          )}
        </div>
        {(!!t.xp || !!t.coins) && (
          <div className="flex shrink-0 flex-col items-end gap-0.5 pr-1">
            {!!t.xp && <span className="font-display text-lg leading-none font-bold text-accent-ink num">+{formatNumber(t.xp)} XP</span>}
            {!!t.coins && (
              <span className="flex items-center gap-1 font-display text-xs font-semibold text-coin">
                <CoinIcon size={12} />+{formatNumber(t.coins)}
              </span>
            )}
          </div>
        )}
        <button type="button" onClick={() => dismiss(t.id)} aria-label="Dismiss notification" className="grid size-8 shrink-0 place-items-center rounded-lg text-faint transition hover:bg-surface-4 hover:text-fg">
          <Icon name="x" size={15} />
        </button>
      </div>
    </m.div>
  );
});

export function Toaster() {
  const toasts = useUI((s) => s.toasts);
  // Hold toasts while a celebration is on screen; they appear (with fresh timers) once it closes.
  const holding = useUI((s) => s.celebrations.length > 0);
  return (
    <div aria-live="polite" aria-atomic="false" className="pointer-events-none fixed inset-x-0 top-0 z-[95] flex justify-center px-3 pt-[calc(var(--safe-top)+0.75rem)] lg:justify-end lg:px-6 lg:pt-6">
      <div className="flex w-full max-w-md flex-col gap-2">
        <AnimatePresence initial={false}>
          {!holding && toasts.map((t) => <ToastView key={t.id} t={t} />)}
        </AnimatePresence>
      </div>
    </div>
  );
}
