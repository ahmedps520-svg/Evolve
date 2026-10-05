/**
 * Turns engine events into feedback: floating XP, particles, toasts, celebration modals, sounds and
 * haptics. Quiet by default, loud when it matters — and calm when reduced motion is on.
 */
import type { GameEvent, GameState } from '@/types';
import { ACHIEVEMENT_MAP } from '@/data/achievements';
import { getCategory } from '@/data/categories';
import { COSMETIC_MAP } from '@/data/cosmetics';
import { EVENT_MAP } from '@/data/events';
import { RARITY_ORDER } from '@/data/difficulty';
import { haptic } from '@/lib/haptics';
import { playSound, type SoundName } from '@/lib/sound';
import { formatNumber } from '@/lib/format';
import { useUI } from '@/store/uiStore';

/** Particle palettes for the equipped XP effect. */
export const XP_EFFECT_COLORS: Record<string, string[]> = {
  'xp:standard': ['var(--accent)', 'var(--accent-2)', '#ffffff'],
  'xp:golden': ['#f5c451', '#ffe7a3', '#d9a019'],
  'xp:plasma': ['#22d3ee', '#a78bfa', '#e0e7ff'],
  'xp:ember': ['#fb923c', '#f87171', '#fde68a'],
  'xp:frost': ['#93c5fd', '#e0f2fe', '#67e8f9'],
  'xp:prismatic': ['#fb7185', '#c084fc', '#60a5fa', '#34d399', '#fbbf24'],
};

export function effectColors(state: GameState): string[] {
  return XP_EFFECT_COLORS[state.profile?.xpEffect ?? 'xp:standard'] ?? XP_EFFECT_COLORS['xp:standard'];
}

const SOUND_PRIORITY: SoundName[] = ['levelup', 'achievement', 'quest', 'unlock', 'coin', 'xp'];

export function prefersReducedMotion(): boolean {
  const root = document.documentElement;
  if (root.classList.contains('reduce-motion')) return true;
  if (root.classList.contains('motion-ok')) return false;
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

function center(): { x: number; y: number } {
  return { x: window.innerWidth / 2, y: window.innerHeight * 0.42 };
}

export interface CelebrateOptions {
  undo?: { label: string; run: () => void };
}

export function celebrate(events: GameEvent[], state: GameState, opts: CelebrateOptions = {}): void {
  if (!events.length) return;
  const ui = useUI.getState();
  const origin = ui.origin ?? center();
  const calm = prefersReducedMotion() || !state.settings.intenseEffects;
  const colors = effectColors(state);
  const fx = state.profile?.uiEffect ?? 'fx:sparks';
  const sounds = new Set<SoundName>();
  let undoUsed = false;
  const undoAction = () => {
    if (undoUsed || !opts.undo) return undefined;
    undoUsed = true;
    return opts.undo;
  };

  const xp = events.reduce((n, e) => (e.type === 'xp' ? n + e.amount : n), 0);
  const coins = events.reduce((n, e) => (e.type === 'coins' ? n + e.amount : n), 0);
  const capped = events.find((e) => e.type === 'healthyCap');

  for (const e of events) {
    switch (e.type) {
      case 'questComplete': {
        ui.toast({ kind: 'quest', title: 'Quest complete', message: e.title, xp: e.xp, coins: e.coins || undefined, action: undoAction() });
        if (!calm) ui.burst({ x: origin.x, y: origin.y, style: fx, colors, power: 1 });
        sounds.add('quest');
        haptic('success');
        break;
      }
      case 'achievement': {
        const def = ACHIEVEMENT_MAP[e.id];
        if (!def) break;
        const big = RARITY_ORDER.indexOf(def.rarity) >= RARITY_ORDER.indexOf('epic');
        if (big) ui.celebrate({ type: 'achievement', achievementId: e.id });
        else ui.toast({ kind: 'achievement', title: 'Achievement unlocked', message: def.name, rarity: def.rarity, icon: def.icon, xp: def.xpReward || undefined, duration: 5200 });
        sounds.add('achievement');
        haptic('success');
        break;
      }
      case 'levelUp':
        ui.celebrate({ type: 'levelUp', from: e.from, to: e.to, coins: e.coins, unlocks: e.unlocks });
        sounds.add('levelup');
        haptic('levelup');
        break;
      case 'categoryLevelUp':
        ui.toast({ kind: 'level', title: `${getCategory(e.category).name} level ${e.level}`, message: 'Skill level up', icon: getCategory(e.category).icon });
        break;
      case 'dailyGoal':
        ui.toast({ kind: 'success', title: 'Daily goal complete', message: `+${e.xp} bonus XP`, coins: e.coins, icon: 'target' });
        if (!calm) ui.burst({ ...center(), style: 'fx:ripple', colors, power: 1.2 });
        sounds.add('achievement');
        break;
      case 'streak':
        ui.bumpStreak();
        if (e.kind === 'milestone') ui.toast({ kind: 'streak', title: `${e.value}-day streak`, message: 'Consistency is a superpower.', icon: 'flame' });
        break;
      case 'weeklyReady':
        ui.toast({ kind: 'challenge', title: 'Challenge complete', message: `${e.title} — claim your reward.`, icon: 'swords', duration: 6000, action: { label: 'Claim', run: () => (location.hash = '#/quests/weekly') } });
        sounds.add('coin');
        break;
      case 'weeklyClaimed':
        ui.celebrate({ type: 'loot', tone: e.boss ? 'boss' : 'bounty', title: e.boss ? 'Boss defeated' : 'Challenge cleared', subtitle: e.title, xp: e.xp, coins: e.coins, items: [] });
        sounds.add('achievement');
        break;
      case 'milestone':
        ui.toast({ kind: 'success', title: 'Milestone reached', message: e.title, xp: e.xp, icon: 'milestone', action: undoAction() });
        sounds.add('quest');
        break;
      case 'goalComplete':
        ui.celebrate({ type: 'loot', tone: 'goal', title: 'Goal complete', subtitle: e.title, xp: e.xp, coins: e.coins, items: [] });
        sounds.add('achievement');
        break;
      case 'unlock': {
        const item = COSMETIC_MAP[e.itemId];
        if (item) ui.toast({ kind: 'unlock', title: 'New reward unlocked', message: item.name, rarity: item.rarity, icon: 'lock-open' });
        sounds.add('unlock');
        break;
      }
      case 'momentum':
        ui.pulseMomentum();
        break;
      case 'eventReady': {
        const def = EVENT_MAP[e.eventId];
        ui.toast({ kind: 'challenge', title: 'Event complete', message: def ? `${def.name} — claim your reward.` : undefined, icon: 'calendar-heart', duration: 6000, action: { label: 'Claim', run: () => (location.hash = '#/quests/weekly') } });
        break;
      }
      case 'eventClaimed': {
        const def = EVENT_MAP[e.eventId];
        ui.celebrate({ type: 'loot', tone: 'event', title: 'Event complete', subtitle: def?.name ?? 'Special event', xp: e.xp, coins: e.coins, items: def?.rewards.itemIds ?? [] });
        sounds.add('achievement');
        break;
      }
      case 'challengeResolved': {
        const title = e.status === 'won' ? 'Challenge won' : e.status === 'tied' ? 'Friendly draw' : 'Good game';
        const subtitle = e.status === 'lost' ? `You and ${e.opponent} both showed up. That’s what matters.` : `Weekly XP challenge vs ${e.opponent}`;
        ui.celebrate({ type: 'loot', tone: 'challenge', title, subtitle, xp: 0, coins: e.coins, items: [] });
        break;
      }
      case 'restDay':
        ui.toast({ kind: 'rest', title: 'Rest day', message: 'Recovery counts. Your streak is safe.', xp: e.xp || undefined, icon: 'battery-charging' });
        break;
      case 'purchase': {
        const item = COSMETIC_MAP[e.itemId];
        ui.toast({ kind: 'unlock', title: 'Unlocked', message: item?.name, rarity: item?.rarity, icon: 'lock-open' });
        sounds.add('unlock');
        haptic('success');
        break;
      }
      default:
        break;
    }
  }

  if (capped && capped.type === 'healthyCap') {
    const name = getCategory(capped.category).name;
    ui.toast({
      kind: 'info',
      icon: 'heart-pulse',
      title: capped.level === 'hard' ? 'Healthy limit reached' : 'Easy does it',
      message:
        capped.level === 'hard'
          ? `${name} time past today’s healthy limit is logged without XP. Rest is part of progress.`
          : `You’ve done a lot of ${name.toLowerCase()} today — extra time now earns half XP.`,
      duration: 6500,
    });
  }

  if (xp > 0) {
    ui.addFloater({ amount: xp, kind: 'xp', from: origin });
    ui.pulseHud();
    sounds.add('xp');
    if (!events.some((e) => e.type === 'questComplete' || e.type === 'achievement' || e.type === 'dailyGoal' || e.type === 'restDay' || e.type === 'milestone')) {
      const label = events.find((e) => e.type === 'xp');
      if (label && label.type === 'xp' && (label.source === 'activity' || label.source === 'momentum')) {
        ui.toast({ kind: 'success', title: `+${formatNumber(xp)} XP`, message: `${label.label} logged`, icon: getCategory(label.category).icon, action: undoAction() });
      }
    }
  }
  if (coins > 0) {
    ui.addFloater({ amount: coins, kind: 'coins', from: origin });
    sounds.add('coin');
  }

  const top = SOUND_PRIORITY.find((s) => sounds.has(s));
  if (top) playSound(top);
  ui.setOrigin(null);
}
