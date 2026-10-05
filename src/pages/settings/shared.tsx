import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { updateSettings, type SettingsPatch } from '@/lib/engine/gameEngine';
import { dispatch } from '@/store/gameStore';
import { Icon } from '@/components/ui/Icon';

/** Apply a settings change without celebrations (curve changes can otherwise trigger level-ups). */
export function setSettings(patch: SettingsPatch) {
  return dispatch((s, now) => updateSettings(s, patch, now), { silent: true });
}

export function Panel({ id, title, icon, description, children, className }: { id: string; title: string; icon: string; description?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24 space-y-3">
      <div className="px-1">
        <h2 id={`${id}-title`} tabIndex={-1} className="flex items-center gap-2 font-display text-[13px] font-bold tracking-[0.2em] text-fg uppercase outline-none">
          <Icon name={icon} size={16} className="text-accent-ink" />
          {title}
        </h2>
        {description && <p className="mt-1 text-[13px] text-muted">{description}</p>}
      </div>
      <div className={cn('card divide-y divide-line px-4 sm:px-5', className)}>{children}</div>
    </section>
  );
}

/** A labelled control row. Stacks on narrow screens. */
export function Row({ label, description, children, htmlFor, stack }: { label: string; description?: ReactNode; children: ReactNode; htmlFor?: string; stack?: boolean }) {
  return (
    <div className={cn('flex gap-3 py-4', stack ? 'flex-col' : 'flex-col sm:flex-row sm:items-center sm:justify-between')}>
      <div className="min-w-0">
        <label htmlFor={htmlFor} className="block text-[15px] font-medium text-fg">
          {label}
        </label>
        {description && <p className="mt-0.5 text-[13px] leading-snug text-muted">{description}</p>}
      </div>
      <div className={cn('shrink-0', stack ? 'w-full' : 'sm:w-auto')}>{children}</div>
    </div>
  );
}
