import type { GameState } from '@/types';
import { COLLECTIONS, KV_KEYS, isEmptyOps, type StorageAdapter, type WriteOps } from './storage';

/**
 * Compute the minimal set of writes between two states. The engine replaces (never mutates) records
 * it changes, so reference equality tells us exactly what is new, changed or gone.
 */
export function diffState(prev: GameState, next: GameState): WriteOps {
  const ops: WriteOps = { kv: [], puts: {}, deletes: {} };
  for (const key of KV_KEYS) if (prev[key] !== next[key]) ops.kv.push({ key, value: next[key] });
  for (const key of COLLECTIONS) {
    const a = prev[key] as { id: string }[];
    const b = next[key] as { id: string }[];
    if (a === b) continue;
    const before = new Map(a.map((item) => [item.id, item]));
    const puts: unknown[] = [];
    for (const item of b) {
      if (before.get(item.id) !== item) puts.push(item);
      before.delete(item.id);
    }
    if (puts.length) ops.puts[key] = puts;
    if (before.size) ops.deletes[key] = [...before.keys()];
  }
  return ops;
}

export interface PersisterHooks {
  onError(error: unknown): void;
  onRecovered(): void;
  onSaved(): void;
}

/**
 * Serialises writes to storage. If a write fails, it switches to "full sync" mode and keeps retrying
 * a complete rewrite of the current state with backoff, so nothing is lost while storage is flaky.
 */
export class Persister {
  private chain: Promise<void> = Promise.resolve();
  private failing = false;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private attempt = 0;
  private adapter: StorageAdapter;
  private getState: () => GameState;
  private hooks: PersisterHooks;

  constructor(adapter: StorageAdapter, getState: () => GameState, hooks: PersisterHooks) {
    this.adapter = adapter;
    this.getState = getState;
    this.hooks = hooks;
  }

  get storageKind() {
    return this.adapter.kind;
  }

  save(prev: GameState, next: GameState): void {
    if (this.failing) {
      this.scheduleFullSync();
      return;
    }
    const ops = diffState(prev, next);
    if (isEmptyOps(ops)) return;
    this.chain = this.chain
      .then(() => this.adapter.apply(ops))
      .then(() => this.hooks.onSaved())
      .catch((error) => {
        this.failing = true;
        this.hooks.onError(error);
        this.scheduleFullSync();
      });
  }

  /** Persist the full state now (used after imports and when recovering from errors). */
  saveAll(state: GameState): Promise<void> {
    this.chain = this.chain.then(() => this.adapter.replaceAll(state)).then(() => this.hooks.onSaved());
    return this.chain;
  }

  private scheduleFullSync() {
    if (this.retryTimer) return;
    const delay = Math.min(30_000, 1500 * 2 ** this.attempt);
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      this.attempt++;
      this.chain = this.chain
        .then(() => this.adapter.replaceAll(this.getState()))
        .then(() => {
          this.failing = false;
          this.attempt = 0;
          this.hooks.onRecovered();
          this.hooks.onSaved();
        })
        .catch((error) => {
          this.hooks.onError(error);
          this.scheduleFullSync();
        });
    }, delay);
  }

  flush(): Promise<void> {
    return this.chain;
  }

  dispose(): void {
    if (this.retryTimer) clearTimeout(this.retryTimer);
  }
}
