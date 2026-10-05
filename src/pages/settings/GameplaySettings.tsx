import { useEffect, useState } from 'react';
import type { GameDifficulty } from '@/types';
import { GAME_DIFFICULTIES, GAME_DIFFICULTY_MAP } from '@/data/difficulty';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import { DAILY_GOAL_MAX, DAILY_GOAL_MIN, updateProfile } from '@/lib/engine/gameEngine';
import { dispatch, useGame } from '@/store/gameStore';
import { Button } from '@/components/ui/Button';
import { Segmented, Stepper, Toggle } from '@/components/ui/Field';
import { Panel, Row, setSettings } from './shared';

export function GameplaySettings() {
  const profile = useGame((s) => s.profile)!;
  const weekStartsOn = useGame((s) => s.settings.weekStartsOn);
  const momentum = useGame((s) => s.settings.xp.momentum);
  const journal = useGame((s) => s.settings.journal);
  const [goal, setGoal] = useState(profile.dailyGoal);
  useEffect(() => setGoal(profile.dailyGoal), [profile.dailyGoal]);
  const suggested = GAME_DIFFICULTY_MAP[profile.difficulty].dailyGoal;

  const setDifficulty = (difficulty: GameDifficulty) => dispatch((s, now) => updateProfile(s, { difficulty }, now), { silent: true });
  const saveGoal = (value: number) => {
    setGoal(value);
    dispatch((s, now) => updateProfile(s, { dailyGoal: value }, now), { silent: true });
  };

  return (
    <Panel id="gameplay" title="Gameplay" icon="swords">
      <div className="py-4">
        <p className="text-[15px] font-medium text-fg" id="difficulty-label">
          Difficulty
        </p>
        <p className="mt-0.5 text-[13px] text-muted">Changes pacing and targets. It never takes progress away.</p>
        <div role="radiogroup" aria-labelledby="difficulty-label" className="mt-3 grid gap-2 sm:grid-cols-3">
          {GAME_DIFFICULTIES.map((d) => {
            const on = profile.difficulty === d.id;
            return (
              <button
                key={d.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => !on && setDifficulty(d.id)}
                className={cn('rounded-xl border p-3.5 text-left transition', on ? 'border-accent bg-accent/10' : 'border-line bg-surface-2 hover:border-line-strong')}
              >
                <span className="block font-display text-sm font-bold tracking-[0.14em] text-fg uppercase">{d.name}</span>
                <span className="mt-0.5 block text-xs text-muted">{d.tagline}</span>
                <span className="mt-2 block text-xs text-faint">
                  {formatNumber(d.dailyGoal)} XP goal · {d.restDaysPerWeek} rest {d.restDaysPerWeek === 1 ? 'day' : 'days'}/week
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <Row label="Daily XP goal" description={`Reaching it earns a +50 XP bonus. ${profile.difficulty[0].toUpperCase() + profile.difficulty.slice(1)} suggests ${formatNumber(suggested)}.`} htmlFor="daily-goal">
        <div className="flex items-center gap-2">
          <div className="w-48">
            <Stepper id="daily-goal" label="Daily XP goal" value={goal} min={DAILY_GOAL_MIN} max={DAILY_GOAL_MAX} step={50} suffix="XP" onChange={saveGoal} />
          </div>
          {profile.dailyGoal !== suggested && (
            <Button variant="ghost" size="sm" onClick={() => saveGoal(suggested)}>
              Reset
            </Button>
          )}
        </div>
      </Row>

      <Row label="Week starts on" description="Weekly challenges, rest-day allowances and charts follow this.">
        <Segmented
          label="Week starts on"
          value={String(weekStartsOn) as '0' | '1'}
          onChange={(v) => setSettings({ weekStartsOn: v === '0' ? 0 : 1 })}
          className="sm:w-56"
          options={[
            { value: '1', label: 'Monday' },
            { value: '0', label: 'Sunday' },
          ]}
        />
      </Row>

      <Toggle label="Momentum bonus" description="Back-to-back activities within 2 hours earn ×1.05 → ×1.15 XP. Capped, so there’s no reason to overdo it." checked={momentum} onChange={(v) => setSettings({ xp: { momentum: v } })} />
      <Toggle label="Journal" description="Daily reflections, moods and photos on your timeline." checked={journal} onChange={(v) => setSettings({ journal: v })} />
    </Panel>
  );
}
