/**
 * Play a short bell/ding sound using Web Audio API (no external file).
 */
let audioContext = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
  return audioContext;
}

export function playBell() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(1100, now + 0.08);
    osc.frequency.exponentialRampToValueAtTime(660, now + 0.2);
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
    osc.start(now);
    osc.stop(now + 0.35);
  } catch (_) {}
}
