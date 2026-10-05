import { useEffect, useMemo, useRef, useState } from 'react';
import type { DateKey, DayStats } from '@/types';
import { addDays, diffDays, formatDay, formatMonth, parseDateKey, weekStart } from '@/lib/date';
import { formatNumber } from '@/lib/format';
import { heatLevel } from '@/lib/stats';
import { ChartTooltip } from './core';

/** Single-hue sequential ramp from the accent; goal days also carry a marker (never color alone). */
export const HEAT_COLORS = [
  'var(--surface-3)',
  'color-mix(in oklab, var(--accent) 26%, var(--surface-3))',
  'color-mix(in oklab, var(--accent) 50%, var(--surface-3))',
  'color-mix(in oklab, var(--accent) 76%, var(--surface-3))',
  'var(--accent)',
];

export const HEAT_LABELS = ['No activity', 'Low activity', 'Medium activity', 'High activity', 'Daily goal reached'];

export function StreakCalendar({ days, today, weeks = 26, goal, weekStartsOn, cell: cellProp }: { days: Map<DateKey, DayStats>; today: DateKey; weeks?: number; goal: number; weekStartsOn: 0 | 1; cell?: number }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ key: DateKey; x: number; y: number } | null>(null);
  const cell = cellProp ?? 13;
  const gap = 3;
  const start = addDays(weekStart(today, weekStartsOn), -7 * (weeks - 1));
  const labelW = 26;
  const topH = 16;

  const columns = useMemo(() => {
    const cols: { key: DateKey; level: number; rest: boolean; future: boolean }[][] = [];
    for (let w = 0; w < weeks; w++) {
      const col = [];
      for (let d = 0; d < 7; d++) {
        const key = addDays(start, w * 7 + d);
        const stats = days.get(key);
        col.push({ key, level: heatLevel(stats, goal), rest: !!stats?.rest && !stats.active, future: key > today });
      }
      cols.push(col);
    }
    return cols;
  }, [days, start, weeks, goal, today]);

  const months = useMemo(() => {
    const out: { x: number; label: string }[] = [];
    let last = '';
    columns.forEach((col, i) => {
      const m = col[0].key.slice(0, 7);
      if (m !== last) {
        last = m;
        if (i < columns.length - 1) out.push({ x: labelW + i * (cell + gap), label: formatMonth(col[0].key) });
      }
    });
    return out.filter((m, i, arr) => i === 0 || m.x - arr[i - 1].x > 26);
  }, [columns, cell]);

  useEffect(() => {
    scroller.current?.scrollTo({ left: scroller.current.scrollWidth });
  }, [weeks]);

  const width = labelW + weeks * (cell + gap);
  const height = topH + 7 * (cell + gap);
  const dayNames = Array.from({ length: 7 }, (_, i) => parseDateKey(addDays(start, i)).toLocaleDateString(undefined, { weekday: 'short' }));
  const hoverStats = hover ? days.get(hover.key) : undefined;
  const totalActive = columns.flat().filter((c) => c.level > 0).length;

  return (
    <div className="relative">
      <div ref={scroller} className="no-scrollbar overflow-x-auto">
        <svg width={width} height={height} role="img" aria-label={`Activity calendar for the last ${weeks} weeks: ${totalActive} active days.`} className="block">
          {months.map((m) => (
            <text key={m.x} x={m.x} y={10} className="fill-[var(--faint)] text-[10px]">
              {m.label}
            </text>
          ))}
          {[1, 3, 5].map((d) => (
            <text key={d} x={0} y={topH + d * (cell + gap) + cell * 0.75} className="fill-[var(--faint)] text-[10px]">
              {dayNames[d]}
            </text>
          ))}
          {columns.map((col, w) =>
            col.map((c, d) => {
              if (c.future) return null;
              const x = labelW + w * (cell + gap);
              const y = topH + d * (cell + gap);
              const stats = days.get(c.key);
              return (
                <g
                  key={c.key}
                  tabIndex={-1}
                  onPointerEnter={() => setHover({ key: c.key, x: x + cell / 2 - (scroller.current?.scrollLeft ?? 0), y })}
                  onPointerLeave={() => setHover(null)}
                >
                  <rect x={x} y={y} width={cell} height={cell} rx={3} fill={HEAT_COLORS[c.level]} stroke={c.key === today ? 'var(--fg)' : 'none'} strokeOpacity={0.6}>
                    <title>{`${formatDay(c.key, { weekday: 'short', month: 'short', day: 'numeric' })}: ${formatNumber(stats?.xp ?? 0)} XP${c.level === 4 ? ', daily goal reached' : ''}${c.rest ? ', rest day' : ''}`}</title>
                  </rect>
                  {c.level === 4 && <circle cx={x + cell / 2} cy={y + cell / 2} r={cell * 0.16} fill="var(--accent-fg)" opacity={0.85} />}
                  {c.rest && <circle cx={x + cell / 2} cy={y + cell / 2} r={cell * 0.24} fill="none" stroke="var(--success)" strokeWidth={1.5} />}
                </g>
              );
            }),
          )}
        </svg>
      </div>
      {hover && (
        <ChartTooltip x={hover.x} y={hover.y} width={scroller.current?.clientWidth ?? width}>
          <p className="font-display text-sm font-bold text-fg num">{formatNumber(hoverStats?.xp ?? 0)} XP</p>
          <p className="text-muted">{formatDay(hover.key, { weekday: 'short', month: 'short', day: 'numeric' })}</p>
          {hoverStats?.goalMet && <p className="mt-0.5 text-success">Daily goal reached</p>}
          {hoverStats?.rest && !hoverStats.active && <p className="mt-0.5 text-success">Rest day</p>}
        </ChartTooltip>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-muted">
        <span className="flex items-center gap-1.5">
          Less
          {HEAT_COLORS.slice(0, 4).map((c, i) => (
            <span key={i} className="size-[11px] rounded-[3px]" style={{ background: c }} aria-label={HEAT_LABELS[i]} />
          ))}
          More
        </span>
        <span className="flex items-center gap-1.5">
          <span className="grid size-[11px] place-items-center rounded-[3px]" style={{ background: HEAT_COLORS[4] }}>
            <span className="size-[3.5px] rounded-full bg-accent-fg" />
          </span>
          Goal reached
        </span>
        <span className="flex items-center gap-1.5">
          <span className="grid size-[11px] place-items-center rounded-[3px] bg-surface-3">
            <span className="size-[6px] rounded-full border border-success" />
          </span>
          Rest day
        </span>
      </div>
    </div>
  );
}

/** Weeks needed so the calendar spans `from` → `today`. */
export function weeksBetween(from: DateKey, today: DateKey): number {
  return Math.max(1, Math.ceil((diffDays(from, today) + 1) / 7) + 1);
}
