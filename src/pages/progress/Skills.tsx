import { useMemo } from 'react';
import { ATTRIBUTE_MAP, attributeColor } from '@/data/attributes';
import { CATEGORIES, getCategory } from '@/data/categories';
import { formatMinutes, formatNumber } from '@/lib/format';
import { attributeLevels, categoryLevels } from '@/lib/stats';
import { CATEGORY_CURVE, calculateRequiredXP } from '@/lib/xp';
import { useGame } from '@/store/gameStore';
import { AttributeRadar } from '@/components/charts/Radar';
import { CategoryIcon } from '@/components/game/Tags';
import { EmptyState, ProgressBar, Section } from '@/components/ui/Display';
import { useUI } from '@/store/uiStore';

export default function Skills() {
  const transactions = useGame((s) => s.transactions);
  const activities = useGame((s) => s.activities);
  const openSheet = useUI((s) => s.openSheet);
  const levels = useMemo(() => categoryLevels({ transactions, activities }), [transactions, activities]);
  const attrs = useMemo(() => attributeLevels(levels), [levels]);
  const untouched = CATEGORIES.filter((c) => !levels.some((l) => l.category === c.id));

  if (!levels.length) {
    return <EmptyState icon="chevrons-up" title="No skills yet." message="Every category you train gets its own level. Log your first activity to start one." action={{ label: 'Log activity', onClick: () => openSheet({ type: 'log' }) }} />;
  }

  return (
    <div className="space-y-7">
      <Section title="Attributes" id="attributes" description="Six attributes grow from the categories you train.">
        <div className="card grid items-center gap-6 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <AttributeRadar values={attrs} />
          <ul className="space-y-3">
            {attrs.map((a) => (
              <li key={a.attribute} className="flex items-center gap-3">
                <span className="w-9 font-display text-xs font-bold tracking-[0.12em] text-muted">{ATTRIBUTE_MAP[a.attribute].abbr}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex justify-between text-sm">
                    <span className="font-medium text-fg">{ATTRIBUTE_MAP[a.attribute].name}</span>
                    <span className="font-display font-bold text-fg">Lv {a.level}</span>
                  </span>
                  <span className="block text-xs text-muted">{ATTRIBUTE_MAP[a.attribute].description} · {formatNumber(a.xp)} XP</span>
                </span>
                <span className="size-2.5 shrink-0 rounded-full" style={{ background: attributeColor(a.attribute) }} aria-hidden />
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <Section title="Category levels" id="category-levels" description="Specialize — or stay well-rounded.">
        <div className="grid gap-3 sm:grid-cols-2">
          {levels.map((l) => {
            const c = getCategory(l.category);
            const color = attributeColor(c.attribute);
            return (
              <div key={l.category} className="card p-4">
                <div className="flex items-center gap-3.5">
                  <CategoryIcon category={l.category} size={44} />
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-sm font-bold tracking-[0.14em] text-fg uppercase">{c.name}</p>
                    <p className="text-xs text-muted">
                      {formatNumber(l.xp)} XP · {formatMinutes(l.minutes)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="hud-label !text-[9.5px]">Level</p>
                    <p className="font-display text-2xl leading-none font-bold text-fg">{l.level}</p>
                  </div>
                </div>
                <ProgressBar className="mt-3.5" value={l.percent} max={1} color={color} height={6} label={`${c.name} level progress`} />
                <p className="mt-1.5 text-xs text-muted num">
                  {formatNumber(l.toNext)} XP to level {l.level + 1} <span className="text-faint">(needs {formatNumber(calculateRequiredXP(l.level, CATEGORY_CURVE))})</span>
                </p>
              </div>
            );
          })}
        </div>
      </Section>

      {untouched.length > 0 && (
        <Section title="Not started yet" id="untouched">
          <div className="flex flex-wrap gap-2">
            {untouched.map((c) => (
              <button key={c.id} type="button" onClick={() => openSheet({ type: 'log', category: c.id })} className="flex h-10 items-center gap-2 rounded-full border border-line bg-surface-2 px-3.5 text-sm text-muted transition hover:border-line-strong hover:text-fg">
                <span className="size-1.5 rounded-full" style={{ background: attributeColor(c.attribute) }} aria-hidden />
                {c.name}
              </button>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
