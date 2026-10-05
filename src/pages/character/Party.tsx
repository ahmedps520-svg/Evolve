import { useMemo, useState } from 'react';
import type { AvatarConfig, PartyMember } from '@/types';
import { CLASS_MAP } from '@/data/classes';
import { cn } from '@/lib/cn';
import { addDays, formatDay, monthKey, timeAgo } from '@/lib/date';
import { formatNumber } from '@/lib/format';
import { navigate } from '@/lib/router';
import { CHALLENGE_REWARD, cancelChallenge, createChallenge, removePartyMember, updateSettings } from '@/lib/engine/gameEngine';
import { currentWeekKey, daysLeftInWeek } from '@/lib/engine/weekly';
import { monthlyXP, weeklyXP } from '@/lib/social';
import { useToday } from '@/hooks/useGameData';
import { dispatch, useGame, useGameStore } from '@/store/gameStore';
import { useUI } from '@/store/uiStore';
import { Avatar } from '@/components/game/Avatar';
import { titleText } from '@/components/game/Cosmetic';
import { CoinIcon, LevelBadge } from '@/components/game/Hud';
import { Button } from '@/components/ui/Button';
import { EmptyState, Section } from '@/components/ui/Display';
import { Field, Segmented, Select } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { ConfirmDialog } from '@/components/ui/Overlay';

type Board = 'weekly' | 'monthly' | 'total';

interface Row {
  id: string;
  name: string;
  you: boolean;
  avatar: AvatarConfig | null;
  level: number | null;
  value: number | null;
  note: string | null;
}

const PLACE_COLOR = ['var(--rarity-legendary)', 'var(--rarity-common)', 'var(--bronze)'];

function OptIn() {
  return (
    <div className="card relative overflow-hidden p-6 text-center sm:p-10">
      <div className="pointer-events-none absolute -top-24 left-1/2 size-80 -translate-x-1/2 rounded-full opacity-60" style={{ background: 'radial-gradient(circle, color-mix(in oklab, var(--accent) 22%, transparent), transparent 70%)' }} aria-hidden />
      <span className="relative mx-auto grid size-14 place-items-center rounded-2xl border border-accent/30 bg-accent/12 text-accent-ink">
        <Icon name="users" size={26} />
      </span>
      <h2 className="relative mt-4 font-display text-xl font-bold tracking-[0.08em] text-fg uppercase">Play with friends — privately</h2>
      <p className="relative mx-auto mt-2 max-w-lg text-sm text-muted">Party mode is optional. There are no accounts and no servers: you share a party card — a link or code — that contains only what you choose. Friends share theirs with you.</p>
      <ul className="relative mx-auto mt-5 grid max-w-lg gap-2.5 text-left text-sm text-fg sm:grid-cols-2">
        {[
          ['trophy', 'Friends-only leaderboard'],
          ['handshake', `Friendly weekly challenges — winner +${CHALLENGE_REWARD} coins`],
          ['eye-off', 'Anonymous names like Player_4821'],
          ['shield-check', 'No public profiles, ever'],
        ].map(([icon, text]) => (
          <li key={text} className="flex items-start gap-2.5 rounded-xl border border-line bg-surface-2 px-3 py-2.5">
            <Icon name={icon} size={16} className="mt-0.5 shrink-0 text-accent-ink" />
            {text}
          </li>
        ))}
      </ul>
      <Button variant="primary" cta size="lg" icon="users" className="relative mt-6" onClick={() => dispatch((s, now) => updateSettings(s, { social: { enabled: true } }, now))}>
        Turn on party mode
      </Button>
      <p className="relative mt-3 text-xs text-muted">You can turn it off any time in Settings → Privacy.</p>
    </div>
  );
}

export default function Party() {
  const enabled = useGame((s) => s.settings.social.enabled);
  const anonymous = useGame((s) => s.settings.social.anonymous);
  const weekStartsOn = useGame((s) => s.settings.weekStartsOn);
  const party = useGame((s) => s.party);
  const challenges = useGame((s) => s.challenges);
  const profile = useGame((s) => s.profile)!;
  const state = useGameStore((s) => s.state);
  const openSheet = useUI((s) => s.openSheet);
  const today = useToday();
  const [board, setBoard] = useState<Board>('weekly');
  const [toRemove, setToRemove] = useState<PartyMember | null>(null);
  const [opponent, setOpponent] = useState('');

  const weekKey = currentWeekKey(today, weekStartsOn);
  const month = monthKey(today);
  const mine = useMemo(() => {
    // `today` is a dependency so the totals roll over with the week and month.
    const now = Date.now();
    return { weekly: weeklyXP(state, now).value, monthly: monthlyXP(state, now).value };
  }, [state, today]);

  const rows = useMemo<Row[]>(() => {
    const me: Row = {
      id: 'me',
      name: anonymous ? profile.playerTag : profile.name,
      you: true,
      avatar: profile.avatar,
      level: profile.level,
      value: board === 'weekly' ? mine.weekly : board === 'monthly' ? mine.monthly : profile.totalXP,
      note: null,
    };
    const friends = party.map<Row>((p) => {
      let value: number | null = null;
      let note: string | null = null;
      if (board === 'weekly') {
        if (p.weeklyXP === null) note = 'Not shared';
        else if (p.weekKey !== weekKey) note = 'Needs a fresh card';
        else value = p.weeklyXP;
      } else if (board === 'monthly') {
        if (p.monthlyXP === null) note = 'Not shared';
        else if (p.monthKey !== month) note = 'Needs a fresh card';
        else value = p.monthlyXP;
      } else if (p.totalXP === null) note = 'Not shared';
      else value = p.totalXP;
      return { id: p.id, name: p.name, you: false, avatar: p.avatar, level: p.level, value, note };
    });
    return [me, ...friends].sort((a, b) => {
      if (a.value === null && b.value === null) return a.name.localeCompare(b.name);
      if (a.value === null) return 1;
      if (b.value === null) return -1;
      return b.value - a.value || (a.you ? -1 : b.you ? 1 : 0);
    });
  }, [anonymous, profile, board, mine, party, weekKey, month]);

  if (!enabled) return <OptIn />;

  const active = challenges.filter((c) => c.status === 'active').sort((a, b) => b.createdAt - a.createdAt);
  const past = challenges.filter((c) => c.status !== 'active').sort((a, b) => (b.resolvedAt ?? 0) - (a.resolvedAt ?? 0)).slice(0, 6);
  const available = party.filter((p) => !challenges.some((c) => c.opponentId === p.id && c.weekKey === weekKey));
  const daysLeft = daysLeftInWeek(today, weekStartsOn);
  const selected = available.find((p) => p.id === opponent) ?? available[0];

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" icon="user-plus" onClick={() => openSheet({ type: 'party' })}>
          Invite or add friends
        </Button>
        <Button variant="ghost" icon="shield-check" onClick={() => navigate('/settings')}>
          What I share
        </Button>
      </div>

      <Section title="Leaderboard" id="leaderboard" description="Friends only. Scores come from the cards your friends share.">
        <Segmented<Board>
          label="Leaderboard period"
          value={board}
          onChange={setBoard}
          size="sm"
          className="mb-3 sm:max-w-sm"
          options={[
            { value: 'weekly', label: 'This week' },
            { value: 'monthly', label: 'This month' },
            { value: 'total', label: 'All time' },
          ]}
        />
        <ol className="card divide-y divide-line" aria-label={`${board === 'weekly' ? 'Weekly' : board === 'monthly' ? 'Monthly' : 'All-time'} XP leaderboard`}>
          {rows.map((r, i) => {
            const place = r.value !== null ? i + 1 : null;
            return (
              <li key={r.id} className={cn('flex items-center gap-3 px-4 py-3', r.you && 'bg-accent/6')}>
                <span className="w-7 shrink-0 text-center font-display text-sm font-bold num" style={{ color: place && place <= 3 ? PLACE_COLOR[place - 1] : 'var(--muted)' }}>
                  {place ? `#${place}` : '—'}
                </span>
                {r.avatar ? <Avatar avatar={r.avatar} size={40} plain /> : <span className="grid size-10 place-items-center rounded-full bg-surface-3 text-muted"><Icon name="user-round" size={18} /></span>}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-fg">
                    {r.name} {r.you && <span className="text-xs font-normal text-accent-ink">(you)</span>}
                  </span>
                  <span className="block text-xs text-muted">{r.level !== null ? `Level ${r.level}` : 'Level hidden'}</span>
                </span>
                <span className="text-right">
                  {r.value !== null ? (
                    <span className="font-display text-sm font-bold text-fg num">{formatNumber(r.value)} XP</span>
                  ) : (
                    <span className="text-xs text-faint">{r.note}</span>
                  )}
                </span>
              </li>
            );
          })}
        </ol>
        {party.length === 0 && <p className="px-1 pt-1 text-[13px] text-muted">Your party is just you for now. Invite a friend to start a friendly rivalry.</p>}
      </Section>

      <Section title="Friend challenges" id="friend-challenges" description={`Weekly XP duels. The winner earns ${CHALLENGE_REWARD} coins — and everyone who plays earns something.`}>
        <div className="space-y-3">
          {active.map((c) => {
            const member = party.find((p) => p.id === c.opponentId);
            const theirs = member && member.weekKey === c.weekKey ? member.weeklyXP : null;
            const current = c.weekKey === weekKey;
            const lead = theirs === null ? null : mine.weekly - theirs;
            return (
              <div key={c.id} className="card p-4">
                <div className="flex items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent/12 text-accent-ink">
                    <Icon name="swords" size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-fg">You vs {c.opponentName}</p>
                    <p className="text-xs text-muted">
                      Week of {formatDay(c.weekKey, { month: 'short', day: 'numeric' })} · {current ? (daysLeft <= 1 ? 'Ends tonight' : `${daysLeft} days left`) : 'Settles at your next visit'}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => dispatch((s, now) => cancelChallenge(s, c.id, now), { undoLabel: 'Challenge cancelled' })}>
                    Cancel
                  </Button>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                  <div className="rounded-xl border border-line bg-surface-2 px-3 py-2.5">
                    <p className="hud-label !text-[9.5px]">You</p>
                    <p className="mt-0.5 font-display text-lg font-bold text-fg num">{current ? formatNumber(mine.weekly) : '—'}</p>
                  </div>
                  <div className="rounded-xl border border-line bg-surface-2 px-3 py-2.5">
                    <p className="hud-label !text-[9.5px]">{c.opponentName}</p>
                    <p className="mt-0.5 font-display text-lg font-bold text-fg num">{theirs !== null ? formatNumber(theirs) : '—'}</p>
                  </div>
                </div>
                <p className="mt-2.5 text-xs text-muted">
                  {theirs === null
                    ? `Waiting for ${c.opponentName}’s card from this week. Ask them to share a fresh one before the week ends.`
                    : lead !== null && lead > 0
                      ? `You’re ahead by ${formatNumber(lead)} XP (as of their last card, ${timeAgo(member!.cardAt)}).`
                      : lead === 0
                        ? 'Neck and neck.'
                        : `${formatNumber(Math.abs(lead ?? 0))} XP behind their last card — plenty of week left.`}
                </p>
              </div>
            );
          })}

          {party.length === 0 ? (
            <EmptyState icon="handshake" title="No friends in your party yet." message="Add a friend with their party code, then challenge them to a friendly week." action={{ label: 'Add a friend', icon: 'user-plus', onClick: () => openSheet({ type: 'party' }) }} />
          ) : available.length > 0 && selected ? (
            <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
              <Field label="Challenge a friend this week" htmlFor="challenge-opponent" className="flex-1">
                <Select id="challenge-opponent" value={selected.id} onChange={(e) => setOpponent(e.target.value)}>
                  {available.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Button variant="primary" icon="swords" className="h-12" onClick={() => dispatch((s, now) => createChallenge(s, selected.id, now))}>
                Start challenge
              </Button>
            </div>
          ) : (
            <p className="px-1 text-[13px] text-muted">You’ve challenged everyone in your party this week. New challenges open next week.</p>
          )}

          {past.length > 0 && (
            <ul className="card divide-y divide-line" aria-label="Past challenges">
              {past.map((c) => (
                <li key={c.id} className="flex items-center gap-3 px-4 py-3">
                  <Icon name={c.status === 'won' ? 'trophy' : c.status === 'tied' ? 'handshake' : 'heart-handshake'} size={18} className={c.status === 'won' ? 'text-coin' : 'text-muted'} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-fg">
                      {c.status === 'won' ? 'Won' : c.status === 'tied' ? 'Friendly draw' : 'Good game'} vs {c.opponentName}
                    </span>
                    <span className="block text-xs text-muted">
                      Week of {formatDay(c.weekKey, { month: 'short', day: 'numeric' })} – {formatDay(addDays(c.weekKey, 6), { month: 'short', day: 'numeric' })}
                      {c.myScore !== null && ` · ${formatNumber(c.myScore)} vs ${c.theirScore !== null ? formatNumber(c.theirScore) : '—'} XP`}
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-coin num">
                    <CoinIcon size={13} />+{c.status === 'won' ? c.reward : c.status === 'tied' ? Math.round(c.reward / 2) : 50}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Section>

      {party.length > 0 && (
        <Section title="Party members" id="party-members" description="Cards update when a friend shares a new one with you.">
          <ul className="grid gap-3 sm:grid-cols-2">
            {party.map((p) => (
              <li key={p.id} className="card flex items-center gap-3.5 p-4">
                {p.avatar ? <Avatar avatar={p.avatar} size={52} /> : <span className="grid size-[52px] place-items-center rounded-full bg-surface-3 text-muted"><Icon name="user-round" size={22} /></span>}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-fg">{p.name}</p>
                  <p className="truncate text-xs text-muted">{titleText(p.titleId) ?? (p.classId ? CLASS_MAP[p.classId].name : 'Adventurer')}</p>
                  <p className="mt-0.5 text-xs text-faint">
                    Updated {timeAgo(p.cardAt)}
                    {p.streak !== null && ` · ${p.streak}-day streak`}
                    {p.achievements !== null && ` · ${p.achievements} achievements`}
                  </p>
                </div>
                {p.level !== null && <LevelBadge level={p.level} size={34} />}
                <button type="button" onClick={() => setToRemove(p)} aria-label={`Remove ${p.name} from party`} className="grid size-9 shrink-0 place-items-center rounded-lg text-faint transition hover:bg-surface-3 hover:text-danger">
                  <Icon name="trash-2" size={16} />
                </button>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <ConfirmDialog
        open={!!toRemove}
        onClose={() => setToRemove(null)}
        onConfirm={() => {
          if (toRemove) dispatch((s, now) => removePartyMember(s, toRemove.id, now));
          setToRemove(null);
        }}
        title={toRemove ? `Remove ${toRemove.name}?` : 'Remove friend?'}
        message="They’ll disappear from your leaderboard and any active challenge with them is cancelled. You can add them again with a new code."
        confirmLabel="Remove"
        tone="danger"
      />
    </div>
  );
}
