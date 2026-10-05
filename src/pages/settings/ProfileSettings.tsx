import { useEffect, useState, type FormEvent } from 'react';
import type { FocusArea } from '@/types';
import { CLASSES } from '@/data/classes';
import { FOCUS_AREAS } from '@/data/focusAreas';
import { cn } from '@/lib/cn';
import { navigate } from '@/lib/router';
import { sanitizeName, updateProfile } from '@/lib/engine/gameEngine';
import { dispatch, useGame } from '@/store/gameStore';
import { useUI } from '@/store/uiStore';
import { Avatar, Sigil } from '@/components/game/Avatar';
import { Button } from '@/components/ui/Button';
import { Chip, Field, Input } from '@/components/ui/Field';
import { Panel } from './shared';

export function ProfileSettings() {
  const profile = useGame((s) => s.profile)!;
  const toast = useUI((s) => s.toast);
  const [name, setName] = useState(profile.name);
  useEffect(() => setName(profile.name), [profile.name]);
  const clean = sanitizeName(name);
  const dirty = clean !== profile.name;

  const saveName = (e: FormEvent) => {
    e.preventDefault();
    if (!dirty || !clean) return;
    const res = dispatch((s, now) => updateProfile(s, { name: clean }, now), { silent: true });
    if (!res.error) toast({ kind: 'success', title: 'Name updated', message: `Welcome back, ${clean}.`, icon: 'user-round' });
  };

  const toggleArea = (id: FocusArea) => {
    const next = profile.focusAreas.includes(id) ? profile.focusAreas.filter((a) => a !== id) : [...profile.focusAreas, id];
    dispatch((s, now) => updateProfile(s, { focusAreas: next }, now), { silent: true });
  };

  return (
    <Panel id="profile" title="Profile" icon="user-round">
      <div className="flex items-center gap-4 py-4">
        <Avatar avatar={profile.avatar} size={56} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-fg">{profile.name}</p>
          <p className="text-xs text-muted">Avatar, frame, title and badge live in your wardrobe.</p>
        </div>
        <Button variant="secondary" size="sm" icon="palette" onClick={() => navigate('/character/wardrobe')}>
          Customize
        </Button>
      </div>

      <form onSubmit={saveName} className="py-4">
        <Field label="Name" htmlFor="settings-name" hint="Shown on your character. Party cards can use an anonymous tag instead." error={name.trim() && !clean ? 'Enter a name.' : !name.trim() ? 'Your name can’t be empty.' : null}>
          <div className="flex gap-2">
            <Input id="settings-name" value={name} maxLength={24} autoComplete="nickname" onChange={(e) => setName(e.target.value)} />
            <Button type="submit" variant={dirty && clean ? 'primary' : 'secondary'} className="h-12" disabled={!dirty || !clean}>
              Save
            </Button>
          </div>
        </Field>
      </form>

      <div className="py-4">
        <p className="text-[15px] font-medium text-fg" id="class-label">
          Class
        </p>
        <p className="mt-0.5 text-[13px] text-muted">Classes shape your quest suggestions. They never lock you out of anything.</p>
        <div role="radiogroup" aria-labelledby="class-label" className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {CLASSES.map((c) => {
            const on = profile.classId === c.id;
            return (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => !on && dispatch((s, now) => updateProfile(s, { classId: c.id }, now), { silent: true })}
                className={cn('flex items-center gap-3 rounded-xl border p-3 text-left transition', on ? 'border-accent bg-accent/10' : 'border-line bg-surface-2 hover:border-line-strong')}
              >
                <span className={cn('grid size-9 shrink-0 place-items-center rounded-lg', on ? 'text-accent-ink' : 'text-muted')}>
                  <Sigil sigil={`sigil:${c.sigil}`} className="size-7" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-fg">{c.name}</span>
                  <span className="block truncate text-xs text-muted">{c.motto}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="py-4">
        <p className="text-[15px] font-medium text-fg">What you want to improve</p>
        <p className="mt-0.5 text-[13px] text-muted">Your daily quests are drawn from these. Keep at least one.</p>
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Goal areas">
          {FOCUS_AREAS.map((f) => (
            <Chip key={f.id} icon={f.icon} selected={profile.focusAreas.includes(f.id)} onClick={() => toggleArea(f.id)}>
              {f.name}
            </Chip>
          ))}
        </div>
      </div>
    </Panel>
  );
}
