/**
 * Private, serverless social: players share a "party card" (a short code or link) with friends.
 * The card only contains what the player chose to share, and nothing is ever uploaded anywhere.
 */
import type { GameState, PartyMember } from '@/types';
import { monthKey, monthStart, toDateKey, addDays, daysInMonth } from '@/lib/date';
import { metricProgress } from '@/lib/engine/analysis';
import { currentWeekKey } from '@/lib/engine/weekly';
import { normalizePartyMember } from '@/lib/db/normalize';

export interface PartyCard {
  v: 1;
  id: string;
  n: string;
  c?: string;
  av?: { s: string; b: string; f: string; a: string };
  t?: string | null;
  l?: number;
  x?: number;
  w?: number;
  wk?: string;
  m?: number;
  mk?: string;
  q?: number;
  a?: number;
  s?: number;
  at: number;
}

export function weeklyXP(state: GameState, now: number): { value: number; weekKey: string } {
  const today = toDateKey(now);
  const weekKey = currentWeekKey(today, state.settings.weekStartsOn);
  return { value: metricProgress(state, { type: 'xp' }, weekKey, addDays(weekKey, 6)), weekKey };
}

export function monthlyXP(state: GameState, now: number): { value: number; monthKey: string } {
  const today = toDateKey(now);
  const start = monthStart(today);
  const end = addDays(start, daysInMonth(today) - 1);
  return { value: metricProgress(state, { type: 'xp' }, start, end), monthKey: monthKey(today) };
}

export function buildCard(state: GameState, now: number): PartyCard | null {
  const p = state.profile;
  if (!p) return null;
  const share = state.settings.social.share;
  const card: PartyCard = {
    v: 1,
    id: p.id,
    n: state.settings.social.anonymous ? p.playerTag : p.name,
    c: p.classId,
    av: { s: p.avatar.sigil, b: p.avatar.background, f: p.avatar.frame, a: p.avatar.aura },
    t: state.settings.social.anonymous ? null : p.titleId,
    at: now,
  };
  if (share.level) card.l = p.level;
  if (share.totalXP) card.x = p.totalXP;
  if (share.weeklyXP) {
    const w = weeklyXP(state, now);
    const m = monthlyXP(state, now);
    card.w = w.value;
    card.wk = w.weekKey;
    card.m = m.value;
    card.mk = m.monthKey;
  }
  if (share.quests) card.q = state.transactions.filter((t) => t.currency === 'xp' && t.source === 'quest').length;
  if (share.achievements) card.a = state.achievements.length;
  if (share.streak) card.s = p.currentStreak;
  return card;
}

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(code: string): string {
  const b64 = code.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeCard(card: PartyCard): string {
  return `EVO1.${toBase64Url(JSON.stringify(card))}`;
}

export function inviteLink(card: PartyCard): string {
  const base = typeof location !== 'undefined' ? `${location.origin}${location.pathname}` : 'https://evolve.app/';
  return `${base}#/join?c=${encodeURIComponent(encodeCard(card))}`;
}

/** Accepts a raw code, or any link that contains one. */
export function decodeCard(input: string, now: number = Date.now()): { ok: true; member: PartyMember } | { ok: false; error: string } {
  const text = input.trim();
  const match = /EVO1\.([A-Za-z0-9_-]+)/.exec(decodeURIComponent(text));
  if (!match) return { ok: false, error: 'That doesn’t look like an Evolve party code.' };
  let card: Partial<PartyCard>;
  try {
    card = JSON.parse(fromBase64Url(match[1])) as Partial<PartyCard>;
  } catch {
    return { ok: false, error: 'This party code is damaged. Ask your friend to share it again.' };
  }
  if (card.v !== 1 || typeof card.id !== 'string' || typeof card.n !== 'string') return { ok: false, error: 'This party code isn’t supported.' };
  if (typeof card.at === 'number' && card.at > now + 86_400_000) return { ok: false, error: 'This party code has an invalid date.' };
  const member = normalizePartyMember({
    id: card.id,
    name: card.n,
    classId: card.c,
    avatar: card.av ? { sigil: card.av.s, background: card.av.b, frame: card.av.f, aura: card.av.a } : null,
    titleId: card.t ?? null,
    level: card.l ?? null,
    totalXP: card.x ?? null,
    weeklyXP: card.w ?? null,
    weekKey: card.wk ?? null,
    monthlyXP: card.m ?? null,
    monthKey: card.mk ?? null,
    questsCompleted: card.q ?? null,
    achievements: card.a ?? null,
    streak: card.s ?? null,
    cardAt: typeof card.at === 'number' ? card.at : now,
    addedAt: now,
    updatedAt: now,
  });
  if (!member) return { ok: false, error: 'This party code is missing information.' };
  return { ok: true, member };
}

export async function shareText(title: string, text: string, url?: string): Promise<'shared' | 'copied' | 'failed'> {
  try {
    if (typeof navigator !== 'undefined' && navigator.share) {
      await navigator.share({ title, text, url });
      return 'shared';
    }
  } catch (e) {
    if ((e as DOMException)?.name === 'AbortError') return 'failed';
  }
  try {
    await navigator.clipboard.writeText(url ? `${text}\n${url}` : text);
    return 'copied';
  } catch {
    return 'failed';
  }
}
