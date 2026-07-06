// ── Arcana Engine · synthesized audio ──────────────────────────────────────
// All sound is generated with WebAudio primitives — no asset files.

let ctx = null, master = null, muted = false;
const lastPlayed = new Map();

export function initAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.32;
  master.connect(ctx.destination);
}

export function toggleMute() {
  muted = !muted;
  if (master) master.gain.value = muted ? 0 : 0.32;
  return muted;
}

function tone({ f = 440, f2 = null, dur = 0.15, type = 'sine', vol = 0.5, delay = 0, curve = 'exp' }) {
  const t0 = ctx.currentTime + delay;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t0);
  if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t0 + dur);
  g.gain.setValueAtTime(vol, t0);
  if (curve === 'exp') g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  else g.gain.linearRampToValueAtTime(0, t0 + dur);
  o.connect(g).connect(master);
  o.start(t0); o.stop(t0 + dur + 0.02);
}

function noise({ dur = 0.2, freq = 1200, q = 1, vol = 0.4, delay = 0, sweep = null, type = 'bandpass' }) {
  const t0 = ctx.currentTime + delay;
  const len = Math.max(1, (dur * ctx.sampleRate) | 0);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource(); src.buffer = buf;
  const flt = ctx.createBiquadFilter(); flt.type = type; flt.frequency.setValueAtTime(freq, t0); flt.Q.value = q;
  if (sweep) flt.frequency.exponentialRampToValueAtTime(Math.max(40, sweep), t0 + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  src.connect(flt).connect(g).connect(master);
  src.start(t0); src.stop(t0 + dur + 0.02);
}

const ELEMENT_TONE = {
  fire: { f: 220, type: 'sawtooth' }, frost: { f: 880, type: 'sine' },
  lightning: { f: 620, type: 'square' }, arcane: { f: 520, type: 'triangle' },
  poison: { f: 300, type: 'triangle' }, physical: { f: 240, type: 'triangle' },
  shadow: { f: 180, type: 'sine' }, gold: { f: 660, type: 'triangle' },
};

const RECIPES = {
  draw: () => noise({ dur: 0.07, freq: 3200, vol: 0.16, sweep: 5200, q: 2 }),
  cast: (el) => { const e = ELEMENT_TONE[el] || ELEMENT_TONE.arcane; tone({ f: e.f, f2: e.f * 1.6, dur: 0.12, type: e.type, vol: 0.22 }); },
  resolve: (el) => { const e = ELEMENT_TONE[el] || ELEMENT_TONE.gold; tone({ f: e.f * 1.2, f2: e.f * 2, dur: 0.16, type: 'sine', vol: 0.2 }); },
  blast: (el) => {
    const e = ELEMENT_TONE[el] || ELEMENT_TONE.arcane;
    noise({ dur: 0.35, freq: 900, vol: 0.4, sweep: 90, type: 'lowpass' });
    tone({ f: e.f * 0.6, f2: e.f * 0.2, dur: 0.35, type: e.type, vol: 0.3 });
  },
  zone: (el) => { const e = ELEMENT_TONE[el] || ELEMENT_TONE.arcane; tone({ f: e.f * 0.5, f2: e.f, dur: 0.4, type: 'sine', vol: 0.18 }); noise({ dur: 0.4, freq: 600, vol: 0.12, sweep: 1600 }); },
  slash: () => { noise({ dur: 0.14, freq: 2400, vol: 0.3, sweep: 500, q: 1.5 }); tone({ f: 340, f2: 160, dur: 0.12, type: 'triangle', vol: 0.18 }); },
  zap: () => { tone({ f: 1400, f2: 200, dur: 0.16, type: 'square', vol: 0.16 }); noise({ dur: 0.12, freq: 3000, vol: 0.14 }); },
  hit: () => noise({ dur: 0.06, freq: 1400, vol: 0.14, sweep: 700 }),
  crit: () => { tone({ f: 900, f2: 1800, dur: 0.1, type: 'square', vol: 0.16 }); noise({ dur: 0.1, freq: 2400, vol: 0.2 }); },
  kill: () => { tone({ f: 300, f2: 60, dur: 0.25, type: 'sawtooth', vol: 0.2 }); noise({ dur: 0.2, freq: 800, vol: 0.2, sweep: 100, type: 'lowpass' }); },
  boom: () => { noise({ dur: 0.5, freq: 500, vol: 0.5, sweep: 60, type: 'lowpass' }); tone({ f: 90, f2: 30, dur: 0.5, type: 'sine', vol: 0.5 }); },
  hurt: () => { tone({ f: 200, f2: 90, dur: 0.2, type: 'sawtooth', vol: 0.3 }); noise({ dur: 0.15, freq: 700, vol: 0.2, type: 'lowpass' }); },
  death: () => { tone({ f: 300, f2: 40, dur: 1.2, type: 'sawtooth', vol: 0.4 }); noise({ dur: 1.0, freq: 400, vol: 0.3, sweep: 50, type: 'lowpass' }); },
  dash: () => noise({ dur: 0.12, freq: 1600, vol: 0.18, sweep: 400 }),
  perfect: () => { tone({ f: 880, dur: 0.1, type: 'sine', vol: 0.25 }); tone({ f: 1320, dur: 0.18, type: 'sine', vol: 0.22, delay: 0.06 }); },
  shard: () => tone({ f: 1200 + Math.random() * 400, f2: 2200, dur: 0.09, type: 'sine', vol: 0.14 }),
  heal: () => { tone({ f: 520, f2: 780, dur: 0.2, type: 'sine', vol: 0.2 }); },
  shrine: () => { tone({ f: 440, dur: 0.3, type: 'sine', vol: 0.2 }); tone({ f: 660, dur: 0.4, type: 'sine', vol: 0.18, delay: 0.1 }); },
  armor: () => { tone({ f: 320, f2: 480, dur: 0.15, type: 'triangle', vol: 0.22 }); noise({ dur: 0.1, freq: 2000, vol: 0.1 }); },
  engine: () => { tone({ f: 700, f2: 1050, dur: 0.1, type: 'triangle', vol: 0.16 }); tone({ f: 1050, f2: 1400, dur: 0.1, type: 'triangle', vol: 0.12, delay: 0.07 }); },
  enchant: () => { tone({ f: 520, dur: 0.25, type: 'sine', vol: 0.16 }); tone({ f: 780, dur: 0.3, type: 'sine', vol: 0.14, delay: 0.09 }); tone({ f: 1040, dur: 0.35, type: 'sine', vol: 0.1, delay: 0.18 }); },
  efire: () => tone({ f: 400, f2: 250, dur: 0.12, type: 'square', vol: 0.1 }),
  fuse: () => tone({ f: 800, f2: 1600, dur: 0.3, type: 'sine', vol: 0.14 }),
  tel: () => tone({ f: 240, f2: 320, dur: 0.25, type: 'sawtooth', vol: 0.14 }),
  lunge: () => noise({ dur: 0.18, freq: 900, vol: 0.24, sweep: 300, type: 'lowpass' }),
  slam: () => { noise({ dur: 0.4, freq: 400, vol: 0.45, sweep: 60, type: 'lowpass' }); tone({ f: 110, f2: 45, dur: 0.4, type: 'sine', vol: 0.4 }); },
  summon: () => { tone({ f: 300, f2: 600, dur: 0.35, type: 'triangle', vol: 0.2 }); },
  theft: () => { tone({ f: 900, f2: 300, dur: 0.4, type: 'sine', vol: 0.22 }); },
  wave: () => { tone({ f: 260, dur: 0.4, type: 'sine', vol: 0.2 }); tone({ f: 390, dur: 0.5, type: 'sine', vol: 0.16, delay: 0.15 }); },
  bossintro: () => { tone({ f: 110, dur: 1.2, type: 'sawtooth', vol: 0.3 }); tone({ f: 165, dur: 1.2, type: 'sawtooth', vol: 0.2, delay: 0.3 }); noise({ dur: 1.4, freq: 300, vol: 0.16, sweep: 80, type: 'lowpass' }); },
  bossphase: () => { tone({ f: 140, f2: 70, dur: 0.8, type: 'sawtooth', vol: 0.35 }); noise({ dur: 0.8, freq: 500, vol: 0.3, sweep: 60, type: 'lowpass' }); },
  bossdie: () => { tone({ f: 220, f2: 30, dur: 1.6, type: 'sawtooth', vol: 0.4 }); noise({ dur: 1.6, freq: 600, vol: 0.35, sweep: 40, type: 'lowpass' }); },
  reward: () => { [523, 659, 784, 1046].forEach((f, i) => tone({ f, dur: 0.3, type: 'sine', vol: 0.16, delay: i * 0.09 })); },
  victory: () => { [392, 523, 659, 784, 1046, 1318].forEach((f, i) => tone({ f, dur: 0.5, type: 'triangle', vol: 0.18, delay: i * 0.12 })); },
  blink: () => { tone({ f: 1200, f2: 300, dur: 0.14, type: 'sine', vol: 0.16 }); },
  charge: () => { noise({ dur: 0.2, freq: 1100, vol: 0.3, sweep: 300 }); tone({ f: 180, f2: 90, dur: 0.2, type: 'sawtooth', vol: 0.2 }); },
};

export function sfx(name, element) {
  if (!ctx || muted) return;
  const now = performance.now();
  const last = lastPlayed.get(name) || 0;
  const minGap = name === 'hit' || name === 'shard' ? 45 : 25;
  if (now - last < minGap) return;
  lastPlayed.set(name, now);
  const r = RECIPES[name];
  if (r) { try { r(element); } catch (e) { /* audio must never crash the game */ } }
}
