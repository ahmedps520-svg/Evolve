import { useEffect, useMemo, useState } from 'react';
import { CLASS_MAP } from '@/data/classes';
import { formatNumber } from '@/lib/format';
import { addPartyMember, updateSettings } from '@/lib/engine/gameEngine';
import { buildCard, decodeCard, encodeCard, inviteLink, shareText } from '@/lib/social';
import { dispatch, useGameStore } from '@/store/gameStore';
import { useUI } from '@/store/uiStore';
import { Avatar } from '@/components/game/Avatar';
import { titleText } from '@/components/game/Cosmetic';
import { LevelBadge } from '@/components/game/Hud';
import { Button } from '@/components/ui/Button';
import { Tabs, useCopy } from '@/components/ui/Display';
import { Field, TextArea } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Sheet as SheetPanel } from '@/components/ui/Overlay';

type Tab = 'share' | 'add';

export default function PartySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const state = useGameStore((s) => s.state);
  const toast = useUI((s) => s.toast);
  const [tab, setTab] = useState<Tab>('share');
  const [code, setCode] = useState('');
  const [copied, copy] = useCopy();

  useEffect(() => {
    if (!open) return;
    let invite: string | null = null;
    try {
      invite = sessionStorage.getItem('evolve:invite-code');
      sessionStorage.removeItem('evolve:invite-code');
    } catch {
      /* ignore */
    }
    setCode(invite ?? '');
    setTab(invite ? 'add' : 'share');
  }, [open]);

  const card = useMemo(() => (open ? buildCard(state, Date.now()) : null), [open, state]);
  const parsed = code.trim() ? decodeCard(code) : null;

  const share = async () => {
    if (!card) return;
    const result = await shareText('Join my party on Evolve', `${card.n} invited you to their party on Evolve. Open this link to add them:`, inviteLink(card));
    if (result === 'copied') toast({ kind: 'success', title: 'Invite link copied', icon: 'link' });
  };

  const add = () => {
    if (!parsed?.ok) return;
    const res = dispatch((s, now) => addPartyMember(s, parsed.member, now));
    if (!res.error) {
      // Adding a friend is an explicit opt-in to party mode.
      if (!res.state.settings.social.enabled) dispatch((s, now) => updateSettings(s, { social: { enabled: true } }, now), { silent: true });
      toast({ kind: 'success', title: 'Party updated', message: `${parsed.member.name} is in your party.`, icon: 'users' });
      setCode('');
      onClose();
    }
  };

  return (
    <SheetPanel open={open} onClose={onClose} title="Your party" description="Private, device-to-device. No accounts, no servers.">
      <div className="space-y-5">
        <Tabs<Tab>
          label="Party"
          value={tab}
          onChange={setTab}
          items={[
            { id: 'share', label: 'Share your card', icon: 'share-2' },
            { id: 'add', label: 'Add a friend', icon: 'user-plus' },
          ]}
        />

        {tab === 'share' && card && (
          <div className="space-y-4">
            <div className="card hud-corners flex items-center gap-4 p-4">
              <Avatar avatar={{ sigil: card.av!.s, background: card.av!.b, frame: card.av!.f, aura: card.av!.a }} size={58} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-fg">{card.n}</p>
                <p className="truncate text-xs text-muted">{titleText(card.t) ?? CLASS_MAP[card.c as keyof typeof CLASS_MAP]?.name}</p>
                <p className="mt-1 text-xs text-muted">
                  {card.w !== undefined && <>This week {formatNumber(card.w)} XP · </>}
                  {card.a !== undefined && <>{card.a} achievements</>}
                </p>
              </div>
              {card.l !== undefined && <LevelBadge level={card.l} size={36} />}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="primary" cta icon="share-2" onClick={() => void share()}>
                Share invite
              </Button>
              <Button variant="secondary" icon={copied ? 'check' : 'copy'} onClick={() => void copy(encodeCard(card))}>
                {copied ? 'Copied' : 'Copy code'}
              </Button>
            </div>
            <p className="flex gap-2 text-[13px] leading-snug text-muted">
              <Icon name="shield-check" size={15} className="mt-0.5 shrink-0 text-success" />
              Your card only contains what you allow in Settings → Privacy. Your activity details are never included. Share a fresh card whenever you want friends to see new progress.
            </p>
          </div>
        )}

        {tab === 'add' && (
          <div className="space-y-4">
            <Field label="Paste a party code or invite link" htmlFor="party-code" error={parsed && !parsed.ok ? parsed.error : null}>
              <TextArea id="party-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="EVO1.…" className="min-h-24 font-mono text-sm" spellCheck={false} autoCapitalize="off" autoCorrect="off" />
            </Field>
            {parsed?.ok && (
              <div className="card flex items-center gap-4 p-4">
                {parsed.member.avatar && <Avatar avatar={parsed.member.avatar} size={52} />}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-fg">{parsed.member.name}</p>
                  <p className="text-xs text-muted">
                    {parsed.member.level !== null ? `Level ${parsed.member.level}` : 'Level hidden'}
                    {parsed.member.weeklyXP !== null && ` · ${formatNumber(parsed.member.weeklyXP)} XP this week`}
                  </p>
                </div>
              </div>
            )}
            <Button variant="primary" cta size="lg" block icon="user-plus" disabled={!parsed?.ok} onClick={add}>
              Add to party
            </Button>
          </div>
        )}
      </div>
    </SheetPanel>
  );
}
