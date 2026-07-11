import type { Vec2 } from '../types.js';

// ── the echo ── World IV's signature: the realm answers a beat late. Shades
// and the Antiphon keep a short memory of where the player stood and strike
// it after a delay — stand still, or double back, and the past catches you.

const SAMPLE_DT = 0.1;
const MAX_SAMPLES = 30; // 3s of memory

export interface EchoTrail {
  pts: Vec2[];
  acc: number;
}

export function makeTrail(): EchoTrail {
  return { pts: [], acc: 0 };
}

export function sampleTrail(trail: EchoTrail, p: Vec2, dt: number): void {
  trail.acc += dt;
  if (trail.acc < SAMPLE_DT) return;
  trail.acc -= SAMPLE_DT;
  trail.pts.push({ x: p.x, y: p.y });
  if (trail.pts.length > MAX_SAMPLES) trail.pts.shift();
}

// where the player stood `secondsAgo` — null until the memory reaches back
// that far
export function trailAt(trail: EchoTrail, secondsAgo: number): Vec2 | null {
  const back = Math.round(secondsAgo / SAMPLE_DT);
  const idx = trail.pts.length - 1 - back;
  return idx >= 0 ? trail.pts[idx] : null;
}
