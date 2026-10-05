import { AnimatePresence, m } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CosmeticItem, CosmeticSlot } from '@/types';
import { COSMETICS, SLOT_LABEL, SLOT_ORDER } from '@/data/cosmetics';
import { RARITY_VAR } from '@/data/difficulty';
import { effectColors, prefersReducedMotion } from '@/lib/celebrate';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import { equipItem, purchaseItem } from '@/lib/engine/gameEngine';
import { dispatch, useGame, useGameStore } from '@/store/gameStore';
import { useUI } from '@/store/uiStore';
import { CosmeticPreview } from '@/components/game/Cosmetic';
import { CoinIcon } from '@/components/game/Hud';
import { RarityTag } from '@/components/game/Tags';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { ConfirmDialog } from '@/components/ui/Overlay';

const SHOP_ITEMS = COSMETICS.filter((c) => c.unlock.type === 'shop').sort((a, b) => price(a) - price(b));
const FEATURED = ['frame:cyber', 'xp:golden'];

function price(item: CosmeticItem): number {
  return item.unlock.type === 'shop' ? item.unlock.price : 0;
}
function minLevel(item: CosmeticItem): number {
  return item.unlock.type === 'shop' ? (item.unlock.minLevel ?? 0) : 0;
}

/** The lock that springs open after a purchase. */
function LockBurst({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    const a = setTimeout(() => setOpen(true), 520);
    const b = setTimeout(() => done.current(), 1500);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, []);
  return (
    <m.div className="absolute inset-0 z-10 grid place-items-center bg-bg/70 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.35 } }} aria-hidden>
      <m.span
        className="grid size-16 place-items-center rounded-full border border-coin/50 bg-coin/14 text-coin"
        animate={open ? { scale: [1, 1.35, 1.1], rotate: 0 } : { rotate: [0, -12, 12, -8, 8, 0] }}
        transition={open ? { duration: 0.5, ease: [0.16, 1, 0.3, 1] } : { duration: 0.5 }}
        style={{ boxShadow: '0 0 32px -6px var(--coin)' }}
      >
        <Icon name={open ? 'lock-open' : 'lock'} size={28} />
      </m.span>
      {open && <m.span className="absolute size-16 rounded-full border-2 border-coin" initial={{ scale: 1, opacity: 0.8 }} animate={{ scale: 2.6, opacity: 0 }} transition={{ duration: 0.8 }} />}
    </m.div>
  );
}

function ShopCard({ item, featured, onBuy, opening, onOpened }: { item: CosmeticItem; featured?: boolean; onBuy: (item: CosmeticItem) => void; opening: boolean; onOpened: () => void }) {
  const level = useGame((s) => s.profile?.level ?? 1);
  const coins = useGame((s) => s.profile?.coins ?? 0);
  const owned = useGame((s) => s.meta.inventory.includes(item.id));
  const equipped = useGame((s) => {
    const p = s.profile;
    if (!p) return false;
    if (item.slot === 'sigil' || item.slot === 'background' || item.slot === 'frame' || item.slot === 'aura') return p.avatar[item.slot] === item.id;
    if (item.slot === 'title') return p.titleId === item.id;
    if (item.slot === 'badge') return p.badgeId === item.id;
    if (item.slot === 'xpEffect') return p.xpEffect === item.id;
    if (item.slot === 'uiEffect') return p.uiEffect === item.id;
    return `theme:${s.settings.accent}` === item.id;
  });
  const cost = price(item);
  const needLevel = minLevel(item);
  const levelLocked = !owned && level < needLevel;
  const short = Math.max(0, cost - coins);
  const color = RARITY_VAR[item.rarity];

  return (
    <li data-shop-item={item.id} className={cn('card relative flex flex-col overflow-hidden', featured ? 'sm:flex-row' : '')}>
      <div className={cn('relative grid place-items-center overflow-hidden border-b border-line', featured ? 'h-44 sm:h-auto sm:w-56 sm:border-r sm:border-b-0' : 'h-32')} style={{ background: `radial-gradient(circle at 50% 60%, color-mix(in oklab, ${color} 16%, transparent), transparent 70%)` }}>
        <div className={cn(levelLocked && 'opacity-40 grayscale')}>
          <CosmeticPreview itemId={item.id} size={featured ? 96 : 76} />
        </div>
        {levelLocked && (
          <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-md border border-line-strong bg-surface-2/90 px-2 py-1 font-display text-[10.5px] font-bold tracking-[0.16em] text-muted uppercase">
            <Icon name="lock" size={11} /> Locked
          </span>
        )}
        {owned && !opening && (
          <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-md border border-success/40 bg-success/12 px-2 py-1 font-display text-[10.5px] font-bold tracking-[0.16em] text-success uppercase">
            <Icon name="check" size={11} /> Owned
          </span>
        )}
        <AnimatePresence>{opening && <LockBurst onDone={onOpened} />}</AnimatePresence>
      </div>
      <div className="flex flex-1 flex-col p-4">
        {featured && <p className="hud-label mb-1 !text-accent-ink">Featured</p>}
        <h3 className="font-display text-[15px] font-bold tracking-[0.1em] text-fg uppercase">{item.name}</h3>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <RarityTag rarity={item.rarity} />
          <span className="text-xs text-muted">{SLOT_LABEL[item.slot].replace(/s$/, '')}</span>
        </div>
        <p className="mt-2 flex-1 text-[13px] text-muted">{item.description}</p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className={cn('inline-flex items-center gap-1.5 font-display text-lg font-bold num', owned ? 'text-muted line-through decoration-1' : 'text-coin')}>
            <CoinIcon size={17} /> {formatNumber(cost)}
          </span>
          {owned ? (
            equipped ? (
              <Button variant="success" size="sm" icon="check" disabled>
                Equipped
              </Button>
            ) : (
              <Button variant="secondary" size="sm" onClick={() => dispatch((s, now) => equipItem(s, item.id, now))}>
                Equip
              </Button>
            )
          ) : levelLocked ? (
            <Button variant="outline" size="sm" icon="lock" disabled>
              Level {needLevel}
            </Button>
          ) : short > 0 ? (
            <Button variant="outline" size="sm" disabled>
              Need {formatNumber(short)} more
            </Button>
          ) : (
            <Button variant="primary" size="sm" icon="shopping-bag" onClick={() => onBuy(item)}>
              Buy
            </Button>
          )}
        </div>
      </div>
    </li>
  );
}

export default function Shop() {
  const coins = useGame((s) => s.profile?.coins ?? 0);
  const ownedCount = useGame((s) => SHOP_ITEMS.filter((i) => s.meta.inventory.includes(i.id)).length);
  const [filter, setFilter] = useState<CosmeticSlot | 'all'>('all');
  const [confirm, setConfirm] = useState<CosmeticItem | null>(null);
  const [opening, setOpening] = useState<string | null>(null);

  const slots = useMemo(() => SLOT_ORDER.filter((s) => SHOP_ITEMS.some((i) => i.slot === s)), []);
  const featured = SHOP_ITEMS.filter((i) => FEATURED.includes(i.id));
  const list = SHOP_ITEMS.filter((i) => !FEATURED.includes(i.id) && (filter === 'all' || i.slot === filter));

  const buy = () => {
    const item = confirm;
    setConfirm(null);
    if (!item) return;
    const res = dispatch((s, now) => purchaseItem(s, item.id, now));
    if (res.error) return;
    setOpening(item.id);
    const state = useGameStore.getState().state;
    const el = document.querySelector(`[data-shop-item="${CSS.escape(item.id)}"]`);
    if (el && state.settings.intenseEffects && !prefersReducedMotion()) {
      const r = el.getBoundingClientRect();
      useUI.getState().burst({ x: r.left + r.width / 2, y: r.top + Math.min(r.height / 2, 90), style: state.profile?.uiEffect ?? 'fx:sparks', colors: effectColors(state), power: 1.1 });
    }
  };

  return (
    <div className="space-y-7">
      <section className="card relative overflow-hidden p-5 sm:p-6" aria-label="Your coins">
        <div className="pointer-events-none absolute -top-20 -right-16 size-64 rounded-full opacity-60" style={{ background: 'radial-gradient(circle, color-mix(in oklab, var(--coin) 22%, transparent), transparent 70%)' }} aria-hidden />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="hud-label">XP Coins</p>
            <p className="mt-1.5 flex items-center gap-2 font-display text-4xl font-bold text-fg num">
              <CoinIcon size={30} /> {formatNumber(coins)}
            </p>
          </div>
          <p className="text-sm text-muted">
            {ownedCount}/{SHOP_ITEMS.length} shop items owned
          </p>
        </div>
        <p className="relative mt-3 max-w-xl text-[13px] text-muted">Earn coins from level-ups, achievements, daily goals and challenges. Everything here is cosmetic — it never changes XP or progress, and nothing costs real money.</p>
      </section>

      <section aria-labelledby="featured-title" className="space-y-3">
        <h2 id="featured-title" className="hud-label px-1">
          Featured
        </h2>
        <ul className="grid gap-3 lg:grid-cols-2">
          {featured.map((item) => (
            <ShopCard key={item.id} item={item} featured onBuy={setConfirm} opening={opening === item.id} onOpened={() => setOpening(null)} />
          ))}
        </ul>
      </section>

      <section aria-labelledby="catalog-title" className="space-y-3">
        <h2 id="catalog-title" className="hud-label px-1">
          Catalog
        </h2>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4" role="group" aria-label="Filter by type">
          <Chip selected={filter === 'all'} onClick={() => setFilter('all')} className="shrink-0">
            All
          </Chip>
          {slots.map((s) => (
            <Chip key={s} selected={filter === s} onClick={() => setFilter(s)} className="shrink-0">
              {SLOT_LABEL[s]}
            </Chip>
          ))}
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((item) => (
            <ShopCard key={item.id} item={item} onBuy={setConfirm} opening={opening === item.id} onOpened={() => setOpening(null)} />
          ))}
        </ul>
      </section>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={buy}
        title={confirm ? `Buy ${confirm.name}?` : 'Buy item?'}
        message={confirm ? `${formatNumber(price(confirm))} coins. You’ll have ${formatNumber(coins - price(confirm))} left. Cosmetic only — your progress is unaffected.` : ''}
        confirmLabel="Buy"
      />
    </div>
  );
}
