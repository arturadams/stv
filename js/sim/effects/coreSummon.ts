import { sfx } from '../../audio.js';
import { EVT } from '../../core/events.js';
import { summonFamilyOf } from '../../data/summonFamilies.js';
import { oldestSummonIndex } from '../combat.js';
import { registerEffect } from './registry.js';

// design doc §15: a hard technical ceiling across every summon family,
// independent of each card's own per-id cap below
export const GLOBAL_SUMMON_CAP = 12;

registerEffect('summon', (game, eff, ctx) => {
  const player = game.player;
  // Endless Legion (design doc §7.3): raises only the standard `raise_dead`
  // servant cap, not lesser_familiar's or any Legendary shade cap
  const cap = ctx.def.id === 'raise_dead' ? 3 + ((game.relicState.summonCapBonus as number) || 0)
    : ctx.def.id === 'lesser_familiar' ? 2 : 0;
  if (cap > 0) {
    const matching = game.summons
      .map((summon, index) => ({ summon, index }))
      .filter(({ summon }) => summon.ctx.def.id === ctx.def.id);
    if (matching.length >= cap) {
      matching.sort((a, b) => b.summon.t - a.summon.t);
      const [evicted] = game.summons.splice(matching[0].index, 1);
      game.bus.emit(EVT.summonExpired, { summon: evicted, forced: true });
    }
  }
  if (game.summons.length >= GLOBAL_SUMMON_CAP) {
    const [evicted] = game.summons.splice(oldestSummonIndex(game.summons), 1);
    game.bus.emit(EVT.summonExpired, { summon: evicted, forced: true });
  }

  const rank = ctx.upgradeRank || 0;
  const normalScale = rank === 1 ? 1.2 : rank === 2 ? 1.4 : 1;
  const summonScale = rank === 1 ? 1.15 : rank === 2 ? 1.3 : 1;
  const summonCtx = { ...ctx, dmgMult: ctx.dmgMult / normalScale * summonScale };
  // Grave Command's 35% attack-speed bonus is applied live (js/sim/entities/
  // summons.ts) against the timer that's actually still counting down
  // (game.core.active.graveCommand), not baked into fireRate here — baking
  // it in would leave the bonus permanently applied once the card's 8s
  // window ends
  const summon = {
    kind: eff.kind,
    x: player.x + 30,
    y: player.y + 10,
    t: 0,
    dur: eff.dur,
    fireT: 0.3,
    fireRate: eff.fireRate,
    dmg: eff.dmg,
    ctx: summonCtx,
    summonFamily: summonFamilyOf(ctx.def.id),
    isRelicSummon: false,
  };
  game.summons.push(summon);
  game.bus.emit(EVT.summonCreated, { summon });
  sfx('enchant');
});
