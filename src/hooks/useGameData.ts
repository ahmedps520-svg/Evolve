import { useEffect, useMemo, useState } from 'react';
import type { DateKey } from '@/types';
import { toDateKey } from '@/lib/date';
import { buildDayStats } from '@/lib/engine/analysis';
import { listAchievements } from '@/lib/engine/achievements';
import { calculateXPProgress, sanitizeCurve } from '@/lib/xp';
import { useGame } from '@/store/gameStore';

/** Current time, refreshed on an interval (and when the tab becomes visible again). */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const id = setInterval(tick, intervalMs);
    const onVisible = () => document.visibilityState === 'visible' && tick();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [intervalMs]);
  return now;
}

/** Today's local date key; updates shortly after midnight. */
export function useToday(): DateKey {
  const now = useNow(30_000);
  return toDateKey(now);
}

export function useDayStats() {
  const transactions = useGame((s) => s.transactions);
  const activities = useGame((s) => s.activities);
  const restDays = useGame((s) => s.meta.restDays);
  return useMemo(() => buildDayStats(transactions, activities, restDays), [transactions, activities, restDays]);
}

export function useXPProgress() {
  const totalXP = useGame((s) => s.profile?.totalXP ?? 0);
  const curve = useGame((s) => s.settings.xp.curve);
  return useMemo(() => calculateXPProgress(totalXP, sanitizeCurve(curve)), [totalXP, curve]);
}

export function useAchievements() {
  const today = useToday();
  const transactions = useGame((s) => s.transactions);
  const activities = useGame((s) => s.activities);
  const achievements = useGame((s) => s.achievements);
  const meta = useGame((s) => s.meta);
  const goals = useGame((s) => s.goals);
  const journal = useGame((s) => s.journal);
  const party = useGame((s) => s.party);
  const challenges = useGame((s) => s.challenges);
  const profile = useGame((s) => s.profile);
  const settings = useGame((s) => s.settings);
  return useMemo(
    () => listAchievements({ transactions, activities, achievements, meta, goals, journal, party, challenges, profile, settings, quests: [], weeklies: [], session: null }, today),
    [today, transactions, activities, achievements, meta, goals, journal, party, challenges, profile, settings],
  );
}
