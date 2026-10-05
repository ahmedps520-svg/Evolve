import type { CategoryId } from '@/types';
import { attributeColor } from '@/data/attributes';
import { CATEGORIES } from '@/data/categories';
import { cn } from '@/lib/cn';
import { Icon } from '@/components/ui/Icon';

/** Grid of category tiles (radio group). */
export function CategoryPicker({ value, onChange, label = 'Category' }: { value: CategoryId; onChange: (c: CategoryId) => void; label?: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-4 gap-2 sm:grid-cols-5">
      {CATEGORIES.map((c) => {
        const active = c.id === value;
        const color = attributeColor(c.attribute);
        return (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(c.id)}
            className={cn(
              'flex min-h-[68px] flex-col items-center justify-center gap-1.5 rounded-2xl border px-1 py-2 text-center text-[11.5px] leading-tight font-medium transition-[background-color,border-color,transform] duration-150 active:scale-95',
              active ? 'border-transparent text-fg' : 'border-line bg-surface-2 text-muted hover:border-line-strong hover:text-fg',
            )}
            style={active ? { background: `color-mix(in oklab, ${color} 18%, var(--surface-2))`, boxShadow: `inset 0 0 0 1.5px ${color}` } : undefined}
          >
            <Icon name={c.icon} size={20} style={{ color }} />
            <span className="line-clamp-2">{c.name}</span>
          </button>
        );
      })}
    </div>
  );
}
