import { m } from 'framer-motion';
import type { AttributeId } from '@/types';
import { ATTRIBUTE_MAP } from '@/data/attributes';

/** Attribute hexagon. Values are levels; the shape is scaled to the strongest attribute. */
export function AttributeRadar({ values, size = 260 }: { values: { attribute: AttributeId; level: number; xp: number }[]; size?: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.33;
  const n = values.length;
  const max = Math.max(5, ...values.map((v) => v.level));
  const angle = (i: number) => -Math.PI / 2 + (i / n) * Math.PI * 2;
  const pt = (i: number, f: number) => [cx + Math.cos(angle(i)) * r * f, cy + Math.sin(angle(i)) * r * f] as const;
  const poly = values.map((v, i) => pt(i, Math.max(0.06, v.level / max)).join(',')).join(' ');

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto block w-full max-w-[320px]" role="img" aria-label={`Attributes: ${values.map((v) => `${ATTRIBUTE_MAP[v.attribute].name} level ${v.level}`).join(', ')}`}>
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <polygon key={f} points={values.map((_, i) => pt(i, f).join(',')).join(' ')} fill="none" stroke="var(--line)" strokeWidth={1} />
      ))}
      {values.map((_, i) => {
        const [x, y] = pt(i, 1);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--line)" />;
      })}
      <m.polygon
        points={poly}
        fill="color-mix(in oklab, var(--accent) 22%, transparent)"
        stroke="var(--accent)"
        strokeWidth={2}
        strokeLinejoin="round"
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{ transformOrigin: `${cx}px ${cy}px`, filter: 'drop-shadow(0 0 calc(10px * var(--glow-strength)) var(--accent))' }}
        transition={{ type: 'spring', stiffness: 120, damping: 16 }}
      />
      {values.map((v, i) => {
        const [x, y] = pt(i, Math.max(0.06, v.level / max));
        return <circle key={v.attribute} cx={x} cy={y} r={4} fill={`var(${ATTRIBUTE_MAP[v.attribute].colorVar})`} stroke="var(--surface)" strokeWidth={2} />;
      })}
      {values.map((v, i) => {
        const [x, y] = pt(i, 1.27);
        return (
          <g key={`l${v.attribute}`}>
            <text x={x} y={y - 5} textAnchor="middle" className="fill-[var(--muted)] font-display text-[11px] font-semibold tracking-[0.12em]">
              {ATTRIBUTE_MAP[v.attribute].abbr}
            </text>
            <text x={x} y={y + 10} textAnchor="middle" className="fill-[var(--fg)] font-display text-[13px] font-bold">
              {v.level}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
