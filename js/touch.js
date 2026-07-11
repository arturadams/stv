// ── Arcana Engine · touch controls ──────────────────────────────────────────
// A dynamic virtual joystick (touch anywhere to steer) plus dash and pause
// buttons. Steering is mapped onto the same 8-way boolean Input the keyboard
// uses, so the sim never knows the difference.

const DEADZONE = 10;   // px of drag before a direction registers
const NUB_MAX = 44;    // px the nub visually travels from the base center
const AXIS_T = 0.383;  // sin(22.5°): 8-way sector threshold on the unit vector

export function initTouch(input, { onPause, onInteract } = {}) {
  const controls = document.getElementById('touch-controls');
  const layer = document.getElementById('touch-layer');
  const joyBase = document.getElementById('joy-base');
  const joyNub = document.getElementById('joy-nub');
  const dashBtn = document.getElementById('dash-btn');
  const pauseBtn = document.getElementById('pause-btn');

  let enabled = false;
  function enable() {
    if (enabled) return;
    enabled = true;
    document.body.classList.add('touch-mode');
    controls.classList.remove('hidden');
  }
  if (window.matchMedia('(pointer: coarse)').matches) enable();
  // hybrid devices that report a fine pointer still get controls on first touch
  window.addEventListener('touchstart', enable, { once: true, passive: true });

  // ── joystick: first pointer on the layer anchors the base where it lands ──
  let joyId = null;
  let originX = 0, originY = 0;

  function clearDir() {
    input.up = input.down = input.left = input.right = false;
  }

  function steer(dx, dy) {
    const len = Math.hypot(dx, dy);
    if (len < DEADZONE) { clearDir(); return; }
    const nx = dx / len, ny = dy / len;
    input.right = nx > AXIS_T;
    input.left = nx < -AXIS_T;
    input.down = ny > AXIS_T;
    input.up = ny < -AXIS_T;
    const vis = Math.min(len, NUB_MAX);
    joyNub.style.transform = `translate(${nx * vis}px, ${ny * vis}px)`;
  }

  layer.addEventListener('pointerdown', (e) => {
    onInteract?.();
    if (joyId !== null) return; // one steering pointer at a time
    joyId = e.pointerId;
    originX = e.clientX;
    originY = e.clientY;
    joyBase.style.left = originX + 'px';
    joyBase.style.top = originY + 'px';
    joyNub.style.transform = 'translate(0, 0)';
    joyBase.classList.remove('hidden');
    layer.setPointerCapture(e.pointerId);
  });
  layer.addEventListener('pointermove', (e) => {
    if (e.pointerId !== joyId) return;
    steer(e.clientX - originX, e.clientY - originY);
  });
  function release(e) {
    if (e.pointerId !== joyId) return;
    joyId = null;
    clearDir();
    joyBase.classList.add('hidden');
  }
  layer.addEventListener('pointerup', release);
  layer.addEventListener('pointercancel', release);

  // ── buttons ──
  dashBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    onInteract?.();
    input.dash = true;
  });
  pauseBtn.addEventListener('click', () => {
    onInteract?.();
    onPause?.();
  });

  // no long-press callout menus over the battlefield
  controls.addEventListener('contextmenu', (e) => e.preventDefault());
}
