import type { SocialSettings } from '@/types';
import { navigate } from '@/lib/router';
import { useGame } from '@/store/gameStore';
import { Button } from '@/components/ui/Button';
import { Toggle } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Panel, setSettings } from './shared';

const SHARE_FIELDS: { key: keyof SocialSettings['share']; label: string }[] = [
  { key: 'level', label: 'Level' },
  { key: 'totalXP', label: 'Total XP' },
  { key: 'weeklyXP', label: 'Weekly and monthly XP' },
  { key: 'quests', label: 'Quests completed' },
  { key: 'achievements', label: 'Achievement count' },
  { key: 'streak', label: 'Current streak' },
];

export function PrivacySettings() {
  const social = useGame((s) => s.settings.social);
  const playerTag = useGame((s) => s.profile?.playerTag ?? 'Player');
  return (
    <Panel id="privacy" title="Privacy & party" icon="shield-check">
      <div className="flex items-start gap-3 py-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-success/12 text-success">
          <Icon name="shield-check" size={20} />
        </span>
        <div>
          <p className="font-semibold text-fg">Your progress stays on your device.</p>
          <p className="mt-0.5 text-[13px] text-muted">No account, no tracking, no ads. Evolve stores everything locally and works offline. Nothing leaves this device unless you export a backup or share a party card yourself.</p>
        </div>
      </div>
      <Toggle label="Party mode" description="Friends-only leaderboard and weekly challenges using shareable party cards." checked={social.enabled} onChange={(enabled) => setSettings({ social: { enabled } })} />
      {social.enabled && (
        <>
          <Toggle label="Anonymous name" description={`Share as “${playerTag}” instead of your name. Your title is hidden too.`} checked={social.anonymous} onChange={(anonymous) => setSettings({ social: { anonymous } })} />
          <div className="py-4">
            <p className="text-[15px] font-medium text-fg">Included in your party card</p>
            <p className="mt-0.5 text-[13px] text-muted">Your activity details, journal and goals are never included.</p>
            <div className="mt-2 divide-y divide-line">
              {SHARE_FIELDS.map((f) => (
                <Toggle key={f.key} label={f.label} checked={social.share[f.key]} onChange={(v) => setSettings({ social: { share: { [f.key]: v } } })} />
              ))}
            </div>
          </div>
          <div className="py-4">
            <Button variant="secondary" size="sm" icon="users" onClick={() => navigate('/character/party')}>
              Open party
            </Button>
          </div>
        </>
      )}
    </Panel>
  );
}
