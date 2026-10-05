/**
 * Storage adapters. IndexedDB is the primary store (structured, asynchronous, large quota).
 * If it is unavailable we fall back to localStorage, and finally to memory (with a visible warning).
 */
import { openDB, type IDBPDatabase } from 'idb';
import type { CollectionKey, GameState, MediaRecord } from '@/types';
import type { RawState } from './normalize';

export const COLLECTIONS: CollectionKey[] = ['quests', 'activities', 'transactions', 'achievements', 'goals', 'journal', 'party', 'challenges', 'weeklies'];
export const KV_KEYS = ['profile', 'settings', 'meta', 'session'] as const;
export type KVKey = (typeof KV_KEYS)[number];

export interface WriteOps {
  kv: { key: KVKey; value: unknown }[];
  puts: Partial<Record<CollectionKey, unknown[]>>;
  deletes: Partial<Record<CollectionKey, string[]>>;
}

export interface StorageAdapter {
  readonly kind: 'indexeddb' | 'localstorage' | 'memory';
  loadAll(): Promise<RawState>;
  apply(ops: WriteOps): Promise<void>;
  replaceAll(state: GameState): Promise<void>;
  clear(): Promise<void>;
  putMedia(record: MediaRecord): Promise<void>;
  getMedia(id: string): Promise<MediaRecord | undefined>;
  deleteMedia(ids: string[]): Promise<void>;
  allMedia(): Promise<MediaRecord[]>;
  close(): void;
}

export function isEmptyOps(ops: WriteOps): boolean {
  return !ops.kv.length && !Object.values(ops.puts).some((v) => v?.length) && !Object.values(ops.deletes).some((v) => v?.length);
}

/* ───────────────────────── IndexedDB ───────────────────────── */

const DB_VERSION = 1;
const ALL_STORES = ['kv', ...COLLECTIONS, 'media'] as const;
type StoreName = (typeof ALL_STORES)[number];

class IndexedDBAdapter implements StorageAdapter {
  readonly kind = 'indexeddb' as const;
  private db: IDBPDatabase;
  constructor(db: IDBPDatabase) {
    this.db = db;
  }

  async loadAll(): Promise<RawState> {
    const stores: StoreName[] = ['kv', ...COLLECTIONS];
    const tx = this.db.transaction(stores, 'readonly');
    const [kvRows, ...lists] = await Promise.all(stores.map((s) => tx.objectStore(s).getAll()));
    await tx.done;
    const raw: RawState = {};
    for (const row of kvRows as { key: KVKey; value: unknown }[]) raw[row.key] = row.value;
    COLLECTIONS.forEach((key, i) => {
      raw[key] = lists[i];
    });
    return raw;
  }

  async apply(ops: WriteOps): Promise<void> {
    const stores = new Set<StoreName>();
    if (ops.kv.length) stores.add('kv');
    for (const key of COLLECTIONS) if (ops.puts[key]?.length || ops.deletes[key]?.length) stores.add(key);
    if (!stores.size) return;
    const tx = this.db.transaction([...stores], 'readwrite');
    const work: Promise<unknown>[] = [];
    for (const { key, value } of ops.kv) work.push(value === null || value === undefined ? tx.objectStore('kv').delete(key) : tx.objectStore('kv').put({ key, value }));
    for (const key of COLLECTIONS) {
      if (!stores.has(key)) continue;
      const store = tx.objectStore(key);
      for (const item of ops.puts[key] ?? []) work.push(store.put(item));
      for (const id of ops.deletes[key] ?? []) work.push(store.delete(id));
    }
    await Promise.all([...work, tx.done]);
  }

  async replaceAll(state: GameState): Promise<void> {
    const stores: StoreName[] = ['kv', ...COLLECTIONS];
    const tx = this.db.transaction(stores, 'readwrite');
    const work: Promise<unknown>[] = stores.map((s) => tx.objectStore(s).clear());
    for (const key of KV_KEYS) if (state[key] !== null) work.push(tx.objectStore('kv').put({ key, value: state[key] }));
    for (const key of COLLECTIONS) for (const item of state[key]) work.push(tx.objectStore(key).put(item));
    await Promise.all([...work, tx.done]);
  }

  async clear(): Promise<void> {
    const tx = this.db.transaction([...ALL_STORES], 'readwrite');
    await Promise.all([...ALL_STORES.map((s) => tx.objectStore(s).clear()), tx.done]);
  }

  async putMedia(record: MediaRecord): Promise<void> {
    await this.db.put('media', record);
  }
  async getMedia(id: string): Promise<MediaRecord | undefined> {
    return this.db.get('media', id);
  }
  async deleteMedia(ids: string[]): Promise<void> {
    if (!ids.length) return;
    const tx = this.db.transaction('media', 'readwrite');
    await Promise.all([...ids.map((id) => tx.store.delete(id)), tx.done]);
  }
  async allMedia(): Promise<MediaRecord[]> {
    return this.db.getAll('media');
  }
  close(): void {
    this.db.close();
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('Timed out opening storage')), ms);
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

export async function openIndexedDB(name: string): Promise<StorageAdapter> {
  if (typeof indexedDB === 'undefined') throw new Error('IndexedDB unavailable');
  const db = await withTimeout(
    openDB(name, DB_VERSION, {
      upgrade(database) {
        for (const store of ALL_STORES) {
          if (!database.objectStoreNames.contains(store)) database.createObjectStore(store, { keyPath: store === 'kv' ? 'key' : 'id' });
        }
      },
      blocking() {
        // A newer version of the app wants to upgrade the database in another tab.
        db.close();
      },
    }),
    6000,
  );
  return new IndexedDBAdapter(db);
}

/* ───────────────────────── localStorage fallback ───────────────────────── */

type Snapshot = Record<string, unknown>;

class LocalStorageAdapter implements StorageAdapter {
  readonly kind = 'localstorage' as const;
  private key: string;
  constructor(key: string) {
    this.key = key;
  }

  private read(): Snapshot {
    try {
      return JSON.parse(localStorage.getItem(this.key) || '{}') as Snapshot;
    } catch {
      return {};
    }
  }
  private write(data: Snapshot) {
    localStorage.setItem(this.key, JSON.stringify(data));
  }

  async loadAll(): Promise<RawState> {
    return this.read() as RawState;
  }

  async apply(ops: WriteOps): Promise<void> {
    const data = this.read();
    for (const { key, value } of ops.kv) data[key] = value;
    for (const key of COLLECTIONS) {
      const map = new Map(((data[key] as { id: string }[]) ?? []).map((item) => [item.id, item]));
      for (const item of (ops.puts[key] ?? []) as { id: string }[]) map.set(item.id, item);
      for (const id of ops.deletes[key] ?? []) map.delete(id);
      data[key] = [...map.values()];
    }
    this.write(data);
  }

  async replaceAll(state: GameState): Promise<void> {
    const data: Snapshot = {};
    for (const key of KV_KEYS) data[key] = state[key];
    for (const key of COLLECTIONS) data[key] = state[key];
    this.write(data);
  }

  async clear(): Promise<void> {
    localStorage.removeItem(this.key);
    for (const k of Object.keys(localStorage)) if (k.startsWith(`${this.key}:media:`)) localStorage.removeItem(k);
  }

  async putMedia(record: MediaRecord): Promise<void> {
    const dataUrl = await blobToDataURL(record.blob);
    localStorage.setItem(`${this.key}:media:${record.id}`, JSON.stringify({ ...record, blob: undefined, dataUrl }));
  }
  async getMedia(id: string): Promise<MediaRecord | undefined> {
    const raw = localStorage.getItem(`${this.key}:media:${id}`);
    if (!raw) return undefined;
    const rec = JSON.parse(raw) as Omit<MediaRecord, 'blob'> & { dataUrl: string };
    return { ...rec, blob: dataURLToBlob(rec.dataUrl) };
  }
  async deleteMedia(ids: string[]): Promise<void> {
    for (const id of ids) localStorage.removeItem(`${this.key}:media:${id}`);
  }
  async allMedia(): Promise<MediaRecord[]> {
    const out: MediaRecord[] = [];
    for (const k of Object.keys(localStorage)) {
      if (!k.startsWith(`${this.key}:media:`)) continue;
      const rec = await this.getMedia(k.slice(`${this.key}:media:`.length));
      if (rec) out.push(rec);
    }
    return out;
  }
  close(): void {}
}

/* ───────────────────────── Memory (last resort) ───────────────────────── */

class MemoryAdapter implements StorageAdapter {
  readonly kind = 'memory' as const;
  private data: Snapshot = {};
  private media = new Map<string, MediaRecord>();
  async loadAll(): Promise<RawState> {
    return structuredClone(this.data) as RawState;
  }
  async apply(ops: WriteOps): Promise<void> {
    for (const { key, value } of ops.kv) this.data[key] = value;
    for (const key of COLLECTIONS) {
      const map = new Map(((this.data[key] as { id: string }[]) ?? []).map((item) => [item.id, item]));
      for (const item of (ops.puts[key] ?? []) as { id: string }[]) map.set(item.id, item);
      for (const id of ops.deletes[key] ?? []) map.delete(id);
      this.data[key] = [...map.values()];
    }
  }
  async replaceAll(state: GameState): Promise<void> {
    this.data = {};
    for (const key of KV_KEYS) this.data[key] = state[key];
    for (const key of COLLECTIONS) this.data[key] = [...state[key]];
  }
  async clear(): Promise<void> {
    this.data = {};
    this.media.clear();
  }
  async putMedia(record: MediaRecord): Promise<void> {
    this.media.set(record.id, record);
  }
  async getMedia(id: string): Promise<MediaRecord | undefined> {
    return this.media.get(id);
  }
  async deleteMedia(ids: string[]): Promise<void> {
    for (const id of ids) this.media.delete(id);
  }
  async allMedia(): Promise<MediaRecord[]> {
    return [...this.media.values()];
  }
  close(): void {}
}

function localStorageWorks(): boolean {
  try {
    const k = '__evolve_probe__';
    localStorage.setItem(k, '1');
    localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

/** Open the best available storage for a database name. */
export async function openStorage(name: string): Promise<StorageAdapter> {
  try {
    return await openIndexedDB(name);
  } catch {
    if (typeof localStorage !== 'undefined' && localStorageWorks()) return new LocalStorageAdapter(`evolve-fallback:${name}`);
    return new MemoryAdapter();
  }
}

export function createMemoryStorage(): StorageAdapter {
  return new MemoryAdapter();
}

/* ───────────────────────── Blob helpers ───────────────────────── */

export async function blobToDataURL(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return `data:${blob.type || 'application/octet-stream'};base64,${btoa(binary)}`;
}

export function dataURLToBlob(dataUrl: string): Blob {
  const match = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(dataUrl);
  if (!match) throw new Error('Invalid data URL');
  const type = match[1] || 'application/octet-stream';
  const data = match[3];
  if (!match[2]) return new Blob([decodeURIComponent(data)], { type });
  const bin = atob(data);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type });
}
