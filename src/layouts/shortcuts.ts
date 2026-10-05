import { useEffect } from 'react';
import { navigate } from '@/lib/router';
import { useUI } from '@/store/uiStore';

export const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ['L'], label: 'Log an activity' },
  { keys: ['N'], label: 'New quest' },
  { keys: ['F'], label: 'Start a focus session' },
  { keys: ['1'], label: 'Home' },
  { keys: ['2'], label: 'Quests' },
  { keys: ['3'], label: 'Progress' },
  { keys: ['4'], label: 'Character' },
  { keys: ['5'], label: 'Settings' },
];

const ROUTES: Record<string, string> = { '1': '/home', '2': '/quests', '3': '/progress', '4': '/character', '5': '/settings' };

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

/** Single-key shortcuts for keyboard players. Inactive while typing or while a dialog is open. */
export function useShortcuts(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.repeat || e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      const ui = useUI.getState();
      if (ui.sheet || ui.celebrations.length || document.querySelector('[aria-modal="true"]')) return;
      const key = e.key.toLowerCase();
      if (ROUTES[key]) navigate(ROUTES[key]);
      else if (key === 'l') ui.openSheet({ type: 'log' });
      else if (key === 'n') ui.openSheet({ type: 'quest' });
      else if (key === 'f') ui.openSheet({ type: 'focus' });
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
