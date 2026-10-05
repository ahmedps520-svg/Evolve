import { useEffect } from 'react';
import { configureHaptics } from '@/lib/haptics';
import { configureSound, primeAudio } from '@/lib/sound';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useGame } from '@/store/gameStore';

/** Applies theme, accent, contrast and motion settings to <html>, and mirrors them for a flash-free boot. */
export function AppearanceSync() {
  const theme = useGame((s) => s.settings.theme);
  const accent = useGame((s) => s.settings.accent);
  const highContrast = useGame((s) => s.settings.highContrast);
  const motion = useGame((s) => s.settings.motion);
  const sound = useGame((s) => s.settings.sound);
  const haptics = useGame((s) => s.settings.haptics);
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');

  useEffect(() => {
    const root = document.documentElement;
    const dark = theme === 'system' ? prefersDark : theme === 'dark';
    root.classList.toggle('dark', dark);
    root.classList.toggle('light', !dark);
    root.classList.toggle('hc', highContrast);
    root.classList.toggle('reduce-motion', motion === 'reduced');
    root.classList.toggle('motion-ok', motion === 'full');
    root.dataset.accent = accent;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#06070a' : '#f2f3f7');
    try {
      localStorage.setItem('evolve:appearance', JSON.stringify({ theme, accent, highContrast }));
    } catch {
      /* storage may be unavailable; appearance still applies for this session */
    }
  }, [theme, accent, highContrast, motion, prefersDark]);

  useEffect(() => {
    configureSound(sound);
  }, [sound]);

  useEffect(() => {
    configureHaptics(haptics);
  }, [haptics]);

  // Browsers only allow audio after a gesture; unlock it on the first one.
  useEffect(() => {
    if (!sound.enabled) return;
    const unlock = () => {
      primeAudio();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, [sound.enabled]);

  return null;
}
