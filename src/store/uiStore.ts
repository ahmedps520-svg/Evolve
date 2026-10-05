import { create } from 'zustand';
import type { CategoryId, DateKey, Rarity } from '@/types';
import type { QuestInput } from '@/lib/engine/validation';
import { uid } from '@/lib/id';

export type ToastKind = 'quest' | 'achievement' | 'info' | 'success' | 'error' | 'streak' | 'unlock' | 'level' | 'rest' | 'challenge';

export interface Toast {
  id: string;
  kind: ToastKind;
  title: string;
  message?: string;
  xp?: number;
  coins?: number;
  icon?: string;
  rarity?: Rarity;
  action?: { label: string; run: () => void };
  duration?: number;
}

export type Celebration =
  | { id: string; type: 'levelUp'; from: number; to: number; coins: number; unlocks: string[] }
  | { id: string; type: 'achievement'; achievementId: string }
  | {
      id: string;
      type: 'loot';
      tone: 'boss' | 'event' | 'goal' | 'challenge' | 'bounty';
      title: string;
      subtitle: string;
      xp: number;
      coins: number;
      items: string[];
    }
  | { id: string; type: 'summary'; dateKey: DateKey; heading: string };

export interface Floater {
  id: string;
  amount: number;
  kind: 'xp' | 'coins';
  from: { x: number; y: number };
}

export interface Burst {
  id: string;
  x: number;
  y: number;
  style: string;
  colors: string[];
  power: number;
}

export type Sheet =
  | { type: 'log'; category?: CategoryId; questId?: string; minutes?: number }
  | { type: 'quest'; questId?: string; goalId?: string; preset?: Partial<QuestInput> }
  | { type: 'generator'; goalId?: string; prompt?: string }
  | { type: 'goal'; goalId?: string }
  | { type: 'focus'; questId?: string; category?: CategoryId }
  | { type: 'journal'; dateKey: DateKey }
  | { type: 'party' }
  | { type: 'rest' };

interface UIState {
  toasts: Toast[];
  celebrations: Celebration[];
  floaters: Floater[];
  bursts: Burst[];
  sheet: Sheet | null;
  origin: { x: number; y: number } | null;
  hudPulse: number;
  streakBump: number;
  momentumPulse: number;
  busy: string | null;

  toast(t: Omit<Toast, 'id'>): string;
  dismissToast(id: string): void;
  celebrate(c: Celebration | Omit<Extract<Celebration, { type: 'levelUp' }>, 'id'> | Omit<Celebration, 'id'>): void;
  finishCelebration(): void;
  addFloater(f: Omit<Floater, 'id'>): void;
  removeFloater(id: string): void;
  burst(b: Omit<Burst, 'id'>): void;
  removeBurst(id: string): void;
  openSheet(s: Sheet): void;
  closeSheet(): void;
  setOrigin(o: { x: number; y: number } | null): void;
  pulseHud(): void;
  bumpStreak(): void;
  pulseMomentum(): void;
  setBusy(label: string | null): void;
}

const MAX_TOASTS = 3;

export const useUI = create<UIState>()((set) => ({
  toasts: [],
  celebrations: [],
  floaters: [],
  bursts: [],
  sheet: null,
  origin: null,
  hudPulse: 0,
  streakBump: 0,
  momentumPulse: 0,
  busy: null,

  toast: (t) => {
    const id = uid('t_');
    set((s) => ({ toasts: [...s.toasts, { ...t, id }].slice(-MAX_TOASTS) }));
    return id;
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  celebrate: (c) => set((s) => ({ celebrations: [...s.celebrations, { ...(c as Celebration), id: uid('c_') }] })),
  finishCelebration: () => set((s) => ({ celebrations: s.celebrations.slice(1) })),
  addFloater: (f) => set((s) => ({ floaters: [...s.floaters, { ...f, id: uid('f_') }].slice(-6) })),
  removeFloater: (id) => set((s) => ({ floaters: s.floaters.filter((f) => f.id !== id) })),
  burst: (b) => set((s) => ({ bursts: [...s.bursts, { ...b, id: uid('b_') }].slice(-6) })),
  removeBurst: (id) => set((s) => ({ bursts: s.bursts.filter((b) => b.id !== id) })),
  openSheet: (sheet) => set({ sheet }),
  closeSheet: () => set({ sheet: null }),
  setOrigin: (origin) => set({ origin }),
  pulseHud: () => set((s) => ({ hudPulse: s.hudPulse + 1 })),
  bumpStreak: () => set((s) => ({ streakBump: s.streakBump + 1 })),
  pulseMomentum: () => set((s) => ({ momentumPulse: s.momentumPulse + 1 })),
  setBusy: (busy) => set({ busy }),
}));

/** Remember where an interaction happened so XP can fly from there. */
export function fxFrom(target: EventTarget | Element | null | undefined): void {
  if (!target || !(target instanceof Element)) return;
  const r = target.getBoundingClientRect();
  useUI.getState().setOrigin({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
}

/** Elements that XP and coins fly towards (the HUD counters). Several may exist; the visible one wins. */
type FxKind = 'xp' | 'coins' | 'streak';
const targets: Record<FxKind, Set<HTMLElement>> = { xp: new Set(), coins: new Set(), streak: new Set() };

export function registerFxTarget(kind: FxKind, el: HTMLElement): () => void {
  targets[kind].add(el);
  return () => targets[kind].delete(el);
}

export function fxTarget(kind: FxKind): DOMRect | null {
  for (const el of targets[kind]) {
    if (!el.isConnected) continue;
    const r = el.getBoundingClientRect();
    const visible = r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < window.innerHeight;
    if (visible) return r;
  }
  return null;
}
