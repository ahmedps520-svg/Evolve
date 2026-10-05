import { useEffect, useState } from 'react';
import type { CategoryId, CurveConfig, QuestDifficulty } from '@/types';
import { CATEGORIES, DEFAULT_ACTIVITY_RATES } from '@/data/categories';
import { DEFAULT_QUEST_XP, QUEST_DIFFICULTIES } from '@/data/difficulty';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import { CURVE_PRESETS, DEFAULT_CURVE, calculateLevel, calculateRequiredXP, describeCurve, sameCurve, sanitizeCurve, totalXPForLevel } from '@/lib/xp';
import { useGame } from '@/store/gameStore';
import { Button } from '@/components/ui/Button';
import { Slider, Stepper } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Panel, setSettings } from './shared';

const PREVIEW_LEVELS = [2, 5, 10, 18, 25, 50];

export function XPSettings() {
  const xp = useGame((s) => s.settings.xp);
  const totalXP = useGame((s) => s.profile?.totalXP ?? 0);
  const [draft, setDraft] = useState<CurveConfig>(xp.curve);
  const [advanced, setAdvanced] = useState(false);
  useEffect(() => setDraft(xp.curve), [xp.curve]);

  const applied = sameCurve(draft, xp.curve);
  const preset = CURVE_PRESETS.find((p) => sameCurve(p.curve, xp.curve));
  const levelNow = calculateLevel(totalXP, xp.curve);
  const levelDraft = calculateLevel(totalXP, sanitizeCurve(draft));
  const ratesChanged = CATEGORIES.some((c) => xp.activityRates[c.id] !== DEFAULT_ACTIVITY_RATES[c.id]);
  const questXPChanged = QUEST_DIFFICULTIES.some((d) => xp.questXP[d.id] !== DEFAULT_QUEST_XP[d.id]);

  return (
    <Panel id="xp" title="XP system" icon="sliders-horizontal" description="Tune the pace of the game. Your total XP is never removed — your level is simply recalculated, and level-up coins are never paid twice.">
      <div className="py-4">
        <p className="text-[15px] font-medium text-fg" id="curve-label">
          Level curve
        </p>
        <div role="radiogroup" aria-labelledby="curve-label" className="mt-3 grid gap-2 sm:grid-cols-2">
          {CURVE_PRESETS.map((p) => {
            const on = sameCurve(p.curve, xp.curve);
            return (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => !on && setSettings({ xp: { curve: p.curve } })}
                className={cn('rounded-xl border p-3.5 text-left transition', on ? 'border-accent bg-accent/10' : 'border-line bg-surface-2 hover:border-line-strong')}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="font-display text-sm font-bold tracking-[0.14em] text-fg uppercase">{p.name}</span>
                  {on && <Icon name="check" size={15} className="text-accent-ink" />}
                </span>
                <span className="mt-0.5 block text-xs text-muted">{p.description}</span>
                <span className="mt-2 block font-mono text-[11px] text-faint">{describeCurve(p.curve)}</span>
              </button>
            );
          })}
        </div>
        {!preset && <p className="mt-2 text-xs text-muted">Custom curve: {describeCurve(xp.curve)}</p>}
      </div>

      <div className="space-y-4 py-4">
        <p className="text-[15px] font-medium text-fg">Custom formula</p>
        <p className="-mt-3 font-mono text-[13px] text-accent-ink">XP to next level = {describeCurve(sanitizeCurve(draft))}</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <Slider id="curve-offset" label="Offset" value={draft.offset} min={0} max={500} step={10} onChange={(offset) => setDraft({ ...draft, offset })} />
          <Slider id="curve-base" label="Base" value={draft.base} min={10} max={500} step={5} onChange={(base) => setDraft({ ...draft, base })} />
          <Slider id="curve-exponent" label="Exponent" value={draft.exponent} min={1} max={2} step={0.05} format={(v) => v.toFixed(2)} onChange={(exponent) => setDraft({ ...draft, exponent: Math.round(exponent * 100) / 100 })} />
        </div>
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full text-sm">
            <caption className="sr-only">XP needed per level with this formula</caption>
            <thead>
              <tr className="text-left text-xs text-muted">
                <th scope="col" className="px-3 py-2 font-medium">Level</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">XP for this level</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Total XP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {PREVIEW_LEVELS.map((l) => (
                <tr key={l}>
                  <td className="px-3 py-2 font-display font-semibold text-fg">{l}</td>
                  <td className="px-3 py-2 text-right text-muted num">{formatNumber(calculateRequiredXP(l - 1, sanitizeCurve(draft)))}</td>
                  <td className="px-3 py-2 text-right text-fg num">{formatNumber(totalXPForLevel(l, sanitizeCurve(draft)))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[13px] text-muted">
            With your {formatNumber(totalXP)} XP: Level {levelNow}
            {!applied && levelDraft !== levelNow && <span className="text-fg"> → Level {levelDraft}</span>}
          </p>
          <div className="flex gap-2">
            {!sameCurve(xp.curve, DEFAULT_CURVE) && (
              <Button variant="ghost" size="sm" onClick={() => setSettings({ xp: { curve: DEFAULT_CURVE } })}>
                Reset to standard
              </Button>
            )}
            <Button variant="primary" size="sm" disabled={applied} onClick={() => setSettings({ xp: { curve: sanitizeCurve(draft) } })}>
              Apply formula
            </Button>
          </div>
        </div>
      </div>

      <div className="py-4">
        <button type="button" aria-expanded={advanced} aria-controls="xp-values" onClick={() => setAdvanced(!advanced)} className="flex w-full items-center justify-between gap-3 text-left">
          <span>
            <span className="block text-[15px] font-medium text-fg">Quest and activity XP</span>
            <span className="block text-[13px] text-muted">Suggested XP per quest difficulty and per 10 minutes of each activity.</span>
          </span>
          <Icon name="chevron-down" size={18} className={cn('shrink-0 text-muted transition-transform', advanced && 'rotate-180')} />
        </button>
        {advanced && (
          <div id="xp-values" className="mt-5 space-y-6">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="hud-label">Quest difficulty</p>
                {questXPChanged && (
                  <Button variant="ghost" size="sm" onClick={() => setSettings({ xp: { questXP: DEFAULT_QUEST_XP } })}>
                    Reset
                  </Button>
                )}
              </div>
              <ul className="grid gap-3 sm:grid-cols-2">
                {QUEST_DIFFICULTIES.map((d) => (
                  <li key={d.id}>
                    <p className="mb-1.5 flex justify-between text-sm">
                      <span className="font-medium text-fg">{d.name}</span>
                      <span className="text-xs text-faint">
                        {d.minXP}–{d.maxXP} XP
                      </span>
                    </p>
                    <Stepper label={`${d.name} quest XP`} value={xp.questXP[d.id]} min={d.minXP} max={d.maxXP} step={5} suffix="XP" onChange={(v) => setSettings({ xp: { questXP: { [d.id]: v } as Partial<Record<QuestDifficulty, number>> } })} />
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="hud-label">XP per 10 minutes</p>
                {ratesChanged && (
                  <Button variant="ghost" size="sm" onClick={() => setSettings({ xp: { activityRates: DEFAULT_ACTIVITY_RATES } })}>
                    Reset
                  </Button>
                )}
              </div>
              <ul className="grid gap-3 sm:grid-cols-2">
                {CATEGORIES.map((c) => {
                  const changed = xp.activityRates[c.id] !== DEFAULT_ACTIVITY_RATES[c.id];
                  return (
                    <li key={c.id}>
                      <p className="mb-1.5 flex justify-between text-sm">
                        <span className="font-medium text-fg">{c.name}</span>
                        <span className={cn('text-xs', changed ? 'text-accent-ink' : 'text-faint')}>default {DEFAULT_ACTIVITY_RATES[c.id]}</span>
                      </p>
                      <Stepper label={`${c.name} XP per 10 minutes`} value={xp.activityRates[c.id]} min={0} max={50} step={1} suffix="XP" onChange={(v) => setSettings({ xp: { activityRates: { [c.id]: v } as Partial<Record<CategoryId, number>> } })} />
                    </li>
                  );
                })}
              </ul>
              <p className="mt-3 text-xs text-muted">Healthy daily limits still apply: long sessions earn half XP past a sensible point, and nothing past the maximum.</p>
            </div>
          </div>
        )}
      </div>
    </Panel>
  );
}
