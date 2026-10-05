import { animate, m, useMotionValue, useTransform } from 'framer-motion';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import { Button } from './Button';
import { Icon } from './Icon';

/* ───────────── Section card ───────────── */

export function Section({ title, action, children, className, id, description }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; id?: string; description?: ReactNode }) {
  return (
    <section className={cn('space-y-3', className)} aria-labelledby={title && id ? `${id}-title` : undefined}>
      {(title || action) && (
        <div className="flex min-h-8 items-end justify-between gap-3 px-1">
          <div className="min-w-0">
            {title && (
              <h2 id={id ? `${id}-title` : undefined} className="hud-label">
                {title}
              </h2>
            )}
            {description && <p className="mt-0.5 text-[13px] text-muted">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Card({ children, className, as: As = 'div', ...rest }: { children: ReactNode; className?: string; as?: 'div' | 'article' | 'section' | 'li' } & Record<string, unknown>) {
  return (
    <As className={cn('card', className)} {...rest}>
      {children}
    </As>
  );
}

/* ───────────── Progress ───────────── */

export function ProgressBar({ value, max = 1, className, color = 'var(--accent)', label, height = 6, animated = true }: { value: number; max?: number; className?: string; color?: string; label?: string; height?: number; animated?: boolean }) {
  const pct = Math.max(0, Math.min(1, max ? value / max : 0));
  return (
    <div
      className={cn('relative w-full overflow-hidden rounded-full bg-surface-4', className)}
      style={{ height }}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.round(value)}
    >
      <m.div
        className="absolute inset-y-0 left-0 rounded-full"
        style={{ background: color }}
        initial={animated ? { width: 0 } : false}
        animate={{ width: `${pct * 100}%` }}
        transition={{ type: 'spring', stiffness: 120, damping: 22 }}
      />
    </div>
  );
}

export function ProgressRing({ value, max = 1, size = 120, stroke = 10, color = 'var(--accent)', track = 'var(--surface-4)', children, label, glow = true }: { value: number; max?: number; size?: number; stroke?: number; color?: string; track?: string; children?: ReactNode; label?: string; glow?: boolean }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, max ? value / max : 0));
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.round(value)}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <m.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - pct) }}
          transition={{ type: 'spring', stiffness: 70, damping: 18 }}
          style={glow ? { filter: `drop-shadow(0 0 calc(6px * var(--glow-strength)) ${color})` } : undefined}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

/* ───────────── Animated number ───────────── */

export function NumberTicker({ value, className, format = formatNumber, duration = 0.9 }: { value: number; className?: string; format?: (n: number) => string; duration?: number }) {
  const mv = useMotionValue(value);
  const text = useTransform(mv, (v) => format(Math.round(v)));
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      mv.set(value);
      return;
    }
    const controls = animate(mv, value, { duration, ease: [0.16, 1, 0.3, 1] });
    return () => controls.stop();
  }, [value, mv, duration]);
  return <m.span className={cn('num', className)}>{text}</m.span>;
}

/* ───────────── Empty state ───────────── */

export function EmptyState({ icon, title, message, action, className }: { icon: string; title: string; message: ReactNode; action?: { label: string; onClick: () => void; icon?: string }; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center rounded-[20px] border border-dashed border-line-strong px-6 py-10 text-center', className)}>
      <div className="relative mb-4 grid size-14 place-items-center">
        <svg viewBox="0 0 56 56" className="absolute inset-0 text-line-strong" aria-hidden>
          <path d="M28 3 50 15.5v25L28 53 6 40.5v-25L28 3Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
        <Icon name={icon} size={22} className="text-muted" />
      </div>
      <h3 className="font-display text-base font-semibold tracking-wide text-fg">{title}</h3>
      <p className="mt-1.5 max-w-xs text-sm text-muted">{message}</p>
      {action && (
        <Button variant="primary" cta className="mt-5" icon={action.icon ?? 'plus'} onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}

/* ───────────── Tabs (pill style) ───────────── */

export interface TabItem<T extends string> {
  id: T;
  label: string;
  icon?: string;
  badge?: number;
}

export function Tabs<T extends string>({ items, value, onChange, label, className }: { items: TabItem<T>[]; value: T; onChange: (v: T) => void; label: string; className?: string }) {
  const listRef = useRef<HTMLDivElement>(null);
  const onKey = (e: React.KeyboardEvent) => {
    const i = items.findIndex((t) => t.id === value);
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const next = items[(i + (e.key === 'ArrowRight' ? 1 : items.length - 1)) % items.length];
      onChange(next.id);
      requestAnimationFrame(() => listRef.current?.querySelector<HTMLElement>(`[data-tab="${next.id}"]`)?.focus());
    }
  };
  return (
    <div ref={listRef} role="tablist" aria-label={label} onKeyDown={onKey} className={cn('no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4', className)}>
      {items.map((t) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            data-tab={t.id}
            role="tab"
            type="button"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(t.id)}
            className={cn(
              'relative flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors',
              active ? 'text-fg' : 'text-muted hover:text-fg',
            )}
          >
            {active && <m.span layoutId={`tab-${label}`} className="absolute inset-0 rounded-full border border-line-strong bg-surface-3" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
            {t.icon && <Icon name={t.icon} size={16} className="relative" />}
            <span className="relative">{t.label}</span>
            {!!t.badge && <span className="relative grid min-w-5 place-items-center rounded-full bg-accent px-1.5 text-[11px] font-bold text-accent-fg">{t.badge}</span>}
          </button>
        );
      })}
    </div>
  );
}

/* ───────────── Misc ───────────── */

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded border border-line-strong bg-surface-3 px-1.5 py-0.5 font-sans text-[11px] text-muted">{children}</kbd>;
}

export function useCopy(): [boolean, (text: string) => Promise<void>] {
  const [copied, setCopied] = useState(false);
  return [
    copied,
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      } catch {
        setCopied(false);
      }
    },
  ];
}
