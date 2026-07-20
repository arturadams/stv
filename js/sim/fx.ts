import type { GameState, Particle } from './types.js';

export type FxState = Pick<
  GameState,
  'rng' | 'floaters' | 'particles' | 'fx' | 'camera'
>;

export function floater(
  game: FxState,
  x: number,
  y: number,
  txt: string,
  color: string,
  size = 13,
  crit = false,
): void {
  game.floaters.push({
    x: x + game.rng.range(-10, 10),
    y,
    txt,
    color,
    t: 0,
    life: crit ? 1.1 : 0.8,
    size: crit ? size * 1.5 : size,
    crit,
  });
}

export function spark(
  game: FxState,
  x: number,
  y: number,
  color: string,
  count = 8,
  speed = 160,
  life = 0.5,
): void {
  for (let i = 0; i < count; i++) {
    const angle = game.rng.range(0, Math.PI * 2);
    const velocity = speed * (0.4 + game.rng.float() * 0.8);
    game.particles.push({
      x,
      y,
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity,
      t: 0,
      life: life * (0.6 + game.rng.float() * 0.8),
      size: 2 + game.rng.float() * 3,
      color,
      add: true,
      drag: 3,
    });
  }
}

export function mote(
  game: FxState,
  x: number,
  y: number,
  color: string,
): Particle {
  const angle = game.rng.range(0, Math.PI * 2);
  return {
    x: x + Math.cos(angle) * 26,
    y: y + Math.sin(angle) * 26,
    vx: Math.cos(angle) * 40,
    vy: Math.sin(angle) * 40 - 60,
    t: 0,
    life: 0.7,
    size: 2.5,
    color,
    add: true,
    drag: 2,
  };
}

export function ringFx(
  game: FxState,
  x: number,
  y: number,
  radius: number,
  color: string,
  life = 0.45,
): void {
  game.fx.push({ kind: 'ring', x, y, r: radius, color, t: 0, life });
}

export function shake(game: FxState, amount: number): void {
  game.camera.shake = Math.min(26, game.camera.shake + amount);
}

/** Directional recoil — a short camera kick along `angle`, distinct from the
 * random jitter of `shake`. Used for melee contact and heavy impacts. */
export function impulse(game: FxState, angle: number, amount: number): void {
  const cam = game.camera;
  cam.impulseX = Math.max(-18, Math.min(18, cam.impulseX + Math.cos(angle) * amount));
  cam.impulseY = Math.max(-18, Math.min(18, cam.impulseY + Math.sin(angle) * amount));
}

/** Compressed contact flash at a hit point — the "impact" beat. Pairs a
 * white-hot core (drawn by the `impactFlash` fx) with a few fragments. */
export function impact(
  game: FxState,
  x: number,
  y: number,
  color: string,
  dir?: number,
  crit = false,
): void {
  game.fx.push({
    kind: 'impactFlash', x, y, color, dir, crit, t: 0, life: crit ? 0.16 : 0.1,
  });
  spark(game, x, y, color, crit ? 9 : 5, crit ? 210 : 130, crit ? 0.32 : 0.22);
}

/** Teleport sigil — a thin vertical glyph that collapses the caster on
 * departure and reconstructs them on arrival, per the "arcane machinery"
 * Mage direction. */
export function sigil(
  game: FxState,
  x: number,
  y: number,
  color: string,
  phase: 'collapse' | 'reconstruct',
): void {
  game.fx.push({ kind: 'sigil', x, y, color, phase, t: 0, life: phase === 'collapse' ? 0.2 : 0.32 });
}
