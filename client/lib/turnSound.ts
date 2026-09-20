/** Play only when the local seat becomes the actor — not on later ticks of the same turn. */
export function shouldPlayTurnSound(wasMine: boolean | null, isMine: boolean): boolean {
  return isMine && wasMine !== true;
}

type WindowAudio = typeof AudioContext;

function AudioCtor(): WindowAudio | undefined {
  if (typeof window === "undefined") return undefined;
  return window.AudioContext ?? (window as Window & { webkitAudioContext?: WindowAudio }).webkitAudioContext;
}

let ctx: AudioContext | null = null;

export function unlockTurnAudio() {
  try {
    const Ctor = AudioCtor();
    if (!Ctor) return;
    if (!ctx) ctx = new Ctor();
    if (ctx.state === "suspended") void ctx.resume();
  } catch {
    // Autoplay blocked or Web Audio missing — stay silent.
  }
}

function tone(frequency: number, start: number, duration: number, peak = 0.045) {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.018);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

/** Short two-note chime. Modest volume, no loop. Failures are silent. */
export function playTurnChime() {
  try {
    unlockTurnAudio();
    if (!ctx) return;
    const t = ctx.currentTime;
    tone(523.25, t, 0.11, 0.04);
    tone(659.25, t + 0.1, 0.16, 0.038);
  } catch {
    // mute is OK
  }
}
