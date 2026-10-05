import { useState } from 'react';
import { navigate } from '@/lib/router';
import { applyUpdate, promptInstall, useInstallHint, usePwa } from '@/pwa/register';
import { useGameStore } from '@/store/gameStore';
import { useUI } from '@/store/uiStore';
import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/Button';
import { Kbd } from '@/components/ui/Display';
import { Icon } from '@/components/ui/Icon';
import { SHORTCUTS } from '@/layouts/shortcuts';
import { Panel, Row } from './shared';

export function InstallSettings() {
  const hint = useInstallHint();
  const updateReady = usePwa((s) => s.updateReady);
  const registration = usePwa((s) => s.registration);
  const toast = useUI((s) => s.toast);
  const [checking, setChecking] = useState(false);

  const check = async () => {
    if (!registration) return;
    setChecking(true);
    try {
      await registration.update();
      const ready = !!registration.waiting || usePwa.getState().updateReady;
      if (!ready) toast({ kind: 'info', title: 'You’re up to date', icon: 'badge-check' });
    } catch {
      toast({ kind: 'info', title: 'Couldn’t check right now', message: 'You might be offline. Evolve keeps working.' });
    } finally {
      setChecking(false);
    }
  };

  return (
    <Panel id="app" title="App" icon="smartphone">
      <Row
        label="Install Evolve"
        description={
          hint === 'installed'
            ? 'Installed. Evolve launches full screen and works offline.'
            : hint === 'ios'
              ? 'In Safari, tap Share, then “Add to Home Screen”.'
              : hint === 'prompt'
                ? 'Add Evolve to your home screen or dock. Full screen, offline, instant.'
                : 'Use your browser’s menu to install or add Evolve to your home screen.'
        }
      >
        {hint === 'prompt' ? (
          <Button variant="primary" icon="download" onClick={() => void promptInstall()}>
            Install
          </Button>
        ) : hint === 'installed' ? (
          <span className="inline-flex items-center gap-1.5 text-sm text-success">
            <Icon name="check" size={15} /> Installed
          </span>
        ) : hint === 'ios' ? (
          <Icon name="share-2" size={20} className="text-muted" />
        ) : null}
      </Row>
      <Row label="Offline mode" description="Everything works without a connection. Your data never needs the internet.">
        <span className="inline-flex items-center gap-1.5 text-sm text-success">
          <Icon name="check" size={15} /> Ready
        </span>
      </Row>
      {registration && (
        <Row label="Updates" description={updateReady ? 'A new version is ready.' : 'Evolve updates itself in the background.'}>
          {updateReady ? (
            <Button variant="primary" icon="refresh-cw" onClick={applyUpdate}>
              Update now
            </Button>
          ) : (
            <Button variant="secondary" icon="refresh-cw" loading={checking} onClick={() => void check()}>
              Check
            </Button>
          )}
        </Row>
      )}
    </Panel>
  );
}

export function AboutSettings() {
  const mode = useGameStore((s) => s.mode);
  const enterDemo = useGameStore((s) => s.enterDemo);
  return (
    <Panel id="about" title="About" icon="info">
      <div className="flex items-center gap-4 py-5">
        <Logo size={44} />
        <div>
          <p className="font-display text-lg font-bold tracking-[0.24em] text-fg uppercase">Evolve</p>
          <p className="text-[13px] text-muted">
            Real life. Now with XP. · Version {__APP_VERSION__}
          </p>
        </div>
      </div>
      <div className="hidden py-4 md:block">
        <p className="text-[15px] font-medium text-fg">Keyboard shortcuts</p>
        <ul className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          {SHORTCUTS.map((s) => (
            <li key={s.keys.join('+')} className="flex items-center justify-between gap-3">
              <span className="text-muted">{s.label}</span>
              <span className="flex gap-1">
                {s.keys.map((k) => (
                  <Kbd key={k}>{k}</Kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </div>
      {mode !== 'demo' && (
        <Row label="Demo hero" description="Explore a Level 18 character with two months of history. Your own progress stays untouched.">
          <Button variant="secondary" icon="play" onClick={() => void enterDemo().then(() => navigate('/home', { replace: true }))}>
            View demo
          </Button>
        </Row>
      )}
      <div className="space-y-2 py-4 text-[13px] text-muted">
        <p>Evolve is built for consistency, not intensity. Healthy limits cap XP for extreme sessions, rest days protect your streak, and missing a day never erases progress.</p>
        <p>Fonts: Inter and Oxanium, under the SIL Open Font License. Icons: Lucide (ISC).</p>
      </div>
    </Panel>
  );
}
