// ── Arcana Engine · entry point ────────────────────────────────────────────
import { createGame, updateGame } from './world.js';
import { render } from './render.js';
import { initUI, updateUI } from './ui.js';
import { initAudio, toggleMute } from './audio.js';
import { ENCOUNTERS } from './data.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);
resize();

const game = createGame();
window.__game = game; // used by the enchant-chip refresh timer in ui.js
initUI(game);

const input = { up: false, down: false, left: false, right: false, dash: false };
let paused = false;

const KEYMAP = {
  KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
};

window.addEventListener('keydown', (e) => {
  initAudio();
  const k = KEYMAP[e.code];
  if (k) { input[k] = true; e.preventDefault(); }
  if (e.code === 'Space') { input.dash = true; e.preventDefault(); }
  if (e.code === 'KeyP' || e.code === 'Escape') {
    if (game.state === 'combat') { paused = !paused; document.getElementById('pause-note').classList.toggle('hidden', !paused); }
  }
  if (e.code === 'KeyM') toggleMute();
  if (e.code === 'Enter' && game.state === 'title') document.getElementById('start-btn').click();
});
window.addEventListener('keyup', (e) => {
  const k = KEYMAP[e.code];
  if (k) input[k] = false;
});
window.addEventListener('blur', () => { for (const k of Object.keys(input)) input[k] = false; });

let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  let dt = (now - last) / 1000;
  last = now;
  dt = Math.min(dt, 0.05); // clamp tab-switch spikes

  if (!paused) updateGame(game, dt, input);

  // HUD label: encounter + wave
  if (game.state === 'combat' || game.state === 'reward') {
    const enc = ENCOUNTERS[Math.min(game.encounterIdx, ENCOUNTERS.length - 1)];
    game.stateLabel = enc.boss ? `${enc.name}` :
      `${enc.name} — Wave ${Math.max(1, game.waveIdx + 1)} / ${enc.waves.length}`;
  } else game.stateLabel = '';

  render(game, ctx, window.innerWidth, window.innerHeight);
  updateUI(game);
}
requestAnimationFrame(frame);
