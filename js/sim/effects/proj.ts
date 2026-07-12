import { sfx } from '../../audio.js';
import { aimAngle, spawnPlayerProj } from '../combat.js';
import { registerEffect } from './registry.js';

registerEffect('proj', (game, eff, ctx) => {
  const p = game.player;
  const n = eff.count || 1;
  const base = aimAngle(game);
  for (let i = 0; i < n; i++) {
    const a = eff.ring ? base + (i / n) * Math.PI * 2
      : base + (n > 1 ? (i - (n - 1) / 2) * 0.16 : 0);
    spawnPlayerProj(game, p.x, p.y, a, eff, ctx);
  }
  sfx('cast', ctx.def.element);
});
