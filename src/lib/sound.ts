/**
 * Synthesized sound effects (WebAudio). No audio files: tiny, offline and tuned to feel soft —
 * glassy chimes rather than arcade beeps. Audio only starts after a user gesture.
 */

export type SoundName = 'click' | 'xp' | 'quest' | 'coin' | 'achievement' | 'levelup' | 'unlock' | 'error' | 'complete' | 'tick';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let wet: GainNode | null = null;
let enabled = false;
let volume = 0.6;

export function configureSound(opts: { enabled: boolean; volume: number }): void {
  enabled = opts.enabled;
  volume = Math.min(1, Math.max(0, opts.volume));
  if (master && ctx) master.gain.setTargetAtTime(volume * 0.5, ctx.currentTime, 0.02);
}

function audio(): AudioContext | null {
  if (!enabled || typeof window === 'undefined') return null;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) {
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = volume * 0.5;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 3;
    master.connect(comp).connect(ctx.destination);
    // A short feedback delay gives chimes a little air.
    const delay = ctx.createDelay(1);
    delay.delayTime.value = 0.13;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.28;
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 3200;
    wet = ctx.createGain();
    wet.gain.value = 0.32;
    wet.connect(delay);
    delay.connect(tone).connect(feedback).connect(delay);
    tone.connect(master);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/** Unlock audio on the first interaction (required by iOS Safari). */
export function primeAudio(): void {
  const c = audio();
  if (!c) return;
  const b = c.createBuffer(1, 1, 22050);
  const s = c.createBufferSource();
  s.buffer = b;
  s.connect(c.destination);
  s.start(0);
}

interface ToneOpts {
  freq: number;
  at?: number;
  dur?: number;
  type?: OscillatorType;
  gain?: number;
  attack?: number;
  glideTo?: number;
  reverb?: boolean;
}

function tone(c: AudioContext, o: ToneOpts) {
  if (!master) return;
  const start = c.currentTime + (o.at ?? 0);
  const dur = o.dur ?? 0.15;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(o.freq, start);
  if (o.glideTo) osc.frequency.exponentialRampToValueAtTime(o.glideTo, start + dur);
  const peak = o.gain ?? 0.2;
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(peak, start + (o.attack ?? 0.008));
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(g);
  g.connect(master);
  if (o.reverb !== false && wet) g.connect(wet);
  osc.start(start);
  osc.stop(start + dur + 0.05);
}

const NOTE = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

export function playSound(name: SoundName): void {
  const c = audio();
  if (!c) return;
  switch (name) {
    case 'click':
      tone(c, { freq: 1500, dur: 0.035, gain: 0.05, type: 'sine', reverb: false });
      break;
    case 'tick':
      tone(c, { freq: 2200, dur: 0.02, gain: 0.03, reverb: false });
      break;
    case 'xp':
      tone(c, { freq: NOTE(88), dur: 0.09, gain: 0.08, type: 'triangle' });
      tone(c, { freq: NOTE(93), at: 0.06, dur: 0.14, gain: 0.08, type: 'triangle' });
      break;
    case 'coin':
      tone(c, { freq: NOTE(83), dur: 0.07, gain: 0.07, type: 'square' });
      tone(c, { freq: NOTE(88), at: 0.06, dur: 0.22, gain: 0.07, type: 'square' });
      break;
    case 'complete':
    case 'quest':
      [72, 76, 79, 84].forEach((n, i) => tone(c, { freq: NOTE(n), at: i * 0.055, dur: 0.42 - i * 0.04, gain: 0.11, type: 'triangle' }));
      tone(c, { freq: NOTE(96), at: 0.2, dur: 0.5, gain: 0.03, type: 'sine' });
      break;
    case 'achievement':
      [79, 83, 86, 91].forEach((n, i) => tone(c, { freq: NOTE(n), at: i * 0.09, dur: 0.7, gain: 0.1, type: 'sine' }));
      [67, 74].forEach((n) => tone(c, { freq: NOTE(n), at: 0.27, dur: 0.9, gain: 0.06, type: 'triangle' }));
      break;
    case 'unlock':
      tone(c, { freq: 900, dur: 0.03, gain: 0.08, type: 'square', reverb: false });
      tone(c, { freq: 1200, at: 0.05, dur: 0.03, gain: 0.07, type: 'square', reverb: false });
      [88, 91, 95].forEach((n, i) => tone(c, { freq: NOTE(n), at: 0.12 + i * 0.06, dur: 0.45, gain: 0.06 }));
      break;
    case 'levelup':
      tone(c, { freq: 180, glideTo: 720, dur: 0.6, gain: 0.05, type: 'sawtooth' });
      [60, 64, 67, 72, 76, 79, 84].forEach((n, i) => tone(c, { freq: NOTE(n), at: 0.35 + i * 0.07, dur: 1.2 - i * 0.06, gain: 0.1, type: i % 2 ? 'sine' : 'triangle' }));
      tone(c, { freq: NOTE(48), at: 0.35, dur: 1.4, gain: 0.08, type: 'triangle' });
      break;
    case 'error':
      tone(c, { freq: NOTE(64), dur: 0.12, gain: 0.08, type: 'triangle', reverb: false });
      tone(c, { freq: NOTE(60), at: 0.1, dur: 0.18, gain: 0.08, type: 'triangle', reverb: false });
      break;
  }
}
