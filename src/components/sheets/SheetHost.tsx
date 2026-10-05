import { lazy, Suspense, useEffect, useRef } from 'react';
import { useUI, type Sheet } from '@/store/uiStore';
import { LogActivitySheet } from './LogActivitySheet';

const QuestFormSheet = lazy(() => import('./QuestFormSheet'));
const GeneratorSheet = lazy(() => import('./GeneratorSheet'));
const GoalFormSheet = lazy(() => import('./GoalFormSheet'));
const FocusSetupSheet = lazy(() => import('./FocusSetupSheet'));
const JournalSheet = lazy(() => import('./JournalSheet'));
const PartySheet = lazy(() => import('./PartySheet'));
const RestDaySheet = lazy(() => import('./RestDaySheet'));

/** Renders whichever sheet is open. Keeps the last sheet's props so exit animations can play. */
export function SheetHost() {
  const sheet = useUI((s) => s.sheet);
  const close = useUI((s) => s.closeSheet);
  const last = useRef<Sheet | null>(null);
  useEffect(() => {
    if (sheet) last.current = sheet;
  }, [sheet]);
  // Browser/OS back closes an open sheet instead of leaving it over a different page.
  useEffect(() => {
    if (!sheet) return;
    window.addEventListener('popstate', close);
    return () => window.removeEventListener('popstate', close);
  }, [sheet, close]);
  const current = sheet ?? last.current;
  const isOpen = (t: Sheet['type']) => sheet?.type === t;

  return (
    <>
      <LogActivitySheet open={isOpen('log')} onClose={close} sheet={current?.type === 'log' ? current : undefined} />
      <Suspense fallback={null}>
        {current?.type === 'quest' && <QuestFormSheet open={isOpen('quest')} onClose={close} sheet={current} />}
        {current?.type === 'generator' && <GeneratorSheet open={isOpen('generator')} onClose={close} sheet={current} />}
        {current?.type === 'goal' && <GoalFormSheet open={isOpen('goal')} onClose={close} sheet={current} />}
        {current?.type === 'focus' && <FocusSetupSheet open={isOpen('focus')} onClose={close} sheet={current} />}
        {current?.type === 'journal' && <JournalSheet open={isOpen('journal')} onClose={close} sheet={current} />}
        {current?.type === 'party' && <PartySheet open={isOpen('party')} onClose={close} />}
        {current?.type === 'rest' && <RestDaySheet open={isOpen('rest')} onClose={close} />}
      </Suspense>
    </>
  );
}
