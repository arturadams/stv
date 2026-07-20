import type { Buffs, CardInstance, EffectCtx, EffectPreview, CardDef } from '../../data/types.js';
import { nearestEnemy } from '../combat.js';
import { colorOf } from '../game.js';
import type { GameState } from '../types.js';
import { resolveEffect } from './registry.js';

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
  const lvl = inst.lvl || 0; // combined duplicates: +25% damage, +8% area, +15% durations per level
  let dmgMult = (buffs.dmgMult || 1) * (1 + 0.25 * lvl);
  if (game.hasDuelist && def.school === 'Warrior' && game.engine.queue.length <= 1) dmgMult *= 1.6;
  if (game.playerClass === 'warlock' && def.school === 'Warlock') {
    dmgMult *= 1 + game.corruption / 150;
  }
  const radMult = (buffs.radiusMult || 1) * game.relicRadiusMult * (1 + 0.08 * lvl);
  let critBonus = buffs.critChance || 0;
  if (game.playerClass === 'rogue') critBonus += game.opportunity * 0.03;
  const ctx: EffectCtx = { def, buffs: { ...buffs, critChance: critBonus }, dmgMult, radMult, preview, lvl };
  for (const eff of def.effects) resolveEffect(game, eff, ctx);
  game.fx.push({ kind: 'cast', x: p.x, y: p.y, color: colorOf(def), t: 0, life: 0.35 });
}
