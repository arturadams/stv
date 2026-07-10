import { sfx } from '../../audio.js';
import { damagePlayer } from '../combat.js';
import { shake } from '../fx.js';
import type { GameState } from '../types.js';
import { inRotRect } from './aim.js';

// ── boss kit ── the three telegraphed strike shapes every boss composes its
// movesets from. Each pushes a telegraph whose onDone resolves the hit.

export interface StrikeOpts {
  dmg: number;
  dur: number;
  color: string;
  boom?: 'boom' | 'slam';
}

export function strikeCircle(game: GameState, x: number, y: number, r: number, opts: StrikeOpts): void {
  game.telegraphs.push({
    shape: 'circle', x, y, r, t: 0, dur: opts.dur, color: opts.color,
    onDone: (g) => {
      if (Math.hypot(g.player.x - x, g.player.y - y) < r + g.player.r) damagePlayer(g, opts.dmg, x, y);
      g.fx.push({ kind: 'blast', x, y, r, color: opts.color, t: 0, life: 0.45 });
      sfx(opts.boom || 'boom');
    },
  });
}

// a rotated beam centred on (cx, cy), length w along `ang`
export function strikeBeam(
  game: GameState,
  cx: number,
  cy: number,
  w: number,
  h: number,
  ang: number,
  opts: StrikeOpts,
): void {
  game.telegraphs.push({
    shape: 'rect', x: cx, y: cy, w, h, ang, t: 0, dur: opts.dur, color: opts.color,
    onDone: (g) => {
      if (inRotRect(g.player.x, g.player.y, g.player.r, cx, cy, w, h, ang)) damagePlayer(g, opts.dmg, cx, cy);
      g.fx.push({ kind: 'rectblast', x: cx, y: cy, w, h, ang, color: opts.color, t: 0, life: 0.4 });
      shake(g, 7);
      sfx(opts.boom || 'slam');
    },
  });
}

// an annulus — safe inside, safe outside, deadly on the band
export function strikeRing(game: GameState, x: number, y: number, r: number, band: number, opts: StrikeOpts): void {
  game.telegraphs.push({
    shape: 'ring', x, y, r, band, t: 0, dur: opts.dur, color: opts.color,
    onDone: (g) => {
      const d = Math.hypot(g.player.x - x, g.player.y - y);
      if (Math.abs(d - r) < band / 2 + g.player.r) damagePlayer(g, opts.dmg, x, y);
      g.fx.push({ kind: 'ring', x, y, r, color: opts.color, t: 0, life: 0.5 });
      shake(g, 5);
      sfx(opts.boom || 'boom');
    },
  });
}
