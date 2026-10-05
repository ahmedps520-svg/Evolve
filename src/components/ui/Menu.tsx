import { AnimatePresence, m } from 'framer-motion';
import { useEffect, useId, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { Icon } from './Icon';

export interface MenuItem {
  label: string;
  icon: string;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
  hint?: string;
}

/** A small accessible popover menu (⋯). */
export function Menu({ items, label = 'More options', className }: { items: MenuItem[]; label?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
        button.current?.focus();
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const nodes = Array.from(root.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not([disabled])') ?? []);
        const i = nodes.indexOf(document.activeElement as HTMLButtonElement);
        const next = nodes[(i + (e.key === 'ArrowDown' ? 1 : nodes.length - 1)) % nodes.length];
        next?.focus();
      }
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey, true);
    requestAnimationFrame(() => root.current?.querySelector<HTMLButtonElement>('[role="menuitem"]:not([disabled])')?.focus());
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open]);

  if (!items.length) return null;
  return (
    <div ref={root} className={cn('relative', className)}>
      <button
        ref={button}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((o) => !o)}
        className="grid size-9 place-items-center rounded-[10px] text-muted transition hover:bg-surface-3 hover:text-fg active:scale-95"
      >
        <Icon name="ellipsis-vertical" size={18} />
      </button>
      <AnimatePresence>
        {open && (
          <m.div
            id={menuId}
            role="menu"
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.14 }}
            className="absolute top-full right-0 z-30 mt-1 min-w-48 origin-top-right rounded-2xl border border-line-strong bg-surface-2 p-1.5 shadow-[0_18px_40px_-12px_rgb(0_0_0/0.6)]"
          >
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition outline-none hover:bg-surface-4 focus-visible:bg-surface-4 disabled:opacity-40',
                  item.danger ? 'text-danger' : 'text-fg',
                )}
              >
                <Icon name={item.icon} size={16} className={item.danger ? '' : 'text-muted'} />
                <span className="flex-1">{item.label}</span>
                {item.hint && <span className="text-xs text-faint">{item.hint}</span>}
              </button>
            ))}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
