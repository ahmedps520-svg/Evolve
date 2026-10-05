import { useId, type CSSProperties, type ReactNode } from 'react';
import type { AvatarConfig } from '@/types';
import { cn } from '@/lib/cn';
import { itemKey } from '@/data/cosmetics';

/* ───────────────────────── Sigils: geometric emblems drawn on a 48×48 grid ───────────────────────── */

function SigilPaths({ id, maskId }: { id: string; maskId: string }): ReactNode {
  const s = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.4, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
  const f = { fill: 'currentColor', stroke: 'none' } as const;
  const soft = { fill: 'currentColor', fillOpacity: 0.16, stroke: 'currentColor', strokeWidth: 2.4, strokeLinejoin: 'round' } as const;
  switch (id) {
    case 'tome':
      return (
        <>
          <path {...soft} d="M7 17c5.8-1.7 11.3-.9 17 2.8 5.7-3.7 11.2-4.5 17-2.8v21.5c-5.8-1.7-11.3-.9-17 2.8-5.7-3.7-11.2-4.5-17-2.8z" />
          <path {...s} d="M24 19.8v21.6" />
          <path {...f} d="M24 4l1.5 3.5 3.5 1.5-3.5 1.5L24 14l-1.5-3.5L19 9l3.5-1.5z" />
        </>
      );
    case 'bolt':
      return <path {...soft} d="M27.5 4 12 27h10.5l-3 17L36 20.5H25.5L27.5 4z" />;
    case 'quill':
      return (
        <>
          <path {...soft} d="M39 6c-1 11.5-8.5 21-20 26l-5.5 1.2C15.4 20.8 25 10 39 6z" />
          <path {...s} d="M13.5 33.2 9 43M20 25.5l5.5-1M24.5 19l5-1" />
        </>
      );
    case 'compass':
      return (
        <>
          <circle {...s} cx="24" cy="24" r="17.5" />
          <path {...soft} d="M24 10.5l4.3 13.5L24 37.5 19.7 24z" />
          <path {...f} d="M24 10.5l4.3 13.5h-8.6z" />
          <circle {...f} cx="24" cy="24" r="1.8" />
        </>
      );
    case 'rook':
      return (
        <>
          <path {...s} d="M12.5 41.5h23M14.8 41.5l1.7-6h15l1.7 6" />
          <path {...soft} d="M17.6 35.5l1.2-13.5h10.4l1.2 13.5z" />
          <path {...s} d="M15 22h18M15.5 22 14 9.5h5V14h3.4V9.5h3.2V14H29V9.5h5L32.5 22" />
        </>
      );
    case 'equinox':
      return (
        <>
          <circle {...s} cx="24" cy="24" r="17.5" />
          <path {...f} fillOpacity={0.22} d="M24 6.5a17.5 17.5 0 0 1 0 35 8.75 8.75 0 0 1 0-17.5 8.75 8.75 0 0 0 0-17.5z" />
          <path {...s} d="M24 6.5a8.75 8.75 0 0 1 0 17.5 8.75 8.75 0 0 0 0 17.5" />
          <circle {...f} cx="24" cy="15.25" r="2.3" />
          <circle {...s} strokeWidth={2} cx="24" cy="32.75" r="2.3" />
        </>
      );
    case 'spark':
      return (
        <>
          <path {...soft} d="M24 5c1.4 8.8 4.6 13.4 19 19-14.4 5.6-17.6 10.2-19 19-1.4-8.8-4.6-13.4-19-19 14.4-5.6 17.6-10.2 19-19z" />
          <path {...f} d="M38.5 4.5l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9z" />
        </>
      );
    case 'flame':
      return (
        <>
          <path {...soft} d="M24 44c-8.3 0-14-5.8-14-13.6C10 19 21 15 22.5 4c6 4.5 15.5 13 15.5 26.4C38 38.2 32.3 44 24 44z" />
          <path {...f} fillOpacity={0.55} d="M24 44c-3.9 0-6.5-2.7-6.5-6.4 0-5.3 4.6-7.3 5.9-12.6 3.2 2.6 7.1 6.6 7.1 12.6 0 3.7-2.6 6.4-6.5 6.4z" />
        </>
      );
    case 'crescent':
      return (
        <>
          <mask id={maskId}>
            <rect width="48" height="48" fill="white" />
            <circle cx="30.5" cy="19" r="14" fill="black" />
          </mask>
          <circle cx="21.5" cy="26" r="17" fill="currentColor" fillOpacity={0.9} mask={`url(#${maskId})`} />
          <path {...f} d="M37 7l1.1 2.9 2.9 1.1-2.9 1.1L37 15l-1.1-2.9L33 11l2.9-1.1z" />
        </>
      );
    case 'wave':
      return (
        <>
          <circle {...f} fillOpacity={0.3} cx="33" cy="14" r="6" />
          <path {...s} d="M5 27c4.5-4.5 9-4.5 13.5 0s9 4.5 13.5 0 9-4.5 11 0M5 36c4.5-4.5 9-4.5 13.5 0s9 4.5 13.5 0 9-4.5 11 0" />
        </>
      );
    case 'prism':
      return (
        <>
          <path {...soft} d="M22 9 37 37H7z" />
          <path {...s} d="M3 26.5h11.5M30.5 22.5l13.5-6M31.6 26.5H44M30.5 30.5l13.5 6" />
        </>
      );
    case 'crown':
      return (
        <>
          <path {...soft} d="M9.5 36 7 15.5l9.5 8L24 9.5l7.5 14 9.5-8L38.5 36z" />
          <path {...s} d="M9 41h30" />
          <circle {...f} cx="7" cy="15.5" r="2.3" />
          <circle {...f} cx="24" cy="9.5" r="2.3" />
          <circle {...f} cx="41" cy="15.5" r="2.3" />
        </>
      );
    case 'oracle':
      return (
        <>
          <path {...s} d="M4 24s7.3-12.5 20-12.5S44 24 44 24s-7.3 12.5-20 12.5S4 24 4 24z" />
          <path {...soft} d="M24 16.5l5.5 7.5-5.5 7.5-5.5-7.5z" />
          <circle {...f} cx="24" cy="24" r="2" />
        </>
      );
    case 'hexcore':
      return (
        <>
          <path {...s} d="M24 4.5l17 9.8v19.4L24 43.5 7 33.7V14.3z" />
          <path {...soft} d="M24 13.5l9.1 5.25v10.5L24 34.5l-9.1-5.25v-10.5z" />
          <circle {...f} cx="24" cy="24" r="3.2" />
        </>
      );
    case 'phoenix':
      return (
        <>
          <path {...soft} d="M24 21C16 19.5 9 13.5 5.5 6.5 7 17 12.5 24.5 24 29c11.5-4.5 17-12 18.5-22.5C39 13.5 32 19.5 24 21z" />
          <path {...f} d="M24 6l3.6 7.4L24 17l-3.6-3.6z" />
          <path {...s} d="M24 29v9M18.5 43.5 24 38l5.5 5.5" />
        </>
      );
    case 'infinity':
      return <path {...soft} fillOpacity={0.1} d="M24 24c-4-5-7.2-7.5-11-7.5a7.5 7.5 0 0 0 0 15c3.8 0 7-2.5 11-7.5s7.2-7.5 11-7.5a7.5 7.5 0 0 1 0 15c-3.8 0-7-2.5-11-7.5z" />;
    default:
      return <path {...soft} d="M24 5c1.4 8.8 4.6 13.4 19 19-14.4 5.6-17.6 10.2-19 19-1.4-8.8-4.6-13.4-19-19 14.4-5.6 17.6-10.2 19-19z" />;
  }
}

export function Sigil({ sigil, className, title }: { sigil: string; className?: string; title?: string }) {
  const maskId = useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 48 48" className={className} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <SigilPaths id={itemKey(sigil)} maskId={`m${maskId}`} />
    </svg>
  );
}

/* ───────────────────────── Backgrounds ───────────────────────── */

export const AVATAR_BACKGROUNDS: Record<string, string> = {
  'bg:void': 'radial-gradient(circle at 30% 22%, #2a3042 0%, #121620 55%, #07080c 100%)',
  'bg:midnight': 'radial-gradient(circle at 30% 18%, #2f56a6 0%, #14295a 50%, #070f24 100%)',
  'bg:nebula': 'radial-gradient(circle at 72% 22%, #8b5cf6 0%, transparent 52%), radial-gradient(circle at 18% 82%, #db2777 0%, transparent 48%), #1a1035',
  'bg:ember': 'radial-gradient(circle at 50% 115%, #fb923c 0%, #b4380f 42%, #2a0d05 100%)',
  'bg:aurora': 'radial-gradient(ellipse at 20% 15%, #34d399 0%, transparent 50%), radial-gradient(ellipse at 85% 40%, #22d3ee 0%, transparent 45%), linear-gradient(170deg, #0b3b3a, #141236)',
  'bg:abyss': 'radial-gradient(circle at 50% -10%, #22a3c4 0%, #0b4a6e 38%, #041628 100%)',
  'bg:gilded': 'radial-gradient(circle at 30% 20%, #fff1c1 0%, transparent 35%), linear-gradient(140deg, #f8d77c 0%, #c58a1f 45%, #6d4207 78%, #e7b44a 100%)',
  'bg:harvest': 'radial-gradient(circle at 68% 28%, #fde3b0 0%, #f59e0b 22%, #b23c0b 50%, #2b0f06 100%)',
  'bg:prismatic': 'conic-gradient(from 210deg, #fb7185, #c084fc, #60a5fa, #34d399, #fbbf24, #fb7185)',
};

/* ───────────────────────── Frames ───────────────────────── */

function FrameSVG({ frame, uid }: { frame: string; uid: string }) {
  const k = itemKey(frame);
  const common = { fill: 'none', vectorEffect: 'non-scaling-stroke' as const };
  switch (k) {
    case 'hex':
      return <path {...common} d="M50 2.5 91.2 26.2v47.6L50 97.5 8.8 73.8V26.2z" stroke="var(--accent)" strokeWidth={2.5} strokeLinejoin="round" />;
    case 'cyber':
      return (
        <g>
          <circle {...common} cx="50" cy="50" r="47" stroke="var(--accent)" strokeWidth={2.5} strokeDasharray="22 6 4 6" strokeLinecap="round" style={{ filter: 'drop-shadow(0 0 3px var(--accent))' }} />
          {[0, 90, 180, 270].map((a) => (
            <rect key={a} x="48" y="-1" width="4" height="7" rx="1" fill="var(--accent-2)" transform={`rotate(${a} 50 50)`} />
          ))}
        </g>
      );
    case 'laurel':
      return (
        <g fill="#e9b949">
          <circle {...common} cx="50" cy="50" r="47" stroke="#e9b949" strokeOpacity={0.55} strokeWidth={1.5} />
          {Array.from({ length: 7 }).map((_, i) => {
            const a = 115 + i * 13;
            return <ellipse key={`l${i}`} cx="50" cy="3.5" rx="2.6" ry="6.5" transform={`rotate(${a} 50 50) rotate(-30 50 3.5)`} />;
          })}
          {Array.from({ length: 7 }).map((_, i) => {
            const a = 245 - i * 13;
            return <ellipse key={`r${i}`} cx="50" cy="3.5" rx="2.6" ry="6.5" transform={`rotate(${a} 50 50) rotate(30 50 3.5)`} />;
          })}
        </g>
      );
    case 'runic':
      return (
        <g stroke="var(--accent-ink)" strokeLinecap="round">
          <circle {...common} cx="50" cy="50" r="47" strokeWidth={1.6} />
          <circle {...common} cx="50" cy="50" r="43.5" strokeWidth={0.8} strokeOpacity={0.6} />
          {Array.from({ length: 12 }).map((_, i) => (
            <path key={i} d={i % 3 === 0 ? 'M50 1.5v6M47.5 4.5h5' : 'M50 2.5v4'} strokeWidth={1.6} transform={`rotate(${i * 30} 50 50)`} />
          ))}
        </g>
      );
    case 'crystal':
      return (
        <g>
          <defs>
            <linearGradient id={`cr${uid}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#a5f3fc" />
              <stop offset="0.5" stopColor="#818cf8" />
              <stop offset="1" stopColor="#f0abfc" />
            </linearGradient>
          </defs>
          <path {...common} d="M50 1.5 84.3 15.7 98.5 50 84.3 84.3 50 98.5 15.7 84.3 1.5 50 15.7 15.7z" stroke={`url(#cr${uid})`} strokeWidth={2.8} strokeLinejoin="round" />
          <path {...common} d="M50 1.5 50 8M98.5 50H92M50 98.5V92M1.5 50H8" stroke={`url(#cr${uid})`} strokeWidth={1.4} />
        </g>
      );
    case 'grind':
      return (
        <g>
          <circle {...common} cx="50" cy="50" r="45" stroke="#c98a4b" strokeWidth={3} />
          {Array.from({ length: 16 }).map((_, i) => (
            <rect key={i} x="46.5" y="0" width="7" height="6" rx="1.2" fill="#c98a4b" transform={`rotate(${i * 22.5} 50 50)`} />
          ))}
        </g>
      );
    case 'gilded':
      return (
        <g>
          <defs>
            <linearGradient id={`gd${uid}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#fff1c1" />
              <stop offset="0.45" stopColor="#e2a83a" />
              <stop offset="1" stopColor="#8a5a0b" />
            </linearGradient>
          </defs>
          <circle {...common} cx="50" cy="50" r="47.5" stroke={`url(#gd${uid})`} strokeWidth={3.2} />
          <circle {...common} cx="50" cy="50" r="42.5" stroke={`url(#gd${uid})`} strokeWidth={1.2} />
          {[45, 135, 225, 315].map((a) => (
            <path key={a} d="M50 0.5l3 3.5-3 3.5-3-3.5z" fill={`url(#gd${uid})`} transform={`rotate(${a} 50 50)`} />
          ))}
        </g>
      );
    case 'mythic':
      return (
        <g className="origin-center animate-spin-slow" style={{ transformBox: 'fill-box' }}>
          <defs>
            <linearGradient id={`my${uid}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#fb7185" />
              <stop offset="0.3" stopColor="#c084fc" />
              <stop offset="0.55" stopColor="#60a5fa" />
              <stop offset="0.8" stopColor="#34d399" />
              <stop offset="1" stopColor="#fbbf24" />
            </linearGradient>
          </defs>
          <circle {...common} cx="50" cy="50" r="47" stroke={`url(#my${uid})`} strokeWidth={3.5} style={{ filter: 'drop-shadow(0 0 4px #c084fc)' }} />
        </g>
      );
    default:
      return <circle {...common} cx="50" cy="50" r="47.5" stroke="var(--line-strong)" strokeWidth={1.5} />;
  }
}

/* ───────────────────────── Auras ───────────────────────── */

function Aura({ aura }: { aura: string }) {
  switch (itemKey(aura)) {
    case 'glow':
      return <span className="absolute inset-[-10%] rounded-full" style={{ background: 'radial-gradient(circle, color-mix(in oklab, var(--accent) 45%, transparent) 0%, transparent 68%)' }} aria-hidden />;
    case 'pulse':
      return (
        <>
          <span className="absolute inset-[2%] animate-pulse-ring rounded-full border-2 border-accent" aria-hidden />
          <span className="absolute inset-[-6%] rounded-full" style={{ background: 'radial-gradient(circle, color-mix(in oklab, var(--accent) 25%, transparent) 0%, transparent 70%)' }} aria-hidden />
        </>
      );
    case 'orbit':
      return (
        <span className="absolute inset-[-7%] animate-spin-slow rounded-full" style={{ animationDuration: '7s' }} aria-hidden>
          <span className="absolute top-0 left-1/2 size-[9%] -translate-x-1/2 rounded-full bg-accent shadow-[0_0_10px_var(--accent)]" />
          <span className="absolute bottom-[8%] left-[8%] size-[6%] rounded-full bg-accent-2 shadow-[0_0_8px_var(--accent-2)]" />
        </span>
      );
    case 'halo':
      return (
        <>
          <span className="absolute inset-[-9%] rounded-full border border-[#f5c451]/70 shadow-[0_0_18px_#f5c45166,inset_0_0_18px_#f5c45133]" aria-hidden />
          <span className="absolute inset-[-14%] rounded-full" style={{ background: 'radial-gradient(circle, #f5c45122 40%, transparent 70%)' }} aria-hidden />
        </>
      );
    case 'embers':
      return (
        <span className="pointer-events-none absolute inset-[-12%]" aria-hidden>
          <span className="absolute inset-[10%] rounded-full" style={{ background: 'radial-gradient(circle, #fb923c33 30%, transparent 70%)' }} />
          {[12, 30, 52, 70, 86].map((left, i) => (
            <span key={left} className="ember-mote absolute bottom-[18%] size-[5%] rounded-full bg-[#fdba74]" style={{ left: `${left}%`, animationDelay: `${i * 0.55}s` }} />
          ))}
        </span>
      );
    default:
      return null;
  }
}

/* ───────────────────────── Avatar ───────────────────────── */

export interface AvatarProps {
  avatar: AvatarConfig;
  size?: number;
  className?: string;
  label?: string;
  /** Skip the aura (e.g. tiny avatars in lists). */
  plain?: boolean;
  children?: ReactNode;
}

export function Avatar({ avatar, size = 64, className, label, plain, children }: AvatarProps) {
  const uid = useId().replace(/:/g, '');
  const style: CSSProperties = { width: size, height: size };
  const bg = AVATAR_BACKGROUNDS[avatar.background] ?? AVATAR_BACKGROUNDS['bg:void'];
  const isHex = itemKey(avatar.frame) === 'hex';
  return (
    <div className={cn('relative shrink-0', className)} style={style} role={label ? 'img' : undefined} aria-label={label}>
      {!plain && <Aura aura={avatar.aura} />}
      <div
        className="absolute inset-[9%] grid place-items-center overflow-hidden shadow-[inset_0_1px_0_rgb(255_255_255/0.15),inset_0_-10px_24px_rgb(0_0_0/0.35)]"
        style={{ background: bg, clipPath: isHex ? 'polygon(50% 2%, 92% 26%, 92% 74%, 50% 98%, 8% 74%, 8% 26%)' : undefined, borderRadius: isHex ? 0 : '9999px' }}
      >
        <Sigil sigil={avatar.sigil} className="h-[58%] w-[58%] text-white drop-shadow-[0_2px_6px_rgb(0_0_0/0.45)]" />
      </div>
      <svg viewBox="0 0 100 100" className="absolute inset-0 overflow-visible" aria-hidden>
        <FrameSVG frame={avatar.frame} uid={uid} />
      </svg>
      {children}
    </div>
  );
}
