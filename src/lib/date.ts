import type { DateKey, MonthKey } from '@/types';

/**
 * Local-calendar date helpers.
 *
 * Every "day" in Evolve is a local calendar date in the user's timezone. Arithmetic is done on
 * calendar fields (never by adding 24h of milliseconds), so DST transitions can't skip or repeat a day.
 */

const pad = (n: number) => String(n).padStart(2, '0');

export function toDateKey(input: number | Date = Date.now()): DateKey {
  const d = typeof input === 'number' ? new Date(input) : input;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function isDateKey(value: unknown): value is DateKey {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = parseDateKey(value);
  return toDateKey(d) === value;
}

/** Local midnight of the given day. */
export function parseDateKey(key: DateKey): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function startOfDay(key: DateKey): number {
  return parseDateKey(key).getTime();
}

/** First millisecond of the following day. */
export function endOfDay(key: DateKey): number {
  return startOfDay(addDays(key, 1));
}

export function addDays(key: DateKey, days: number): DateKey {
  const d = parseDateKey(key);
  d.setDate(d.getDate() + days);
  return toDateKey(d);
}

/** Whole calendar days from `a` to `b` (positive when `b` is later). DST-safe. */
export function diffDays(a: DateKey, b: DateKey): number {
  const da = parseDateKey(a);
  const db = parseDateKey(b);
  const utcA = Date.UTC(da.getFullYear(), da.getMonth(), da.getDate());
  const utcB = Date.UTC(db.getFullYear(), db.getMonth(), db.getDate());
  return Math.round((utcB - utcA) / 86_400_000);
}

/** 0 = Sunday … 6 = Saturday */
export function weekday(key: DateKey): number {
  return parseDateKey(key).getDay();
}

export function weekStart(key: DateKey, weekStartsOn: 0 | 1 = 1): DateKey {
  const offset = (weekday(key) - weekStartsOn + 7) % 7;
  return addDays(key, -offset);
}

export function weekEnd(key: DateKey, weekStartsOn: 0 | 1 = 1): DateKey {
  return addDays(weekStart(key, weekStartsOn), 6);
}

export function monthKey(key: DateKey): MonthKey {
  return key.slice(0, 7);
}

export function monthStart(key: DateKey): DateKey {
  return `${key.slice(0, 7)}-01`;
}

export function daysInMonth(key: DateKey): number {
  const d = parseDateKey(key);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

/** Inclusive list of day keys from `from` to `to`. */
export function dayRange(from: DateKey, to: DateKey): DateKey[] {
  const out: DateKey[] = [];
  const n = diffDays(from, to);
  for (let i = 0; i <= n; i++) out.push(addDays(from, i));
  return out;
}

export function hourOf(ts: number): number {
  return new Date(ts).getHours();
}

export function isWeekday(key: DateKey): boolean {
  const d = weekday(key);
  return d !== 0 && d !== 6;
}

/** Minutes since local midnight for a `HH:MM` string. */
export function parseClock(value: string): number {
  const [h, m] = value.split(':').map(Number);
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

export function minutesSinceMidnight(ts: number = Date.now()): number {
  const d = new Date(ts);
  return d.getHours() * 60 + d.getMinutes();
}

/** Is the local time of `ts` inside [start, end) — handles ranges that cross midnight. */
export function inClockRange(ts: number, start: string, end: string): boolean {
  const now = minutesSinceMidnight(ts);
  const s = parseClock(start);
  const e = parseClock(end);
  if (s === e) return false;
  return s < e ? now >= s && now < e : now >= s || now < e;
}

/* ───────────── Formatting ───────────── */

const formatterCache = new Map<string, Intl.DateTimeFormat>();
function fmt(options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const id = JSON.stringify(options);
  let f = formatterCache.get(id);
  if (!f) {
    f = new Intl.DateTimeFormat(undefined, options);
    formatterCache.set(id, f);
  }
  return f;
}

export function formatDay(key: DateKey, options: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric' }): string {
  return fmt(options).format(parseDateKey(key));
}

export function formatDayShort(key: DateKey): string {
  return fmt({ month: 'short', day: 'numeric' }).format(parseDateKey(key));
}

export function formatWeekdayShort(key: DateKey): string {
  return fmt({ weekday: 'short' }).format(parseDateKey(key));
}

export function formatWeekdayLong(key: DateKey): string {
  return fmt({ weekday: 'long' }).format(parseDateKey(key));
}

export function formatMonth(key: DateKey | MonthKey, long = false): string {
  const k = key.length === 7 ? `${key}-01` : key;
  return fmt({ month: long ? 'long' : 'short', year: long ? 'numeric' : undefined }).format(parseDateKey(k));
}

export function formatTime(ts: number): string {
  return fmt({ hour: 'numeric', minute: '2-digit' }).format(new Date(ts));
}

export function formatDateTime(ts: number): string {
  return fmt({ month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(ts));
}

export function formatFullDate(ts: number): string {
  return fmt({ month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(ts));
}

export function formatHour(hour: number): string {
  const d = new Date(2000, 0, 1, hour);
  return fmt({ hour: 'numeric' }).format(d);
}

/** "Today", "Yesterday", weekday name within the last week, otherwise "Oct 5". */
export function relativeDay(key: DateKey, today: DateKey): string {
  const diff = diffDays(key, today);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff === -1) return 'Tomorrow';
  if (diff > 1 && diff < 7) return formatWeekdayLong(key);
  return formatDayShort(key);
}

export function timeAgo(ts: number, now: number = Date.now()): string {
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d ago`;
  const w = Math.round(d / 7);
  if (w < 5) return `${w}w ago`;
  return formatDayShort(toDateKey(ts));
}
