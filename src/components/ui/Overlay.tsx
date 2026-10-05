import { AnimatePresence, m, useDragControls, type PanInfo } from 'framer-motion';
import { useEffect, useId, useRef, useState, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/cn';
import { easeOut } from '@/lib/motion';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { Button, IconButton } from './Button';
import { Input } from './Field';

/* ───────────── Overlay stack: Escape closes only the top-most layer; scroll is locked while open ───────────── */

const stack: symbol[] = [];

export function useOverlayLayer(open: boolean, onClose: () => void) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const token = Symbol('overlay');
    stack.push(token);
    const root = document.documentElement;
    const prevOverflow = root.style.overflow;
    root.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && stack[stack.length - 1] === token) {
        e.stopPropagation();
        closeRef.current();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      stack.splice(stack.indexOf(token), 1);
      if (!stack.length) root.style.overflow = prevOverflow;
    };
  }, [open]);
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useFocusTrap(ref: RefObject<HTMLElement | null>, active: boolean) {
  useEffect(() => {
    if (!active) return;
    const previous = document.activeElement as HTMLElement | null;
    const frame = requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      const target = el.querySelector<HTMLElement>('[data-autofocus]') ?? el;
      target.focus({ preventScroll: true });
    });
    const onKey = (e: KeyboardEvent) => {
      const el = ref.current;
      if (e.key !== 'Tab' || !el) return;
      const items = Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((n) => n.offsetParent !== null || n === document.activeElement);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === el)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKey);
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, [active, ref]);
}

/* ───────────── Sheet: bottom sheet on phones, centered dialog on larger screens ───────────── */

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'md' | 'lg';
  /** Hide the visual title (still announced to assistive tech). */
  bare?: boolean;
}

export function Sheet({ open, onClose, title, description, children, footer, size = 'md', bare }: SheetProps) {
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();
  const wide = useMediaQuery('(min-width: 640px)');
  const drag = useDragControls();
  useOverlayLayer(open, onClose);
  useFocusTrap(panel, open);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 110 || info.velocity.y > 650) onClose();
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6" role="presentation">
          <m.div
            className="absolute inset-0 bg-black/60 backdrop-blur-[3px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            aria-hidden
          />
          <m.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descId : undefined}
            tabIndex={-1}
            className={cn(
              'relative flex max-h-[min(92dvh,860px)] w-full flex-col overflow-hidden border border-line bg-surface shadow-[0_-20px_60px_-20px_rgb(0_0_0/0.6)] outline-none',
              'rounded-t-[28px] sm:rounded-[26px]',
              size === 'lg' ? 'sm:max-w-2xl' : 'sm:max-w-lg',
            )}
            initial={wide ? { opacity: 0, scale: 0.96, y: 12 } : { y: '100%' }}
            animate={wide ? { opacity: 1, scale: 1, y: 0 } : { y: 0 }}
            exit={wide ? { opacity: 0, scale: 0.97, y: 8 } : { y: '100%' }}
            transition={wide ? { duration: 0.22, ease: easeOut } : { type: 'spring', damping: 34, stiffness: 360 }}
            drag={wide ? false : 'y'}
            dragControls={drag}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={onDragEnd}
          >
            {!wide && (
              <div className="flex shrink-0 touch-none justify-center pt-2.5 pb-1" onPointerDown={(e) => drag.start(e)}>
                <span className="h-1.5 w-10 rounded-full bg-line-strong" aria-hidden />
              </div>
            )}
            <header className={cn('flex shrink-0 items-start gap-3 px-5 pb-3 sm:px-6 sm:pt-5', wide ? 'pt-5' : 'pt-1', bare && 'sr-only')}>
              <div className="min-w-0 flex-1">
                <h2 id={titleId} className="font-display text-lg font-semibold tracking-wide text-fg">
                  {title}
                </h2>
                {description && (
                  <p id={descId} className="mt-1 text-sm text-muted">
                    {description}
                  </p>
                )}
              </div>
              <IconButton icon="x" label="Close" size="sm" variant="ghost" onClick={onClose} className="-mr-1.5" />
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 sm:px-6">{children}</div>
            {footer && <div className="shrink-0 border-t border-line bg-surface px-5 pt-3 pb-[max(0.9rem,var(--safe-bottom))] sm:px-6">{footer}</div>}
          </m.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/* ───────────── Confirm dialog (with optional "type to confirm") ───────────── */

export interface ConfirmProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: ReactNode;
  confirmLabel: string;
  tone?: 'danger' | 'primary';
  /** Require typing this word before confirming (e.g. RESET). */
  typeToConfirm?: string;
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel, tone = 'primary', typeToConfirm }: ConfirmProps) {
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  useOverlayLayer(open, onClose);
  useFocusTrap(panel, open);
  useEffect(() => {
    if (!open) setTyped('');
  }, [open]);
  const ready = !typeToConfirm || typed.trim() === typeToConfirm;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-5" role="presentation">
          <m.div className="absolute inset-0 bg-black/65 backdrop-blur-[3px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} aria-hidden />
          <m.div
            ref={panel}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            className="relative w-full max-w-sm rounded-[24px] border border-line bg-surface p-6 shadow-2xl outline-none"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.18, ease: easeOut }}
          >
            <h2 id={titleId} className={cn('font-display text-lg font-semibold tracking-wide', tone === 'danger' ? 'text-danger' : 'text-fg')}>
              {title}
            </h2>
            <div className="mt-2 text-sm leading-relaxed text-muted">{message}</div>
            {typeToConfirm && (
              <div className="mt-4 space-y-1.5">
                <label htmlFor={`${titleId}-confirm`} className="text-[13px] text-fg">
                  Type <span className="font-display font-semibold tracking-widest">{typeToConfirm}</span> to confirm
                </label>
                <Input id={`${titleId}-confirm`} data-autofocus value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" autoCapitalize="characters" spellCheck={false} />
              </div>
            )}
            <div className="mt-6 flex gap-3">
              <Button variant="secondary" block onClick={onClose} data-autofocus={typeToConfirm ? undefined : true}>
                Cancel
              </Button>
              <Button
                variant={tone === 'danger' ? 'danger' : 'primary'}
                block
                disabled={!ready}
                loading={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await onConfirm();
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {confirmLabel}
              </Button>
            </div>
          </m.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
