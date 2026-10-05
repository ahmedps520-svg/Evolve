import { AnimatePresence, m } from 'framer-motion';
import { memo, useEffect, useRef } from 'react';
import { prefersReducedMotion } from '@/lib/celebrate';
import { formatNumber } from '@/lib/format';
import { fxTarget, useUI, type Burst, type Floater } from '@/store/uiStore';
import { CoinIcon } from '@/components/game/Hud';

/* ───────────── Floating "+XP" numbers that fly into the HUD ───────────── */

const FloaterView = memo(function FloaterView({ f }: { f: Floater }) {
  const remove = useUI((s) => s.removeFloater);
  const reduced = prefersReducedMotion();
  const target = fxTarget(f.kind === 'xp' ? 'xp' : 'coins');
  const to = target ? { x: target.left + target.width * (f.kind === 'xp' ? 0.6 : 0.5), y: target.top + target.height / 2 } : { x: f.from.x, y: f.from.y - 90 };
  const dx = to.x - f.from.x;
  const dy = to.y - f.from.y;

  return (
    <m.div
      className="pointer-events-none fixed top-0 left-0 z-[90] flex items-center gap-1 font-display font-bold whitespace-nowrap"
      style={{ x: f.from.x, y: f.from.y, translateX: '-50%', translateY: '-50%' }}
      initial={{ opacity: 0, scale: 0.6 }}
      animate={
        reduced
          ? { opacity: [0, 1, 1, 0], transition: { duration: 1.1 } }
          : {
              opacity: [0, 1, 1, 0],
              scale: [0.6, 1.25, 1, 0.55],
              x: [f.from.x, f.from.x, f.from.x + dx * 0.15, to.x],
              y: [f.from.y, f.from.y - 46, f.from.y - 56 + dy * 0.1, to.y],
              transition: { duration: target ? 1.05 : 1.2, times: [0, 0.22, 0.45, 1], ease: [0.45, 0, 0.2, 1] },
            }
      }
      onAnimationComplete={() => remove(f.id)}
      aria-hidden
    >
      {f.kind === 'coins' && <CoinIcon size={18} />}
      <span
        className={f.kind === 'xp' ? 'text-[22px] text-accent-ink' : 'text-lg text-coin'}
        style={{ textShadow: f.kind === 'xp' ? '0 0 18px var(--accent), 0 2px 10px rgb(0 0 0 / 0.5)' : '0 0 14px #f5c45199, 0 2px 8px rgb(0 0 0 / 0.5)' }}
      >
        +{formatNumber(f.amount)}
        {f.kind === 'xp' ? ' XP' : ''}
      </span>
    </m.div>
  );
});

/* ───────────── Particle canvas ───────────── */

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  kind: 'spark' | 'shard' | 'star' | 'ring';
  rot: number;
  vr: number;
}

function resolveColor(c: string): string {
  const m = /var\((--[\w-]+)\)/.exec(c);
  if (!m) return c;
  return getComputedStyle(document.documentElement).getPropertyValue(m[1]).trim() || '#8b7bff';
}

function spawn(b: Burst): Particle[] {
  const colors = b.colors.map(resolveColor);
  const pick = () => colors[Math.floor(Math.random() * colors.length)];
  const out: Particle[] = [];
  const power = b.power;
  switch (b.style) {
    case 'fx:ripple':
      for (let i = 0; i < 3; i++) out.push({ x: b.x, y: b.y, vx: 0, vy: 0, life: -i * 7, max: 46, size: 6, color: colors[i % colors.length], kind: 'ring', rot: 0, vr: 0 });
      break;
    case 'fx:shards':
      for (let i = 0; i < 26 * power; i++) {
        const a = Math.random() * Math.PI * 2;
        const v = 3 + Math.random() * 6;
        out.push({ x: b.x, y: b.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, life: 0, max: 46 + Math.random() * 20, size: 4 + Math.random() * 6, color: pick(), kind: 'shard', rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4 });
      }
      break;
    case 'fx:starfall':
      for (let i = 0; i < 22 * power; i++) {
        out.push({ x: b.x + (Math.random() - 0.5) * 220, y: b.y - 120 - Math.random() * 120, vx: (Math.random() - 0.5) * 1.2, vy: 2 + Math.random() * 3, life: 0, max: 60 + Math.random() * 25, size: 3 + Math.random() * 4, color: pick(), kind: 'star', rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.2 });
      }
      break;
    default:
      for (let i = 0; i < 34 * power; i++) {
        const a = Math.random() * Math.PI * 2;
        const v = 2.5 + Math.random() * 7 * power;
        out.push({ x: b.x, y: b.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2.5, life: 0, max: 34 + Math.random() * 26, size: 1.4 + Math.random() * 2.2, color: pick(), kind: 'spark', rot: 0, vr: 0 });
      }
  }
  return out;
}

function draw(ctx: CanvasRenderingContext2D, p: Particle) {
  const t = Math.max(0, p.life) / p.max;
  const alpha = p.kind === 'ring' ? 1 - t : t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85;
  if (alpha <= 0) return;
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.fillStyle = p.color;
  ctx.strokeStyle = p.color;
  switch (p.kind) {
    case 'ring': {
      if (p.life < 0) return;
      ctx.lineWidth = 2.5 * (1 - t) + 0.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 10 + t * 120, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case 'spark': {
      const len = Math.hypot(p.vx, p.vy) * 2.2;
      const a = Math.atan2(p.vy, p.vx);
      ctx.lineWidth = p.size;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - Math.cos(a) * len, p.y - Math.sin(a) * len);
      ctx.stroke();
      break;
    }
    case 'shard': {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.beginPath();
      ctx.moveTo(0, -p.size);
      ctx.lineTo(p.size * 0.45, 0);
      ctx.lineTo(0, p.size);
      ctx.lineTo(-p.size * 0.45, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      break;
    }
    case 'star': {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const r = i % 2 === 0 ? p.size * 2 : p.size * 0.45;
        const a = (i / 8) * Math.PI * 2;
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      break;
    }
  }
}

function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const raf = useRef<number | null>(null);
  const bursts = useUI((s) => s.bursts);
  const removeBurst = useUI((s) => s.removeBurst);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !bursts.length) return;
    for (const b of bursts) {
      particles.current.push(...spawn(b));
      removeBurst(b.id);
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const tick = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      ctx.globalCompositeOperation = 'lighter';
      const alive: Particle[] = [];
      for (const p of particles.current) {
        p.life += 1;
        if (p.life > p.max) continue;
        if (p.life > 0 && p.kind !== 'ring') {
          p.x += p.vx;
          p.y += p.vy;
          p.vx *= 0.955;
          p.vy = p.vy * 0.955 + (p.kind === 'star' ? 0.02 : 0.18);
          p.rot += p.vr;
        }
        draw(ctx, p);
        alive.push(p);
      }
      particles.current = alive;
      ctx.globalAlpha = 1;
      if (alive.length) raf.current = requestAnimationFrame(tick);
      else {
        raf.current = null;
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      }
    };
    if (raf.current === null) raf.current = requestAnimationFrame(tick);
  }, [bursts, removeBurst]);

  useEffect(() => () => {
    if (raf.current !== null) cancelAnimationFrame(raf.current);
  }, []);

  return <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-[85] h-full w-full" aria-hidden />;
}

export function FxLayer() {
  const floaters = useUI((s) => s.floaters);
  return (
    <>
      <ParticleCanvas />
      <AnimatePresence>
        {floaters.map((f) => (
          <FloaterView key={f.id} f={f} />
        ))}
      </AnimatePresence>
    </>
  );
}
