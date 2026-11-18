// Every sound in the game, synthesised with WebAudio: no audio files, no
// network. The context is created on the first player gesture; before that,
// and in screenshot mode, every call is a silent no-op.
let ctx = null;
let muted = false;

function ensure() {
  if (ctx || typeof window === 'undefined' || !window.AudioContext) return null;
  try {
    ctx = new window.AudioContext();
  } catch {
    ctx = null;
  }
  return ctx;
}

export function initAudio() {
  const c = ensure();
  if (c && c.state === 'suspended') c.resume().catch(() => {});
}

export function toggleMute() {
  muted = !muted;
  return muted;
}

export function isMuted() {
  return muted;
}

function tone(freq, seconds, type, gain, slideTo) {
  if (muted) return;
  const c = ctx ?? ensure();
  if (!c) return;
  const now = c.currentTime;
  const osc = c.createOscillator();
  const amp = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), now + seconds);
  amp.gain.setValueAtTime(gain, now);
  amp.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
  osc.connect(amp).connect(c.destination);
  osc.start(now);
  osc.stop(now + seconds + 0.02);
}

function noise(seconds, gain, cutoff) {
  if (muted) return;
  const c = ctx ?? ensure();
  if (!c) return;
  const now = c.currentTime;
  const len = Math.floor(c.sampleRate * seconds);
  const buffer = c.createBuffer(1, len, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = cutoff;
  const amp = c.createGain();
  amp.gain.setValueAtTime(gain, now);
  amp.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
  src.connect(filter).connect(amp).connect(c.destination);
  src.start(now);
}

export const sfx = {
  paddle() {
    tone(240, 0.07, 'triangle', 0.22, 330);
  },
  wall() {
    tone(190, 0.05, 'triangle', 0.12, 240);
  },
  brick(hp) {
    tone(420 + hp * 120, 0.08, 'square', 0.14, 700 + hp * 120);
    noise(0.05, 0.08, 4000);
  },
  crack() {
    tone(300, 0.06, 'square', 0.1, 180);
  },
  explode() {
    noise(0.35, 0.3, 900);
    tone(120, 0.3, 'sawtooth', 0.18, 40);
  },
  power() {
    tone(520, 0.09, 'sine', 0.2, 780);
    setTimeout(() => tone(780, 0.12, 'sine', 0.2, 1170), 70);
  },
  launch() {
    tone(330, 0.1, 'triangle', 0.2, 520);
  },
  lose() {
    tone(320, 0.35, 'sawtooth', 0.16, 70);
  },
  laser() {
    tone(880, 0.06, 'square', 0.09, 440);
  },
  level() {
    [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.14, 'triangle', 0.2), i * 90));
  },
  win() {
    [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => setTimeout(() => tone(f, 0.18, 'triangle', 0.22), i * 110));
  },
  over() {
    [392, 330, 262, 196].forEach((f, i) => setTimeout(() => tone(f, 0.22, 'triangle', 0.18), i * 140));
  },
};
