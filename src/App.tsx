import { AnimatePresence, m } from 'framer-motion';
import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { MotionProvider } from '@/lib/motion';
import { navigate, useRoute } from '@/lib/router';
import { decodeCard } from '@/lib/social';
import { isStandalone, usePwa, applyUpdate } from '@/pwa/register';
import { useGameStore } from '@/store/gameStore';
import { useUI } from '@/store/uiStore';
import { AppShell } from '@/layouts/AppShell';
import { Logo } from '@/components/brand/Logo';
import { CelebrationHost } from '@/components/fx/CelebrationHost';
import { FxLayer } from '@/components/fx/FxLayer';
import { Toaster } from '@/components/fx/Toaster';
import { SheetHost } from '@/components/sheets/SheetHost';
import { AppearanceSync } from '@/components/system/AppearanceSync';
import { DayWatcher } from '@/components/system/DayWatcher';
import { ErrorBoundary } from '@/components/system/ErrorBoundary';
import { Button } from '@/components/ui/Button';
import Home from '@/pages/Home';

const Landing = lazy(() => import('@/pages/Landing'));
const Onboarding = lazy(() => import('@/pages/Onboarding'));
const Quests = lazy(() => import('@/pages/Quests'));
const Progress = lazy(() => import('@/pages/Progress'));
const Character = lazy(() => import('@/pages/Character'));
const Settings = lazy(() => import('@/pages/Settings'));
const Focus = lazy(() => import('@/pages/Focus'));

const INVITE_KEY = 'evolve:pending-invite';

function Splash({ label }: { label?: string }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-bg" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-4">
        <Logo size={56} animated />
        {label && <p className="text-sm text-muted">{label}</p>}
        <span className="sr-only">Loading Evolve…</span>
      </div>
    </div>
  );
}

function PageFallback() {
  return (
    <div className="grid place-items-center py-24" role="status">
      <Logo size={36} animated className="opacity-70" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}

function FatalError({ message }: { message: string }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-bg p-6" role="alert">
      <div className="max-w-sm text-center">
        <Logo size={48} className="mx-auto" />
        <h1 className="mt-5 font-display text-xl font-semibold tracking-wide text-fg">Something went wrong.</h1>
        <p className="mt-2 text-sm text-muted">{message} Your progress is safe — nothing was deleted.</p>
        <p className="mt-2 text-xs text-faint">If you’re in a private window, storage may be disabled. Try a normal window.</p>
        <Button variant="primary" cta className="mt-6" icon="refresh-cw" onClick={() => location.reload()}>
          Try again
        </Button>
      </div>
    </div>
  );
}

function UpdatePrompt() {
  const ready = usePwa((s) => s.updateReady);
  return (
    <AnimatePresence>
      {ready && (
        <m.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} className="fixed inset-x-3 bottom-[calc(var(--safe-bottom)+5.5rem)] z-[96] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-line-strong bg-surface-2/95 p-3 pl-4 shadow-2xl backdrop-blur lg:bottom-6" role="status">
          <p className="flex-1 text-sm text-fg">A new version of Evolve is ready.</p>
          <Button variant="primary" size="sm" onClick={applyUpdate}>
            Update
          </Button>
        </m.div>
      )}
    </AnimatePresence>
  );
}

function BusyOverlay() {
  const busy = useUI((s) => s.busy);
  return (
    <AnimatePresence>
      {busy && (
        <m.div className="fixed inset-0 z-[99] grid place-items-center bg-bg/80 backdrop-blur" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="status" aria-live="polite">
          <div className="flex flex-col items-center gap-4">
            <Logo size={48} animated />
            <p className="text-sm text-muted">{busy}</p>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
}

/** Routes for a player who has a character. */
function GameRoutes() {
  const route = useRoute();
  const top = route.segments[0] ?? 'home';
  const tab = route.segments[1];

  useEffect(() => {
    if (top === 'onboarding' || route.path === '/') navigate('/home', { replace: true });
  }, [top, route.path]);

  // App shortcuts from the manifest, e.g. #/home?action=log
  useEffect(() => {
    const action = route.query.get('action');
    if (!action) return;
    if (action === 'log') useUI.getState().openSheet({ type: 'log' });
    else if (action === 'quest') useUI.getState().openSheet({ type: 'quest' });
    navigate(route.path, { replace: true });
  }, [route]);

  if (top === 'focus') return <Focus />;
  if (top === 'welcome') return <Landing />;
  let page: ReactNode;
  switch (top) {
    case 'quests':
      page = <Quests tab={tab} />;
      break;
    case 'progress':
      page = <Progress tab={tab} />;
      break;
    case 'character':
      page = <Character tab={tab} />;
      break;
    case 'settings':
      page = <Settings />;
      break;
    default:
      page = <Home />;
  }
  return (
    <AppShell>
      <ErrorBoundary inline resetKey={route.path}>
        <Suspense fallback={<PageFallback />}>{page}</Suspense>
      </ErrorBoundary>
    </AppShell>
  );
}

function Router() {
  const status = useGameStore((s) => s.status);
  const loadError = useGameStore((s) => s.loadError);
  const onboarded = useGameStore((s) => !!s.state.profile);
  const mode = useGameStore((s) => s.mode);
  const enterDemo = useGameStore((s) => s.enterDemo);
  const route = useRoute();
  const top = route.segments[0];

  // Party invite links: #/join?c=EVO1.xxxx
  useEffect(() => {
    if (top !== 'join') return;
    const code = route.query.get('c') ?? '';
    try {
      sessionStorage.setItem(INVITE_KEY, code);
    } catch {
      /* ignore */
    }
    navigate(onboarded ? '/character/party' : '/', { replace: true });
  }, [top, route.query, onboarded]);

  // Process a pending invite once a character exists.
  useEffect(() => {
    if (!onboarded || status !== 'ready') return;
    let code: string | null = null;
    try {
      code = sessionStorage.getItem(INVITE_KEY);
      sessionStorage.removeItem(INVITE_KEY);
    } catch {
      /* ignore */
    }
    if (!code) return;
    const parsed = decodeCard(code);
    if (parsed.ok) useUI.getState().openSheet({ type: 'party' });
    try {
      if (parsed.ok) sessionStorage.setItem('evolve:invite-code', code);
    } catch {
      /* ignore */
    }
  }, [onboarded, status]);

  useEffect(() => {
    if (top === 'demo' && status === 'ready' && mode !== 'demo') void enterDemo().then(() => navigate('/home', { replace: true }));
    else if (top === 'demo' && mode === 'demo') navigate('/home', { replace: true });
  }, [top, status, mode, enterDemo]);

  if (status === 'idle' || status === 'loading') return <Splash />;
  if (status === 'error') return <FatalError message={loadError ?? 'Evolve couldn’t start.'} />;
  if (top === 'demo') return <Splash label="Loading the demo hero…" />;
  if (onboarded) return <GameRoutes />;
  if (top === 'onboarding' || (isStandalone() && top !== 'welcome')) return <Onboarding />;
  return <Landing />;
}

export default function App() {
  const init = useGameStore((s) => s.init);
  const motion = useGameStore((s) => s.state.settings.motion);
  useEffect(() => {
    void init();
  }, [init]);
  return (
    <MotionProvider motion={motion}>
      <ErrorBoundary>
        <AppearanceSync />
        <DayWatcher />
        <Suspense fallback={<Splash />}>
          <Router />
        </Suspense>
        <SheetHost />
        <CelebrationHost />
        <FxLayer />
        <Toaster />
        <UpdatePrompt />
        <BusyOverlay />
      </ErrorBoundary>
    </MotionProvider>
  );
}
