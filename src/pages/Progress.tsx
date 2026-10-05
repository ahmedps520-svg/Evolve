import { m } from 'framer-motion';
import { lazy, Suspense } from 'react';
import { navigate } from '@/lib/router';
import { useGame } from '@/store/gameStore';
import { PageHeader } from '@/layouts/AppShell';
import { Tabs } from '@/components/ui/Display';
import Overview from './progress/Overview';

const Streaks = lazy(() => import('./progress/Streaks'));
const Skills = lazy(() => import('./progress/Skills'));
const Journal = lazy(() => import('./progress/Journal'));
const History = lazy(() => import('./progress/History'));

type Tab = 'stats' | 'streaks' | 'skills' | 'journal' | 'history';
const TABS: Tab[] = ['stats', 'streaks', 'skills', 'journal', 'history'];

export default function Progress({ tab }: { tab?: string }) {
  const current: Tab = TABS.includes(tab as Tab) ? (tab as Tab) : 'stats';
  const journalOn = useGame((s) => s.settings.journal);
  return (
    <div>
      <PageHeader eyebrow="Progress" title="Your journey" subtitle="Stats, streaks, skills and the story of your days." />
      <Tabs<Tab>
        label="Progress sections"
        className="mb-7"
        value={current}
        onChange={(t) => navigate(t === 'stats' ? '/progress' : `/progress/${t}`, { replace: true })}
        items={[
          { id: 'stats', label: 'Stats', icon: 'chart-column' },
          { id: 'streaks', label: 'Streaks', icon: 'flame' },
          { id: 'skills', label: 'Skills', icon: 'chevrons-up' },
          ...(journalOn ? [{ id: 'journal' as Tab, label: 'Journal', icon: 'notebook-text' }] : []),
          { id: 'history', label: 'History', icon: 'history' },
        ]}
      />
      <m.div key={current} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} role="tabpanel">
        <Suspense fallback={<div className="h-64" aria-hidden />}>
          {current === 'stats' && <Overview />}
          {current === 'streaks' && <Streaks />}
          {current === 'skills' && <Skills />}
          {current === 'journal' && <Journal />}
          {current === 'history' && <History />}
        </Suspense>
      </m.div>
    </div>
  );
}
