import { forwardRef, useId, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { Icon } from './Icon';

const CONTROL =
  'w-full rounded-xl border border-line bg-surface-2 px-3.5 text-fg placeholder:text-faint transition-[border-color,box-shadow] outline-none focus:border-accent focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--accent)_22%,transparent)] disabled:opacity-50';

export function Field({ label, hint, error, children, htmlFor, className, optional }: { label: string; hint?: ReactNode; error?: string | null; children: ReactNode; htmlFor?: string; className?: string; optional?: boolean }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={htmlFor} className="flex items-baseline justify-between gap-2 text-[13px] font-medium text-fg">
        <span>{label}</span>
        {optional && <span className="text-xs font-normal text-faint">Optional</span>}
      </label>
      {children}
      {error ? (
        <p className="flex items-center gap-1.5 text-xs text-danger" role="alert">
          <Icon name="triangle-alert" size={13} /> {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={cn(CONTROL, 'h-12 text-base', className)} {...rest} />;
});

export const TextArea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function TextArea({ className, ...rest }, ref) {
  return <textarea ref={ref} className={cn(CONTROL, 'min-h-24 resize-y py-3 text-base leading-relaxed', className)} {...rest} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, children, ...rest }, ref) {
  return (
    <div className="relative">
      <select ref={ref} className={cn(CONTROL, 'h-12 appearance-none pr-10 text-base', className)} {...rest}>
        {children}
      </select>
      <Icon name="chevron-down" size={16} className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-muted" />
    </div>
  );
});

export function Toggle({ checked, onChange, label, description, disabled, id }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: ReactNode; disabled?: boolean; id?: string }) {
  const autoId = useId();
  const tid = id ?? autoId;
  return (
    <div className={cn('flex items-center justify-between gap-4 py-2.5', disabled && 'opacity-50')}>
      <div className="min-w-0">
        <label htmlFor={tid} className="block text-[15px] font-medium text-fg">
          {label}
        </label>
        {description && <p className="mt-0.5 text-[13px] leading-snug text-muted">{description}</p>}
      </div>
      <button
        id={tid}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-[30px] w-[50px] shrink-0 rounded-full border transition-colors duration-200',
          checked ? 'border-transparent bg-accent' : 'border-line-strong bg-surface-4',
        )}
      >
        <span
          className={cn(
            'absolute top-1/2 left-[3px] size-[22px] -translate-y-1/2 rounded-full bg-white shadow-[0_2px_6px_rgb(0_0_0/0.3)] transition-transform duration-200 [transition-timing-function:var(--ease-spring)]',
            checked && 'translate-x-[20px]',
          )}
        />
        <span className="sr-only">{checked ? 'On' : 'Off'}</span>
      </button>
    </div>
  );
}

export interface SegmentOption<T extends string> {
  value: T;
  label: ReactNode;
  icon?: string;
}

export function Segmented<T extends string>({ value, onChange, options, label, size = 'md', className }: { value: T; onChange: (v: T) => void; options: SegmentOption<T>[]; label: string; size?: 'sm' | 'md'; className?: string }) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('flex w-full gap-1 rounded-xl border border-line bg-surface-2 p-1', className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-[9px] font-medium transition-[background-color,color,box-shadow] duration-150',
              size === 'sm' ? 'h-8 px-2 text-xs' : 'h-10 px-3 text-sm',
              active ? 'bg-surface-4 text-fg shadow-[0_1px_0_rgb(255_255_255/0.06)_inset,0_4px_12px_-6px_rgb(0_0_0/0.5)]' : 'text-muted hover:text-fg',
            )}
          >
            {o.icon && <Icon name={o.icon} size={15} />}
            <span className="truncate">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function Slider({ value, onChange, min, max, step = 1, label, format, id }: { value: number; onChange: (v: number) => void; min: number; max: number; step?: number; label: string; format?: (v: number) => string; id?: string }) {
  const autoId = useId();
  const sid = id ?? autoId;
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <label htmlFor={sid} className="text-[13px] font-medium text-fg">
          {label}
        </label>
        <span className="num font-display text-sm font-semibold text-fg">{format ? format(value) : value}</span>
      </div>
      <input
        id={sid}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="evolve-range h-2 w-full cursor-pointer appearance-none rounded-full bg-surface-4"
        style={{ background: `linear-gradient(90deg, var(--accent) ${pct}%, var(--surface-4) ${pct}%)` }}
        aria-valuetext={format ? format(value) : String(value)}
      />
    </div>
  );
}

export function Stepper({ value, onChange, min, max, step = 1, label, suffix, id }: { value: number; onChange: (v: number) => void; min: number; max: number; step?: number; label: string; suffix?: string; id?: string }) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  // While typing, keep the raw text so "700" isn't clamped to the minimum at "7".
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft === null) return;
    const n = Number(draft);
    if (draft.trim() !== '' && Number.isFinite(n)) onChange(clamp(n));
    setDraft(null);
  };
  return (
    <div className="flex h-12 items-center rounded-xl border border-line bg-surface-2">
      <button type="button" aria-label={`Decrease ${label}`} className="flex h-full w-12 items-center justify-center text-muted transition hover:text-fg active:scale-90" onClick={() => onChange(clamp(value - step))}>
        <span aria-hidden className="text-xl leading-none">−</span>
      </button>
      <div className="flex flex-1 items-baseline justify-center gap-1">
        <input
          id={id}
          type="number"
          inputMode="numeric"
          aria-label={label}
          value={draft ?? (Number.isFinite(value) ? value : '')}
          min={min}
          max={max}
          onChange={(e) => {
            const text = e.target.value;
            setDraft(text);
            const n = Number(text);
            if (text.trim() !== '' && Number.isFinite(n) && n >= min && n <= max) onChange(n);
          }}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commit();
            }
          }}
          className="num w-16 bg-transparent text-center font-display text-lg font-semibold text-fg outline-none"
        />
        {suffix && <span className="text-sm text-muted">{suffix}</span>}
      </div>
      <button type="button" aria-label={`Increase ${label}`} className="flex h-full w-12 items-center justify-center text-muted transition hover:text-fg active:scale-90" onClick={() => onChange(clamp(value + step))}>
        <span aria-hidden className="text-xl leading-none">+</span>
      </button>
    </div>
  );
}

export function Chip({ selected, onClick, children, icon, color, className, disabled }: { selected?: boolean; onClick?: () => void; children: ReactNode; icon?: string; color?: string; className?: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex h-10 items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.96] disabled:opacity-40',
        selected ? 'border-accent bg-accent/14 text-fg' : 'border-line bg-surface-2 text-muted hover:border-line-strong hover:text-fg',
        className,
      )}
    >
      {icon && <Icon name={icon} size={16} style={color ? { color } : undefined} />}
      {children}
      {selected && <Icon name="check" size={14} className="text-accent-ink" />}
    </button>
  );
}
