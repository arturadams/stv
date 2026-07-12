import { sfx } from '../../audio.js';
import { registerEffect } from './registry.js';

registerEffect('summon', (game, eff, ctx) => {
  const p = game.player;
  game.summons.push({ kind: eff.kind, x: p.x + 30, y: p.y + 10, t: 0, dur: eff.dur, fireT: 0.3, fireRate: eff.fireRate, dmg: eff.dmg, ctx });
  sfx('enchant');
});
