import { sfx } from '../../audio.js';
import { registerEffect } from './registry.js';

registerEffect('summon', (game, eff, ctx) => {
  const player = game.player;
  const cap = ctx.def.id === 'raise_dead' ? 3 : ctx.def.id === 'lesser_familiar' ? 2 : 0;
  if (cap > 0) {
    const matching = game.summons
      .map((summon, index) => ({ summon, index }))
      .filter(({ summon }) => summon.ctx.def.id === ctx.def.id);
    if (matching.length >= cap) {
      matching.sort((a, b) => b.summon.t - a.summon.t);
      game.summons.splice(matching[0].index, 1);
    }
  }

  const rank = ctx.upgradeRank || 0;
  const normalScale = rank === 1 ? 1.2 : rank === 2 ? 1.4 : 1;
  const summonScale = rank === 1 ? 1.15 : rank === 2 ? 1.3 : 1;
  const summonCtx = { ...ctx, dmgMult: ctx.dmgMult / normalScale * summonScale };
  const fireRate = (game.core.active.graveCommand || 0) > 0 ? eff.fireRate * 0.65 : eff.fireRate;
  game.summons.push({
    kind: eff.kind,
    x: player.x + 30,
    y: player.y + 10,
    t: 0,
    dur: eff.dur,
    fireT: 0.3,
    fireRate,
    dmg: eff.dmg,
    ctx: summonCtx,
  });
  sfx('enchant');
});
