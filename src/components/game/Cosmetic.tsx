import type { AccentId, CosmeticItem, Rarity } from '@/types';
import { ACHIEVEMENT_MAP } from '@/data/achievements';
import { BADGE_ICON, COSMETIC_MAP, itemKey } from '@/data/cosmetics';
import { EVENT_MAP } from '@/data/events';
import { RARITY_VAR } from '@/data/difficulty';
import { XP_EFFECT_COLORS } from '@/lib/celebrate';
import { cn } from '@/lib/cn';
import { Icon } from '@/components/ui/Icon';
import { AVATAR_BACKGROUNDS, Avatar } from './Avatar';

export const THEME_SWATCH: Record<AccentId, [string, string]> = {
  electric: ['#8b7bff', '#4fa3ff'],
  cyan: ['#22d3ee', '#60a5fa'],
  emerald: ['#34d399', '#22d3ee'],
  amber: ['#fbbf24', '#fb923c'],
  crimson: ['#fb5470', '#fb923c'],
  violet: ['#c084fc', '#f472b6'],
  aurum: ['#f2c66d', '#e8a33c'],
  synth: ['#f472b6', '#22d3ee'],
  mono: ['#e7e9ee', '#9aa2b4'],
};

const UI_EFFECT_ICON: Record<string, string> = { 'fx:sparks': 'sparkles', 'fx:ripple': 'target', 'fx:shards': 'diamond', 'fx:starfall': 'star' };

export function BadgeEmblem({ itemId, size = 22, rarity }: { itemId: string; size?: number; rarity?: Rarity }) {
  const item = COSMETIC_MAP[itemId];
  const r = rarity ?? item?.rarity ?? 'common';
  const color = RARITY_VAR[r];
  return (
    <span className="relative inline-grid shrink-0 place-items-center" style={{ width: size, height: size * 1.1, color }} role="img" aria-label={item ? `${item.name} badge` : 'Badge'}>
      <svg viewBox="0 0 40 44" className="absolute inset-0 h-full w-full" aria-hidden>
        <path d="M20 1.5 37.3 11.5v21L20 42.5 2.7 32.5v-21z" fill="currentColor" fillOpacity="0.16" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
      </svg>
      <Icon name={BADGE_ICON[itemId] ?? 'sparkle'} size={Math.round(size * 0.5)} className="relative" />
    </span>
  );
}

export function titleText(titleId: string | null | undefined): string | null {
  if (!titleId) return null;
  return COSMETIC_MAP[titleId]?.name ?? null;
}

/** "AHMED THE CONSISTENT" — the player's name with their equipped title. */
export function heroName(name: string, titleId: string | null | undefined): string {
  const title = titleText(titleId);
  if (!title) return name;
  return /^the /i.test(title) ? `${name} ${title}` : `${name}, ${title}`;
}

/** How a locked cosmetic is earned. Secret achievements stay secret until unlocked. */
export function unlockHint(item: CosmeticItem, unlockedAchievements?: ReadonlySet<string>): string {
  const u = item.unlock;
  switch (u.type) {
    case 'default':
      return 'Starter item';
    case 'level':
      return `Reach Level ${u.level}`;
    case 'achievement': {
      const def = ACHIEVEMENT_MAP[u.achievementId];
      if (!def) return 'Unlocked by an achievement';
      return def.secret && !unlockedAchievements?.has(def.id) ? 'Unlocked by a secret achievement' : `Achievement: ${def.name}`;
    }
    case 'shop':
      return u.minLevel ? `Shop · Level ${u.minLevel}+` : 'Shop';
    case 'event':
      return `Event: ${EVENT_MAP[u.eventId]?.name ?? 'Special event'}`;
  }
}

export function CosmeticPreview({ itemId, size = 64, className }: { itemId: string; size?: number; className?: string }) {
  const item = COSMETIC_MAP[itemId];
  if (!item) return null;
  const box = cn('grid place-items-center', className);
  switch (item.slot) {
    case 'sigil':
      return <Avatar avatar={{ sigil: itemId, background: 'bg:void', frame: 'frame:simple', aura: 'aura:none' }} size={size} plain className={className} />;
    case 'background':
      return <div className={cn('rounded-full shadow-[inset_0_1px_0_rgb(255_255_255/0.15)]', className)} style={{ width: size * 0.84, height: size * 0.84, background: AVATAR_BACKGROUNDS[itemId] }} aria-hidden />;
    case 'frame':
      return <Avatar avatar={{ sigil: 'sigil:spark', background: 'bg:void', frame: itemId, aura: 'aura:none' }} size={size} plain className={className} />;
    case 'aura':
      return <Avatar avatar={{ sigil: 'sigil:spark', background: 'bg:midnight', frame: 'frame:simple', aura: itemId }} size={size * 0.8} className={className} />;
    case 'xpEffect': {
      const colors = XP_EFFECT_COLORS[itemId] ?? XP_EFFECT_COLORS['xp:standard'];
      return (
        <div className={box} style={{ width: size, height: size }}>
          <span className="font-display text-base font-bold" style={{ backgroundImage: `linear-gradient(90deg, ${colors.join(', ')})`, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', filter: `drop-shadow(0 0 8px ${colors[0]})` }}>
            +50 XP
          </span>
        </div>
      );
    }
    case 'uiEffect':
      return (
        <div className={box} style={{ width: size, height: size }}>
          <Icon name={UI_EFFECT_ICON[itemId] ?? 'sparkles'} size={size * 0.42} className="text-accent" style={{ filter: 'drop-shadow(0 0 8px var(--accent))' }} />
        </div>
      );
    case 'theme': {
      const [a, b] = THEME_SWATCH[itemKey(itemId) as AccentId] ?? THEME_SWATCH.electric;
      return <div className={cn('rounded-full', className)} style={{ width: size * 0.7, height: size * 0.7, background: `linear-gradient(135deg, ${a} 0 50%, ${b} 50% 100%)`, boxShadow: `0 0 18px -4px ${a}` }} aria-hidden />;
    }
    case 'title':
      return (
        <div className={box} style={{ minHeight: size }}>
          <span className="px-1 text-center font-display text-[13px] font-semibold tracking-[0.14em] text-accent-ink uppercase">{item.name}</span>
        </div>
      );
    case 'badge':
      return (
        <div className={box} style={{ width: size, height: size }}>
          <BadgeEmblem itemId={itemId} size={size * 0.55} />
        </div>
      );
  }
}
