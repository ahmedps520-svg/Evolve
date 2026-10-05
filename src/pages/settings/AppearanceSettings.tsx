import type { AccentId } from '@/types';
import { COSMETIC_MAP } from '@/data/cosmetics';
import { cn } from '@/lib/cn';
import { haptic } from '@/lib/haptics';
import { navigate } from '@/lib/router';
import { playSound, primeAudio } from '@/lib/sound';
import { useGame } from '@/store/gameStore';
import { THEME_SWATCH } from '@/components/game/Cosmetic';
import { Button } from '@/components/ui/Button';
import { Segmented, Slider, Toggle } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Panel, Row, setSettings } from './shared';

const ACCENT_ORDER: AccentId[] = ['electric', 'cyan', 'emerald', 'amber', 'crimson', 'violet', 'mono', 'synth', 'aurum'];

export function AppearanceSettings() {
  const settings = useGame((s) => s.settings);
  const inventory = useGame((s) => s.meta.inventory);
  return (
    <Panel id="appearance" title="Appearance" icon="palette">
      <Row label="Theme" description="Dark is the signature look. Light is tuned for daylight.">
        <Segmented
          label="Theme"
          value={settings.theme}
          onChange={(theme) => setSettings({ theme })}
          className="sm:w-72"
          options={[
            { value: 'dark', label: 'Dark', icon: 'moon' },
            { value: 'light', label: 'Light', icon: 'sun' },
            { value: 'system', label: 'Auto', icon: 'monitor' },
          ]}
        />
      </Row>
      <div className="py-4">
        <p className="text-[15px] font-medium text-fg" id="accent-label">
          Accent color
        </p>
        <p className="mt-0.5 text-[13px] text-muted">Premium themes unlock through levels and the shop.</p>
        <div role="radiogroup" aria-labelledby="accent-label" className="mt-3 flex flex-wrap gap-2.5">
          {ACCENT_ORDER.map((id) => {
            const itemId = `theme:${id}`;
            const owned = inventory.includes(itemId);
            const on = settings.accent === id;
            const [a, b] = THEME_SWATCH[id];
            const name = COSMETIC_MAP[itemId]?.name ?? id;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={on}
                aria-label={owned ? name : `${name} (locked)`}
                title={owned ? name : `${name} — unlock in the shop or by leveling up`}
                onClick={() => (owned ? setSettings({ accent: id }) : navigate('/character/shop'))}
                className={cn('relative grid size-11 place-items-center rounded-full border-2 transition active:scale-95', on ? 'border-fg' : 'border-transparent hover:border-line-strong')}
              >
                <span className={cn('size-8 rounded-full', !owned && 'opacity-35')} style={{ background: `linear-gradient(135deg, ${a} 0 50%, ${b} 50% 100%)` }} />
                {!owned && <Icon name="lock" size={13} className="absolute text-fg" />}
                {on && <Icon name="check" size={14} className="absolute text-white drop-shadow-[0_1px_2px_rgb(0_0_0/0.6)]" />}
              </button>
            );
          })}
        </div>
      </div>
      <Toggle label="High contrast" description="Stronger borders and text for readability." checked={settings.highContrast} onChange={(highContrast) => setSettings({ highContrast })} />
      <Row label="Motion" description="Reduced motion removes movement and keeps feedback as fades.">
        <Segmented
          label="Motion"
          value={settings.motion}
          onChange={(motion) => setSettings({ motion })}
          className="sm:w-72"
          options={[
            { value: 'system', label: 'System' },
            { value: 'reduced', label: 'Reduced' },
            { value: 'full', label: 'Full' },
          ]}
        />
      </Row>
      <Toggle label="Intense effects" description="Particles, screen flashes and cinematic level-ups. Turn off for a calmer game." checked={settings.intenseEffects} onChange={(intenseEffects) => setSettings({ intenseEffects })} />
    </Panel>
  );
}

export function SoundSettings() {
  const sound = useGame((s) => s.settings.sound);
  const haptics = useGame((s) => s.settings.haptics);
  const canVibrate = typeof navigator !== 'undefined' && 'vibrate' in navigator;
  return (
    <Panel id="sound" title="Sound & haptics" icon="volume-2">
      <Toggle
        label="Sound effects"
        description="Short synthesized cues for XP, quests and level-ups."
        checked={sound.enabled}
        onChange={(enabled) => {
          setSettings({ sound: { enabled } });
          if (enabled) {
            primeAudio();
            setTimeout(() => playSound('coin'), 60);
          }
        }}
      />
      {sound.enabled && (
        <div className="flex items-end gap-3 py-4">
          <div className="flex-1">
            <Slider id="volume" label="Volume" value={Math.round(sound.volume * 100)} min={0} max={100} step={5} format={(v) => `${v}%`} onChange={(v) => setSettings({ sound: { volume: v / 100 } })} />
          </div>
          <Button variant="secondary" size="sm" icon="play" onClick={() => playSound('levelup')}>
            Test
          </Button>
        </div>
      )}
      <Toggle
        label="Haptics"
        description={canVibrate ? 'Gentle vibration on completions and level-ups.' : 'Your device or browser doesn’t support vibration.'}
        checked={haptics && canVibrate}
        disabled={!canVibrate}
        onChange={(v) => {
          setSettings({ haptics: v });
          if (v) setTimeout(() => haptic('success'), 30);
        }}
      />
    </Panel>
  );
}
