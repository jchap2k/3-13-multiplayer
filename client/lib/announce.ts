const announced = new Map<string, number>();

export function shouldAnnounceRound(roomCode: string, round: number): boolean {
  const key = `${roomCode}:${round}`;
  const prev = announced.get(key);
  const now = Date.now();
  if (prev && now - prev > 1500) return false;
  announced.set(key, now);
  return true;
}

export function announceFeel() {
  try {
    navigator.vibrate?.(35);
  } catch {
    // ignore
  }
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(466, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(698, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.06, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.32);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.34);
    osc.onended = () => {
      void ctx.close();
    };
  } catch {
    // autoplay or missing Web Audio — visual announcement still stands
  }
}
