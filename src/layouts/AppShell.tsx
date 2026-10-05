import { AnimatePresence, m } from 'framer-motion';
import { useEffect, useState, type ReactNode } from 'react';
import { CLASS_MAP } from '@/data/classes';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import { href, navigate, useRoute } from '@/lib/router';
import { useXPProgress } from '@/hooks/useGameData';
import { useGame, useGameStore } from '@/store/gameStore';
import { useUI } from '@/store/uiStore';
import { Avatar } from '@/components/game/Avatar';
import { titleText } from '@/components/game/Cosmetic';
import { CoinBadge, LevelBadge, StreakFlame, XPBar } from '@/components/game/Hud';
import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { useShortcuts } from './shortcuts';

export const NAV = [
  { id: 'home', label: 'Home', icon: 'house', to: '/home' },
  { id: 'quests', label: 'Quests', icon: 'swords', to: '/quests' },
  { id: 'progress', label: 'Progress', icon: 'chart-column', to: '/progress' },
  { id: 'character', label: 'Character', icon: 'user-round', to: '/character' },
  { id: 'settings', label: 'Settings', icon: 'settings', to: '/settings' },
] as const;

function useOnline(): boolean {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

function DemoBanner() {
  const mode = useGameStore((s) => s.mode);
  const exitDemo = useGameStore((s) => s.exitDemo);
  if (mode !== 'demo') return null;
  return (
    <div data-demo-banner className="mb-5 flex items-center gap-3 rounded-2xl border border-accent/30 bg-accent/10 px-4 py-2.5 text-[13px] text-fg">
      <span className="font-display text-[11px] font-semibold tracking-[0.18em] text-accent-ink uppercase">Demo</span>
      <span className="min-w-0 flex-1 truncate text-muted">You’re exploring a sample hero. Changes aren’t kept.</span>
      <button
        type="button"
        className="shrink-0 font-semibold text-accent-ink underline-offset-4 hover:underline"
        onClick={async () => {
          await exitDemo();
          const hasProfile = !!useGameStore.getState().state.profile;
          navigate(hasProfile ? '/home' : '/onboarding', { replace: true });
        }}
      >
        Exit demo
      </button>
    </div>
  );
}

function StatusChips() {
  const online = useOnline();
  const saveState = useGameStore((s) => s.saveState);
  const storageKind = useGameStore((s) => s.storageKind);
  if (online && saveState === 'ok' && storageKind !== 'memory') return null;
  return (
    <div className="pointer-events-none fixed bottom-[calc(var(--safe-bottom)+5.25rem)] left-1/2 z-30 flex -translate-x-1/2 flex-col items-center gap-2 lg:bottom-6">
      {!online && (
        <span className="flex items-center gap-2 rounded-full border border-line bg-surface-2/95 px-3 py-1.5 text-xs text-muted shadow-lg backdrop-blur">
          <Icon name="wifi-off" size={13} /> Offline — everything still works
        </span>
      )}
      {saveState === 'retrying' && (
        <span className="flex items-center gap-2 rounded-full border border-warning/40 bg-surface-2/95 px-3 py-1.5 text-xs text-warning shadow-lg backdrop-blur">
          <Icon name="refresh-cw" size={13} /> Saving… retrying
        </span>
      )}
      {storageKind === 'memory' && (
        <span className="flex items-center gap-2 rounded-full border border-danger/40 bg-surface-2/95 px-3 py-1.5 text-xs text-danger shadow-lg backdrop-blur">
          <Icon name="triangle-alert" size={13} /> Storage unavailable — export before closing
        </span>
      )}
    </div>
  );
}

/** Compact HUD for phones. On Home it appears once the hero scrolls away. */
function TopHud({ hideUntilScroll }: { hideUntilScroll: boolean }) {
  const profile = useGame((s) => s.profile);
  const xp = useXPProgress();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 190);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  if (!profile) return null;
  const visible = !hideUntilScroll || scrolled;
  return (
    <div
      className={cn(
        'glass z-30 border-b border-line transition-[transform,opacity] duration-300 lg:hidden',
        hideUntilScroll ? 'fixed inset-x-0 top-0' : 'sticky top-0',
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-full opacity-0',
      )}
      aria-hidden={!visible}
    >
      <div className="safe-px mx-auto flex h-14 max-w-3xl items-center gap-3 pt-[var(--safe-top)] box-content">
        <a href={href('/character')} className="shrink-0" aria-label="Character" tabIndex={visible ? 0 : -1}>
          <Avatar avatar={profile.avatar} size={34} plain />
        </a>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-baseline justify-between gap-2">
            <span className="font-display text-[12px] font-bold tracking-[0.14em] text-fg">LVL {xp.level}</span>
            <span className="num text-[11px] text-muted">
              {formatNumber(xp.current)} / {formatNumber(xp.required)} XP
            </span>
          </div>
          <XPBar percent={xp.percent} level={xp.level} height={6} registerTarget={visible} showTicks={false} />
        </div>
        <StreakFlame streak={profile.currentStreak} size="sm" />
        <CoinBadge coins={profile.coins} size="sm" registerTarget={visible} />
      </div>
    </div>
  );
}

function BottomNav({ active }: { active: string }) {
  return (
    <nav aria-label="Main" className="glass fixed inset-x-0 bottom-0 z-40 border-t border-line pb-[var(--safe-bottom)] lg:hidden">
      <ul className="mx-auto flex h-16 max-w-xl items-stretch px-2">
        {NAV.map((n) => {
          const on = n.id === active;
          return (
            <li key={n.id} className="flex-1">
              <a href={href(n.to)} aria-current={on ? 'page' : undefined} className={cn('relative flex h-full flex-col items-center justify-center gap-1 rounded-xl text-[10.5px] font-medium tracking-wide transition-colors', on ? 'text-fg' : 'text-faint hover:text-muted')}>
                {on && <m.span layoutId="nav-active" className="absolute top-0 h-[3px] w-8 rounded-b-full bg-accent shadow-[0_0_14px_var(--accent)]" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
                <Icon name={n.icon} size={22} strokeWidth={on ? 2.1 : 1.8} className={on ? 'text-accent-ink' : ''} />
                <span>{n.label}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function Sidebar({ active }: { active: string }) {
  const profile = useGame((s) => s.profile);
  const xp = useXPProgress();
  const openSheet = useUI((s) => s.openSheet);
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] flex-col border-r border-line bg-bg-elevated/80 px-4 py-6 backdrop-blur-xl lg:flex">
      <a href={href('/home')} className="mb-8 flex items-center gap-3 px-2" aria-label="Evolve home">
        <Logo size={30} />
        <span className="font-display text-lg font-bold tracking-[0.32em] text-fg">EVOLVE</span>
      </a>
      <nav aria-label="Main">
        <ul className="space-y-1">
          {NAV.map((n) => {
            const on = n.id === active;
            return (
              <li key={n.id}>
                <a href={href(n.to)} aria-current={on ? 'page' : undefined} className={cn('relative flex h-11 items-center gap-3 rounded-xl px-3 text-[14.5px] font-medium transition-colors', on ? 'text-fg' : 'text-muted hover:bg-surface-2 hover:text-fg')}>
                  {on && <m.span layoutId="side-active" className="absolute inset-0 rounded-xl border border-line-strong bg-surface-2" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
                  {on && <span className="absolute top-2.5 bottom-2.5 left-0 w-[3px] rounded-r-full bg-accent shadow-[0_0_12px_var(--accent)]" />}
                  <Icon name={n.icon} size={19} className={cn('relative', on && 'text-accent-ink')} />
                  <span className="relative">{n.label}</span>
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="mt-6 space-y-2 px-1">
        <Button variant="primary" cta block icon="plus" onClick={() => openSheet({ type: 'log' })}>
          Log activity
        </Button>
        <Button variant="secondary" block icon="timer" onClick={() => openSheet({ type: 'focus' })}>
          Focus session
        </Button>
      </div>
      {profile && (
        <a href={href('/character')} className="card mt-auto block p-4 transition hover:border-line-strong">
          <div className="flex items-center gap-3">
            <Avatar avatar={profile.avatar} size={46} plain />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-fg">{profile.name}</p>
              <p className="truncate text-xs text-muted">{titleText(profile.titleId) ?? CLASS_MAP[profile.classId].name}</p>
            </div>
            <LevelBadge level={xp.level} size={32} />
          </div>
          <XPBar className="mt-3.5" percent={xp.percent} level={xp.level} height={7} registerTarget />
          <div className="mt-2 flex items-center justify-between text-xs text-muted">
            <span className="num">
              {formatNumber(xp.current)} / {formatNumber(xp.required)} XP
            </span>
            <span className="flex items-center gap-2">
              <StreakFlame streak={profile.currentStreak} size="sm" registerTarget />
              <CoinBadge coins={profile.coins} size="sm" registerTarget />
            </span>
          </div>
        </a>
      )}
    </aside>
  );
}

function Fab() {
  const openSheet = useUI((s) => s.openSheet);
  return (
    <m.button
      type="button"
      onClick={() => openSheet({ type: 'log' })}
      aria-label="Log activity"
      whileTap={{ scale: 0.92 }}
      className="fixed right-4 bottom-[calc(var(--safe-bottom)+5rem)] z-30 grid size-14 place-items-center rounded-2xl bg-accent text-accent-fg shadow-[0_14px_32px_-10px_var(--accent)] lg:hidden"
    >
      <Icon name="plus" size={26} strokeWidth={2.4} />
    </m.button>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  useShortcuts();
  const route = useRoute();
  const active = route.segments[0] ?? 'home';
  const showFab = active === 'home' || active === 'quests';
  return (
    <div className="min-h-dvh">
      <div className="app-backdrop" aria-hidden />
      <a href="#main" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus(); }} className="sr-only z-[100] rounded-lg bg-accent px-4 py-2 text-accent-fg focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
        Skip to content
      </a>
      <Sidebar active={active} />
      <div className="lg:pl-[264px]">
        <TopHud hideUntilScroll={active === 'home'} />
        <main
          id="main"
          tabIndex={-1}
          className={cn(
            'safe-px mx-auto w-full max-w-3xl pb-[calc(var(--safe-bottom)+6.5rem)] outline-none md:max-w-5xl lg:max-w-[1180px] lg:px-10 lg:pt-10 lg:pb-16',
            active === 'home' ? 'pt-[calc(var(--safe-top)+1.25rem)]' : 'pt-5',
          )}
        >
          <DemoBanner />
          {/* A new section starts at the top, once the previous page has faded out. */}
          <AnimatePresence mode="wait" initial={false} onExitComplete={() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' })}>
            <m.div key={active} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}>
              {children}
            </m.div>
          </AnimatePresence>
        </main>
      </div>
      {showFab && <Fab />}
      <BottomNav active={active} />
      <StatusChips />
    </div>
  );
}

export function PageHeader({ title, subtitle, actions, eyebrow }: { title: string; subtitle?: ReactNode; actions?: ReactNode; eyebrow?: string }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="hud-label mb-1.5 !text-accent-ink">{eyebrow}</p>}
        <h1 className="font-display text-[28px] leading-tight font-bold tracking-[0.04em] text-fg sm:text-[32px]">{title}</h1>
        {subtitle && <p className="mt-1.5 text-[15px] text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}
