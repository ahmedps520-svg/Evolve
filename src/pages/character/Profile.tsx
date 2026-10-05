import { useMemo } from 'react';
import { CLASS_MAP } from '@/data/classes';
import { getCategory } from '@/data/categories';
import { RARITY_VAR } from '@/data/difficulty';
import { formatFullDate, toDateKey, formatDay } from '@/lib/date';
import { formatMinutes, formatNumber } from '@/lib/format';
import { navigate } from '@/lib/router';
import { computeTotals } from '@/lib/engine/analysis';
import { attributeLevels, categoryLevels, favoriteCategory } from '@/lib/stats';
import { useAchievements, useDayStats, useXPProgress } from '@/hooks/useGameData';
import { useGame } from '@/store/gameStore';
import { AttributeRadar } from '@/components/charts/Radar';
import { Avatar, Sigil } from '@/components/game/Avatar';
import { StatTile } from '@/components/game/Challenges';
import { BadgeEmblem, heroName } from '@/components/game/Cosmetic';
import { CoinBadge, LevelBadge, StreakFlame, XPBar } from '@/components/game/Hud';
import { RarityTag } from '@/components/game/Tags';
import { Button } from '@/components/ui/Button';
import { NumberTicker, Section } from '@/components/ui/Display';
import { Icon } from '@/components/ui/Icon';

export default function Profile() {
  const profile = useGame((s) => s.profile)!;
  const transactions = useGame((s) => s.transactions);
  const activities = useGame((s) => s.activities);
  const xp = useXPProgress();
  const days = useDayStats();
  const achievements = useAchievements();

  const totals = useMemo(() => computeTotals({ transactions, activities }), [transactions, activities]);
  const levels = useMemo(() => categoryLevels({ transactions, activities }), [transactions, activities]);
  const attrs = useMemo(() => attributeLevels(levels), [levels]);
  const activeDays = useMemo(() => [...days.values()].filter((d) => d.active).length, [days]);
  const unlocked = achievements.filter((a) => a.unlocked);
  const recent = [...unlocked].sort((a, b) => (b.unlockedAt ?? 0) - (a.unlockedAt ?? 0)).slice(0, 4);
  const fav = favoriteCategory(levels);
  const cls = CLASS_MAP[profile.classId];

  return (
    <div className="space-y-7">
      <section className="card hud-corners relative overflow-hidden p-5 sm:p-7" aria-label="Character card">
        <div className="pointer-events-none absolute -top-28 left-1/2 size-[420px] -translate-x-1/2 rounded-full opacity-60 sm:left-24" style={{ background: 'radial-gradient(circle, color-mix(in oklab, var(--accent) 24%, transparent), transparent 68%)' }} aria-hidden />
        <div className="relative flex flex-col items-center gap-5 text-center sm:flex-row sm:items-center sm:text-left">
          <Avatar avatar={profile.avatar} size={128} label={`${profile.name}’s avatar`} />
          <div className="min-w-0 flex-1">
            <p className="hud-label">{cls.name} · Level {xp.level}</p>
            <h2 className="mt-1 flex items-center justify-center gap-2.5 font-display text-[26px] leading-tight font-bold tracking-[0.06em] text-fg uppercase sm:justify-start sm:text-[30px]">
              <span className="min-w-0 break-words">{heroName(profile.name, profile.titleId)}</span>
              {profile.badgeId && <BadgeEmblem itemId={profile.badgeId} size={24} />}
            </h2>
            <p className="mt-1 text-sm text-muted">“{cls.motto}”</p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <span className="inline-flex h-9 items-center rounded-full border border-line bg-surface-2 px-3">
                <StreakFlame streak={profile.currentStreak} />
                <span className="ml-1.5 text-xs text-muted">day streak</span>
              </span>
              <CoinBadge coins={profile.coins} />
            </div>
          </div>
          <LevelBadge level={xp.level} size={72} className="hidden sm:grid" />
        </div>

        <div className="relative mt-6">
          <div className="flex items-end justify-between gap-3">
            <p className="flex items-baseline gap-2">
              <span className="hud-label">Level</span>
              <span className="font-display text-[34px] leading-none font-bold text-fg">
                <NumberTicker value={xp.level} />
              </span>
            </p>
            <p className="text-right text-sm text-muted">
              <span className="font-display text-base font-semibold text-fg num">{formatNumber(xp.current)}</span> / {formatNumber(xp.required)} XP
            </p>
          </div>
          <XPBar className="mt-3" percent={xp.percent} level={xp.level} height={10} />
          <p className="mt-2 text-xs text-muted">
            <span className="font-semibold text-fg num">{formatNumber(xp.toNext)}</span> XP to Level {xp.level + 1}
          </p>
        </div>

        <div className="relative mt-5 flex flex-wrap justify-center gap-2 sm:justify-start">
          <Button variant="primary" icon="palette" onClick={() => navigate('/character/wardrobe')}>
            Customize
          </Button>
          <Button variant="secondary" icon="pencil" onClick={() => navigate('/settings')}>
            Edit profile
          </Button>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Total XP" icon="sparkles" value={formatNumber(profile.totalXP)} sub={`${formatNumber(totals.xpBySource.quest ?? 0)} from quests`} />
        <StatTile label="Quests done" icon="scroll-text" value={formatNumber(totals.questsCompleted)} sub={`${formatNumber(totals.activitiesLogged)} activities logged`} />
        <StatTile label="Achievements" icon="award" value={`${unlocked.length}/${achievements.length}`} sub="unlocked" />
        <StatTile label="Longest streak" icon="flame" value={formatNumber(profile.longestStreak)} sub={profile.longestStreak === 1 ? 'day' : 'days'} />
        <StatTile label="Time invested" icon="clock" value={formatMinutes(totals.totalMinutes)} sub={`${formatNumber(totals.focusSessions)} focus sessions`} />
        <StatTile label="Active days" icon="calendar-check" value={formatNumber(activeDays)} sub={`${formatNumber(totals.dailyGoals)} daily goals reached`} />
        <StatTile label="Coins earned" icon="coins" value={formatNumber(totals.coinsEarned)} sub={`${formatNumber(totals.coinsSpent)} spent in the shop`} />
        <StatTile label="Favorite" icon="star" value={<span className="text-xl">{fav ? getCategory(fav).name : '—'}</span>} sub={fav ? 'most time spent' : 'log an activity to find out'} />
      </div>

      <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Section title="Class" id="class">
          <div className="card flex gap-4 p-5">
            <span className="grid size-14 shrink-0 place-items-center rounded-2xl border border-accent/30 bg-accent/12 text-accent-ink">
              <Sigil sigil={`sigil:${cls.sigil}`} className="size-8" />
            </span>
            <div className="min-w-0">
              <p className="font-display text-lg font-bold tracking-[0.12em] text-fg uppercase">{cls.name}</p>
              <p className="mt-1 text-sm text-muted">{cls.description}</p>
              <p className="mt-3 flex items-start gap-2 text-[13px] text-fg">
                <Icon name="sparkle" size={14} className="mt-0.5 shrink-0 text-accent-ink" />
                {cls.passive}
              </p>
              <p className="mt-3 text-xs text-faint">
                Joined {formatFullDate(profile.createdAt)} · Party tag {profile.playerTag}
              </p>
            </div>
          </div>
        </Section>

        <Section
          title="Recent achievements"
          id="recent-achievements"
          action={
            <Button variant="ghost" size="sm" iconRight="chevron-right" onClick={() => navigate('/character/achievements')}>
              All
            </Button>
          }
        >
          <ul className="card divide-y divide-line">
            {recent.map((a) => (
              <li key={a.id} className="flex items-center gap-3.5 px-4 py-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl border" style={{ color: RARITY_VAR[a.rarity], borderColor: `color-mix(in oklab, ${RARITY_VAR[a.rarity]} 40%, transparent)`, background: `color-mix(in oklab, ${RARITY_VAR[a.rarity]} 12%, transparent)` }}>
                  <Icon name={a.icon} size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-fg">{a.name}</span>
                  <span className="block text-xs text-muted">{a.unlockedAt ? formatDay(toDateKey(a.unlockedAt), { month: 'short', day: 'numeric', year: 'numeric' }) : ''}</span>
                </span>
                <RarityTag rarity={a.rarity} className="hidden sm:inline-flex" />
              </li>
            ))}
          </ul>
        </Section>
      </div>

      <Section
        title="Attributes"
        id="profile-attributes"
        description="Your six attributes grow from the categories you train."
        action={
          <Button variant="ghost" size="sm" iconRight="chevron-right" onClick={() => navigate('/progress/skills')}>
            Skills
          </Button>
        }
      >
        <div className="card grid place-items-center p-5">
          <AttributeRadar values={attrs} />
        </div>
      </Section>
    </div>
  );
}
