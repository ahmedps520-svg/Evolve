import { AnimatePresence, m } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { attributeColor } from '@/data/attributes';
import { getCategory } from '@/data/categories';
import { formatClock, formatMinutes, formatNumber } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { showNotification } from '@/lib/notifications';
import { navigate } from '@/lib/router';
import { playSound } from '@/lib/sound';
import { activityRate, finishSession, markSessionComplete, pauseSession, resumeSession, sessionClaimable, sessionElapsed, MIN_FOCUS_MINUTES } from '@/lib/engine/gameEngine';
import { useNow } from '@/hooks/useGameData';
import { dispatch, useGame } from '@/store/gameStore';
import { fxFrom, useUI } from '@/store/uiStore';
import { CategoryIcon } from '@/components/game/Tags';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

type WakeLockSentinelLike = { release(): Promise<void> };

function useWakeLock(active: boolean) {
  const lock = useRef<WakeLockSentinelLike | null>(null);
  useEffect(() => {
    const nav = navigator as Navigator & { wakeLock?: { request(type: 'screen'): Promise<WakeLockSentinelLike> } };
    if (!active || !nav.wakeLock) return;
    let cancelled = false;
    const acquire = () =>
      nav
        .wakeLock!.request('screen')
        .then((l) => {
          if (cancelled) void l.release();
          else lock.current = l;
        })
        .catch(() => {});
    void acquire();
    const onVisible = () => document.visibilityState === 'visible' && void acquire();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      void lock.current?.release().catch(() => {});
      lock.current = null;
    };
  }, [active]);
}

export default function Focus() {
  const session = useGame((s) => s.session);
  const settings = useGame((s) => s.settings);
  const quest = useGame((s) => (s.session?.questId ? s.quests.find((q) => q.id === s.session!.questId) : undefined));
  const toast = useUI((s) => s.toast);
  const now = useNow(250);
  const [ending, setEnding] = useState(false);
  const completedOnce = useRef(false);

  useWakeLock(session?.status === 'running');

  const elapsed = session ? sessionElapsed(session, now).ms : 0;
  const target = session ? session.targetMinutes * 60_000 : 1;
  const remaining = Math.max(0, target - elapsed);
  const complete = session?.status === 'complete' || (session?.status === 'running' && remaining <= 0);

  useEffect(() => {
    if (!session) navigate('/home', { replace: true });
  }, [session]);

  useEffect(() => {
    if (session?.status === 'running' && remaining <= 0 && !completedOnce.current) {
      completedOnce.current = true;
      dispatch((s, n) => markSessionComplete(s, n), { silent: true });
      playSound('complete');
      haptic('success');
      if (document.visibilityState !== 'visible') void showNotification({ type: 'focus', title: 'Session complete', body: 'Nice focus. Come back to claim your XP.', url: '#/focus' });
    }
  }, [session?.status, remaining]);

  useEffect(() => {
    const prev = document.title;
    document.title = session ? `${complete ? 'Complete' : formatClock(remaining)} · Focus · Evolve` : prev;
    return () => {
      document.title = prev;
    };
  }, [session, remaining, complete]);

  if (!session) return null;
  const cat = getCategory(session.category);
  const color = attributeColor(cat.attribute);
  const pct = Math.min(1, elapsed / target);
  const minutesDone = Math.min(session.targetMinutes, Math.floor(elapsed / 60_000));
  const rate = activityRate(settings, session.category);
  const potentialXP = Math.round((rate * session.targetMinutes) / 10) + (quest && !quest.completed ? quest.xpReward : 0);
  const claimable = sessionClaimable(session, now);
  const earnedNow = Math.round((rate * claimable.minutes) / 10);

  const finish = (claim: boolean, target?: EventTarget) => {
    if (target) fxFrom(target);
    const res = dispatch((s, n) => finishSession(s, n, claim), { quietErrors: true });
    if (res.error) toast({ kind: 'info', title: 'No XP this time', message: res.error, duration: 7000 });
    navigate(quest ? '/quests' : '/home');
  };

  const size = 300;
  const r = size / 2 - 8;
  const c = 2 * Math.PI * r;

  return (
    <div className="relative flex min-h-dvh flex-col bg-bg">
      <div className="pointer-events-none fixed inset-0" style={{ background: `radial-gradient(circle at 50% 42%, color-mix(in oklab, ${color} 14%, transparent), transparent 60%)` }} aria-hidden />
      <header className="safe-px relative flex items-center justify-between pt-[calc(var(--safe-top)+0.75rem)]">
        <button type="button" onClick={() => navigate('/home')} className="flex h-10 items-center gap-2 rounded-xl px-3 text-sm text-muted transition hover:bg-surface-2 hover:text-fg">
          <Icon name="chevron-left" size={18} /> Back to app
        </button>
        <span className="hud-label">Focus mode</span>
      </header>

      <main className="safe-px relative flex flex-1 flex-col items-center justify-center pb-[calc(var(--safe-bottom)+1.5rem)] text-center">
        <div className="flex items-center gap-3">
          <CategoryIcon category={session.category} size={36} />
          <h1 className="max-w-[18rem] truncate font-display text-lg font-bold tracking-[0.12em] text-fg uppercase sm:max-w-md">{session.label}</h1>
        </div>

        <div className="relative mt-10 grid place-items-center" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="-rotate-90" aria-hidden>
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={6} />
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={complete ? 'var(--success)' : color} strokeWidth={6} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} style={{ transition: 'stroke-dashoffset 0.3s linear', filter: `drop-shadow(0 0 10px ${complete ? 'var(--success)' : color})` }} />
          </svg>
          <div className="absolute inset-0 grid place-items-center">
            <div>
              <AnimatePresence mode="wait" initial={false}>
                {complete ? (
                  <m.div key="done" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                    <Icon name="badge-check" size={44} className="mx-auto text-success" />
                    <p className="mt-3 font-display text-xl font-bold tracking-[0.14em] text-fg">SESSION COMPLETE</p>
                  </m.div>
                ) : (
                  <m.div key="timer" role="timer" aria-live="off" aria-label={`${formatClock(remaining)} remaining`}>
                    <p className="num font-display text-[72px] leading-none font-bold tracking-tight text-fg sm:text-[84px]">{formatClock(remaining)}</p>
                    <p className="mt-3 text-sm text-muted">{session.status === 'paused' ? 'Paused' : `${formatMinutes(session.targetMinutes)} session`}</p>
                  </m.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <p className="mt-8 font-display text-2xl font-bold text-accent-ink" style={{ textShadow: '0 0 20px var(--accent)' }}>
          +{formatNumber(complete ? earnedNow + (quest && !quest.completed ? quest.xpReward : 0) : potentialXP)} XP
        </p>
        <p className="mt-1 text-xs text-muted">{complete ? 'Ready to claim' : quest && !quest.completed ? `Includes +${quest.xpReward} XP for “${quest.title}”` : `${rate} XP per 10 minutes`}</p>

        <div className="mt-10 flex w-full max-w-sm flex-col gap-3">
          {complete ? (
            <Button variant="primary" cta size="lg" block icon="sparkles" onClick={(e) => finish(true, e.currentTarget)}>
              Claim XP
            </Button>
          ) : (
            <>
              {session.status === 'running' ? (
                <Button variant="secondary" size="lg" block icon="pause" onClick={() => dispatch((s, n) => pauseSession(s, n))}>
                  Pause
                </Button>
              ) : (
                <Button variant="primary" cta size="lg" block icon="play" onClick={() => dispatch((s, n) => resumeSession(s, n))}>
                  Resume
                </Button>
              )}
              <Button variant="ghost" size="lg" block onClick={() => setEnding(true)}>
                End session
              </Button>
            </>
          )}
        </div>
      </main>

      <AnimatePresence>
        {ending && !complete && (
          <m.div className="fixed inset-0 z-50 grid place-items-end bg-black/60 backdrop-blur-sm sm:place-items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEnding(false)}>
            <m.div role="alertdialog" aria-modal="true" aria-labelledby="end-title" initial={{ y: 40 }} animate={{ y: 0 }} exit={{ y: 40 }} className="w-full rounded-t-[28px] border border-line bg-surface p-6 pb-[calc(var(--safe-bottom)+1.5rem)] sm:max-w-sm sm:rounded-[24px]" onClick={(e) => e.stopPropagation()}>
              <h2 id="end-title" className="font-display text-lg font-bold tracking-wide text-fg">
                End this session?
              </h2>
              <p className="mt-2 text-sm text-muted">
                {claimable.ok
                  ? `You focused for ${formatMinutes(minutesDone)}. Claim it for +${formatNumber(earnedNow)} XP, or keep going for the full session.`
                  : claimable.reason ?? `Sessions under ${MIN_FOCUS_MINUTES} minutes don’t earn XP.`}
              </p>
              <div className="mt-6 space-y-2.5">
                {claimable.ok && (
                  <Button variant="primary" cta block icon="sparkles" onClick={(e) => finish(true, e.currentTarget)}>
                    Claim {formatMinutes(minutesDone)}
                  </Button>
                )}
                <Button variant="secondary" block onClick={() => setEnding(false)}>
                  Keep going
                </Button>
                <Button variant="ghost" block onClick={() => finish(false)}>
                  Discard session
                </Button>
              </div>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
