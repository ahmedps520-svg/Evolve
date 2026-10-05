import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import type { GameState } from '@/types';
import { emptyState } from '@/data/defaults';
import { toDateKey } from '@/lib/date';
import { computeTotals } from '@/lib/engine/analysis';
import { completeOnboarding, logActivity, syncDay } from '@/lib/engine/gameEngine';
import { createBackup, parseBackup } from './backup';
import { buildDemoState } from './demo';
import { normalizeState } from './normalize';
import { diffState, Persister } from './persistence';
import { openIndexedDB } from './storage';

const at = (y: number, m: number, d: number, h = 12, min = 0) => new Date(y, m - 1, d, h, min).getTime();

function played(): GameState {
  let s = completeOnboarding(emptyState(), { name: 'Ahmed', focusAreas: ['studying', 'fitness'], difficulty: 'normal', classId: 'athlete' }, at(2026, 10, 3, 9)).state;
  s = logActivity(s, { category: 'study', duration: 45 }, at(2026, 10, 3, 11)).state;
  s = syncDay(s, at(2026, 10, 4, 8)).state;
  s = logActivity(s, { category: 'exercise', duration: 30 }, at(2026, 10, 4, 18)).state;
  return s;
}

describe('demo hero', () => {
  // Different weekdays, months (incl. event windows) and times of day — including early mornings.
  const nows = [
    at(2026, 10, 5, 14), at(2026, 10, 6, 6, 30), at(2026, 10, 7, 23, 50), at(2026, 10, 8, 0, 20), at(2026, 10, 9, 9),
    at(2026, 10, 10, 12), at(2026, 10, 11, 19), at(2027, 1, 10, 10), at(2027, 3, 30, 16), at(2027, 6, 30, 7, 15), at(2027, 12, 20, 21),
  ];
  for (const now of nows) {
    it(`matches the brief on ${new Date(now).toString().slice(0, 21)}`, () => {
      const s = buildDemoState(now);
      const t = computeTotals(s);
      expect(s.profile!.level).toBe(18);
      expect(s.profile!.totalXP).toBe(12_480);
      expect(s.profile!.currentStreak).toBe(14);
      expect(t.questsCompleted).toBe(73);
      expect(s.achievements).toHaveLength(18);
      expect(s.activities.every((a) => a.timestamp <= now)).toBe(true);
      expect(s.transactions.every((x) => x.timestamp <= now)).toBe(true);
      expect(s.meta.lastSeenDate).toBe(toDateKey(now));
      // No stale "streak reset" card on a 14-day streak, and the hero shows off earned cosmetics.
      expect(s.meta.streakReset).toBeNull();
      expect(s.profile!.titleId).toBe('title:consistent');
      expect(s.meta.inventory).toEqual(expect.arrayContaining([s.profile!.avatar.frame, s.profile!.avatar.background, s.profile!.avatar.aura, s.profile!.badgeId]));
      // Stable: syncing again changes nothing.
      const again = syncDay(s, now + 60_000);
      expect(again.events).toHaveLength(0);
      expect(again.state.profile!.totalXP).toBe(12_480);
    });
  }
});

describe('diffing', () => {
  it('produces minimal puts and deletes', () => {
    const a = played();
    const b = logActivity(a, { category: 'reading', duration: 20 }, at(2026, 10, 4, 21)).state;
    const ops = diffState(a, b);
    expect(ops.puts.activities).toHaveLength(1);
    expect(ops.puts.transactions!.length).toBeGreaterThan(0);
    expect(ops.kv.map((k) => k.key)).toContain('profile');
    const c = { ...b, activities: b.activities.slice(1) };
    expect(diffState(b, c).deletes.activities).toEqual([b.activities[0].id]);
    expect(diffState(b, b)).toEqual({ kv: [], puts: {}, deletes: {} });
  });
});

describe('IndexedDB persistence', () => {
  it('round-trips the full state', async () => {
    const db = await openIndexedDB('evolve-test-roundtrip');
    const s = played();
    await db.replaceAll(s);
    const { state } = normalizeState(await db.loadAll());
    expect(state.profile).toEqual(s.profile);
    expect(state.activities).toEqual(s.activities);
    expect(state.transactions.length).toBe(s.transactions.length);
    expect(state.quests.length).toBe(s.quests.length);
    expect(state.settings).toEqual(s.settings);
    db.close();
  });

  it('applies incremental writes through the persister', async () => {
    const db = await openIndexedDB('evolve-test-persister');
    let current = played();
    await db.replaceAll(current);
    const errors: unknown[] = [];
    const persister = new Persister(db, () => current, { onError: (e) => errors.push(e), onRecovered: () => {}, onSaved: () => {} });
    const next = logActivity(current, { category: 'coding', duration: 60 }, at(2026, 10, 4, 22)).state;
    persister.save(current, next);
    current = next;
    await persister.flush();
    expect(errors).toEqual([]);
    const { state } = normalizeState(await db.loadAll());
    expect(state.activities).toHaveLength(next.activities.length);
    expect(state.profile!.totalXP).toBe(next.profile!.totalXP);
    db.close();
  });
});

describe('backup', () => {
  it('exports and imports losslessly', async () => {
    const s = played();
    const file = await createBackup(s, null);
    const parsed = parseBackup(JSON.stringify(file));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.state.profile).toEqual(s.profile);
    expect(parsed.state.activities).toEqual(s.activities);
    expect(parsed.summary.level).toBe(s.profile!.level);
  });

  it('rejects files that are not Evolve backups, kindly', () => {
    expect(parseBackup('not json')).toMatchObject({ ok: false });
    expect(parseBackup(JSON.stringify({ hello: 'world' }))).toMatchObject({ ok: false });
    expect(parseBackup(JSON.stringify({ app: 'evolve', format: 99, data: {} }))).toMatchObject({ ok: false });
    expect(parseBackup(JSON.stringify({ app: 'evolve', format: 1, data: { profile: null } }))).toMatchObject({ ok: false });
  });

  it('reconciles tampered totals with the ledger and drops broken records', async () => {
    const s = played();
    const file = await createBackup(s, null);
    const data = file.data as Record<string, unknown>;
    data.profile = { ...(s.profile as object), totalXP: 9_999_999, coins: 1_000_000 };
    data.activities = [...s.activities, { id: 'bad', category: 'nope', duration: -5 }];
    const parsed = parseBackup(JSON.stringify(file));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.state.profile!.totalXP).toBe(s.profile!.totalXP);
    expect(parsed.state.profile!.coins).toBe(s.profile!.coins);
    expect(parsed.state.activities).toHaveLength(s.activities.length);
    expect(parsed.summary.skipped).toBe(1);
  });
});
