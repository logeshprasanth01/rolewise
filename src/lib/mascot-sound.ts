/**
 * Tiny synthesized sound effects for the Rolewise mascot (no audio files).
 * Sounds only play after the browser allows audio (first click / key press),
 * and can be muted; the choice is remembered per browser.
 */

export type MascotSound = 'hello' | 'boop' | 'open' | 'close' | 'reply' | 'send';

const STORAGE_KEY = 'rolewise-mascot-sound';
let ctx: AudioContext | null = null;
let lastHello = 0;

export function isMascotSoundOn(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function setMascotSoundOn(on: boolean) {
  try {
    window.localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off');
  } catch {
    // storage can be unavailable (private mode); sound just stays as-is for this visit
  }
}

type Note = { f0: number; f1: number; at: number; dur: number; vol?: number; type?: OscillatorType };

const SOUNDS: Record<MascotSound, Note[]> = {
  // two rising chirps: "hi-i!"
  hello: [
    { f0: 620, f1: 880, at: 0, dur: 0.09, vol: 0.05, type: 'triangle' },
    { f0: 760, f1: 1180, at: 0.11, dur: 0.12, vol: 0.05, type: 'triangle' },
  ],
  // soft squish when poked
  boop: [{ f0: 420, f1: 260, at: 0, dur: 0.12, vol: 0.06, type: 'sine' }],
  // pop up
  open: [
    { f0: 360, f1: 720, at: 0, dur: 0.1, vol: 0.05, type: 'sine' },
    { f0: 900, f1: 1100, at: 0.08, dur: 0.08, vol: 0.03, type: 'triangle' },
  ],
  // settle down
  close: [{ f0: 700, f1: 340, at: 0, dur: 0.12, vol: 0.04, type: 'sine' }],
  // gentle two-note ding
  reply: [
    { f0: 880, f1: 880, at: 0, dur: 0.1, vol: 0.035, type: 'sine' },
    { f0: 1320, f1: 1320, at: 0.09, dur: 0.16, vol: 0.03, type: 'sine' },
  ],
  // quick whoosh-up
  send: [{ f0: 500, f1: 1000, at: 0, dur: 0.08, vol: 0.03, type: 'sine' }],
};

export function playMascotSound(name: MascotSound) {
  if (typeof window === 'undefined' || !isMascotSoundOn()) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches && name === 'hello') return;
  if (name === 'hello') {
    const now = Date.now();
    if (now - lastHello < 4000) return; // don't chirp on every hover
    lastHello = now;
  }
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') {
      // Browsers only allow audio after a user gesture; skip silently until then.
      void ctx.resume();
      if (ctx.state === 'suspended') return;
    }
    const t0 = ctx.currentTime;
    for (const n of SOUNDS[name]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = n.type ?? 'sine';
      osc.frequency.setValueAtTime(n.f0, t0 + n.at);
      osc.frequency.exponentialRampToValueAtTime(n.f1, t0 + n.at + n.dur);
      gain.gain.setValueAtTime(0.0001, t0 + n.at);
      gain.gain.exponentialRampToValueAtTime(n.vol ?? 0.04, t0 + n.at + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + n.at + n.dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0 + n.at);
      osc.stop(t0 + n.at + n.dur + 0.02);
    }
  } catch {
    // Sound is a nicety; never break the UI over it.
  }
}
