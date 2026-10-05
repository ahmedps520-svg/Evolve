import { AnimatePresence, m } from 'framer-motion';
import { useEffect, useState, type ReactNode } from 'react';
import type { Rarity } from '@/types';
import { RARITY_LABEL, RARITY_VAR } from '@/data/difficulty';
import { cn } from '@/lib/cn';
import { prefersReducedMotion } from '@/lib/celebrate';
import { navigate } from '@/lib/router';
import { formatNumber } from '@/lib/format';
import { totalXPForLevel } from '@/lib/xp';
import { useGameStore } from '@/store/gameStore';
import { Logo } from '@/components/brand/Logo';
import { Avatar } from '@/components/game/Avatar';
import { CoinIcon, LevelBadge, XPBar } from '@/components/game/Hud';
import { CategoryIcon, CategoryTag, DifficultyTag } from '@/components/game/Tags';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

/** Total XP for the example Level 24 character card, straight from the level curve. */
const CARD_XP = totalXPForLevel(24) + 430;

/* ───────────── Mock dashboard: a looping glimpse of the reward loop ───────────── */

function MockDashboard() {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const id = setInterval(() => setPhase((p) => (p + 1) % 4), 2200);
    return () => clearInterval(id);
  }, []);
  const done = phase >= 1;
  const leveled = phase >= 2;
  const xp = leveled ? 0.01 : done ? 0.955 : 0.85;
  return (
    <div className="relative mx-auto w-full max-w-[340px]" aria-label="Preview of the Evolve dashboard" role="img">
      <div className="absolute -inset-10 rounded-full opacity-60 blur-3xl" style={{ background: 'radial-gradient(circle, color-mix(in oklab, var(--accent) 35%, transparent), transparent 65%)' }} aria-hidden />
      <div className="relative rounded-[42px] border border-line-strong bg-bg p-3 shadow-[0_40px_90px_-30px_rgb(0_0_0/0.8)]">
        <div className="overflow-hidden rounded-[32px] border border-line bg-bg">
          <div className="space-y-3 p-4">
            <div className="card hud-corners p-4">
              <div className="flex items-center gap-3">
                <Avatar avatar={{ sigil: 'sigil:tome', background: 'bg:nebula', frame: 'frame:cyber', aura: 'aura:glow' }} size={50} />
                <div className="min-w-0 flex-1">
                  <p className="font-display text-sm font-bold tracking-[0.08em] text-fg">AHMED</p>
                  <p className="font-display text-[9.5px] font-semibold tracking-[0.2em] text-accent-ink">THE CONSISTENT</p>
                </div>
                <LevelBadge level={leveled ? 13 : 12} size={36} />
              </div>
              <div className="mt-3 flex items-baseline justify-between text-[11px]">
                <span className="font-display font-bold text-fg">LEVEL {leveled ? 13 : 12}</span>
                <span className="text-muted num">{leveled ? '7 / 1,048' : done ? '920 / 963' : '820 / 963'} XP</span>
              </div>
              <div className="mt-1.5">
                <XPBar percent={xp} level={leveled ? 13 : 12} height={8} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                ['Today', done ? '+440' : '+340'],
                ['Goal', done ? '88%' : '68%'],
                ['Streak', '8'],
              ].map(([k, v]) => (
                <div key={k} className="card p-2.5">
                  <p className="hud-label !text-[8.5px]">{k}</p>
                  <p className="mt-1 font-display text-base font-bold text-fg">{v}</p>
                </div>
              ))}
            </div>
            <div className={cn('card relative overflow-hidden p-3.5 transition-opacity', done && 'opacity-80')}>
              <div className="flex gap-3">
                <CategoryIcon category="study" size={36} />
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between gap-2">
                    <p className="text-[13px] font-semibold text-fg">Study Session</p>
                    <p className="font-display text-[11px] font-bold text-accent-ink">+100 XP</p>
                  </div>
                  <p className="text-[11px] text-muted">Study mathematics for 30 minutes.</p>
                  <div className="mt-2 flex gap-1">
                    <CategoryTag category="study" className="!h-5 !text-[9px]" />
                    <DifficultyTag difficulty="hard" className="!h-5 !text-[9px]" />
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                {done ? (
                  <span className="flex h-8 items-center gap-1.5 rounded-lg bg-success/12 px-2.5 font-display text-[10px] font-semibold tracking-[0.1em] text-success">
                    <Icon name="check" size={13} /> COMPLETED
                  </span>
                ) : (
                  <span className="flex h-8 items-center gap-1.5 rounded-lg bg-accent-fill px-3 font-display text-[10px] font-semibold tracking-[0.12em] text-accent-fg">
                    <Icon name="play" size={12} /> START
                  </span>
                )}
                <span className="num ml-auto text-[10px] text-muted">{done ? '30 / 30 min' : '18 / 30 min'}</span>
              </div>
              <AnimatePresence>
                {phase === 1 && (
                  <m.span initial={{ opacity: 0, y: 0 }} animate={{ opacity: [0, 1, 0], y: -40 }} exit={{ opacity: 0 }} transition={{ duration: 1.4 }} className="absolute top-6 right-6 font-display text-lg font-bold text-accent-ink" style={{ textShadow: '0 0 14px var(--accent)' }}>
                    +100 XP
                  </m.span>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
      <AnimatePresence>
        {phase === 2 && (
          <m.div initial={{ opacity: 0, y: -10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }} className="absolute inset-x-6 -top-5 flex items-center gap-3 rounded-2xl border border-accent/40 bg-surface-2/95 px-3.5 py-2.5 shadow-2xl backdrop-blur">
            <Icon name="chevrons-up" size={18} className="text-accent-ink" />
            <div>
              <p className="hud-label !text-[9.5px] !text-accent-ink">Level up</p>
              <p className="text-[12.5px] font-semibold text-fg">You reached Level 13 · +50 coins</p>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ───────────── Sections ───────────── */

function SectionHead({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="hud-label !text-accent-ink">{eyebrow}</p>
      <h2 className="mt-3 font-display text-3xl font-bold tracking-[0.03em] text-balance text-fg sm:text-4xl">{title}</h2>
      {children && <p className="mt-4 text-base text-pretty text-muted sm:text-lg">{children}</p>}
    </div>
  );
}

const STEPS = [
  { icon: 'goal', title: 'Set your goals', text: 'Pick what matters — study, fitness, reading, creativity, sleep.' },
  { icon: 'scroll-text', title: 'Get daily quests', text: 'A fresh, realistic quest board every day, shaped by your class.' },
  { icon: 'timer', title: 'Do the real thing', text: 'Study, train, read, create. Log it or run a focus session.' },
  { icon: 'chevrons-up', title: 'Level up', text: 'Earn XP, keep streaks, unlock achievements and rewards.' },
];

const FEATURES = [
  { icon: 'swords', title: 'Quests & weekly bosses', text: 'Daily quests, custom quests and a weekly boss you defeat with every XP you earn.' },
  { icon: 'chevrons-up', title: 'XP, levels & skills', text: 'A real progression curve, plus individual levels for every skill you train.' },
  { icon: 'flame', title: 'Streaks that forgive', text: 'Rest days keep your streak safe. No guilt, no shame — just start again.' },
  { icon: 'award', title: '50+ achievements', text: 'Six rarities from Common to Mythic, including secret ones to discover.' },
  { icon: 'user-round', title: 'A character to grow', text: 'Choose a class, earn titles, frames, sigils and effects — cosmetic only.' },
  { icon: 'chart-column', title: 'Honest insights', text: 'XP trends, heatmaps, your most productive days and hours.' },
  { icon: 'timer', title: 'Focus mode', text: 'A distraction-free timer that turns deep work into XP.' },
  { icon: 'wand-sparkles', title: 'Quest generator', text: '“I want to get better at coding” becomes four small, doable quests.' },
  { icon: 'heart-pulse', title: 'Healthy by design', text: 'Daily limits stop rewards for overtraining, all-nighters and burnout.' },
];

const SHOWCASE: { name: string; text: string; icon: string; rarity: Rarity }[] = [
  { name: 'First Step', text: 'Complete your first quest.', icon: 'footprints', rarity: 'common' },
  { name: 'Early Riser', text: 'Complete a quest before 8 AM.', icon: 'sunrise', rarity: 'uncommon' },
  { name: 'Consistent', text: 'Maintain a 7-day streak.', icon: 'flame', rarity: 'rare' },
  { name: 'Dedicated', text: 'Maintain a 30-day streak.', icon: 'flame', rarity: 'epic' },
  { name: 'Unbreakable', text: 'Maintain a 100-day streak.', icon: 'mountain-snow', rarity: 'legendary' },
  { name: 'Century', text: 'Reach Level 100.', icon: 'gem', rarity: 'mythic' },
];

export default function Landing() {
  const onboarded = useGameStore((s) => !!s.state.profile);
  const start = () => navigate(onboarded ? '/home' : '/onboarding');
  const demo = () => navigate('/demo');

  return (
    <div className="min-h-dvh overflow-x-hidden bg-bg">
      <div className="app-backdrop" aria-hidden />
      <header className="safe-px sticky top-0 z-30 border-b border-line bg-bg/75 pt-[var(--safe-top)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between">
          <a href="#/" className="flex items-center gap-2.5" aria-label="Evolve">
            <Logo size={28} />
            <span className="font-display text-base font-bold tracking-[0.32em] text-fg">EVOLVE</span>
          </a>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={demo} className="hidden sm:inline-flex">
              View demo
            </Button>
            <Button variant="primary" size="sm" cta onClick={start}>
              {onboarded ? 'Open app' : 'Start'}
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="safe-px mx-auto grid max-w-6xl items-center gap-14 pt-14 pb-20 sm:pt-20 lg:grid-cols-[1.1fr_0.9fr] lg:pt-24">
          <div className="text-center lg:text-left">
            <p className="hud-label !text-accent-ink">Evolve · Real-life XP</p>
            <h1 className="mt-5 font-display text-[44px] leading-[1.02] font-bold tracking-[0.02em] text-fg sm:text-6xl lg:text-7xl">
              REAL LIFE.
              <br />
              <span className="bg-gradient-to-r from-accent-2 to-accent bg-clip-text text-transparent">NOW WITH XP.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg text-pretty text-muted lg:mx-0">Turn your goals, habits and daily activities into an RPG progression system. Earn XP for the things you already want to do — and watch yourself level up.</p>
            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
              <Button variant="primary" cta size="lg" iconRight="arrow-right" onClick={start}>
                {onboarded ? 'Continue your journey' : 'Start your journey'}
              </Button>
              <Button variant="secondary" size="lg" icon="play" onClick={demo}>
                View demo
              </Button>
            </div>
            <p className="mt-5 flex items-center justify-center gap-2 text-sm text-faint lg:justify-start">
              <Icon name="shield-check" size={15} /> Free. No account. Works offline.
            </p>
          </div>
          <MockDashboard />
        </section>

        <section className="safe-px mx-auto max-w-6xl py-20" aria-label="How it works">
          <SectionHead eyebrow="How it works" title="A game loop for real life" />
          <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="card p-5">
                <div className="flex items-center justify-between">
                  <span className="grid size-11 place-items-center rounded-[14px] bg-accent/14 text-accent-ink">
                    <Icon name={s.icon} size={20} />
                  </span>
                  <span className="font-display text-3xl font-bold text-faint" aria-hidden>0{i + 1}</span>
                </div>
                <h3 className="mt-4 font-display text-base font-bold tracking-wide text-fg">{s.title}</h3>
                <p className="mt-1.5 text-sm text-muted">{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="safe-px mx-auto max-w-6xl py-20" aria-label="Features">
          <SectionHead eyebrow="Features" title="Everything a progression system needs">
            Built like a game, designed for real life — fast, focused and calm when you’re not playing.
          </SectionHead>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="card p-5 transition hover:-translate-y-0.5 hover:border-line-strong">
                <Icon name={f.icon} size={22} className="text-accent-ink" />
                <h3 className="mt-3 font-semibold text-fg">{f.title}</h3>
                <p className="mt-1 text-sm text-muted">{f.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="safe-px mx-auto max-w-6xl py-20" aria-label="Achievements">
          <SectionHead eyebrow="Achievements" title="From First Step to Mythic">
            Six rarities. Some are secret. All of them are earned by living well.
          </SectionHead>
          <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {SHOWCASE.map((a) => (
              <div key={a.name} className="card rarity-glow flex flex-col items-center p-5 text-center transition hover:-translate-y-1" style={{ ['--rarity' as string]: RARITY_VAR[a.rarity] }}>
                <span className="relative grid size-14 place-items-center" style={{ color: RARITY_VAR[a.rarity] }}>
                  <svg viewBox="0 0 40 44" className="absolute inset-0 h-full w-full" aria-hidden>
                    <path d="M20 1.5 37.3 11.5v21L20 42.5 2.7 32.5v-21z" fill="currentColor" fillOpacity="0.14" stroke="currentColor" strokeWidth="1.8" />
                  </svg>
                  <Icon name={a.icon} size={22} className="relative" />
                </span>
                <p className="mt-3 font-display text-sm font-bold tracking-wide text-fg uppercase">{a.name}</p>
                <p className="mt-1 text-xs text-muted">{a.text}</p>
                <p className="mt-2 font-display text-[10px] font-semibold tracking-[0.16em] uppercase" style={{ color: RARITY_VAR[a.rarity] }}>
                  {RARITY_LABEL[a.rarity]}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="safe-px mx-auto grid max-w-6xl items-center gap-12 py-20 lg:grid-cols-2" aria-label="Character progression">
          <div>
            <p className="hud-label !text-accent-ink">Character progression</p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-[0.03em] text-fg sm:text-4xl">See yourself progressing</h2>
            <p className="mt-4 text-lg text-muted">Choose a class — Scholar, Athlete, Creator, Explorer, Strategist or Balanced. Grow six attributes, earn titles like “The Consistent”, and unlock frames, sigils and effects with coins you earn by showing up.</p>
            <ul className="mt-6 space-y-2.5 text-muted">
              {['Cosmetic rewards only — never pay-to-win', 'Titles, badges, frames and themes', 'Skill levels for every category you train'].map((t) => (
                <li key={t} className="flex items-center gap-2.5">
                  <Icon name="check" size={16} className="text-success" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="card hud-corners mx-auto w-full max-w-sm p-7 text-center">
            <p className="hud-label">Character</p>
            <Avatar avatar={{ sigil: 'sigil:phoenix', background: 'bg:gilded', frame: 'frame:gilded', aura: 'aura:embers' }} size={132} className="mx-auto mt-5" />
            <p className="mt-5 font-display text-3xl font-bold text-fg">LEVEL 24</p>
            <p className="mt-1 font-display text-xs font-semibold tracking-[0.24em] text-accent-ink">SCHOLAR · THE DISCIPLINED</p>
            <p className="mt-4 font-display text-lg font-semibold text-fg num">{formatNumber(CARD_XP)} TOTAL XP</p>
            <div className="mt-4 flex justify-center gap-2 text-xs text-muted">
              <span className="flex items-center gap-1">
                <Icon name="flame" size={14} className="text-[#fb7185]" /> 31 days
              </span>
              <span className="flex items-center gap-1">
                <CoinIcon size={14} /> 2,140
              </span>
            </div>
          </div>
        </section>

        <section className="safe-px mx-auto max-w-6xl py-20" aria-label="Privacy">
          <div className="card relative overflow-hidden p-8 sm:p-12">
            <div className="pointer-events-none absolute -top-24 -left-24 size-80 rounded-full" style={{ background: 'radial-gradient(circle, color-mix(in oklab, var(--success) 18%, transparent), transparent 70%)' }} aria-hidden />
            <div className="relative grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:items-center">
              <div>
                <Icon name="shield-check" size={34} className="text-success" />
                <h2 className="mt-4 font-display text-3xl font-bold tracking-[0.03em] text-fg">Your progress stays on your device.</h2>
                <p className="mt-3 text-muted">No account. No server. No tracking. Evolve stores everything locally and works fully offline.</p>
              </div>
              <ul className="grid gap-3 sm:grid-cols-2">
                {[
                  ['wifi-off', 'Works offline', 'Install it and use it anywhere.'],
                  ['download', 'Export anytime', 'Your data, as a JSON file you own.'],
                  ['users', 'Private parties', 'Share only what you choose, peer to peer.'],
                  ['eye-off', 'No ads, no trackers', 'Nothing about you leaves your device.'],
                ].map(([icon, title, text]) => (
                  <li key={title} className="rounded-2xl border border-line bg-surface-2/70 p-4">
                    <Icon name={icon} size={18} className="text-accent-ink" />
                    <p className="mt-2 font-semibold text-fg">{title}</p>
                    <p className="mt-0.5 text-sm text-muted">{text}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="safe-px mx-auto max-w-3xl py-24 text-center" aria-labelledby="cta">
          <Logo size={52} className="mx-auto" />
          <h2 id="cta" className="mt-6 font-display text-4xl font-bold tracking-[0.03em] text-fg sm:text-5xl">
            Your next level starts today.
          </h2>
          <p className="mt-4 text-lg text-muted">It takes a minute to create your character.</p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Button variant="primary" cta size="lg" iconRight="arrow-right" onClick={start}>
              {onboarded ? 'Continue your journey' : 'Start your journey'}
            </Button>
            <Button variant="secondary" size="lg" icon="play" onClick={demo}>
              View demo
            </Button>
          </div>
        </section>
      </main>

      <footer className="safe-px border-t border-line pt-8 pb-[calc(var(--safe-bottom)+2rem)]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 text-sm text-faint sm:flex-row">
          <span className="flex items-center gap-2">
            <Logo size={18} /> Evolve — turn your real life into a game.
          </span>
          <span>Made for humans, not for engagement metrics.</span>
        </div>
      </footer>
    </div>
  );
}
