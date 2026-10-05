import { useId, useMemo, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import { AXIS_TEXT, ChartTooltip, niceTicks, useWidth } from './core';

export interface Point {
  key: string;
  /** Short axis label. */
  label: string;
  /** Long label for tooltips and tables. */
  long?: string;
  value: number;
}

const PAD = { top: 12, right: 12, bottom: 24, left: 40 };

/* ───────────────────────── Area chart (single series, crosshair tooltip) ───────────────────────── */

export function AreaChart({ data, height = 190, color = 'var(--accent)', format = formatNumber, unit = 'XP', reference }: { data: Point[]; height?: number; color?: string; format?: (n: number) => string; unit?: string; reference?: { value: number; label: string } }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const gid = useId().replace(/:/g, '');
  const max = Math.max(1, ...data.map((d) => d.value), reference?.value ?? 0);
  const ticks = niceTicks(max, 3);
  const top = ticks[ticks.length - 1];
  const w = Math.max(0, width - PAD.left - PAD.right);
  const h = height - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (data.length <= 1 ? w / 2 : (i / (data.length - 1)) * w);
  const y = (v: number) => PAD.top + h - (v / top) * h;

  const { line, area } = useMemo(() => {
    if (!data.length || !w) return { line: '', area: '' };
    const pts = data.map((d, i) => `${x(i).toFixed(1)},${y(d.value).toFixed(1)}`);
    return { line: `M${pts.join('L')}`, area: `M${x(0)},${PAD.top + h}L${pts.join('L')}L${x(data.length - 1)},${PAD.top + h}Z` };
  }, [data, w, h, top]);

  const onMove = (e: PointerEvent<SVGRectElement>) => {
    const r = (e.currentTarget as SVGRectElement).getBoundingClientRect();
    const rel = (e.clientX - r.left) / Math.max(1, r.width);
    setHover(Math.max(0, Math.min(data.length - 1, Math.round(rel * (data.length - 1)))));
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') setHover((h0) => Math.min(data.length - 1, (h0 ?? -1) + 1));
    else if (e.key === 'ArrowLeft') setHover((h0) => Math.max(0, (h0 ?? data.length) - 1));
    else return;
    e.preventDefault();
  };
  const labelIdx = data.length > 1 ? [0, Math.floor((data.length - 1) / 2), data.length - 1] : [0];
  const last = data.length - 1;

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} className="block overflow-visible outline-none" tabIndex={0} role="img" aria-label={`Line chart, ${data.length} points. Use arrow keys to read values.`} onKeyDown={onKey} onBlur={() => setHover(null)}>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={color} stopOpacity="0.22" />
              <stop offset="1" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={PAD.left + w} y1={y(t)} y2={y(t)} stroke="var(--line)" />
              <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className={AXIS_TEXT}>
                {formatNumber(t)}
              </text>
            </g>
          ))}
          {reference && reference.value <= top && (
            <g>
              <line x1={PAD.left} x2={PAD.left + w} y1={y(reference.value)} y2={y(reference.value)} stroke="var(--line-strong)" />
              <text x={PAD.left + w} y={y(reference.value) - 4} textAnchor="end" className="fill-[var(--muted)] text-[10.5px]">
                {reference.label}
              </text>
            </g>
          )}
          <path d={area} fill={`url(#${gid})`} />
          <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {last >= 0 && <circle cx={x(last)} cy={y(data[last].value)} r={4} fill={color} stroke="var(--surface)" strokeWidth={2} />}
          {labelIdx.map((i) => (
            <text key={i} x={x(i)} y={height - 6} textAnchor={i === 0 ? 'start' : i === last ? 'end' : 'middle'} className={AXIS_TEXT}>
              {data[i]?.label}
            </text>
          ))}
          {hover !== null && data[hover] && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + h} stroke="var(--muted)" strokeOpacity={0.6} />
              <circle cx={x(hover)} cy={y(data[hover].value)} r={4.5} fill={color} stroke="var(--surface)" strokeWidth={2} />
            </g>
          )}
          <rect x={PAD.left} y={PAD.top} width={w} height={h} fill="transparent" onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setHover(null)} />
        </svg>
      )}
      {hover !== null && data[hover] && (
        <ChartTooltip x={x(hover)} y={y(data[hover].value)} width={width}>
          <p className="font-display text-sm font-bold text-fg num">
            {format(data[hover].value)} {unit}
          </p>
          <p className="text-muted">{data[hover].long ?? data[hover].label}</p>
        </ChartTooltip>
      )}
    </div>
  );
}

/* ───────────────────────── Column chart (single series, per-bar tooltip, emphasis) ───────────────────────── */

export function ColumnChart({ data, height = 170, color = 'var(--accent)', muted = 'color-mix(in oklab, var(--accent) 38%, var(--surface-4))', highlight, format = formatNumber, unit = 'XP', labelEvery = 1 }: { data: Point[]; height?: number; color?: string; muted?: string; highlight?: string | null; format?: (n: number) => string; unit?: string; labelEvery?: number }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const ticks = niceTicks(max, 3);
  const top = ticks[ticks.length - 1];
  const w = Math.max(0, width - PAD.left - PAD.right);
  const h = height - PAD.top - PAD.bottom;
  const band = data.length ? w / data.length : 0;
  const bar = Math.max(2, Math.min(24, band - 2));
  const y = (v: number) => PAD.top + h - (v / top) * h;
  const hl = highlight ?? null;

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} className="block overflow-visible" role="img" aria-label={`Column chart with ${data.length} bars`}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={PAD.left + w} y1={y(t)} y2={y(t)} stroke="var(--line)" />
              <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className={AXIS_TEXT}>
                {formatNumber(t)}
              </text>
            </g>
          ))}
          {data.map((d, i) => {
            const cx = PAD.left + band * i + band / 2;
            const bh = Math.max(d.value > 0 ? 2 : 0, PAD.top + h - y(d.value));
            const isHl = hl ? d.key === hl : false;
            const r = Math.min(4, bar / 2, bh);
            const x0 = cx - bar / 2;
            const y0 = PAD.top + h - bh;
            const path = bh > 0 ? `M${x0},${PAD.top + h}V${y0 + r}Q${x0},${y0} ${x0 + r},${y0}H${x0 + bar - r}Q${x0 + bar},${y0} ${x0 + bar},${y0 + r}V${PAD.top + h}Z` : '';
            return (
              <g
                key={d.key}
                tabIndex={0}
                role="img"
                aria-label={`${d.long ?? d.label}: ${format(d.value)} ${unit}`}
                onPointerEnter={() => setHover(i)}
                onPointerLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                className="outline-none"
              >
                <rect x={cx - band / 2} y={PAD.top} width={band} height={h} fill="transparent" />
                {path && <path d={path} fill={hl ? (isHl ? color : muted) : color} opacity={hover === null || hover === i ? 1 : 0.55} />}
                {isHl && d.value > 0 && (
                  <text x={cx} y={y0 - 6} textAnchor="middle" className="fill-[var(--fg)] text-[11px] font-semibold num">
                    {format(d.value)}
                  </text>
                )}
                {(i % labelEvery === 0 || i === data.length - 1) && (
                  <text x={cx} y={height - 6} textAnchor="middle" className={cn(AXIS_TEXT, isHl && 'fill-[var(--fg)]')}>
                    {d.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      )}
      {hover !== null && data[hover] && (
        <ChartTooltip x={PAD.left + band * hover + band / 2} y={y(data[hover].value)} width={width}>
          <p className="font-display text-sm font-bold text-fg num">
            {format(data[hover].value)} {unit}
          </p>
          <p className="text-muted">{data[hover].long ?? data[hover].label}</p>
        </ChartTooltip>
      )}
    </div>
  );
}

/* ───────────────────────── Stacked columns (several series, legend + combined tooltip) ───────────────────────── */

export interface StackSeries {
  id: string;
  label: string;
  color: string;
}

export function StackedColumns({ rows, series, height = 190, format = formatNumber, unit = 'min' }: { rows: { key: string; label: string; long?: string; values: Record<string, number> }[]; series: StackSeries[]; height?: number; format?: (n: number) => string; unit?: string }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const totals = rows.map((r) => series.reduce((n, s) => n + (r.values[s.id] ?? 0), 0));
  const ticks = niceTicks(Math.max(1, ...totals), 3);
  const top = ticks[ticks.length - 1];
  const w = Math.max(0, width - PAD.left - PAD.right);
  const h = height - PAD.top - PAD.bottom;
  const band = rows.length ? w / rows.length : 0;
  const bar = Math.max(2, Math.min(24, band - 2));
  const y = (v: number) => PAD.top + h - (v / top) * h;
  const labelEvery = Math.max(1, Math.ceil(rows.length / 7));

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} className="block overflow-visible" role="img" aria-label="Stacked column chart">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={PAD.left + w} y1={y(t)} y2={y(t)} stroke="var(--line)" />
              <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className={AXIS_TEXT}>
                {formatNumber(t)}
              </text>
            </g>
          ))}
          {rows.map((r, i) => {
            const cx = PAD.left + band * i + band / 2;
            let acc = 0;
            return (
              <g
                key={r.key}
                tabIndex={0}
                role="img"
                aria-label={`${r.long ?? r.label}: ${series.map((s) => `${s.label} ${format(r.values[s.id] ?? 0)}`).join(', ')}`}
                onPointerEnter={() => setHover(i)}
                onPointerLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                className="outline-none"
              >
                <rect x={cx - band / 2} y={PAD.top} width={band} height={h} fill="transparent" />
                {series.map((s, si) => {
                  const v = r.values[s.id] ?? 0;
                  if (v <= 0) return null;
                  const y1 = y(acc);
                  acc += v;
                  const y2 = y(acc);
                  const isTop = series.slice(si + 1).every((n) => (r.values[n.id] ?? 0) <= 0);
                  const segH = Math.max(1, y1 - y2 - (acc > v ? 2 : 0));
                  const rr = isTop ? Math.min(4, bar / 2, segH) : 0;
                  const x0 = cx - bar / 2;
                  const top0 = y1 - (acc > v ? 2 : 0) - segH;
                  const bottom = y1 - (acc > v ? 2 : 0);
                  const d = rr
                    ? `M${x0},${bottom}V${top0 + rr}Q${x0},${top0} ${x0 + rr},${top0}H${x0 + bar - rr}Q${x0 + bar},${top0} ${x0 + bar},${top0 + rr}V${bottom}Z`
                    : `M${x0},${bottom}V${top0}H${x0 + bar}V${bottom}Z`;
                  return <path key={s.id} d={d} fill={s.color} opacity={hover === null || hover === i ? 1 : 0.5} />;
                })}
                {(i % labelEvery === 0 || i === rows.length - 1) && (
                  <text x={cx} y={height - 6} textAnchor="middle" className={AXIS_TEXT}>
                    {r.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      )}
      {hover !== null && rows[hover] && (
        <ChartTooltip x={PAD.left + band * hover + band / 2} y={y(totals[hover])} width={width}>
          <p className="mb-1 text-muted">{rows[hover].long ?? rows[hover].label}</p>
          <p className="mb-1.5 font-display text-sm font-bold text-fg num">
            {format(totals[hover])} {unit}
          </p>
          <ul className="space-y-0.5">
            {series
              .filter((s) => (rows[hover].values[s.id] ?? 0) > 0)
              .map((s) => (
                <li key={s.id} className="flex items-center gap-2">
                  <span className="h-0.5 w-3 rounded-full" style={{ background: s.color }} aria-hidden />
                  <span className="num font-semibold text-fg">{format(rows[hover].values[s.id] ?? 0)}</span>
                  <span className="text-muted">{s.label}</span>
                </li>
              ))}
          </ul>
        </ChartTooltip>
      )}
    </div>
  );
}

/* ───────────────────────── Part-to-whole bar ───────────────────────── */

export function PartBar({ parts, height = 14 }: { parts: { id: string; label: string; value: number; color: string }[]; height?: number }) {
  const total = parts.reduce((n, p) => n + p.value, 0);
  const visible = parts.filter((p) => p.value > 0);
  if (!total) return <div className="rounded-full bg-surface-4" style={{ height }} />;
  return (
    <div className="flex w-full gap-[2px] overflow-hidden rounded-full" style={{ height }} role="img" aria-label={visible.map((p) => `${p.label} ${Math.round((p.value / total) * 100)}%`).join(', ')}>
      {visible.map((p) => (
        <div key={p.id} className="h-full first:rounded-l-full last:rounded-r-full" style={{ width: `${(p.value / total) * 100}%`, background: p.color, minWidth: 3 }} title={`${p.label}: ${Math.round((p.value / total) * 100)}%`} />
      ))}
    </div>
  );
}

/* ───────────────────────── Sparkline ───────────────────────── */

export function Sparkline({ values, width = 96, height = 28, color = 'var(--accent)' }: { values: number[]; width?: number; height?: number; color?: string }) {
  if (values.length < 2) return null;
  const max = Math.max(1, ...values);
  const pts = values.map((v, i) => `${((i / (values.length - 1)) * (width - 4) + 2).toFixed(1)},${(height - 3 - (v / max) * (height - 6)).toFixed(1)}`);
  const last = pts[pts.length - 1].split(',').map(Number);
  return (
    <svg width={width} height={height} aria-hidden className="overflow-visible">
      <path d={`M${pts.join('L')}`} fill="none" stroke="var(--muted)" strokeOpacity={0.5} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r={3} fill={color} stroke="var(--surface)" strokeWidth={1.5} />
    </svg>
  );
}
