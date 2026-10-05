import { useMemo, useState } from 'react';
import type { AttributeId } from '@/types';
import { ATTRIBUTES, ATTRIBUTE_MAP, attributeColor } from '@/data/attributes';
import { CATEGORY_MAP, getCategory } from '@/data/categories';
import { cn } from '@/lib/cn';
import { dayRange, diffDays, formatDay, formatDayShort, formatHour, formatMonth, formatWeekdayLong, formatWeekdayShort, monthKey, toDateKey, weekStart } from '@/lib/date';
import { formatCompact, formatMinutes, formatNumber, formatPercent } from '@/lib/format';
import { RANGES, attributeDistribution, bucketSeries, categoryDistribution, dailySeries, firstDay, hourlyDistribution, questCompletion, rangeBounds, weekdayAverages, xpBreakdown, type RangeId } from '@/lib/stats';
import { useDayStats, useToday } from '@/hooks/useGameData';
import { useGame } from '@/store/gameStore';
import { AreaChart, ColumnChart, PartBar, StackedColumns, type Point } from '@/components/charts/Charts';
import { ChartFrame, DataTable } from '@/components/charts/core';
import { StatTile } from '@/components/game/Challenges';
import { CategoryIcon } from '@/components/game/Tags';
import { EmptyState } from '@/components/ui/Display';
import { Segmented } from '@/components/ui/Field';

export default function Overview() {
  const days = useDayStats();
  const today = useToday();
  const transactions = useGame((s) => s.transactions);
  const activities = useGame((s) => s.activities);
  const quests = useGame((s) => s.quests);
  const goal = useGame((s) => s.profile?.dailyGoal ?? 400);
  const weekStartsOn = useGame((s) => s.settings.weekStartsOn);
  const [range, setRange] = useState<RangeId>('30d');

  const earliest = firstDay(days, today);
  const { from, to } = rangeBounds(range, today, earliest);
  const span = diffDays(from, to) + 1;
  const points = useMemo(() => dailySeries(days, from, to), [days, from, to]);
  const granularity: 'day' | 'week' | 'month' = span <= 92 ? 'day' : span <= 400 ? 'week' : 'month';
  const buckets = useMemo(() => (granularity === 'day' ? null : bucketSeries(points, granularity, weekStartsOn)), [points, granularity, weekStartsOn]);
  const shares = useMemo(() => categoryDistribution({ transactions, activities }, from, to), [transactions, activities, from, to]);
  const attrs = useMemo(() => attributeDistribution(shares), [shares]);
  const completion = useMemo(() => questCompletion({ quests, transactions }, from, to), [quests, transactions, from, to]);
  const breakdown = useMemo(() => xpBreakdown({ transactions }, today, weekStartsOn), [transactions, today, weekStartsOn]);
  // Activity by attribute (stacked), daily for short ranges, weekly otherwise.
  const stackRows = useActivityRows(activities, from, to, span <= 31 ? 'day' : 'week', weekStartsOn);

  const totalXP = points.reduce((n, p) => n + p.xp, 0);
  const activeDays = points.filter((p) => p.active).length;
  const minutes = points.reduce((n, p) => n + p.minutes, 0);

  if (!transactions.some((t) => t.currency === 'xp')) {
    return <EmptyState icon="chart-column" title="Your history starts today." message="Complete a quest or log an activity and your stats will appear here." />;
  }

  const xpPoints: Point[] = buckets
    ? buckets.map((b) => ({ key: b.key, label: granularity === 'month' ? formatMonth(b.key) : formatDayShort(b.from), long: granularity === 'month' ? formatMonth(b.key, true) : `Week of ${formatDay(b.from, { month: 'short', day: 'numeric' })}`, value: b.xp }))
    : points.map((p) => ({ key: p.dateKey, label: formatDayShort(p.dateKey), long: formatDay(p.dateKey, { weekday: 'short', month: 'short', day: 'numeric' }), value: p.xp }));

  const series = ATTRIBUTES.map((a) => ({ id: a.id, label: a.name, color: attributeColor(a.id) }));

  // Weekly & monthly XP — always the last 12 periods.
  const weeklyAll = bucketSeries(dailySeries(days, rangeBounds('90d', today, earliest).from, today), 'week', weekStartsOn).slice(-12);
  const monthlyAll = bucketSeries(dailySeries(days, rangeBounds('1y', today, earliest).from, today), 'month', weekStartsOn).slice(-12);
  const weekdays = weekdayAverages(points, weekStartsOn);
  const bestDay = weekdays.reduce((a, b) => (b.avg > a.avg ? b : a), weekdays[0]);
  const hours = hourlyDistribution({ transactions }, from, to);
  const peakHour = hours.indexOf(Math.max(...hours));

  return (
    <div className="space-y-6">
      <Segmented<RangeId> label="Time range" value={range} onChange={setRange} size="sm" options={RANGES.map((r) => ({ value: r.id, label: r.label }))} className="lg:max-w-xl" />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="XP earned" value={formatCompact(totalXP)} sub={`${formatNumber(Math.round(totalXP / span))} per day on average`} />
        <StatTile label="Active days" value={`${activeDays}`} sub={`of ${span} days · ${formatPercent(activeDays / span)}`} />
        <StatTile label="Quests" value={formatNumber(completion.completed)} sub={completion.expired ? `${formatPercent(completion.rate)} of daily quests done` : 'completed'} />
        <StatTile label="Time logged" value={formatMinutes(minutes)} sub="of real activity" />
      </div>

      <ChartFrame
        title="XP over time"
        subtitle={granularity === 'day' ? 'Daily XP, with your daily goal' : granularity === 'week' ? 'Weekly XP' : 'Monthly XP'}
        table={<DataTable caption="XP over time" rows={xpPoints} columns={[{ label: 'Period', value: (r) => r.long ?? r.label }, { label: 'XP', value: (r) => formatNumber(r.value), numeric: true }]} />}
      >
        <AreaChart data={xpPoints} reference={granularity === 'day' ? { value: goal, label: 'Goal' } : undefined} />
      </ChartFrame>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartFrame
          title="Activity over time"
          subtitle={`Minutes by attribute, per ${span <= 31 ? 'day' : 'week'}`}
          legend={series.filter((s) => stackRows.some((r) => (r.values[s.id] ?? 0) > 0)).map((s) => ({ label: s.label, color: s.color }))}
          table={
            <DataTable
              caption="Activity minutes by attribute"
              rows={stackRows}
              columns={[{ label: 'Period', value: (r) => r.long ?? r.label }, ...series.map((s) => ({ label: s.label, value: (r: (typeof stackRows)[number]) => formatMinutes(r.values[s.id] ?? 0), numeric: true }))]}
            />
          }
        >
          <StackedColumns rows={stackRows} series={series} format={formatNumber} unit="min" />
        </ChartFrame>

        <ChartFrame
          title="Where your XP comes from"
          subtitle="Share of activity and quest XP by attribute"
          table={<DataTable caption="XP by category" rows={shares} columns={[{ label: 'Category', value: (r) => getCategory(r.category).name }, { label: 'XP', value: (r) => formatNumber(r.xp), numeric: true }, { label: 'Time', value: (r) => formatMinutes(r.minutes), numeric: true }, { label: 'Sessions', value: (r) => r.sessions, numeric: true }]} />}
        >
          <PartBar parts={attrs.map((a) => ({ id: a.attribute, label: ATTRIBUTE_MAP[a.attribute as AttributeId].name, value: a.xp, color: attributeColor(a.attribute) }))} />
          <ul className="mt-4 space-y-1">
            {shares.slice(0, 7).map((sh) => {
              const total = shares.reduce((n, x) => n + x.xp, 0) || 1;
              const cat = CATEGORY_MAP[sh.category];
              return (
                <li key={sh.category} className="flex items-center gap-3 rounded-xl px-1 py-1.5">
                  <CategoryIcon category={sh.category} size={32} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-fg">{cat.name}</span>
                    <span className="block text-xs text-muted">{formatMinutes(sh.minutes)} · {sh.sessions} sessions</span>
                  </span>
                  <span className="text-right">
                    <span className="block font-display text-sm font-bold text-fg num">{formatNumber(sh.xp)} XP</span>
                    <span className="block text-xs text-muted num">{formatPercent(sh.xp / total)}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </ChartFrame>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartFrame title="Weekly XP" subtitle="Last 12 weeks" table={<DataTable caption="Weekly XP" rows={weeklyAll} columns={[{ label: 'Week of', value: (r) => formatDay(r.from, { month: 'short', day: 'numeric' }) }, { label: 'XP', value: (r) => formatNumber(r.xp), numeric: true }]} />}>
          <ColumnChart data={weeklyAll.map((b) => ({ key: b.key, label: formatDayShort(b.from), long: `Week of ${formatDay(b.from, { month: 'short', day: 'numeric' })}`, value: b.xp }))} highlight={weeklyAll[weeklyAll.length - 1]?.key} labelEvery={3} />
        </ChartFrame>
        <ChartFrame title="Monthly XP" subtitle="Last 12 months" table={<DataTable caption="Monthly XP" rows={monthlyAll} columns={[{ label: 'Month', value: (r) => formatMonth(r.key, true) }, { label: 'XP', value: (r) => formatNumber(r.xp), numeric: true }]} />}>
          <ColumnChart data={monthlyAll.map((b) => ({ key: b.key, label: formatMonth(b.key), long: formatMonth(b.key, true), value: b.xp }))} highlight={monthKey(today)} />
        </ChartFrame>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartFrame
          title="Most productive days"
          subtitle={bestDay?.avg ? `${formatWeekdayLong(dayOfWeekKey(bestDay.weekday))}s are your strongest — ${formatNumber(bestDay.avg)} XP on average` : 'Average XP by weekday'}
          table={<DataTable caption="Average XP by weekday" rows={weekdays} columns={[{ label: 'Day', value: (r) => formatWeekdayLong(dayOfWeekKey(r.weekday)) }, { label: 'Average XP', value: (r) => formatNumber(r.avg), numeric: true }]} />}
        >
          <ColumnChart data={weekdays.map((w) => ({ key: String(w.weekday), label: formatWeekdayShort(dayOfWeekKey(w.weekday)), long: `${formatWeekdayLong(dayOfWeekKey(w.weekday))} (average)`, value: w.avg }))} highlight={bestDay?.avg ? String(bestDay.weekday) : null} unit="XP avg" />
        </ChartFrame>
        <ChartFrame
          title="Most productive hours"
          subtitle={hours[peakHour] ? `You earn the most XP around ${formatHour(peakHour)}` : 'XP by hour of day'}
          table={<DataTable caption="XP by hour" rows={hours.map((v, h) => ({ h, v }))} columns={[{ label: 'Hour', value: (r) => formatHour(r.h) }, { label: 'XP', value: (r) => formatNumber(r.v), numeric: true }]} />}
        >
          <ColumnChart data={hours.map((v, h) => ({ key: String(h), label: h % 6 === 0 ? formatHour(h) : '', long: formatHour(h), value: v }))} highlight={hours[peakHour] ? String(peakHour) : null} />
        </ChartFrame>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <ChartFrame title="Quest completion" subtitle="Daily quests completed vs. left to expire">
          <div className="flex items-center gap-6">
            <div>
              <p className="font-display text-4xl font-bold text-fg">{formatPercent(completion.rate)}</p>
              <p className="mt-1 text-sm text-muted">completion rate</p>
            </div>
            <div className="flex-1 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-muted">
                  <span className="size-2.5 rounded-[3px] bg-accent" aria-hidden /> Completed
                </span>
                <span className="font-semibold text-fg num">{formatNumber(completion.completed)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-muted">
                  <span className="size-2.5 rounded-[3px] bg-surface-4" aria-hidden /> Expired
                </span>
                <span className="font-semibold text-fg num">{formatNumber(completion.expired)}</span>
              </div>
              <PartBar parts={[{ id: 'c', label: 'Completed', value: completion.completed, color: 'var(--accent)' }, { id: 'e', label: 'Expired', value: completion.expired, color: 'var(--surface-4)' }]} height={8} />
            </div>
          </div>
          <p className="mt-4 text-xs text-muted">Expired quests are never held against you — a fresh board arrives every day.</p>
        </ChartFrame>

        <ChartFrame title="XP breakdown" subtitle="Where every point came from">
          <dl className="grid grid-cols-4 gap-2 text-center">
            {[
              ['Total', breakdown.total],
              ['Today', breakdown.today],
              ['Week', breakdown.week],
              ['Month', breakdown.month],
            ].map(([k, v]) => (
              <div key={k as string} className="rounded-xl bg-surface-2 px-1 py-2.5">
                <dt className="hud-label !text-[9.5px]">{k}</dt>
                <dd className="mt-1 font-display text-[15px] font-bold text-fg num">{formatCompact(v as number)}</dd>
              </div>
            ))}
          </dl>
          <ul className="mt-4 space-y-2.5">
            {breakdown.sources.map((src) => (
              <li key={src.id}>
                <div className="flex justify-between text-sm">
                  <span className="text-muted">{src.label}</span>
                  <span className="font-semibold text-fg num">{formatNumber(src.xp)} XP</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-4">
                  <div className={cn('h-full rounded-full bg-accent')} style={{ width: `${breakdown.total ? (src.xp / breakdown.total) * 100 : 0}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </ChartFrame>
      </div>
    </div>
  );
}

/** A date key that falls on the given weekday (only used for weekday names). */
function dayOfWeekKey(weekday: number): string {
  const base = new Date(2024, 0, 7 + weekday); // Jan 7, 2024 was a Sunday
  return toDateKey(base);
}

function useActivityRows(activities: { dateKey: string; category: string; duration: number }[], from: string, to: string, by: 'day' | 'week', weekStartsOn: 0 | 1) {
  return useMemo(() => {
    const rows = new Map<string, { key: string; label: string; long: string; values: Record<string, number> }>();
    const keyOf = (d: string) => (by === 'day' ? d : weekStart(d, weekStartsOn));
    // Seed every period so gaps render as empty columns.
    for (const d of dayRange(from, to)) {
      const k = keyOf(d);
      if (!rows.has(k)) rows.set(k, { key: k, label: formatDayShort(k), long: by === 'day' ? formatDay(k, { weekday: 'short', month: 'short', day: 'numeric' }) : `Week of ${formatDay(k, { month: 'short', day: 'numeric' })}`, values: {} });
    }
    for (const a of activities) {
      if (a.dateKey < from || a.dateKey > to) continue;
      const row = rows.get(keyOf(a.dateKey));
      if (!row) continue;
      const attr = CATEGORY_MAP[a.category as keyof typeof CATEGORY_MAP]?.attribute ?? 'dis';
      row.values[attr] = (row.values[attr] ?? 0) + a.duration;
    }
    return [...rows.values()];
  }, [activities, from, to, by, weekStartsOn]);
}
