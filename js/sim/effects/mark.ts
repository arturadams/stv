import { nearestEnemy } from '../combat.js';
import { floater } from '../fx.js';
import { registerEffect } from './registry.js';

registerEffect('mark', (game, eff) => {
  const p = game.player;
  const t = nearestEnemy(game, p.x, p.y);
  if (t) {
    t.mark = { t: eff.dur, amp: eff.amp, crit: eff.crit || 0 };
    floater(game, t.x, t.y - t.r - 10, 'MARKED', '#a98fe0', 12);
  }
});
