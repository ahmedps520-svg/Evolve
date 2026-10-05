import { AnimatePresence, m } from 'framer-motion';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { ClassId, FocusArea, GameDifficulty } from '@/types';
import { CLASSES, CLASS_MAP } from '@/data/classes';
import { GAME_DIFFICULTIES } from '@/data/difficulty';
import { FOCUS_AREAS } from '@/data/focusAreas';
import { cn } from '@/lib/cn';
import { parseBackup } from '@/lib/db/backup';
import { completeOnboarding, sanitizeName } from '@/lib/engine/gameEngine';
import { STARTER_COINS } from '@/lib/engine/rewards';
import { navigate } from '@/lib/router';
import { dispatch, useGameStore } from '@/store/gameStore';
import { useUI } from '@/store/uiStore';
import { Logo } from '@/components/brand/Logo';
import { Avatar } from '@/components/game/Avatar';
import { CoinIcon, LevelBadge, XPBar } from '@/components/game/Hud';
import { Button, IconButton } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';

const STEPS = 6;

function Step({ children, dir }: { children: ReactNode; dir: number }) {
  return (
    <m.div
      custom={dir}
      initial={{ opacity: 0, x: dir * 36 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: dir * -36 }}
      transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      className="flex min-h-0 flex-1 flex-col"
    >
      {children}
    </m.div>
  );
}

function Heading({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <div className="mb-7">
      <p className="hud-label !text-accent-ink">{eyebrow}</p>
      <h1 className="mt-2 font-display text-[30px] leading-tight font-bold tracking-[0.03em] text-fg sm:text-4xl">{title}</h1>
      {children && <p className="mt-2.5 text-[15px] text-muted">{children}</p>}
    </div>
  );
}

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [name, setName] = useState('');
  const [focus, setFocus] = useState<FocusArea[]>([]);
  const [difficulty, setDifficulty] = useState<GameDifficulty>('normal');
  const [classId, setClassId] = useState<ClassId | null>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const importState = useGameStore((s) => s.importState);
  const toast = useUI((s) => s.toast);

  const go = (next: number) => {
    setDir(next > step ? 1 : -1);
    setStep(next);
  };

  const canContinue = [true, sanitizeName(name).length > 0, focus.length > 0, true, classId !== null, true][step];

  const finished = useRef(false);
  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    dispatch((s, now) => completeOnboarding(s, { name, focusAreas: focus, difficulty, classId: classId ?? 'balanced' }, now), { quietErrors: true });
    navigate('/home', { replace: true });
  };
  const finishRef = useRef(finish);
  finishRef.current = finish;

  useEffect(() => {
    if (step !== 5) return;
    const t = setTimeout(() => finishRef.current(), 4200);
    return () => clearTimeout(t);
  }, [step]);

  const onImport = async (file: File | undefined) => {
    if (!file) return;
    const parsed = parseBackup(await file.text());
    if (!parsed.ok) return toast({ kind: 'error', title: 'Import failed', message: parsed.error, duration: 6000 });
    await importState(parsed.state, parsed.media);
    toast({ kind: 'success', title: 'Welcome back', message: parsed.summaryText, icon: 'upload' });
    navigate('/home', { replace: true });
  };

  const cls = classId ? CLASS_MAP[classId] : null;

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <div className="app-backdrop" aria-hidden />
      <div className="safe-px mx-auto flex w-full max-w-xl flex-1 flex-col pt-[calc(var(--safe-top)+1rem)] pb-[calc(var(--safe-bottom)+1.25rem)]">
        {step > 0 && step < 5 && (
          <div className="mb-8 flex items-center gap-3">
            <IconButton icon="chevron-left" label="Back" size="sm" onClick={() => go(step - 1)} />
            <div className="flex flex-1 gap-1.5" aria-label={`Step ${step} of ${STEPS - 2}`} role="progressbar" aria-valuemin={1} aria-valuemax={STEPS - 2} aria-valuenow={step}>
              {Array.from({ length: STEPS - 2 }, (_, i) => (
                <span key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-surface-4">
                  <m.span className="block h-full rounded-full bg-accent" initial={false} animate={{ width: i < step ? '100%' : '0%' }} transition={{ duration: 0.35 }} />
                </span>
              ))}
            </div>
          </div>
        )}

        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault();
            if (canContinue && step < 4) go(step + 1);
            else if (canContinue && step === 4) go(5);
          }}
        >
          <AnimatePresence mode="wait" custom={dir} initial={false}>
            {step === 0 && (
              <Step key="welcome" dir={dir}>
                <div className="flex flex-1 flex-col items-center justify-center text-center">
                  <m.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 160, damping: 14 }} className="relative">
                    <span className="absolute inset-[-40%] rounded-full opacity-70 blur-2xl" style={{ background: 'radial-gradient(circle, color-mix(in oklab, var(--accent) 45%, transparent), transparent 70%)' }} aria-hidden />
                    <Logo size={96} className="relative" />
                  </m.div>
                  <m.h1 initial={{ opacity: 0, letterSpacing: '0.7em' }} animate={{ opacity: 1, letterSpacing: '0.38em' }} transition={{ duration: 0.9, delay: 0.15 }} className="mt-9 pl-[0.38em] font-display text-[40px] font-bold text-fg sm:text-5xl">
                    EVOLVE
                  </m.h1>
                  <m.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-3 font-display text-xs font-semibold tracking-[0.3em] text-accent-ink">
                    REAL-LIFE XP
                  </m.p>
                  <m.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }} className="mt-6 max-w-xs text-lg text-muted">
                    Turn your real life into a game.
                  </m.p>
                </div>
                <m.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} className="space-y-3">
                  <Button type="submit" variant="primary" cta size="lg" block iconRight="arrow-right">
                    Begin journey
                  </Button>
                  <div className="flex justify-center gap-5 text-sm">
                    <button type="button" className="text-muted underline-offset-4 hover:text-fg hover:underline" onClick={() => navigate('/demo')}>
                      View demo
                    </button>
                    <button type="button" className="text-muted underline-offset-4 hover:text-fg hover:underline" onClick={() => importRef.current?.click()}>
                      Restore a backup
                    </button>
                  </div>
                  <input ref={importRef} type="file" accept="application/json,.json" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => void onImport(e.target.files?.[0])} />
                </m.div>
              </Step>
            )}

            {step === 1 && (
              <Step key="name" dir={dir}>
                <Heading eyebrow="Your character" title="What should we call you?">
                  This is how Evolve greets you. You can change it any time.
                </Heading>
                <Input autoFocus aria-label="Your name" value={name} maxLength={24} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoComplete="nickname" className="h-14 text-lg" />
                <div className="flex-1" />
                <Button type="submit" variant="primary" cta size="lg" block disabled={!canContinue} iconRight="arrow-right">
                  Continue
                </Button>
              </Step>
            )}

            {step === 2 && (
              <Step key="goals" dir={dir}>
                <Heading eyebrow="Your goals" title="What do you want to level up?">
                  Pick as many as you like. Your quests are built around them.
                </Heading>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3" role="group" aria-label="Primary goals">
                  {FOCUS_AREAS.map((f) => {
                    const on = focus.includes(f.id);
                    return (
                      <button
                        key={f.id}
                        type="button"
                        aria-pressed={on}
                        onClick={() => setFocus((cur) => (on ? cur.filter((x) => x !== f.id) : [...cur, f.id]))}
                        className={cn('flex min-h-[60px] items-center gap-3 rounded-2xl border px-3.5 text-left text-[14.5px] font-medium transition-[background-color,border-color,transform] active:scale-[0.97]', on ? 'border-accent bg-accent/12 text-fg' : 'border-line bg-surface text-muted hover:border-line-strong hover:text-fg')}
                      >
                        <Icon name={f.icon} size={19} className={on ? 'text-accent-ink' : ''} />
                        <span className="flex-1 leading-tight">{f.name}</span>
                        {on && <Icon name="check" size={16} className="text-accent-ink" />}
                      </button>
                    );
                  })}
                </div>
                <div className="flex-1" />
                <Button type="submit" variant="primary" cta size="lg" block disabled={!canContinue} iconRight="arrow-right" className="mt-6">
                  {focus.length ? `Continue with ${focus.length}` : 'Pick at least one'}
                </Button>
              </Step>
            )}

            {step === 3 && (
              <Step key="difficulty" dir={dir}>
                <Heading eyebrow="Difficulty" title="Choose your difficulty">
                  It changes suggested quest XP, streak expectations and daily targets — never your progress. Switch any time.
                </Heading>
                <div className="space-y-3" role="radiogroup" aria-label="Difficulty">
                  {GAME_DIFFICULTIES.map((d) => {
                    const on = difficulty === d.id;
                    return (
                      <button key={d.id} type="button" role="radio" aria-checked={on} onClick={() => setDifficulty(d.id)} className={cn('card w-full p-4 text-left transition-[border-color,box-shadow]', on && 'border-accent shadow-[0_0_0_1px_var(--accent),0_0_32px_-12px_var(--accent)]')}>
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-display text-lg font-bold tracking-[0.18em] text-fg">{d.name.toUpperCase()}</p>
                            <p className="text-sm text-muted">{d.tagline}</p>
                          </div>
                          <span className={cn('grid size-6 place-items-center rounded-full border-2', on ? 'border-accent bg-accent' : 'border-line-strong')}>{on && <Icon name="check" size={13} className="text-accent-fg" strokeWidth={3} />}</span>
                        </div>
                        <ul className="mt-3 grid gap-1.5 text-[13px] text-muted sm:grid-cols-3">
                          {d.points.map((p) => (
                            <li key={p} className="flex items-start gap-1.5">
                              <span className="mt-1.5 size-1 shrink-0 rounded-full bg-accent" aria-hidden />
                              {p}
                            </li>
                          ))}
                        </ul>
                      </button>
                    );
                  })}
                </div>
                <div className="flex-1" />
                <Button type="submit" variant="primary" cta size="lg" block iconRight="arrow-right" className="mt-6">
                  Continue
                </Button>
              </Step>
            )}

            {step === 4 && (
              <Step key="class" dir={dir}>
                <Heading eyebrow="Create your character" title="Choose your class">
                  Classes shape your look and suggested quests. Every activity stays open to every class.
                </Heading>
                <div className="card hud-corners mb-5 flex items-center gap-4 p-4">
                  <m.div key={classId ?? 'none'} initial={{ scale: 0.85, opacity: 0.4 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 16 }}>
                    <Avatar avatar={{ sigil: `sigil:${cls?.sigil ?? 'spark'}`, background: cls ? 'bg:midnight' : 'bg:void', frame: 'frame:simple', aura: cls ? 'aura:glow' : 'aura:none' }} size={72} />
                  </m.div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-lg font-bold tracking-[0.08em] text-fg uppercase">{sanitizeName(name) || 'Adventurer'}</p>
                    <p className="font-display text-[11px] font-semibold tracking-[0.2em] text-muted">
                      CLASS: <span className={cls ? 'text-accent-ink' : 'text-faint'}>{cls ? cls.name.toUpperCase() : 'UNDEFINED'}</span>
                    </p>
                    <div className="mt-2.5 flex items-center gap-2">
                      <span className="font-display text-xs font-bold text-fg">LEVEL 1</span>
                      <XPBar percent={0} level={1} height={6} className="flex-1" showTicks={false} />
                      <span className="text-[11px] text-muted">0 XP</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2.5" role="radiogroup" aria-label="Class">
                  {CLASSES.map((c) => {
                    const on = classId === c.id;
                    return (
                      <button key={c.id} type="button" role="radio" aria-checked={on} onClick={() => setClassId(c.id)} className={cn('card flex flex-col items-start p-3.5 text-left transition-[border-color,box-shadow]', on && 'border-accent shadow-[0_0_0_1px_var(--accent),0_0_28px_-12px_var(--accent)]')}>
                        <div className="flex w-full items-center justify-between">
                          <Avatar avatar={{ sigil: `sigil:${c.sigil}`, background: on ? 'bg:midnight' : 'bg:void', frame: 'frame:simple', aura: 'aura:none' }} size={40} plain />
                          {on && <Icon name="check" size={16} className="text-accent-ink" />}
                        </div>
                        <p className="mt-2.5 font-display text-[15px] font-bold tracking-[0.1em] text-fg uppercase">{c.name}</p>
                        <p className="mt-0.5 text-[12.5px] leading-snug text-muted">{c.description}</p>
                      </button>
                    );
                  })}
                </div>
                {cls && <p className="mt-4 rounded-2xl border border-line bg-surface-2/70 px-4 py-3 text-[13px] text-muted">{cls.passive}</p>}
                <div className="flex-1" />
                <Button type="submit" variant="primary" cta size="lg" block disabled={!canContinue} className="mt-6" icon="sparkles">
                  Create character
                </Button>
              </Step>
            )}

            {step === 5 && (
              <Step key="begin" dir={dir}>
                <div className="flex flex-1 flex-col items-center justify-center text-center">
                  <m.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 150, damping: 13 }} className="relative">
                    <span className="absolute inset-[-30%] animate-pulse-ring rounded-full border-2 border-accent" aria-hidden />
                    <Avatar avatar={{ sigil: `sigil:${cls?.sigil ?? 'spark'}`, background: 'bg:midnight', frame: 'frame:simple', aura: 'aura:glow' }} size={120} />
                  </m.div>
                  <m.h1 initial={{ opacity: 0, letterSpacing: '0.5em' }} animate={{ opacity: 1, letterSpacing: '0.12em' }} transition={{ duration: 1, delay: 0.3 }} className="mt-10 font-display text-[28px] leading-tight font-bold text-fg sm:text-4xl">
                    YOUR JOURNEY BEGINS
                  </m.h1>
                  <m.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }} className="mt-3 text-muted">
                    {sanitizeName(name) || 'Adventurer'} the {cls?.name ?? 'Balanced'}, Level 1.
                  </m.p>
                  <ul className="mt-8 grid w-full max-w-xs gap-2.5 text-left">
                    {[
                      [<Icon key="q" name="scroll-text" size={17} className="text-accent-ink" />, '3 starter quests'],
                      [<Icon key="a" name="award" size={17} className="text-legendary" />, '1 achievement unlocked'],
                      [<CoinIcon key="c" size={17} />, `${STARTER_COINS} starter coins`],
                      [<LevelBadge key="l" level={1} size={18} />, 'Level 1 · 0 XP'],
                    ].map(([icon, text], i) => (
                      <m.li key={String(text)} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.2 + i * 0.18 }} className="flex items-center gap-3 rounded-xl border border-line bg-surface/80 px-4 py-2.5 text-sm font-medium text-fg">
                        {icon}
                        {text}
                      </m.li>
                    ))}
                  </ul>
                </div>
                <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }}>
                  <Button type="button" variant="primary" cta size="lg" block iconRight="arrow-right" onClick={finish}>
                    Enter
                  </Button>
                </m.div>
              </Step>
            )}
          </AnimatePresence>
        </form>
      </div>
    </div>
  );
}
