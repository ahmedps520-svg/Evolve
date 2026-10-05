import { AnimatePresence, m } from 'framer-motion';
import { useMemo, useState } from 'react';
import type { Goal, Quest } from '@/types';
import { cn } from '@/lib/cn';
import { addDays, diffDays, formatDay, toDateKey } from '@/lib/date';
import { formatNumber } from '@/lib/format';
import { navigate } from '@/lib/router';
import { deleteGoal, goalBonusXP, goalProgress, rerollsLeft, setGoalProgress, toggleMilestone } from '@/lib/engine/gameEngine';
import { isRepeating, nextScheduledDay, questsForToday } from '@/lib/engine/quests';
import { activeEvents, eventProgress } from '@/lib/engine/specialEvents';
import { challengeProgress, currentWeekKey, daysLeftInWeek } from '@/lib/engine/weekly';
import { useToday } from '@/hooks/useGameData';
import { dispatch, useGame } from '@/store/gameStore';
import { fxFrom, useUI } from '@/store/uiStore';
import { PageHeader } from '@/layouts/AppShell';
import { BossCard, BossClaim, ChallengeCard, EventCard } from '@/components/game/Challenges';
import { QuestCard } from '@/components/game/QuestCard';
import { CategoryTag } from '@/components/game/Tags';
import { Button } from '@/components/ui/Button';
import { EmptyState, ProgressBar, ProgressRing, Section, Tabs } from '@/components/ui/Display';
import { Slider } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Menu } from '@/components/ui/Menu';
import { ConfirmDialog } from '@/components/ui/Overlay';

type Tab = 'today' | 'all' | 'weekly' | 'goals';

function TodayTab() {
  const quests = useGame((s) => s.quests);
  const today = useToday();
  const rerolls = useGame((s) => rerollsLeft(s, Date.now()));
  const openSheet = useUI((s) => s.openSheet);
  const board = useMemo(() => questsForToday(quests, today), [quests, today]);
  const open = board.filter((q) => !q.completed);
  const done = board.filter((q) => q.completed);
  return (
    <div className="space-y-7">
      <div className="grid grid-cols-2 gap-2 sm:flex">
        <Button variant="primary" cta icon="plus" onClick={() => openSheet({ type: 'quest' })}>
          Create quest
        </Button>
        <Button variant="secondary" icon="wand-sparkles" onClick={() => openSheet({ type: 'generator' })}>
          Generate quests
        </Button>
      </div>
      {board.length === 0 ? (
        <EmptyState icon="scroll-text" title="Your quest board is empty." message="Create your first quest and start earning XP." action={{ label: 'Create quest', onClick: () => openSheet({ type: 'quest' }) }} />
      ) : (
        <>
          <Section title={`Open · ${open.length}`} id="open" description={rerolls > 0 ? 'Don’t like a daily quest? You have 1 free reroll today (⋯ menu).' : undefined}>
            {open.length ? (
              <div className="grid gap-3 lg:grid-cols-2">
                <AnimatePresence initial={false}>
                  {open.map((q) => (
                    <QuestCard key={q.id} quest={q} />
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="card flex items-center gap-3 p-4 text-sm text-muted">
                <Icon name="trophy" size={18} className="text-success" /> All of today’s quests are done. Rest counts too.
              </div>
            )}
          </Section>
          {done.length > 0 && (
            <Section title={`Completed · ${done.length}`} id="done">
              <div className="grid gap-3 lg:grid-cols-2">
                {done.map((q) => (
                  <QuestCard key={q.id} quest={q} />
                ))}
              </div>
            </Section>
          )}
        </>
      )}
    </div>
  );
}

function scheduleText(q: Quest, today: string): string {
  const s = q.repeatSchedule;
  if (s.type === 'daily') return 'Every day';
  if (s.type === 'weekdays') return 'Weekdays';
  if (s.type === 'weekly') {
    const next = nextScheduledDay(s, today);
    return next && next !== today ? `Next: ${formatDay(next, { weekday: 'long' })}` : 'Today';
  }
  return 'Once';
}

function AllTab() {
  const quests = useGame((s) => s.quests);
  const today = useToday();
  const openSheet = useUI((s) => s.openSheet);
  const [showDone, setShowDone] = useState(false);
  const repeating = quests.filter((q) => isRepeating(q) && q.status === 'active');
  const oneOff = quests.filter((q) => !isRepeating(q) && q.status === 'active' && q.kind !== 'daily');
  const completed = quests.filter((q) => q.status === 'completed' && q.kind !== 'daily').sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));
  const todayIds = new Set(questsForToday(quests, today).map((q) => q.id));

  if (!repeating.length && !oneOff.length && !completed.length) {
    return <EmptyState icon="scroll-text" title="No custom quests yet." message="Turn anything into a quest — “Practice guitar”, “Clean my room”, “Run 2 km”." action={{ label: 'Create quest', onClick: () => openSheet({ type: 'quest' }) }} />;
  }
  return (
    <div className="space-y-8">
      {repeating.length > 0 && (
        <Section title="Repeating" id="repeating" description="Habits that come back on their schedule.">
          <div className="grid gap-3 lg:grid-cols-2">
            {repeating.map((q) =>
              todayIds.has(q.id) ? (
                <QuestCard key={q.id} quest={q} />
              ) : (
                <div key={q.id} className="card flex items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-fg">{q.title}</p>
                    <p className="mt-0.5 text-[13px] text-muted">{scheduleText(q, today)}</p>
                  </div>
                  <CategoryTag category={q.category} />
                  <Menu items={[{ label: 'Edit quest', icon: 'pencil', onSelect: () => openSheet({ type: 'quest', questId: q.id }) }]} />
                </div>
              ),
            )}
          </div>
        </Section>
      )}
      {oneOff.length > 0 && (
        <Section title="One-time quests" id="oneoff">
          <div className="grid gap-3 lg:grid-cols-2">
            {oneOff.map((q) => (
              <QuestCard key={q.id} quest={q} />
            ))}
          </div>
        </Section>
      )}
      {completed.length > 0 && (
        <Section
          title={`Completed · ${completed.length}`}
          id="completed"
          action={
            <button type="button" onClick={() => setShowDone((v) => !v)} className="text-[13px] font-medium text-accent-ink hover:underline" aria-expanded={showDone}>
              {showDone ? 'Hide' : 'Show'}
            </button>
          }
        >
          {showDone && (
            <ul className="card divide-y divide-line">
              {completed.slice(0, 50).map((q) => (
                <li key={q.id} className="flex items-center gap-3 px-4 py-3">
                  <Icon name="check" size={16} className="text-success" />
                  <span className="min-w-0 flex-1 truncate text-sm text-fg">{q.title}</span>
                  <span className="text-xs text-muted">{q.completedAt ? formatDay(toDateKey(q.completedAt), { month: 'short', day: 'numeric' }) : ''}</span>
                  <span className="font-display text-xs font-bold text-faint">+{q.xpReward} XP</span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      )}
    </div>
  );
}

function WeeklyTab() {
  const today = useToday();
  const weekStartsOn = useGame((s) => s.settings.weekStartsOn);
  const weeklies = useGame((s) => s.weeklies);
  const transactions = useGame((s) => s.transactions);
  const activities = useGame((s) => s.activities);
  const data = { transactions, activities };
  const weekKey = currentWeekKey(today, weekStartsOn);
  const week = weeklies.find((w) => w.weekKey === weekKey);
  const left = daysLeftInWeek(today, weekStartsOn);
  const events = activeEvents(today, weekStartsOn);
  const history = weeklies.filter((w) => w.weekKey < weekKey).slice(-6).reverse();
  const boss = week?.challenges.find((c) => c.bossId);
  const bounties = week?.challenges.filter((c) => !c.bossId) ?? [];

  return (
    <div className="space-y-8">
      <p className="flex items-center gap-2 text-sm text-muted">
        <Icon name="clock" size={15} /> Resets in {left} day{left === 1 ? '' : 's'} · {formatDay(weekKey, { month: 'short', day: 'numeric' })} – {formatDay(addDays(weekKey, 6), { month: 'short', day: 'numeric' })}
      </p>
      {events.length > 0 && (
        <Section title="Special event" id="event">
          {events.map((ev) => (
            <EventCard key={ev.key} ev={ev} progress={eventProgress(data, ev)} />
          ))}
        </Section>
      )}
      {boss && (
        <Section title="Boss fight" id="boss">
          <div className="space-y-0">
            <BossCard challenge={boss} progress={challengeProgress(data, weekKey, boss)} daysLeft={left} />
            <div className="-mt-3 px-4 pb-1 sm:px-5">
              <BossClaim challenge={boss} progress={challengeProgress(data, weekKey, boss)} />
            </div>
          </div>
        </Section>
      )}
      {bounties.length > 0 && (
        <Section title="Bounties" id="bounties">
          <div className="grid gap-3 lg:grid-cols-2">
            {bounties.map((c) => (
              <ChallengeCard key={c.id} challenge={c} progress={challengeProgress(data, weekKey, c)} />
            ))}
          </div>
        </Section>
      )}
      {history.length > 0 && (
        <Section title="Past weeks" id="history">
          <ul className="card divide-y divide-line">
            {history.map((w) => {
              const cleared = w.challenges.filter((c) => c.claimed).length;
              return (
                <li key={w.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                  <span className="flex-1 text-fg">Week of {formatDay(w.weekKey, { month: 'short', day: 'numeric' })}</span>
                  <span className="flex gap-1" role="img" aria-label={`${cleared} of ${w.challenges.length} cleared`}>
                    {w.challenges.map((c) => (
                      <span key={c.id} className={cn('size-2.5 rotate-45 rounded-[2px]', c.claimed ? 'bg-success' : 'bg-surface-4')} />
                    ))}
                  </span>
                  <span className="w-16 text-right text-xs text-muted">
                    {cleared}/{w.challenges.length} cleared
                  </span>
                </li>
              );
            })}
          </ul>
        </Section>
      )}
    </div>
  );
}

function GoalCard({ goal }: { goal: Goal }) {
  const openSheet = useUI((s) => s.openSheet);
  const today = useToday();
  const [confirm, setConfirm] = useState(false);
  const pct = goalProgress(goal);
  const done = goal.status === 'completed';
  const daysLeft = goal.deadline ? diffDays(today, goal.deadline) : null;
  const linked = useGame((s) => s.quests.filter((q) => q.goalId === goal.id && q.status === 'active').length);

  return (
    <article className={cn('card p-5', done && 'border-success/30')}>
      <div className="flex items-start gap-4">
        <ProgressRing value={pct} max={100} size={66} stroke={7} color={done ? 'var(--success)' : 'var(--accent)'} label={`${goal.title} progress`}>
          <span className="font-display text-sm font-bold text-fg">{pct}%</span>
        </ProgressRing>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-lg font-bold tracking-wide text-fg">{goal.title}</h3>
          {goal.target && <p className="text-sm text-muted">Target: {goal.target}</p>}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            {goal.category && <CategoryTag category={goal.category} />}
            {goal.deadline && !done && (
              <span className={cn('flex items-center gap-1', daysLeft !== null && daysLeft < 0 && 'text-warning')}>
                <Icon name="calendar-days" size={13} />
                {daysLeft !== null && daysLeft >= 0 ? `${daysLeft} days left · ${formatDay(goal.deadline, { month: 'short', day: 'numeric' })}` : `Deadline passed · ${formatDay(goal.deadline, { month: 'short', day: 'numeric' })}`}
              </span>
            )}
            {done && <span className="flex items-center gap-1 text-success"><Icon name="badge-check" size={13} /> Completed</span>}
            {linked > 0 && <span className="flex items-center gap-1"><Icon name="scroll-text" size={13} /> {linked} linked quest{linked === 1 ? '' : 's'}</span>}
          </div>
        </div>
        <Menu
          items={[
            ...(done ? [] : [{ label: 'Generate quests', icon: 'wand-sparkles', onSelect: () => openSheet({ type: 'generator', goalId: goal.id, prompt: goal.title }) }]),
            { label: 'Edit goal', icon: 'pencil', onSelect: () => openSheet({ type: 'goal', goalId: goal.id }) },
            { label: 'Delete goal', icon: 'trash-2', danger: true, onSelect: () => setConfirm(true) },
          ]}
        />
      </div>
      {goal.description && <p className="mt-4 text-sm text-muted">{goal.description}</p>}
      {goal.milestones.length > 0 ? (
        <ol className="mt-4 space-y-1.5">
          {goal.milestones.map((ms, i) => (
            <li key={ms.id}>
              <button
                type="button"
                disabled={done}
                onClick={(e) => {
                  fxFrom(e.currentTarget);
                  dispatch((s, now) => toggleMilestone(s, goal.id, ms.id, now));
                }}
                aria-pressed={ms.completed}
                className={cn('flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition', ms.completed ? 'border-success/25 bg-success/8' : 'border-line bg-surface-2 hover:border-line-strong')}
              >
                <span className={cn('grid size-6 shrink-0 place-items-center rounded-full border-2', ms.completed ? 'border-success bg-success text-bg' : 'border-line-strong')}>{ms.completed && <Icon name="check" size={13} strokeWidth={3} />}</span>
                <span className="min-w-0 flex-1">
                  <span className="text-xs text-faint">Milestone {i + 1}</span>
                  <span className={cn('block text-sm font-medium', ms.completed ? 'text-muted line-through decoration-1' : 'text-fg')}>{ms.title}</span>
                </span>
                <span className={cn('font-display text-xs font-bold', ms.completed ? 'text-success' : 'text-accent-ink')}>+{ms.xpReward} XP</span>
              </button>
            </li>
          ))}
        </ol>
      ) : (
        !done && (
          <div className="mt-4">
            <Slider label="Progress" value={goal.progress} min={0} max={100} step={5} format={(v) => `${v}%`} onChange={(v) => dispatch((s, now) => setGoalProgress(s, goal.id, v, now))} />
          </div>
        )
      )}
      {!done && (
        <p className="mt-3 text-xs text-muted">
          Completing this goal awards <span className="font-semibold text-accent-ink">+{formatNumber(goalBonusXP(goal))} XP</span> and 100 coins.
        </p>
      )}
      {!done && goal.milestones.length > 0 && <ProgressBar className="mt-3" value={pct} max={100} height={4} label="Goal progress" />}
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={() => {
          dispatch((s, now) => deleteGoal(s, goal.id, now));
          setConfirm(false);
        }}
        title="Delete goal?"
        message="The goal and its milestones will be removed. XP you earned stays yours, and linked quests remain on your board."
        confirmLabel="Delete"
        tone="danger"
      />
    </article>
  );
}

function GoalsTab() {
  const goals = useGame((s) => s.goals);
  const openSheet = useUI((s) => s.openSheet);
  const active = goals.filter((g) => g.status === 'active');
  const completed = goals.filter((g) => g.status === 'completed');
  return (
    <div className="space-y-8">
      <div className="flex gap-2">
        <Button variant="primary" cta icon="goal" onClick={() => openSheet({ type: 'goal' })}>
          New goal
        </Button>
      </div>
      {!goals.length && <EmptyState icon="goal" title="No goals yet." message="Set a long-term goal, break it into milestones, and let Evolve turn it into quests." action={{ label: 'Create goal', icon: 'goal', onClick: () => openSheet({ type: 'goal' }) }} />}
      {active.length > 0 && (
        <Section title={`Active · ${active.length}`} id="active-goals">
          <div className="grid gap-3 lg:grid-cols-2">
            {active.map((g) => (
              <GoalCard key={g.id} goal={g} />
            ))}
          </div>
        </Section>
      )}
      {completed.length > 0 && (
        <Section title={`Completed · ${completed.length}`} id="done-goals">
          <div className="grid gap-3 lg:grid-cols-2">
            {completed.map((g) => (
              <GoalCard key={g.id} goal={g} />
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

export default function Quests({ tab }: { tab?: string }) {
  const current: Tab = tab === 'all' || tab === 'weekly' || tab === 'goals' ? tab : 'today';
  const quests = useGame((s) => s.quests);
  const today = useToday();
  const openCount = useMemo(() => questsForToday(quests, today).filter((q) => !q.completed).length, [quests, today]);
  return (
    <div>
      <PageHeader eyebrow="Quest board" title="Quests" subtitle="Small, real actions that add up." />
      <Tabs<Tab>
        label="Quest sections"
        className="mb-7"
        value={current}
        onChange={(t) => navigate(t === 'today' ? '/quests' : `/quests/${t}`, { replace: true })}
        items={[
          { id: 'today', label: 'Today', icon: 'sun', badge: openCount || undefined },
          { id: 'all', label: 'All quests', icon: 'scroll-text' },
          { id: 'weekly', label: 'Weekly', icon: 'swords' },
          { id: 'goals', label: 'Goals', icon: 'goal' },
        ]}
      />
      <m.div key={current} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} role="tabpanel">
        {current === 'today' && <TodayTab />}
        {current === 'all' && <AllTab />}
        {current === 'weekly' && <WeeklyTab />}
        {current === 'goals' && <GoalsTab />}
      </m.div>
    </div>
  );
}

