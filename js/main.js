// ── Arcana Engine · entry point ────────────────────────────────────────────
import { createGame, updateGame } from './world.js';
import { render } from './render.js';
import { initUI, updateUI, isBuildBoardOpen, toggleBuildBoard } from './ui.js';
import { initAudio, toggleMute } from './audio.js';
import { initTouch } from './touch.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const pauseOverlay = document.getElementById('pause-overlay');
const pauseStats = document.getElementById('pause-stats');
const muteBtn = document.getElementById('mute-btn');

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

function setPaused(v) {
  paused = v;
  pauseOverlay.classList.toggle('hidden', !paused);
  if (paused) {
    const mins = Math.floor(game.runTime / 60), secs = Math.floor(game.runTime % 60);
    pauseStats.innerHTML = `
      <span>❂ world ${game.world}</span>
      <span>☠ ${game.kills} unmade</span>
      <span>⌛ ${mins}:${String(secs).padStart(2, '0')}</span>`;
  }
}

function setMuted(m) {
  muteBtn.textContent = m ? 'UNMUTE' : 'MUTE';
}

window.addEventListener('keydown', (e) => {
  initAudio();
  const k = KEYMAP[e.code];
  if (k) { input[k] = true; e.preventDefault(); }
  if (e.code === 'Space') { input.dash = true; e.preventDefault(); }
  if (e.code === 'Tab' && game.state !== 'title') {
    toggleBuildBoard(game);
    e.preventDefault();
  }
  if (e.code === 'KeyP' || e.code === 'Escape') {
    if (e.code === 'Escape' && isBuildBoardOpen()) toggleBuildBoard(game);
    else if (game.state === 'combat') setPaused(!paused);
  }
  if (e.code === 'KeyM') setMuted(toggleMute());
  if (e.code === 'Enter' && game.state === 'title') {
    const setupOpen = !document.getElementById('setup-overlay').classList.contains('hidden');
    document.getElementById(setupOpen ? 'enter-btn' : 'start-btn').click();
  }
});
document.getElementById('resume-btn').addEventListener('click', () => setPaused(false));
document.getElementById('mute-btn').addEventListener('click', () => setMuted(toggleMute()));
document.getElementById('quit-btn').addEventListener('click', () => {
  setPaused(false);
  game.state = 'title';
  document.getElementById('title-overlay').classList.remove('hidden');
});
window.addEventListener('keyup', (e) => {
  const k = KEYMAP[e.code];
  if (k) input[k] = false;
});
window.addEventListener('blur', () => { for (const k of Object.keys(input)) input[k] = false; });

initTouch(input, {
  onPause: () => { if (game.state === 'combat') setPaused(!paused); },
  onInteract: initAudio,
});

let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  let dt = (now - last) / 1000;
  last = now;
  dt = Math.min(dt, 0.05); // clamp tab-switch spikes

  if (!paused && !isBuildBoardOpen()) updateGame(game, dt, input);

  render(game, ctx, window.innerWidth, window.innerHeight);
  updateUI(game);
}
requestAnimationFrame(frame);
