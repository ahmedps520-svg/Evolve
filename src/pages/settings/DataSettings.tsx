import { useEffect, useRef, useState } from 'react';
import { formatNumber } from '@/lib/format';
import { backupFileName, createBackup, parseBackup, type ParsedBackup } from '@/lib/db/backup';
import { navigate } from '@/lib/router';
import { currentStorage, flushStorage, useGameStore } from '@/store/gameStore';
import { useUI } from '@/store/uiStore';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { ConfirmDialog } from '@/components/ui/Overlay';
import { Panel, Row } from './shared';

type ValidBackup = Extract<ParsedBackup, { ok: true }>;

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

const STORAGE_LABEL = {
  indexeddb: { label: 'On this device', detail: 'Saved in your browser’s database and available offline.', icon: 'database', warn: false },
  localstorage: { label: 'Basic browser storage', detail: 'Your browser limits storage here. Export a backup now and then.', icon: 'database', warn: true },
  memory: { label: 'Temporary only', detail: 'This browser is blocking storage (private mode?). Progress will be lost when you close the tab — export a backup to keep it.', icon: 'triangle-alert', warn: true },
} as const;

async function saveFile(blob: Blob, name: string): Promise<'shared' | 'downloaded'> {
  const file = new File([blob], name, { type: 'application/json' });
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.userAgent.includes('Mac') && 'ontouchend' in document);
  // iOS home-screen apps can't download files; the share sheet lets the player save to Files.
  if (ios && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: name });
      return 'shared';
    } catch (e) {
      if ((e as DOMException)?.name === 'AbortError') throw e;
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return 'downloaded';
}

export function DataSettings() {
  const mode = useGameStore((s) => s.mode);
  const storageKind = useGameStore((s) => s.storageKind);
  const saveState = useGameStore((s) => s.saveState);
  const entries = useGameStore((s) => s.state.transactions.length + s.state.activities.length + s.state.journal.length);
  const importState = useGameStore((s) => s.importState);
  const resetAll = useGameStore((s) => s.resetAll);
  const exitDemo = useGameStore((s) => s.exitDemo);
  const toast = useUI((s) => s.toast);
  const setBusy = useUI((s) => s.setBusy);
  const fileRef = useRef<HTMLInputElement>(null);
  const [usage, setUsage] = useState<number | null>(null);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [pending, setPending] = useState<ValidBackup | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const demo = mode === 'demo';

  useEffect(() => {
    let alive = true;
    navigator.storage
      ?.estimate?.()
      .then((e) => alive && setUsage(e.usage ?? null))
      .catch(() => {});
    navigator.storage
      ?.persisted?.()
      .then((p) => alive && setPersisted(p))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [entries]);

  const exportData = async () => {
    setBusy('Preparing your backup…');
    try {
      await flushStorage();
      const backup = await createBackup(useGameStore.getState().state, currentStorage());
      const name = backupFileName();
      const how = await saveFile(new Blob([JSON.stringify(backup)], { type: 'application/json' }), name);
      toast({ kind: 'success', title: how === 'shared' ? 'Backup ready' : 'Backup downloaded', message: name, icon: 'download' });
    } catch (e) {
      if ((e as DOMException)?.name !== 'AbortError') toast({ kind: 'error', title: 'Export failed', message: 'Your progress is safe. Please try again.' });
    } finally {
      setBusy(null);
    }
  };

  const onFile = async (file: File | undefined) => {
    if (fileRef.current) fileRef.current.value = '';
    if (!file) return;
    let text: string;
    try {
      text = await file.text();
    } catch {
      toast({ kind: 'error', title: 'Couldn’t read that file' });
      return;
    }
    const parsed = parseBackup(text);
    if (!parsed.ok) {
      toast({ kind: 'error', title: 'Couldn’t import', message: parsed.error, duration: 6000 });
      return;
    }
    setPending(parsed);
  };

  const confirmImport = async () => {
    const backup = pending;
    setPending(null);
    if (!backup) return;
    setBusy('Restoring your backup…');
    try {
      await importState(backup.state, backup.media);
      toast({ kind: 'success', title: 'Backup restored', message: backup.summaryText, icon: 'upload' });
      navigate('/home', { replace: true });
    } catch {
      toast({ kind: 'error', title: 'Import failed', message: 'Nothing was changed. Please try again.' });
    } finally {
      setBusy(null);
    }
  };

  const confirmReset = async () => {
    await resetAll();
    setResetOpen(false);
    navigate('/', { replace: true });
  };

  const store = storageKind ? STORAGE_LABEL[storageKind] : null;

  return (
    <Panel id="data" title="Your data" icon="database">
      {demo && (
        <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13px] text-muted">You’re exploring the demo hero. Nothing here touches your own progress.</p>
          <Button variant="primary" size="sm" icon="log-out" onClick={() => void exitDemo().then(() => navigate(useGameStore.getState().state.profile ? '/home' : '/onboarding', { replace: true }))}>
            Exit demo
          </Button>
        </div>
      )}
      {store && (
        <div className="flex items-start gap-3 py-4">
          <Icon name={store.icon} size={18} className={store.warn ? 'mt-0.5 text-warning' : 'mt-0.5 text-muted'} />
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-medium text-fg">
              {store.label}
              {saveState === 'retrying' && <span className="ml-2 text-xs font-normal text-warning">Saving — retrying…</span>}
            </p>
            <p className="mt-0.5 text-[13px] text-muted">
              {store.detail}
              {usage !== null && ` Using ${formatBytes(usage)}.`}
            </p>
            {storageKind === 'indexeddb' && persisted === false && (
              <Button
                variant="ghost"
                size="sm"
                icon="shield-check"
                className="mt-2 -ml-2"
                onClick={async () => {
                  const ok = await navigator.storage?.persist?.().catch(() => false);
                  setPersisted(!!ok);
                  toast(ok ? { kind: 'success', title: 'Storage protected', message: 'Your browser won’t clear Evolve to free up space.' } : { kind: 'info', title: 'Not granted right now', message: 'Browsers usually allow this once Evolve is installed or used often.' });
                }}
              >
                Protect from automatic cleanup
              </Button>
            )}
            {persisted && <p className="mt-1 text-xs text-success">Protected from automatic cleanup.</p>}
          </div>
        </div>
      )}
      <Row label="Export backup" description="Download everything — character, history, journal and photos — as a JSON file.">
        <Button variant="secondary" icon="download" onClick={() => void exportData()}>
          Export JSON
        </Button>
      </Row>
      {!demo && (
        <>
          <Row label="Import backup" description="Restore from an Evolve backup file. This replaces the progress on this device.">
            <Button variant="secondary" icon="upload" onClick={() => fileRef.current?.click()}>
              Import JSON
            </Button>
          </Row>
          <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => void onFile(e.target.files?.[0])} />
          <Row label="Reset progress" description="Permanently delete everything on this device and start over.">
            <Button variant="danger" icon="rotate-ccw" onClick={() => setResetOpen(true)}>
              Reset
            </Button>
          </Row>
        </>
      )}

      <ConfirmDialog
        open={!!pending}
        onClose={() => setPending(null)}
        onConfirm={confirmImport}
        title="Restore this backup?"
        message={
          pending ? (
            <>
              <span className="block font-medium text-fg">{pending.summaryText}</span>
              {pending.summary.exportedAt && <span className="mt-1 block">Exported {new Date(pending.summary.exportedAt).toLocaleString()}.</span>}
              {pending.summary.photos > 0 && <span className="block">{formatNumber(pending.summary.photos)} journal photos included.</span>}
              {pending.summary.skipped > 0 && <span className="block text-warning">{formatNumber(pending.summary.skipped)} damaged entries will be skipped.</span>}
              <span className="mt-2 block">Your current progress on this device will be replaced.</span>
            </>
          ) : (
            ''
          )
        }
        confirmLabel="Restore"
      />
      <ConfirmDialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        onConfirm={confirmReset}
        title="Reset all progress?"
        message="This permanently deletes your character, XP, quests, achievements, journal and photos from this device. Export a backup first if you might want them back."
        confirmLabel="Reset everything"
        tone="danger"
        typeToConfirm="RESET"
      />
    </Panel>
  );
}
