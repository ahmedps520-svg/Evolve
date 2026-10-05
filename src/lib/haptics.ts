let hapticsEnabled = true;

export function configureHaptics(enabled: boolean): void {
  hapticsEnabled = enabled;
}

const PATTERNS = {
  tap: 8,
  success: [12, 40, 18],
  levelup: [20, 60, 30, 60, 45],
  warning: [30, 50, 30],
} satisfies Record<string, number | number[]>;

/** Vibrate on devices that support it (Android). A no-op elsewhere. */
export function haptic(kind: keyof typeof PATTERNS): void {
  if (!hapticsEnabled || typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  try {
    navigator.vibrate(PATTERNS[kind]);
  } catch {
    /* ignore */
  }
}
