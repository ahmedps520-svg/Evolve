import { create } from 'zustand';
import type { GameState, MediaRecord } from '@/types';
import { emptyState } from '@/data/defaults';
import { celebrate } from '@/lib/celebrate';
import { toDateKey } from '@/lib/date';
import { buildDemoState } from '@/lib/db/demo';
import { normalizeState } from '@/lib/db/normalize';
import { Persister } from '@/lib/db/persistence';
import { openStorage, type StorageAdapter } from '@/lib/db/storage';
import { syncDay, type EngineResult } from '@/lib/engine/gameEngine';
import { uid } from '@/lib/id';
import { resizeImage } from '@/lib/media';
import { playSound } from '@/lib/sound';
import { useUI } from './uiStore';

export type Mode = 'main' | 'demo';
const DB_NAMES: Record<Mode, string> = { main: 'evolve', demo: 'evolve-demo' };
const MODE_KEY = 'evolve:mode';
const TAB_ID = uid('tab_');
const UNDO_MS = 7000;

interface Undo {
  label: string;
  prev: GameState;
  expires: number;
}

interface GameStore {
  status: 'idle' | 'loading' | 'ready' | 'error';
  loadError: string | null;
  mode: Mode;
  storageKind: StorageAdapter['kind'] | null;
  saveState: 'ok' | 'retrying';
  state: GameState;
  undo: Undo | null;

  init(): Promise<void>;
  dispatch(fn: (s: GameState, now: number) => EngineResult, opts?: { undoLabel?: string; silent?: boolean; quietErrors?: boolean }): EngineResult;
  undoLast(): boolean;
  enterDemo(): Promise<void>;
  exitDemo(): Promise<void>;
  importState(state: GameState, media: MediaRecord[]): Promise<void>;
  resetAll(): Promise<void>;
  reload(): Promise<void>;
}

let adapter: StorageAdapter | null = null;
let persister: Persister | null = null;
let channel: BroadcastChannel | null = null;
let reloadTimer: ReturnType<typeof setTimeout> | null = null;

function readMode(): Mode {
  try {
    return sessionStorage.getItem(MODE_KEY) === 'demo' ? 'demo' : 'main';
  } catch {
    return 'main';
  }
}

function writeMode(mode: Mode) {
  try {
    if (mode === 'demo') sessionStorage.setItem(MODE_KEY, 'demo');
    else sessionStorage.removeItem(MODE_KEY);
  } catch {
    /* private mode: the session simply won't remember demo mode */
  }
}

export const useGameStore = create<GameStore>()((set, get) => {
  const hooks = {
    onError: () => {
      if (get().saveState !== 'retrying') {
        set({ saveState: 'retrying' });
        useUI.getState().toast({ kind: 'error', title: 'Couldn’t save just now', message: 'Your progress is safe in this session — retrying automatically.', duration: 6000 });
      }
    },
    onRecovered: () => set({ saveState: 'ok' }),
    onSaved: () => channel?.postMessage({ type: 'saved', tab: TAB_ID, mode: get().mode }),
  };

  async function open(mode: Mode): Promise<GameState> {
    persister?.dispose();
    adapter?.close();
    adapter = await openStorage(DB_NAMES[mode]);
    persister = new Persister(adapter, () => get().state, hooks);
    const { state } = normalizeState(await adapter.loadAll());
    set({ mode, storageKind: adapter.kind });
    return state;
  }

  function commit(next: GameState) {
    const prev = get().state;
    if (prev === next) return;
    set({ state: next });
    persister?.save(prev, next);
  }

  function listen() {
    if (channel || typeof BroadcastChannel === 'undefined') return;
    channel = new BroadcastChannel('evolve-sync');
    channel.onmessage = (e: MessageEvent<{ type: string; tab: string; mode: Mode }>) => {
      if (e.data?.type !== 'saved' || e.data.tab === TAB_ID || e.data.mode !== get().mode) return;
      if (reloadTimer) clearTimeout(reloadTimer);
      reloadTimer = setTimeout(() => void get().reload(), 250);
    };
  }

  return {
    status: 'idle',
    loadError: null,
    mode: 'main',
    storageKind: null,
    saveState: 'ok',
    state: emptyState(),
    undo: null,

    async init() {
      if (get().status === 'loading' || get().status === 'ready') return;
      set({ status: 'loading', loadError: null });
      try {
        const mode = readMode();
        let state = await open(mode);
        const now = Date.now();
        if (mode === 'demo' && (!state.profile || state.meta.lastSeenDate !== toDateKey(now))) {
          state = buildDemoState(now);
          await adapter!.replaceAll(state);
        }
        set({ state, status: 'ready' });
        listen();
        if (state.profile) get().dispatch(syncDay);
      } catch (error) {
        console.error(error);
        set({ status: 'error', loadError: 'Evolve couldn’t open its storage on this device.' });
      }
    },

    dispatch(fn, opts = {}) {
      const prev = get().state;
      let result: EngineResult;
      try {
        result = fn(prev, Date.now());
      } catch (error) {
        console.error(error);
        useUI.getState().toast({ kind: 'error', title: 'Something went wrong', message: 'Your progress is safe. Try again.' });
        return { state: prev, events: [], error: 'Something went wrong.' };
      }
      if (result.error && !opts.quietErrors) {
        useUI.getState().toast({ kind: 'error', title: result.error });
        playSound('error');
      }
      if (result.state !== prev) {
        commit(result.state);
        set({ undo: opts.undoLabel ? { label: opts.undoLabel, prev, expires: Date.now() + UNDO_MS } : null });
      }
      if (!opts.silent && result.events.length) {
        const undo = opts.undoLabel ? { label: 'Undo', run: () => get().undoLast() } : undefined;
        celebrate(result.events, result.state, { undo });
      }
      return result;
    },

    undoLast() {
      const u = get().undo;
      if (!u || Date.now() > u.expires) {
        useUI.getState().toast({ kind: 'info', title: 'Too late to undo', message: 'You can delete entries from your history instead.' });
        return false;
      }
      commit(u.prev);
      set({ undo: null });
      useUI.getState().toast({ kind: 'info', title: 'Undone', message: `${u.label} was reverted.` });
      return true;
    },

    async enterDemo() {
      useUI.getState().setBusy('Loading the demo hero…');
      try {
        await persister?.flush();
        writeMode('demo');
        await open('demo');
        const state = buildDemoState(Date.now());
        await adapter!.replaceAll(state);
        set({ state, status: 'ready', undo: null });
        listen();
      } finally {
        useUI.getState().setBusy(null);
      }
    },

    async exitDemo() {
      useUI.getState().setBusy('Leaving demo…');
      try {
        await persister?.flush();
        await adapter?.clear();
        writeMode('main');
        const state = await open('main');
        set({ state, status: 'ready', undo: null });
        if (state.profile) get().dispatch(syncDay);
      } finally {
        useUI.getState().setBusy(null);
      }
    },

    async importState(state, media) {
      if (!adapter || !persister) throw new Error('Storage is not ready');
      await persister.flush();
      await adapter.clear();
      for (const m of media) await adapter.putMedia(m);
      await adapter.replaceAll(state);
      clearPhotoCache();
      set({ state, undo: null });
      get().dispatch(syncDay, { silent: true });
    },

    async resetAll() {
      await persister?.flush();
      await adapter?.clear();
      clearPhotoCache();
      try {
        localStorage.removeItem('evolve:appearance');
      } catch {
        /* ignore */
      }
      set({ state: emptyState(), undo: null });
    },

    async reload() {
      if (!adapter) return;
      await persister?.flush();
      const { state } = normalizeState(await adapter.loadAll());
      set({ state });
    },
  };
});

/** Select from the game state (re-renders only when the selected value changes). */
export function useGame<T>(selector: (s: GameState) => T): T {
  return useGameStore((st) => selector(st.state));
}

export const dispatch: GameStore['dispatch'] = (fn, opts) => useGameStore.getState().dispatch(fn, opts);

/* ───────────────────────── Photos ───────────────────────── */

const urlCache = new Map<string, string>();

function clearPhotoCache() {
  for (const url of urlCache.values()) URL.revokeObjectURL(url);
  urlCache.clear();
}

export async function savePhoto(file: Blob): Promise<string> {
  if (!adapter) throw new Error('Storage is not ready');
  const { blob, width, height } = await resizeImage(file);
  const id = uid('m_');
  await adapter.putMedia({ id, blob, type: 'image/jpeg', width, height, createdAt: Date.now() });
  return id;
}

export async function photoURL(id: string): Promise<string | null> {
  const cached = urlCache.get(id);
  if (cached) return cached;
  const rec = await adapter?.getMedia(id);
  if (!rec) return null;
  const url = URL.createObjectURL(rec.blob);
  urlCache.set(id, url);
  return url;
}

export async function deletePhotos(ids: string[]): Promise<void> {
  for (const id of ids) {
    const url = urlCache.get(id);
    if (url) URL.revokeObjectURL(url);
    urlCache.delete(id);
  }
  await adapter?.deleteMedia(ids);
}

export function currentStorage(): StorageAdapter | null {
  return adapter;
}

export function flushStorage(): Promise<void> {
  return persister?.flush() ?? Promise.resolve();
}
