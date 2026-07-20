import type { Buffs, CardInstance, EffectCtx, EffectPreview, CardDef } from '../../data/types.js';
import { enemiesIn, hitEnemy, nearestEnemy } from '../combat.js';
import { colorOf } from '../game.js';
import type { GameState } from '../types.js';
import { resolveEffect } from './registry.js';
import { coreCardDamageMultiplier } from './coreMechanic.js';
import { talentDamageMultiplier, talentStatusBonuses } from '../run/talents.js';

// registering every effect handler and enchant action is a side effect of
// importing these modules — this file is the one place that pulls them all
// in, so nothing else needs to know the full list.
import './power.js';
import './sustained.js';
import './trap.js';
import './aoe.js';
import './proj.js';
import './zone.js';
import './arc.js';
import './chain.js';
import './movement.js';
import './defense.js';
import './heal.js';
import './engineOps.js';
import './mark.js';
import './summon.js';
import './enchantActions.js';
import './coreMechanic.js';
import './coreSummon.js';

// ═══ channel preview ═══
export function computePreview(game: GameState, def: CardDef, buffs: Buffs): EffectPreview | null {
  const p = game.player;
  const radMult = (buffs.radiusMult || 1) * game.relicRadiusMult;
  const color = colorOf(def);
  if (def.preview) {
    const r = def.preview.r * radMult;
    if (def.targeting === 'self') return { x: p.x, y: p.y, r, follow: true, color };
    const t = nearestEnemy(game, p.x, p.y);
    return t
      ? { x: t.x, y: t.y, r, follow: false, color }
      : { x: p.x + Math.cos(p.facing) * 180, y: p.y + Math.sin(p.facing) * 180, r, follow: false, color };
  }
  if (def.targeting === 'nearest') {
    const t = nearestEnemy(game, p.x, p.y);
    if (t) return { enemy: t, r: 24, reticle: true, color, x: t.x, y: t.y };
  }
  return null;
}

// ═══ effect resolver ═══ every card flows through here; no one-off logic ═══
export function resolveCard(game: GameState, inst: CardInstance, buffs: Buffs, preview: EffectPreview | null): void {
  const def = inst.def;
  const p = game.player;
  const lvl = Math.max(1, Math.min(3, inst.lvl || 1));
  const upgradeRank = lvl - 1;
  const damageScale = upgradeRank === 1 ? 1.2 : upgradeRank === 2 ? 1.4 : 1;
  let dmgMult = (buffs.dmgMult || 1) * damageScale * coreCardDamageMultiplier(game) * talentDamageMultiplier(game, def);
  if (game.hasDuelist && def.school === 'Warrior' && game.engine.queue.length <= 1) dmgMult *= 1.6;
  const radMult = (buffs.radiusMult || 1) * game.relicRadiusMult * (upgradeRank === 2 ? 1.1 : 1);
  let critBonus = buffs.critChance || 0;
  if (game.playerClass === 'rogue') critBonus += game.engine.flow * 0.024;
  const addStatus = [...(buffs.addStatus || []), ...talentStatusBonuses(game, def)];
  const flameSigil = (game.core.active.flameSigil || 0) > 0 && def.cat === 'Signature';
  if (flameSigil) addStatus.push(['burn', 1]);
  const ctx: EffectCtx = {
    def, buffs: { ...buffs, addStatus, critChance: critBonus },
    dmgMult, radMult, preview, lvl, upgradeRank,
  };
  for (const eff of def.effects) resolveEffect(game, eff, ctx);
  if (flameSigil && (game.core.cooldowns.flameSigil || 0) <= 0) {
    const target = nearestEnemy(game, p.x, p.y);
    if (target) {
      for (const enemy of enemiesIn(game, target.x, target.y, 55)) hitEnemy(game, enemy, 8, ctx, {});
      game.core.cooldowns.flameSigil = 2;
    }
  }
  game.fx.push({ kind: 'cast', x: p.x, y: p.y, color: colorOf(def), t: 0, life: 0.35 });
}
