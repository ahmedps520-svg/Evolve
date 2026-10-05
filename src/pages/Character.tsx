import { m } from 'framer-motion';
import { lazy, Suspense } from 'react';
import { navigate } from '@/lib/router';
import { PageHeader } from '@/layouts/AppShell';
import { Tabs } from '@/components/ui/Display';
import Profile from './character/Profile';

const Achievements = lazy(() => import('./character/Achievements'));
const Wardrobe = lazy(() => import('./character/Wardrobe'));
const Shop = lazy(() => import('./character/Shop'));
const Party = lazy(() => import('./character/Party'));

type Tab = 'profile' | 'achievements' | 'wardrobe' | 'shop' | 'party';
const TABS: Tab[] = ['profile', 'achievements', 'wardrobe', 'shop', 'party'];

export default function Character({ tab }: { tab?: string }) {
  const current: Tab = TABS.includes(tab as Tab) ? (tab as Tab) : 'profile';
  return (
    <div>
      <PageHeader eyebrow="Character" title="Your hero" subtitle="Who you are becoming — and how you show it." />
      <Tabs<Tab>
        label="Character sections"
        className="mb-7"
        value={current}
        onChange={(t) => navigate(t === 'profile' ? '/character' : `/character/${t}`, { replace: true })}
        items={[
          { id: 'profile', label: 'Profile', icon: 'user-round' },
          { id: 'achievements', label: 'Achievements', icon: 'award' },
          { id: 'wardrobe', label: 'Customize', icon: 'palette' },
          { id: 'shop', label: 'Shop', icon: 'shopping-bag' },
          { id: 'party', label: 'Party', icon: 'users' },
        ]}
      />
      <m.div key={current} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} role="tabpanel">
        <Suspense fallback={<div className="h-64" aria-hidden />}>
          {current === 'profile' && <Profile />}
          {current === 'achievements' && <Achievements />}
          {current === 'wardrobe' && <Wardrobe />}
          {current === 'shop' && <Shop />}
          {current === 'party' && <Party />}
        </Suspense>
      </m.div>
    </div>
  );
}
