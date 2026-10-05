import type { DateKey, GameState, SpecialEventDef } from '@/types';
import { SPECIAL_EVENTS } from '@/data/events';
import { parseDateKey, toDateKey, weekEnd, weekStart } from '@/lib/date';
import { metricProgress } from './analysis';

export interface ActiveEvent {
  def: SpecialEventDef;
  key: string;
  start: DateKey;
  end: DateKey;
  /** Progress window: the whole event, or the current week clipped to the event. */
  from: DateKey;
  to: DateKey;
}

function eventDates(def: SpecialEventDef, year: number): { start: DateKey; end: DateKey } {
  const start = toDateKey(new Date(year, def.start.month - 1, def.start.day));
  // Events may wrap the new year (e.g. Dec 20 – Jan 5).
  const endYear = def.end.month < def.start.month ? year + 1 : year;
  const end = toDateKey(new Date(endYear, def.end.month - 1, def.end.day));
  return { start, end };
}

export function activeEvents(today: DateKey, weekStartsOn: 0 | 1): ActiveEvent[] {
  const year = parseDateKey(today).getFullYear();
  const out: ActiveEvent[] = [];
  for (const def of SPECIAL_EVENTS) {
    for (const y of [year - 1, year]) {
      const { start, end } = eventDates(def, y);
      if (today < start || today > end) continue;
      const ws = weekStart(today, weekStartsOn);
      const we = weekEnd(today, weekStartsOn);
      out.push({
        def,
        key: `${def.id}:${y}`,
        start,
        end,
        from: def.window === 'week' ? (ws > start ? ws : start) : start,
        to: def.window === 'week' ? (we < end ? we : end) : end,
      });
    }
  }
  return out;
}

export function eventProgress(state: Pick<GameState, 'transactions' | 'activities'>, ev: ActiveEvent): number {
  return metricProgress(state, ev.def.metric, ev.from, ev.to);
}
