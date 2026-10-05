/** Collision-resistant ids that work in every browser (and in tests). */
export function uid(prefix = ''): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') return prefix + c.randomUUID().replace(/-/g, '').slice(0, 20);
  if (c && typeof c.getRandomValues === 'function') {
    const bytes = c.getRandomValues(new Uint8Array(10));
    return prefix + Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
}

/** Anonymous display name, e.g. `Player_4821`. */
export function makePlayerTag(): string {
  const n = 1000 + Math.floor(Math.random() * 9000);
  return `Player_${n}`;
}
