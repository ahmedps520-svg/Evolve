import { PageHeader } from '@/layouts/AppShell';
import { Icon } from '@/components/ui/Icon';
import { AboutSettings, InstallSettings } from './settings/AboutSettings';
import { AppearanceSettings, SoundSettings } from './settings/AppearanceSettings';
import { DataSettings } from './settings/DataSettings';
import { GameplaySettings } from './settings/GameplaySettings';
import { NotificationSettings } from './settings/NotificationSettings';
import { PrivacySettings } from './settings/PrivacySettings';
import { ProfileSettings } from './settings/ProfileSettings';
import { XPSettings } from './settings/XPSettings';

const SECTIONS = [
  { id: 'profile', label: 'Profile', icon: 'user-round' },
  { id: 'appearance', label: 'Appearance', icon: 'palette' },
  { id: 'sound', label: 'Sound & haptics', icon: 'volume-2' },
  { id: 'notifications', label: 'Notifications', icon: 'bell' },
  { id: 'gameplay', label: 'Gameplay', icon: 'swords' },
  { id: 'xp', label: 'XP system', icon: 'sliders-horizontal' },
  { id: 'privacy', label: 'Privacy & party', icon: 'shield-check' },
  { id: 'data', label: 'Your data', icon: 'database' },
  { id: 'app', label: 'App', icon: 'smartphone' },
  { id: 'about', label: 'About', icon: 'info' },
];

function jump(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const reduce = document.documentElement.classList.contains('reduce-motion') || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  el.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true });
}

export default function Settings() {
  return (
    <div>
      <PageHeader eyebrow="Settings" title="Make it yours" subtitle="Everything is saved on this device as you change it." />
      <div className="grid gap-8 lg:grid-cols-[200px_minmax(0,1fr)] lg:items-start">
        <nav aria-label="Settings sections" className="hidden lg:sticky lg:top-24 lg:block">
          <ul className="space-y-0.5">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <button type="button" onClick={() => jump(s.id)} className="flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-sm text-muted transition hover:bg-surface-2 hover:text-fg">
                  <Icon name={s.icon} size={15} />
                  {s.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <div className="min-w-0 space-y-9">
          <ProfileSettings />
          <AppearanceSettings />
          <SoundSettings />
          <NotificationSettings />
          <GameplaySettings />
          <XPSettings />
          <PrivacySettings />
          <DataSettings />
          <InstallSettings />
          <AboutSettings />
        </div>
      </div>
    </div>
  );
}
