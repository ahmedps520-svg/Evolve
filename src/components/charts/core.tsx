import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Icon } from '@/components/ui/Icon';

/** Track an element's content width for responsive SVG charts. */
export function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

/** Round, human-friendly axis ticks (0 / 500 / 1,000 …). */
export function niceTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0, 1];
  const raw = max / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
  const ticks: number[] = [];
  for (let v = 0; v <= max + step * 0.001; v += step) ticks.push(Math.round(v * 100) / 100);
  if (ticks[ticks.length - 1] < max) ticks.push(ticks[ticks.length - 1] + step);
  return ticks;
}

export interface TableColumn<T> {
  label: string;
  value: (row: T) => ReactNode;
  numeric?: boolean;
}

/** The accessible twin of every chart. */
export function DataTable<T>({ rows, columns, caption }: { rows: T[]; columns: TableColumn<T>[]; caption: string }) {
  return (
    <div className="max-h-72 overflow-auto rounded-xl border border-line">
      <table className="w-full text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="sticky top-0 bg-surface-2">
          <tr>
            {columns.map((c) => (
              <th key={c.label} scope="col" className={cn('px-3 py-2 text-xs font-semibold text-muted', c.numeric ? 'text-right' : 'text-left')}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-line">
              {columns.map((c) => (
                <td key={c.label} className={cn('px-3 py-2 text-fg', c.numeric && 'num text-right')}>
                  {c.value(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export interface LegendItem {
  label: string;
  color: string;
  value?: string;
  shape?: 'line' | 'rect';
}

export function Legend({ items }: { items: LegendItem[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted">
      {items.map((it) => (
        <li key={it.label} className="flex items-center gap-1.5">
          {it.shape === 'line' ? <span className="h-0.5 w-3.5 rounded-full" style={{ background: it.color }} aria-hidden /> : <span className="size-2.5 rounded-[3px]" style={{ background: it.color }} aria-hidden />}
          <span>{it.label}</span>
          {it.value && <span className="num font-medium text-fg">{it.value}</span>}
        </li>
      ))}
    </ul>
  );
}

/** Chart container: title, optional legend, chart ⇄ table toggle. */
export function ChartFrame({ title, subtitle, legend, table, children, className, action }: { title: string; subtitle?: ReactNode; legend?: LegendItem[]; table?: ReactNode; children: ReactNode; className?: string; action?: ReactNode }) {
  const [showTable, setShowTable] = useState(false);
  const id = useId();
  return (
    <figure className={cn('card p-4 sm:p-5', className)} aria-labelledby={`${id}-t`}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <figcaption id={`${id}-t`} className="font-display text-[15px] font-semibold tracking-wide text-fg">
            {title}
          </figcaption>
          {subtitle && <p className="mt-0.5 text-[13px] text-muted">{subtitle}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {action}
          {table && (
            <button
              type="button"
              aria-pressed={showTable}
              onClick={() => setShowTable((v) => !v)}
              className={cn('flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition', showTable ? 'bg-surface-3 text-fg' : 'text-muted hover:bg-surface-3 hover:text-fg')}
            >
              <Icon name={showTable ? 'chart-column' : 'scroll-text'} size={14} />
              {showTable ? 'Chart' : 'Table'}
            </button>
          )}
        </div>
      </div>
      {legend && legend.length > 1 && !showTable && (
        <div className="mb-3">
          <Legend items={legend} />
        </div>
      )}
      {showTable && table ? table : children}
    </figure>
  );
}

/** Tooltip positioned inside a chart's relative container. Values lead, labels follow. */
export function ChartTooltip({ x, y, width, children }: { x: number; y: number; width: number; children: ReactNode }) {
  const flip = x > width * 0.62;
  return (
    <div
      className="pointer-events-none absolute z-10 min-w-28 rounded-xl border border-line-strong bg-surface-2/95 px-3 py-2 text-xs shadow-[0_12px_30px_-10px_rgb(0_0_0/0.6)] backdrop-blur"
      style={{ left: flip ? undefined : x + 12, right: flip ? width - x + 12 : undefined, top: Math.max(0, y - 8) }}
      role="presentation"
    >
      {children}
    </div>
  );
}

export const AXIS_TEXT = 'fill-[var(--faint)] text-[10.5px] num';
