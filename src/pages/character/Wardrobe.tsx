import { useMemo, useState } from 'react';
import type { CosmeticItem, CosmeticSlot, Profile } from '@/types';
import { COSMETICS, SLOT_LABEL, SLOT_ORDER } from '@/data/cosmetics';
import { RARITY_LABEL, RARITY_VAR } from '@/data/difficulty';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import { navigate } from '@/lib/router';
import { equipItem, unequipTitle } from '@/lib/engine/gameEngine';
import { dispatch, useGame } from '@/store/gameStore';
import { Avatar } from '@/components/game/Avatar';
import { BadgeEmblem, CosmeticPreview, heroName, unlockHint } from '@/components/game/Cosmetic';
import { CoinIcon } from '@/components/game/Hud';
import { RarityGem } from '@/components/game/Tags';
import { Tabs } from '@/components/ui/Display';
import { Icon } from '@/components/ui/Icon';

function isEquipped(item: CosmeticItem, profile: Profile, accent: string): boolean {
  switch (item.slot) {
    case 'sigil':
    case 'background':
    case 'frame':
    case 'aura':
      return profile.avatar[item.slot] === item.id;
    case 'title':
      return profile.titleId === item.id;
    case 'badge':
      return profile.badgeId === item.id;
    case 'xpEffect':
      return profile.xpEffect === item.id;
    case 'uiEffect':
      return profile.uiEffect === item.id;
    case 'theme':
      return `theme:${accent}` === item.id;
  }
}

const SLOT_HELP: Record<CosmeticSlot, string> = {
  sigil: 'The emblem at the heart of your avatar.',
  background: 'The backdrop behind your sigil.',
  frame: 'The ring around your avatar.',
  aura: 'A living effect around your avatar.',
  title: 'Shown with your name: “Alex the Consistent”.',
  badge: 'A badge beside your name. Tap the equipped badge to remove it.',
  xpEffect: 'How XP looks when it flies to your bar.',
  uiEffect: 'The burst when you complete a quest.',
  theme: 'The accent color of the whole app.',
};

export default function Wardrobe() {
  const profile = useGame((s) => s.profile)!;
  const inventory = useGame((s) => s.meta.inventory);
  const achievementRecords = useGame((s) => s.achievements);
  const accent = useGame((s) => s.settings.accent);
  const [slot, setSlot] = useState<CosmeticSlot>('sigil');

  const owned = useMemo(() => new Set(inventory), [inventory]);
  const unlockedAchievements = useMemo(() => new Set(achievementRecords.map((a) => a.id)), [achievementRecords]);
  const items = COSMETICS.filter((c) => c.slot === slot);
  const ownedCount = items.filter((c) => owned.has(c.id)).length;

  const equip = (item: CosmeticItem) => {
    if (item.slot === 'title' && profile.titleId === item.id) return;
    dispatch((s, now) => equipItem(s, item.id, now));
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">
      <aside className="card hud-corners relative overflow-hidden p-6 text-center lg:sticky lg:top-24" aria-label="Preview">
        <div className="pointer-events-none absolute -top-24 left-1/2 size-80 -translate-x-1/2 rounded-full opacity-70" style={{ background: 'radial-gradient(circle, color-mix(in oklab, var(--accent) 22%, transparent), transparent 70%)' }} aria-hidden />
        <div className="relative grid place-items-center">
          <Avatar avatar={profile.avatar} size={148} label="Your avatar" />
        </div>
        <p className="relative mt-4 flex items-center justify-center gap-2 font-display text-lg font-bold tracking-[0.08em] text-fg uppercase">
          <span className="min-w-0 break-words">{heroName(profile.name, profile.titleId)}</span>
          {profile.badgeId && <BadgeEmblem itemId={profile.badgeId} size={20} />}
        </p>
        <p className="relative mt-1 text-xs text-muted">Cosmetics are just for style — they never change XP or progress.</p>
      </aside>

      <div className="min-w-0 space-y-5">
        <Tabs<CosmeticSlot> label="Cosmetic slots" value={slot} onChange={setSlot} items={SLOT_ORDER.map((s) => ({ id: s, label: SLOT_LABEL[s] }))} />
        <div className="flex items-baseline justify-between gap-3 px-1">
          <p className="text-sm text-muted">{SLOT_HELP[slot]}</p>
          <p className="shrink-0 text-xs text-faint num">
            {ownedCount}/{items.length} owned
          </p>
        </div>

        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {slot === 'title' && (
            <li>
              <button
                type="button"
                aria-pressed={!profile.titleId}
                onClick={() => dispatch((s) => unequipTitle(s))}
                className={cn('card flex h-full w-full flex-col items-center gap-2 p-3.5 text-center transition hover:border-line-strong', !profile.titleId && 'border-accent! shadow-[0_0_0_1px_var(--accent)]')}
              >
                <div className="grid min-h-16 place-items-center text-sm text-muted">No title</div>
                <span className="text-xs text-muted">{!profile.titleId ? 'Equipped' : 'Just your name'}</span>
              </button>
            </li>
          )}
          {items.map((item) => {
            const has = owned.has(item.id);
            const on = isEquipped(item, profile, accent);
            const color = RARITY_VAR[item.rarity];
            if (!has) {
              return (
                <li key={item.id} className="card relative flex flex-col items-center gap-2 p-3.5 text-center" aria-label={`${item.name}, locked. ${unlockHint(item, unlockedAchievements)}`}>
                  <div className="pointer-events-none opacity-35 grayscale" aria-hidden>
                    <CosmeticPreview itemId={item.id} size={64} />
                  </div>
                  <span className="absolute top-2.5 right-2.5 grid size-6 place-items-center rounded-full bg-surface-3 text-muted" aria-hidden>
                    <Icon name="lock" size={12} />
                  </span>
                  <p className="text-sm font-medium text-muted">{item.name}</p>
                  {item.unlock.type === 'shop' ? (
                    <button type="button" onClick={() => navigate('/character/shop')} className="inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-1 text-xs text-muted transition hover:border-line-strong hover:text-fg">
                      <CoinIcon size={12} /> {formatNumber(item.unlock.price)} in shop
                    </button>
                  ) : (
                    <p className="text-xs leading-snug text-faint">{unlockHint(item, unlockedAchievements)}</p>
                  )}
                </li>
              );
            }
            return (
              <li key={item.id}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => equip(item)}
                  className={cn('card relative flex h-full w-full flex-col items-center gap-2 p-3.5 text-center transition hover:border-line-strong active:scale-[0.98]', on && 'border-accent! shadow-[0_0_0_1px_var(--accent)]')}
                >
                  <CosmeticPreview itemId={item.id} size={64} />
                  <span className="flex items-center gap-1.5 text-sm font-medium text-fg">
                    <RarityGem rarity={item.rarity} size={9} />
                    {item.name}
                  </span>
                  <span className="text-xs" style={{ color: on ? 'var(--accent-ink)' : undefined }}>
                    {on ? (
                      <span className="inline-flex items-center gap-1 font-semibold">
                        <Icon name="check" size={12} /> Equipped
                      </span>
                    ) : (
                      <span className="text-muted">
                        <span className="sr-only">{RARITY_LABEL[item.rarity]} · </span>
                        Tap to equip
                      </span>
                    )}
                  </span>
                  <span className="absolute inset-x-6 bottom-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
