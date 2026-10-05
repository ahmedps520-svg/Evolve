import { useId } from 'react';

/** The Evolve mark: a hex crest with a rising chevron — progress, level by level. */
export function Logo({ size = 32, className, animated = false }: { size?: number; className?: string; animated?: boolean }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} role="img" aria-label="Evolve">
      <defs>
        <linearGradient id={`lg${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--accent-2)" />
          <stop offset="1" stopColor="var(--accent)" />
        </linearGradient>
      </defs>
      <path d="M32 4.5 55.8 18.2v27.6L32 59.5 8.2 45.8V18.2z" fill={`url(#lg${id})`} fillOpacity="0.12" stroke={`url(#lg${id})`} strokeWidth="3" strokeLinejoin="round" />
      <path d="M20 40.5 32 28.5l12 12" fill="none" stroke={`url(#lg${id})`} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
        {animated && <animate attributeName="opacity" values="1;0.55;1" dur="2.4s" repeatCount="indefinite" />}
      </path>
      <path d="M20 30.5 32 18.5l12 12" fill="none" stroke={`url(#lg${id})`} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.55" />
    </svg>
  );
}
