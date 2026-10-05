import { useEffect } from 'react';
import { addDays, toDateKey } from '@/lib/date';
import { markSessionComplete, markSummaryShown, recordNotification, sessionElapsed, syncDay } from '@/lib/engine/gameEngine';
import { nextNotification, showNotification } from '@/lib/notifications';
import { useGameStore } from '@/store/gameStore';
import { useUI } from '@/store/uiStore';

/**
 * Keeps the world in sync with the clock:
 * - processes the day rollover at midnight and whenever the app returns to the foreground,
 * - shows yesterday's adventure summary on the first visit of a new day,
 * - completes focus timers that finished in the background,
 * - delivers local reminders (rate-limited, quiet-hours aware).
 */
export function DayWatcher() {
  useEffect(() => {
    const store = useGameStore;

    const check = () => {
      const { state, status, dispatch } = store.getState();
      if (status !== 'ready' || !state.profile) return;
      const now = Date.now();
      const today = toDateKey(now);
      if (state.meta.lastSeenDate !== today) dispatch(syncDay);

      // Yesterday's adventure, once, if there was one.
      const fresh = store.getState().state;
      const yesterday = addDays(today, -1);
      if (fresh.meta.lastSummaryDate !== today && fresh.meta.lastSummaryDate !== yesterday) {
        const hadDay = fresh.transactions.some((t) => t.currency === 'xp' && t.dateKey === yesterday);
        dispatch((s) => markSummaryShown(s, yesterday), { silent: true });
        if (hadDay && fresh.meta.onboardedAt && toDateKey(fresh.meta.onboardedAt) !== today) {
          useUI.getState().celebrate({ type: 'summary', dateKey: yesterday, heading: 'Yesterday’s adventure' });
        }
      }

      // A running timer that reached its target while we were away.
      const session = fresh.session;
      if (session && session.status === 'running' && sessionElapsed(session, now).ms >= session.targetMinutes * 60_000) {
        dispatch((s, n) => markSessionComplete(s, n), { silent: true });
      }

      // Local reminders.
      const pending = nextNotification(store.getState().state, now);
      if (pending) {
        // While the app is open the player can already see this; record it so it doesn't fire later.
        dispatch((s, n) => recordNotification(s, pending.type, pending.key, n), { silent: true });
        if (document.visibilityState !== 'visible') void showNotification(pending);
      }
    };

    check();
    const interval = setInterval(check, 30_000);
    const scheduleMidnight = () => {
      const d = new Date();
      const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 5).getTime();
      return setTimeout(() => {
        check();
        timer = scheduleMidnight();
      }, next - d.getTime());
    };
    let timer = scheduleMidnight();
    const onVisible = () => document.visibilityState === 'visible' && check();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', check);
    return () => {
      clearInterval(interval);
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', check);
    };
  }, []);
  return null;
}
