import { useEffect, useMemo, useRef, useState } from 'react';
import type { JournalEntry } from '@/types';
import { cn } from '@/lib/cn';
import { formatDay, toDateKey } from '@/lib/date';
import { formatNumber } from '@/lib/format';
import { deleteJournal, saveJournal } from '@/lib/engine/gameEngine';
import { deletePhotos, dispatch, photoURL, savePhoto, useGame } from '@/store/gameStore';
import { useUI, type Sheet } from '@/store/uiStore';
import { Button, IconButton } from '@/components/ui/Button';
import { Field, TextArea } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { ConfirmDialog, Sheet as SheetPanel } from '@/components/ui/Overlay';

export const MOODS: { value: NonNullable<JournalEntry['mood']>; label: string; icon: string }[] = [
  { value: 1, label: 'Rough', icon: 'cloud-rain' },
  { value: 2, label: 'Low', icon: 'cloud' },
  { value: 3, label: 'Okay', icon: 'cloud-sun' },
  { value: 4, label: 'Good', icon: 'sun' },
  { value: 5, label: 'Great', icon: 'sparkles' },
];

export function Photo({ id, className, alt = '' }: { id: string; className?: string; alt?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    void photoURL(id).then((u) => live && setUrl(u));
    return () => {
      live = false;
    };
  }, [id]);
  if (!url) return <div className={cn('animate-pulse bg-surface-3', className)} aria-hidden />;
  return <img src={url} alt={alt} className={cn('object-cover', className)} loading="lazy" decoding="async" />;
}

export default function JournalSheet({ open, onClose, sheet }: { open: boolean; onClose: () => void; sheet: Extract<Sheet, { type: 'journal' }> }) {
  const existing = useGame((s) => s.journal.find((j) => j.dateKey === sheet.dateKey));
  const transactions = useGame((s) => s.transactions);
  const toast = useUI((s) => s.toast);
  const [text, setText] = useState('');
  const [mood, setMood] = useState<JournalEntry['mood']>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const added = useRef<string[]>([]);
  const saved = useRef(false);
  const file = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setText(existing?.text ?? '');
    setMood(existing?.mood ?? null);
    setPhotos(existing?.photoIds ?? []);
    added.current = [];
    saved.current = false;
  }, [open, existing]);

  const summary = useMemo(() => {
    const xp = transactions.filter((t) => t.currency === 'xp' && t.dateKey === sheet.dateKey).reduce((n, t) => n + t.amount, 0);
    const quests = transactions.filter((t) => t.currency === 'xp' && t.source === 'quest' && t.dateKey === sheet.dateKey).length;
    return { xp, quests };
  }, [transactions, sheet.dateKey]);

  const close = () => {
    // Photos picked but never saved are cleaned up.
    if (!saved.current && added.current.length) void deletePhotos(added.current);
    onClose();
  };

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    try {
      for (const f of Array.from(files).slice(0, 6 - photos.length)) {
        const id = await savePhoto(f);
        added.current.push(id);
        setPhotos((p) => [...p, id]);
      }
    } catch (e) {
      toast({ kind: 'error', title: 'Couldn’t add that photo', message: e instanceof Error ? e.message : undefined });
    } finally {
      setBusy(false);
      if (file.current) file.current.value = '';
    }
  };

  const save = () => {
    const removed = (existing?.photoIds ?? []).filter((id) => !photos.includes(id));
    const res = dispatch((s, now) => saveJournal(s, { dateKey: sheet.dateKey, text, mood, photoIds: photos }, now));
    if (res.error) return;
    saved.current = true;
    if (removed.length) void deletePhotos(removed);
    toast({ kind: 'success', title: 'Journal saved', icon: 'notebook-text' });
    onClose();
  };

  const isToday = sheet.dateKey === toDateKey();

  return (
    <SheetPanel
      open={open}
      onClose={close}
      title={isToday ? 'How did today go?' : formatDay(sheet.dateKey, { weekday: 'long', month: 'long', day: 'numeric' })}
      description={`${formatDay(sheet.dateKey, { month: 'long', day: 'numeric' })} · +${formatNumber(summary.xp)} XP · ${summary.quests} quest${summary.quests === 1 ? '' : 's'}`}
      footer={
        <div className="flex gap-3">
          {existing && <IconButton icon="trash-2" label="Delete entry" variant="danger" onClick={() => setConfirm(true)} />}
          <Button variant="primary" cta size="lg" block icon="check" onClick={save} disabled={busy || (!text.trim() && !photos.length && !mood)}>
            Save entry
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <Field label="Mood" optional>
          <div role="radiogroup" aria-label="Mood" className="grid grid-cols-5 gap-2">
            {MOODS.map((m) => (
              <button
                key={m.value}
                type="button"
                role="radio"
                aria-checked={mood === m.value}
                onClick={() => setMood(mood === m.value ? null : m.value)}
                className={cn('flex h-[68px] flex-col items-center justify-center gap-1.5 rounded-2xl border text-xs font-medium transition', mood === m.value ? 'border-accent bg-accent/12 text-fg' : 'border-line bg-surface-2 text-muted hover:text-fg')}
              >
                <Icon name={m.icon} size={20} />
                {m.label}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Your entry" htmlFor="journal-text">
          <TextArea id="journal-text" data-autofocus value={text} maxLength={5000} onChange={(e) => setText(e.target.value)} placeholder="Had a really productive day…" className="min-h-40" />
        </Field>
        <Field label="Photos" optional hint="Photos stay on this device. Up to 6 per day.">
          <div className="grid grid-cols-3 gap-2">
            {photos.map((id) => (
              <div key={id} className="relative aspect-square overflow-hidden rounded-xl border border-line">
                <Photo id={id} className="h-full w-full" alt="Journal photo" />
                <button type="button" aria-label="Remove photo" onClick={() => setPhotos((p) => p.filter((x) => x !== id))} className="absolute top-1.5 right-1.5 grid size-7 place-items-center rounded-full bg-black/60 text-white backdrop-blur">
                  <Icon name="x" size={14} />
                </button>
              </div>
            ))}
            {photos.length < 6 && (
              <button type="button" onClick={() => file.current?.click()} disabled={busy} className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-line-strong text-xs text-muted transition hover:border-accent hover:text-fg disabled:opacity-50">
                {busy ? <span className="size-5 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Icon name="image-plus" size={22} />}
                Add photo
              </button>
            )}
          </div>
          <input ref={file} type="file" accept="image/*" multiple className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => void onFiles(e.target.files)} />
        </Field>
      </div>
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={() => {
          if (existing) {
            dispatch((s, now) => deleteJournal(s, existing.id, now));
            void deletePhotos(existing.photoIds);
          }
          setConfirm(false);
          saved.current = true;
          onClose();
        }}
        title="Delete this entry?"
        message="The text and photos for this day will be removed from your journal."
        confirmLabel="Delete"
        tone="danger"
      />
    </SheetPanel>
  );
}
