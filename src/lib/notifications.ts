/**
 * Local reminders. Generated on-device from the player's own data, rate-limited and quiet-hours aware.
 * Without a push server, reminders are delivered while Evolve is open or running in the background
 * (and via periodic background sync where the browser supports it).
 */
import type { GameState } from '@/types';
import { inClockRange, minutesSinceMidnight, parseClock, toDateKey } from '@/lib/date';
import { questsForToday } from '@/lib/engine/quests';
import { STREAK_MILESTONES } from '@/lib/engine/streaks';
import { challengeProgress, currentWeekKey, daysLeftInWeek } from '@/lib/engine/weekly';
import { calculateXPProgress, sanitizeCurve } from '@/lib/xp';
import { formatNumber } from '@/lib/format';

export interface PendingNotification {
  type: string;
  key: string;
  title: string;
  body: string;
  url: string;
}

const DAILY_CAP = 3;

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function notificationPermission(): NotificationPermission | 'unsupported' {
  return notificationsSupported() ? Notification.permission : 'unsupported';
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!notificationsSupported()) return 'unsupported';
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export async function showNotification(n: Pick<PendingNotification, 'title' | 'body' | 'url' | 'type'>): Promise<boolean> {
  if (notificationPermission() !== 'granted') return false;
  const options: NotificationOptions = { body: n.body, tag: `evolve-${n.type}`, icon: './icons/icon-192.png', badge: './icons/badge-96.png', data: { url: n.url } };
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) {
      await reg.showNotification(n.title, options);
      return true;
    }
    new Notification(n.title, options);
    return true;
  } catch {
    return false;
  }
}

/** The single most relevant reminder right now, if any (never more than a few per day). */
export function nextNotification(state: GameState, now: number): PendingNotification | null {
  const s = state.settings.notifications;
  const p = state.profile;
  if (!s.enabled || !p) return null;
  if (s.quietHours.enabled && inClockRange(now, s.quietHours.start, s.quietHours.end)) return null;
  const today = toDateKey(now);
  const log = state.meta.notificationLog;
  const sentToday = Number(log[`count:${today}`] ?? 0);
  if (sentToday >= DAILY_CAP) return null;

  if (s.streakMilestones && STREAK_MILESTONES.includes(p.currentStreak) && log.streak !== String(p.currentStreak)) {
    return { type: 'streak', key: String(p.currentStreak), title: `${p.currentStreak} days in a row`, body: `You’ve shown up ${p.currentStreak} days in a row. That’s how it’s done.`, url: '#/progress' };
  }

  if (s.dailyReminder && minutesSinceMidnight(now) >= parseClock(s.reminderTime) && log.daily !== today) {
    const open = questsForToday(state.quests, today).filter((q) => !q.completed);
    if (open.length) {
      return { type: 'daily', key: today, title: 'Your daily quest is waiting', body: `${open.length} quest${open.length === 1 ? '' : 's'} on today’s board — even one counts.`, url: '#/quests' };
    }
  }

  if (s.levelProximity) {
    const xp = calculateXPProgress(p.totalXP, sanitizeCurve(state.settings.xp.curve));
    const near = xp.toNext <= Math.max(40, Math.round(xp.required * 0.1));
    if (near && log.level !== `${today}:${xp.level}`) {
      return { type: 'level', key: `${today}:${xp.level}`, title: `Level ${xp.level + 1} is close`, body: `You’re ${formatNumber(xp.toNext)} XP away from Level ${xp.level + 1}.`, url: '#/home' };
    }
  }

  if (s.weeklyDeadline) {
    const weekKey = currentWeekKey(today, state.settings.weekStartsOn);
    const left = daysLeftInWeek(today, state.settings.weekStartsOn);
    const wk = state.weeklies.find((w) => w.weekKey === weekKey);
    const open = wk?.challenges.filter((c) => !c.claimed && challengeProgress(state, weekKey, c) < c.target) ?? [];
    if (left <= 2 && open.length && log.weekly !== weekKey) {
      return { type: 'weekly', key: weekKey, title: 'Weekly challenge', body: `Your weekly challenge has ${left} day${left === 1 ? '' : 's'} left.`, url: '#/quests/weekly' };
    }
  }
  return null;
}
