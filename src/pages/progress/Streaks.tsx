import { useMemo } from 'react';
import type { CategoryId } from '@/types';
import { CATEGORIES, FITNESS_CATEGORIES } from '@/data/categories';
import { addDays, formatDay, formatDayShort } from '@/lib/date';
import { formatNumber } from '@/lib/format';
import { restAllowance, restDaysUsed } from '@/lib/engine/gameEngine';
import { isRepeating } from '@/lib/engine/quests';
import { categoryStreak, streakHistory } from '@/lib/engine/streaks';
import { weeklyConsistency } from '@/lib/stats';
import { useDayStats, useToday } from '@/hooks/useGameData';
import { useGame, useGameStore } from '@/store/gameStore';
import { useUI } from '@/store/uiStore';
import { AreaChart } from '@/components/charts/Charts';
import { ChartFrame, DataTable } from '@/components/charts/core';
import { StreakCalendar } from '@/components/charts/Heatmap';
import { StatTile } from '@/components/game/Challenges';
import { StreakFlame } from '@/components/game/Hud';
import { CategoryIcon } from '@/components/game/Tags';
import { Button } from '@/components/ui/Button';
import { Section } from '@/components/ui/Display';
import { Icon } from '@/components/ui/Icon';

export default function Streaks() {
  const days = useDayStats();
  const today = useToday();
  const profile = useGame((s) => s.profile)!;
  const quests = useGame((s) => s.quests);
  const weekStartsOn = useGame((s) => s.settings.weekStartsOn);
  const state = useGameStore((s) => s.state);
  const openSheet = useUI((s) => s.openSheet);

  const history = useMemo(() => streakHistory(days, today), [days, today]);
  const consistency = useMemo(() => weeklyConsistency(days, today, weekStartsOn), [days, today, weekStartsOn]);
  const series = useMemo(() => {
    const out = [];
    for (let i = 89; i >= 0; i--) {
      const k = addDays(today, -i);
      out.push({ key: k, label: formatDayShort(k), long: formatDay(k, { weekday: 'short', month: 'short', day: 'numeric' }), value: history.series.get(k) ?? 0 });
    }
    return out;
  }, [history, today]);

  const groups: { id: string; name: string; icon: CategoryId; cats: CategoryId[] }[] = [
    { id: 'study', name: 'Study streak', icon: 'study', cats: ['study'] },
    { id: 'reading', name: 'Reading streak', icon: 'reading', cats: ['reading'] },
    { id: 'fitness', name: 'Fitness streak', icon: 'exercise', cats: FITNESS_CATEGORIES },
    ...CATEGORIES.filter((c) => !['study', 'reading', ...FITNESS_CATEGORIES].includes(c.id)).map((c) => ({ id: c.id, name: `${c.name} streak`, icon: c.id, cats: [c.id] })),
  ];
  const categoryStreaks = groups.map((g) => ({ ...g, value: categoryStreak(days, g.cats, today) })).filter((g, i) => g.value > 0 || i < 3);
  const questStreaks = quests.filter((q) => isRepeating(q) && q.status === 'active').sort((a, b) => b.streak - a.streak);
  const used = restDaysUsed(state, today);
  const allowance = restAllowance(state);
  const topRuns = [...history.runs].sort((a, b) => b.length - a.length).slice(0, 5);

  return (
    <div className="space-y-7">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Current streak" value={<StreakFlame streak={profile.currentStreak} size="lg" />} sub="days in a row" />
        <StatTile label="Longest streak" value={formatNumber(Math.max(profile.longestStreak, history.longest))} sub="days — your record" />
        <StatTile label="This week" value={`${consistency.thisWeek}/7`} sub={`active or rest days (${consistency.elapsed} so far)`} />
        <StatTile label="Rest days" value={`${Math.max(0, allowance - used)} left`} sub={`of ${allowance} this week`}>
          <Button variant="ghost" size="sm" icon="moon" className="-ml-2 self-start" onClick={() => openSheet({ type: 'rest' })}>
            Take a rest day
          </Button>
        </StatTile>
      </div>

      <Section title="Calendar" id="calendar" description="Every square is a day. Brighter means more XP.">
        <div className="card p-4 sm:p-5">
          <StreakCalendar days={days} today={today} weeks={53} goal={profile.dailyGoal} weekStartsOn={weekStartsOn} />
        </div>
      </Section>

      <Section title="Weekly consistency" id="consistency">
        <div className="card p-4 sm:p-5">
          <div className="flex items-end gap-2" role="img" aria-label={`Active days per week: ${consistency.history.map((w) => w.active).join(', ')}`}>
            {consistency.history.map((w) => (
              <div key={w.weekKey} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex h-24 w-full max-w-7 flex-col-reverse gap-[2px]">
                  {Array.from({ length: 7 }, (_, i) => (
                    <span key={i} className="flex-1 rounded-[3px]" style={{ background: i < w.active ? 'var(--accent)' : 'var(--surface-3)', opacity: i < w.active ? 0.45 + (w.active / 7) * 0.55 : 1 }} />
                  ))}
                </div>
                <span className="text-[10px] text-faint num">{formatDayShort(w.weekKey)}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted">Days per week with activity or a rest day. Consistency beats intensity.</p>
        </div>
      </Section>

      <div className="grid gap-7 lg:grid-cols-2">
        <Section title="Category streaks" id="category-streaks">
          <ul className="card divide-y divide-line">
            {categoryStreaks.map((g) => (
              <li key={g.id} className="flex items-center gap-3.5 px-4 py-3">
                <CategoryIcon category={g.icon} size={36} />
                <span className="flex-1 font-medium text-fg">{g.name.toUpperCase().replace(' STREAK', '')} STREAK</span>
                <span className="font-display text-sm font-bold text-fg">
                  {g.value} {g.value === 1 ? 'DAY' : 'DAYS'}
                </span>
              </li>
            ))}
          </ul>
        </Section>
        <Section title="Quest streaks" id="quest-streaks">
          {questStreaks.length ? (
            <ul className="card divide-y divide-line">
              {questStreaks.map((q) => (
                <li key={q.id} className="flex items-center gap-3.5 px-4 py-3">
                  <CategoryIcon category={q.category} size={36} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-fg">{q.title}</span>
                    <span className="block text-xs text-muted">Best {q.bestStreak} · done {q.completionCount}×</span>
                  </span>
                  <span className="flex items-center gap-1 font-display text-sm font-bold text-fg">
                    <Icon name="flame" size={15} className="text-[#fb923c]" /> {q.streak}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="card p-5 text-sm text-muted">Repeating quests build their own streaks. Create one — “Practice guitar every day” — to start.</div>
          )}
        </Section>
      </div>

      <ChartFrame
        title="Streak history"
        subtitle="Your streak over the last 90 days"
        table={<DataTable caption="Longest streaks" rows={topRuns} columns={[{ label: 'From', value: (r) => formatDay(r.start, { month: 'short', day: 'numeric', year: 'numeric' }) }, { label: 'To', value: (r) => formatDay(r.end, { month: 'short', day: 'numeric', year: 'numeric' }) }, { label: 'Days', value: (r) => r.length, numeric: true }]} />}
      >
        <AreaChart data={series} unit="days" height={160} />
      </ChartFrame>

      <p className="flex items-start gap-2 px-1 text-[13px] text-muted">
        <Icon name="heart-pulse" size={15} className="mt-0.5 shrink-0 text-success" />
        Missing a day resets a streak, never your progress. Rest days bridge the gap — recovery is part of the game.
      </p>
    </div>
  );
}
