import { AnimatePresence, m } from 'framer-motion';
import { useMemo } from 'react';
import { CLASS_MAP } from '@/data/classes';
import { getCategory } from '@/data/categories';
import { attributeColor } from '@/data/attributes';
import { addDays, formatDay, toDateKey } from '@/lib/date';
import { formatNumber } from '@/lib/format';
import { href } from '@/lib/router';
import { categoryLevels } from '@/lib/stats';
import { dismissStreakReset, dismissTip, takeRestDay } from '@/lib/engine/gameEngine';
import { questsForToday } from '@/lib/engine/quests';
import { activeEvents, eventProgress } from '@/lib/engine/specialEvents';
import { challengeProgress, currentWeekKey, daysLeftInWeek } from '@/lib/engine/weekly';
import { useDayStats, useToday, useXPProgress } from '@/hooks/useGameData';
import { promptInstall, useInstallHint } from '@/pwa/register';
import { dispatch, useGame } from '@/store/gameStore';
import { useUI } from '@/store/uiStore';
import { Avatar } from '@/components/game/Avatar';
import { BossCard, EventCard, MomentumMeter, StatTile } from '@/components/game/Challenges';
import { titleText, BadgeEmblem } from '@/components/game/Cosmetic';
import { CoinBadge, LevelBadge, StreakFlame, XPBar } from '@/components/game/Hud';
import { QuestCard } from '@/components/game/QuestCard';
import { rankFor } from '@/components/game/rank';
import { CategoryIcon } from '@/components/game/Tags';
import { StreakCalendar } from '@/components/charts/Heatmap';
import { Sparkline } from '@/components/charts/Charts';
import { Button } from '@/components/ui/Button';
import { EmptyState, NumberTicker, ProgressBar, ProgressRing, Section } from '@/components/ui/Display';
import { Icon } from '@/components/ui/Icon';

function greeting(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Good morning';
  if (h >= 12 && h < 17) return 'Good afternoon';
  return 'Good evening';
}

function Hero() {
  const profile = useGame((s) => s.profile)!;
  const xp = useXPProgress();
  const title = titleText(profile.titleId);
  return (
    <section className="card hud-corners relative overflow-hidden p-5 sm:p-6" aria-label="Your character">
      <div className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full opacity-70" style={{ background: 'radial-gradient(circle, color-mix(in oklab, var(--accent) 22%, transparent), transparent 70%)' }} aria-hidden />
      <div className="relative flex items-center gap-4">
        <a href={href('/character')} aria-label="Open character">
          <Avatar avatar={profile.avatar} size={76} />
        </a>
        <div className="min-w-0 flex-1">
          <p className="hud-label">{greeting()}</p>
          <h1 className="flex items-center gap-2 truncate font-display text-[22px] leading-tight font-bold tracking-[0.06em] text-fg uppercase sm:text-2xl">
            <span className="truncate">{profile.name}</span>
            {profile.badgeId && <BadgeEmblem itemId={profile.badgeId} size={20} />}
          </h1>
          <p className="mt-0.5 truncate font-display text-[11.5px] font-semibold tracking-[0.2em] text-accent-ink uppercase">
            {title ?? 'No title'} <span className="text-faint">· {CLASS_MAP[profile.classId].name}</span>
          </p>
        </div>
        <LevelBadge level={xp.level} size={54} className="hidden sm:grid" />
      </div>

      <div className="relative mt-5">
        <div className="flex items-end justify-between gap-3">
          <p className="flex items-baseline gap-2">
            <span className="hud-label">Level</span>
            <span className="font-display text-[40px] leading-none font-bold text-fg">
              <NumberTicker value={xp.level} />
            </span>
          </p>
          <p className="text-right">
            <span className="font-display text-lg font-semibold text-fg">
              <NumberTicker value={xp.current} />
            </span>
            <span className="text-sm text-muted"> / {formatNumber(xp.required)} XP</span>
          </p>
        </div>
        <XPBar className="mt-3" percent={xp.percent} level={xp.level} height={12} registerTarget />
        <div className="mt-2 flex justify-between gap-3 text-xs text-muted">
          <span>
            <span className="font-semibold text-fg num">{formatNumber(xp.toNext)}</span> XP to Level {xp.level + 1}
          </span>
          <span className="num">{formatNumber(profile.totalXP)} total XP</span>
        </div>
      </div>
      <div className="relative mt-4 flex flex-wrap items-center gap-2">
        <span className="inline-flex h-9 items-center rounded-full border border-line bg-surface-2 px-3">
          <StreakFlame streak={profile.currentStreak} registerTarget />
          <span className="ml-1.5 text-xs text-muted">day streak</span>
        </span>
        <CoinBadge coins={profile.coins} registerTarget />
      </div>
    </section>
  );
}

function StreakResetCard() {
  const notice = useGame((s) => s.meta.streakReset);
  const today = useToday();
  if (!notice || notice.seen) return null;
  const canProtect = notice.protectableDay === addDays(today, -1);
  return (
    <m.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card relative overflow-hidden p-5" aria-labelledby="streak-reset">
      <span className="absolute inset-y-0 left-0 w-[3px] bg-accent" aria-hidden />
      <p id="streak-reset" className="hud-label !text-accent-ink">
        Streak reset
      </p>
      <p className="mt-1.5 text-[15px] font-medium text-fg">Your progress isn’t gone. Start a new streak today.</p>
      <p className="mt-1 text-sm text-muted">
        Your {notice.previous}-day streak still counts toward your longest streak{canProtect ? ' — and a rest day can still cover yesterday.' : '.'}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {canProtect && (
          <Button variant="success" icon="shield-check" onClick={() => dispatch((s, now) => takeRestDay(s, notice.protectableDay!, now))}>
            Use a rest day for yesterday
          </Button>
        )}
        <Button variant="ghost" onClick={() => dispatch((s) => dismissStreakReset(s))}>
          Got it
        </Button>
      </div>
    </m.section>
  );
}

function InstallCard() {
  const hint = useInstallHint();
  const dismissed = useGame((s) => s.meta.dismissed.includes('install'));
  const created = useGame((s) => s.profile?.createdAt ?? 0);
  if (dismissed || hint === 'installed' || hint === 'none' || Date.now() - created < 60_000) return null;
  return (
    <section className="card flex items-start gap-4 p-4" aria-label="Install Evolve">
      <span className="grid size-11 shrink-0 place-items-center rounded-[14px] bg-accent/14 text-accent-ink">
        <Icon name="smartphone" size={20} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-fg">Add Evolve to your Home Screen</p>
        <p className="mt-0.5 text-[13px] text-muted">{hint === 'ios' ? 'Tap Share, then “Add to Home Screen”. It works offline like a real app.' : 'Launch it like an app — full screen, offline, instant.'}</p>
        <div className="mt-3 flex gap-2">
          {hint === 'prompt' && (
            <Button variant="primary" size="sm" icon="download" onClick={() => void promptInstall()}>
              Install
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => dispatch((s) => dismissTip(s, 'install'))}>
            Not now
          </Button>
        </div>
      </div>
    </section>
  );
}

function TodayStatus() {
  const profile = useGame((s) => s.profile)!;
  const days = useDayStats();
  const today = useToday();
  const quests = useGame((s) => s.quests);
  const openSheet = useUI((s) => s.openSheet);
  const celebrate = useUI((s) => s.celebrate);
  const day = days.get(today);
  const xpToday = day?.xp ?? 0;
  const board = useMemo(() => questsForToday(quests, today), [quests, today]);
  const done = board.filter((q) => q.completed).length;
  const rank = rankFor(xpToday, profile.dailyGoal);
  const last7 = useMemo(() => Array.from({ length: 7 }, (_, i) => days.get(addDays(today, i - 6))?.xp ?? 0), [days, today]);
  const goalMet = !!day?.goalMet;
  const activeToday = !!day?.active;

  return (
    <Section title="Today" id="today" action={<span className="text-xs text-muted">{formatDay(today, { weekday: 'long', month: 'short', day: 'numeric' })}</span>}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="card col-span-2 flex items-center gap-5 p-4 sm:col-span-2 sm:row-span-2 sm:flex-col sm:justify-center sm:gap-4 sm:p-5">
          <ProgressRing value={xpToday} max={profile.dailyGoal} size={118} stroke={11} label="Daily goal progress" color={goalMet ? 'var(--success)' : 'var(--accent)'}>
            <div>
              <p className="font-display text-[26px] leading-none font-bold text-fg">
                <NumberTicker value={xpToday} />
              </p>
              <p className="mt-1 text-[11px] text-muted num">/ {formatNumber(profile.dailyGoal)} XP</p>
            </div>
          </ProgressRing>
          <div className="min-w-0 flex-1 sm:text-center">
            <p className="hud-label">Daily goal</p>
            {goalMet ? (
              <p className="mt-1 flex items-center gap-1.5 font-display text-sm font-bold tracking-wide text-success uppercase sm:justify-center">
                <Icon name="badge-check" size={16} /> Complete
              </p>
            ) : (
              <p className="mt-1 text-sm text-fg">
                <span className="font-semibold num">{formatNumber(Math.max(0, profile.dailyGoal - xpToday))}</span> <span className="text-muted">XP to go</span>
              </p>
            )}
            <p className="mt-2 text-xs text-muted">
              Rank{' '}
              <span className="font-display font-semibold tracking-[0.1em] uppercase" style={{ color: rank.color }}>
                {rank.label}
              </span>
              {rank.next && <span className="block sm:inline"> · {formatNumber(rank.toNext)} XP to {rank.next}</span>}
            </p>
          </div>
        </div>
        <StatTile label="Today’s XP" value={<>+<NumberTicker value={xpToday} /></>} sub={<Sparkline values={last7} width={84} height={22} />} />
        <StatTile label="Quests" value={`${done}/${board.length}`} sub="completed today" />
        <StatTile label="Streak" value={<StreakFlame streak={profile.currentStreak} size="lg" />} sub={`Best ${profile.longestStreak} days`} />
        <StatTile label="This week" value={<NumberTicker value={last7.reduce((a, b) => a + b, 0)} />} sub="XP in 7 days" />
      </div>
      <MomentumMeter />
      {profile.currentStreak > 0 && !activeToday && (
        <p className="flex items-center gap-2 px-1 text-[13px] text-muted">
          <Icon name="flame" size={14} className="text-[#fb923c]" />
          Any quest or activity today keeps your {profile.currentStreak}-day streak going.
        </p>
      )}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-2 xl:grid-cols-4">
        <Button variant="secondary" icon="timer" onClick={() => openSheet({ type: 'focus' })}>
          Focus
        </Button>
        <Button variant="secondary" icon="notebook-pen" onClick={() => openSheet({ type: 'log' })}>
          Log
        </Button>
        <Button variant="secondary" icon="moon" onClick={() => openSheet({ type: 'rest' })}>
          Rest day
        </Button>
        <Button variant="secondary" icon="scroll-text" onClick={() => celebrate({ type: 'summary', dateKey: toDateKey(), heading: 'Today’s adventure' })}>
          Summary
        </Button>
      </div>
    </Section>
  );
}

function TodaysQuests() {
  const quests = useGame((s) => s.quests);
  const today = useToday();
  const openSheet = useUI((s) => s.openSheet);
  const board = useMemo(() => questsForToday(quests, today), [quests, today]);
  const done = board.filter((q) => q.completed).length;
  const cleared = board.length > 0 && done === board.length;

  return (
    <Section
      title="Today’s quests"
      id="quests"
      description={board.length ? `${done} of ${board.length} complete` : undefined}
      action={
        <a href={href('/quests')} className="flex items-center gap-1 text-[13px] font-medium text-accent-ink hover:underline">
          All quests <Icon name="chevron-right" size={15} />
        </a>
      }
    >
      <AnimatePresence>
        {cleared && (
          <m.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-3 rounded-2xl border border-success/30 bg-success/8 px-4 py-3">
            <Icon name="trophy" size={20} className="text-success" />
            <div>
              <p className="font-display text-sm font-bold tracking-[0.1em] text-fg uppercase">Board cleared</p>
              <p className="text-[13px] text-muted">Every quest done. Rest easy — or take on something extra.</p>
            </div>
          </m.div>
        )}
      </AnimatePresence>
      {board.length ? (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {board.map((q) => (
              <QuestCard key={q.id} quest={q} />
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <EmptyState icon="scroll-text" title="Your quest board is empty." message="Create your first quest and start earning XP." action={{ label: 'Create quest', onClick: () => openSheet({ type: 'quest' }) }} />
      )}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" icon="plus" onClick={() => openSheet({ type: 'quest' })}>
          Create quest
        </Button>
        <Button variant="outline" icon="wand-sparkles" onClick={() => openSheet({ type: 'generator' })}>
          Generate quests
        </Button>
      </div>
    </Section>
  );
}

function WeekPanel() {
  const today = useToday();
  const weekStartsOn = useGame((s) => s.settings.weekStartsOn);
  const weeklies = useGame((s) => s.weeklies);
  const transactions = useGame((s) => s.transactions);
  const activities = useGame((s) => s.activities);
  const weekKey = currentWeekKey(today, weekStartsOn);
  const week = weeklies.find((w) => w.weekKey === weekKey);
  const boss = week?.challenges.find((c) => c.bossId);
  const events = activeEvents(today, weekStartsOn);
  const data = { transactions, activities };
  if (!boss && !events.length) return null;
  return (
    <Section title="This week" id="week" action={<a href={href('/quests/weekly')} className="flex items-center gap-1 text-[13px] font-medium text-accent-ink hover:underline">Challenges <Icon name="chevron-right" size={15} /></a>}>
      {events.map((ev) => (
        <EventCard key={ev.key} ev={ev} progress={eventProgress(data, ev)} compact />
      ))}
      {boss && <BossCard challenge={boss} progress={challengeProgress(data, weekKey, boss)} daysLeft={daysLeftInWeek(today, weekStartsOn)} compact linkTo="/quests/weekly" />}
    </Section>
  );
}

function StreakPanel() {
  const days = useDayStats();
  const today = useToday();
  const goal = useGame((s) => s.profile?.dailyGoal ?? 400);
  const weekStartsOn = useGame((s) => s.settings.weekStartsOn);
  return (
    <Section title="Activity" id="activity" action={<a href={href('/progress/streaks')} className="flex items-center gap-1 text-[13px] font-medium text-accent-ink hover:underline">Streaks <Icon name="chevron-right" size={15} /></a>}>
      <div className="card p-4 sm:p-5">
        <StreakCalendar days={days} today={today} weeks={17} goal={goal} weekStartsOn={weekStartsOn} cell={14} />
      </div>
    </Section>
  );
}

function TopSkills() {
  const transactions = useGame((s) => s.transactions);
  const activities = useGame((s) => s.activities);
  const levels = useMemo(() => categoryLevels({ transactions, activities }).slice(0, 3), [transactions, activities]);
  if (!levels.length) return null;
  return (
    <Section title="Top skills" id="skills" action={<a href={href('/progress/skills')} className="flex items-center gap-1 text-[13px] font-medium text-accent-ink hover:underline">All skills <Icon name="chevron-right" size={15} /></a>}>
      <div className="card divide-y divide-line">
        {levels.map((l) => {
          const c = getCategory(l.category);
          return (
            <div key={l.category} className="flex items-center gap-3.5 p-4">
              <CategoryIcon category={l.category} size={40} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate font-semibold text-fg">{c.name}</p>
                  <p className="shrink-0 font-display text-sm font-bold text-fg">Lv {l.level}</p>
                </div>
                <ProgressBar className="mt-2" value={l.percent} max={1} color={attributeColor(c.attribute)} height={5} label={`${c.name} level progress`} />
                <p className="mt-1.5 text-xs text-muted num">{formatNumber(l.xp)} XP</p>
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

export default function Home() {
  const profile = useGame((s) => s.profile);
  if (!profile) return null;
  return (
    <div className="grid gap-7 md:grid-cols-[minmax(0,1fr)_minmax(0,320px)] lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8">
      <div className="min-w-0 space-y-7">
        <Hero />
        <StreakResetCard />
        <TodayStatus />
        <TodaysQuests />
      </div>
      <div className="min-w-0 space-y-7">
        <InstallCard />
        <WeekPanel />
        <StreakPanel />
        <TopSkills />
      </div>
    </div>
  );
}
