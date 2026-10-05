import type { CollectionKey, DateKey, GameEvent, GameMeta, GameState, Profile } from '@/types';
import { toDateKey } from '@/lib/date';

export interface EngineResult {
  state: GameState;
  events: GameEvent[];
  /** A short message for the UI when an action was refused (never a raw error). */
  error?: string;
}

/**
 * A single engine action works on a draft of the state. Collections are copied on first write, and
 * changed records are always *replaced* (never mutated), so persistence can diff by reference.
 */
export class EngineContext {
  readonly now: number;
  readonly today: DateKey;
  readonly events: GameEvent[] = [];
  /** Per-action memo for expensive derived values (invalidated by whoever changes the inputs). */
  readonly cache: Record<string, unknown> = {};
  state: GameState;
  private copied = new Set<CollectionKey>();

  constructor(state: GameState, now: number) {
    this.state = { ...state };
    this.now = now;
    this.today = toDateKey(now);
  }

  get profile(): Profile {
    const p = this.state.profile;
    if (!p) throw new Error('No profile');
    return p;
  }

  get meta(): GameMeta {
    return this.state.meta;
  }

  setProfile(patch: Partial<Profile>): void {
    this.state.profile = { ...this.profile, ...patch };
  }

  setMeta(patch: Partial<GameMeta>): void {
    this.state.meta = { ...this.state.meta, ...patch };
  }

  /** Mutable (copied-once) array for a collection. */
  list<K extends CollectionKey>(key: K): GameState[K] {
    if (!this.copied.has(key)) {
      this.state[key] = [...this.state[key]] as GameState[K];
      this.copied.add(key);
    }
    return this.state[key];
  }

  push<K extends CollectionKey>(key: K, item: GameState[K][number]): void {
    (this.list(key) as GameState[K][number][]).push(item);
  }

  /** Replace an item (matched by `id`) with a patched copy. Returns the new item, or undefined. */
  update<K extends CollectionKey>(key: K, id: string, patch: Partial<GameState[K][number]>): GameState[K][number] | undefined {
    const arr = this.list(key) as { id: string }[];
    const i = arr.findIndex((item) => item.id === id);
    if (i < 0) return undefined;
    const next = { ...arr[i], ...patch };
    arr[i] = next;
    return next as GameState[K][number];
  }

  remove<K extends CollectionKey>(key: K, predicate: (item: GameState[K][number]) => boolean): number {
    const arr = this.list(key) as GameState[K][number][];
    let removed = 0;
    for (let i = arr.length - 1; i >= 0; i--) {
      if (predicate(arr[i])) {
        arr.splice(i, 1);
        removed++;
      }
    }
    return removed;
  }

  find<K extends CollectionKey>(key: K, id: string): GameState[K][number] | undefined {
    return (this.state[key] as { id: string }[]).find((item) => item.id === id) as GameState[K][number] | undefined;
  }

  emit(event: GameEvent): void {
    this.events.push(event);
  }

  result(error?: string): EngineResult {
    return error ? { state: this.state, events: this.events, error } : { state: this.state, events: this.events };
  }
}
