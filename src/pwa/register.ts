import { useEffect, useState } from 'react';
import { create } from 'zustand';

interface PwaState {
  updateReady: boolean;
  registration: ServiceWorkerRegistration | null;
  installEvent: BeforeInstallPromptEvent | null;
  installed: boolean;
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const usePwa = create<PwaState>()(() => ({ updateReady: false, registration: null, installEvent: null, installed: false }));

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('./sw.js', { scope: './' });
      usePwa.setState({ registration: reg });
      const watch = (worker: ServiceWorker | null) => {
        if (!worker) return;
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) usePwa.setState({ updateReady: true });
        });
      };
      if (reg.waiting && navigator.serviceWorker.controller) usePwa.setState({ updateReady: true });
      reg.addEventListener('updatefound', () => watch(reg.installing));
      // Check for updates when the app comes back to the foreground.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') reg.update().catch(() => {});
      });
      // Daily reminders where Periodic Background Sync exists (installed Chromium PWAs).
      const periodic = (reg as ServiceWorkerRegistration & { periodicSync?: { register(tag: string, o: { minInterval: number }): Promise<void> } }).periodicSync;
      if (periodic) periodic.register('evolve-daily-reminder', { minInterval: 6 * 60 * 60 * 1000 }).catch(() => {});
    } catch (error) {
      console.warn('Service worker registration failed', error);
    }
  });
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return;
    reloading = true;
    location.reload();
  });
}

export function applyUpdate(): void {
  const reg = usePwa.getState().registration;
  if (reg?.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
  else location.reload();
}

export function listenForInstallPrompt(): void {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    usePwa.setState({ installEvent: e as BeforeInstallPromptEvent });
  });
  window.addEventListener('appinstalled', () => usePwa.setState({ installEvent: null, installed: true }));
}

export async function promptInstall(): Promise<boolean> {
  const e = usePwa.getState().installEvent;
  if (!e) return false;
  await e.prompt();
  const { outcome } = await e.userChoice;
  usePwa.setState({ installEvent: null });
  return outcome === 'accepted';
}

/** iOS Safari never fires beforeinstallprompt — it needs Share → Add to Home Screen. */
export function useInstallHint(): 'prompt' | 'ios' | 'installed' | 'none' {
  const installEvent = usePwa((s) => s.installEvent);
  const installed = usePwa((s) => s.installed);
  const [ios, setIos] = useState(false);
  useEffect(() => {
    const ua = navigator.userAgent;
    setIos(/iPad|iPhone|iPod/.test(ua) || (ua.includes('Mac') && 'ontouchend' in document));
  }, []);
  if (installed || isStandalone()) return 'installed';
  if (installEvent) return 'prompt';
  if (ios) return 'ios';
  return 'none';
}
