import type { CategoryId, QuestDifficulty, Rarity } from '@/types';
import { attributeColor } from '@/data/attributes';
import { getCategory } from '@/data/categories';
import { QUEST_DIFFICULTY_MAP, RARITY_LABEL, RARITY_VAR } from '@/data/difficulty';
import { cn } from '@/lib/cn';
import { Icon } from '@/components/ui/Icon';

const TAG = 'inline-flex h-6 items-center gap-1.5 rounded-md border border-line bg-surface-2 px-2 font-display text-[10.5px] font-semibold tracking-[0.12em] text-muted uppercase';

export function CategoryTag({ category, className }: { category: CategoryId; className?: string }) {
  const c = getCategory(category);
  return (
    <span className={cn(TAG, className)}>
      <span className="size-1.5 rounded-full" style={{ background: attributeColor(c.attribute) }} aria-hidden />
      {c.tag}
    </span>
  );
}

export function RarityGem({ rarity, size = 10 }: { rarity: Rarity; size?: number }) {
  return (
    <span
      aria-hidden
      className={cn('inline-block rotate-45 rounded-[2px]', rarity === 'mythic' && 'mythic-sheen')}
      style={{ width: size * 0.78, height: size * 0.78, background: rarity === 'mythic' ? undefined : RARITY_VAR[rarity], boxShadow: `0 0 8px ${RARITY_VAR[rarity]}` }}
    />
  );
}

export function DifficultyTag({ difficulty, className }: { difficulty: QuestDifficulty; className?: string }) {
  const d = QUEST_DIFFICULTY_MAP[difficulty];
  return (
    <span className={cn(TAG, className)}>
      <RarityGem rarity={d.rarity} size={9} />
      {d.name}
    </span>
  );
}

export function RarityTag({ rarity, className }: { rarity: Rarity; className?: string }) {
  return (
    <span className={cn(TAG, className)} style={{ borderColor: `color-mix(in oklab, ${RARITY_VAR[rarity]} 45%, transparent)` }}>
      <RarityGem rarity={rarity} size={9} />
      <span className="text-fg">{RARITY_LABEL[rarity]}</span>
    </span>
  );
}

export function CategoryIcon({ category, size = 44, className }: { category: CategoryId; size?: number; className?: string }) {
  const c = getCategory(category);
  const color = attributeColor(c.attribute);
  return (
    <span
      className={cn('grid shrink-0 place-items-center rounded-[14px] border', className)}
      style={{ width: size, height: size, color, background: `color-mix(in oklab, ${color} 14%, transparent)`, borderColor: `color-mix(in oklab, ${color} 28%, transparent)` }}
      aria-hidden
    >
      <Icon name={c.icon} size={Math.round(size * 0.46)} />
    </span>
  );
}
