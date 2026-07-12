import { CLASSES } from '../data/index.js';
import { ELEMENT_COLORS } from '../data/index.js';
import type { ArcBasic, ElementId, ProjBasic, ProjectileSpec, StatusApp } from '../data/types.js';
import { wrapAngle } from '../core/math.js';
import { sfx } from '../audio.js';
import { hitEnemy, nearestEnemy, spawnPlayerProj, targetable } from './combat.js';
import type { GameState } from './types.js';

// CardEngine itself isn't typed until R3.6 — this narrows just the shape
// basicMods() returns (the merged basic-attack modifications from active Powers).
interface BasicMods {
  override: ProjectileSpec | null;
  addStatus: StatusApp[];
  arcMult: number;
  dmgMult: number;
  rateMult: number;
  extraEvery: number;
}

// ═══ the basic attack — the constant action layer; NOT a card ═══
export function updateBasicAttack(game: GameState, dt: number): void {
  const p = game.player;
  const cls = CLASSES[game.playerClass];
  if (!cls) return;
  const mods = game.engine.basicMods() as BasicMods;
  p.attackT -= dt;
  if (p.attackT > 0) return;

  // CLASSES preserves each class's exact literal shape (via `satisfies`), so
  // indexing by the ClassId union yields a union of those literals rather
  // than the ArcBasic | ProjBasic interface — widen explicitly so the
  // `kind` narrowing below sees ProjBasic's optional `critChance` correctly.
  const base: ArcBasic | ProjBasic = cls.basic;
  const range = base.kind === 'arc' ? base.range * mods.arcMult * 0.6 + base.range : base.range;
  const target = nearestEnemy(game, p.x, p.y, undefined, range);
  if (!target) {
    p.attackT = 0.08;
    return;
  }
  p.attackT = base.rate * mods.rateMult;

  let dmgMult = mods.dmgMult;
  // Resource fill empowers the basic attack too, rescaled to the 0-10 scale
  // (same +50%/+24% ceilings the old max-100 Rage / max-8 Opportunity gave).
  if (game.playerClass === 'warrior') dmgMult *= 1 + game.engine.flow / 20;
  let critBonus = 0;
  if (game.playerClass === 'rogue') critBonus += game.engine.flow * 0.024;
  if (p.empower) {
    dmgMult *= p.empower.mult;
    critBonus += p.empower.crit || 0;
    p.empower = null;
  }

  const ang = Math.atan2(target.y - p.y, target.x - p.x);
  p.facing = ang;
  p.basicCount++;

  if (base.kind === 'arc') {
    // melee swing
    const half = (base.arc * Math.PI / 180) * mods.arcMult / 2;
    const reach = base.range * (0.9 + mods.arcMult * 0.1);
    const ctx = { def: { element: base.element }, buffs: { addStatus: mods.addStatus, critChance: critBonus }, dmgMult };
    let hits = 0;
    for (const e of game.enemies) {
      if (!targetable(e)) continue;
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      if (d > reach + e.r) continue;
      let da = Math.atan2(e.y - p.y, e.x - p.x) - ang;
      da = wrapAngle(da);
      if (Math.abs(da) > half + 0.2) continue;
      hits++;
      hitEnemy(game, e, base.dmg, ctx, { critChance: 0 }, { quiet: hits > 1 });
      if (!e.dead && base.knockback) {
        e.kvx = Math.cos(ang) * base.knockback;
        e.kvy = Math.sin(ang) * base.knockback;
        e.kt = 0.15;
      }
    }
    if (hits > 0) {
      // §8.2: +1 Rage after every 3rd landed melee swing.
      game.resourceMeters.hitCount += hits;
      while (game.resourceMeters.hitCount >= 3) {
        game.resourceMeters.hitCount -= 3;
        game.engine.gainFlow(1, 'melee_swing');
      }
    }
    game.fx.push({
      kind: 'arc', x: p.x, y: p.y, ang, arc: half * 2, range: reach,
      color: ELEMENT_COLORS[base.element], t: 0, life: 0.22,
    });
    sfx('slash');
  } else {
    // projectile bolt / knife — possibly transformed by an active Power
    const spec: ProjectileSpec = mods.override
      ? { ...mods.override, life: 1.6 }
      : {
        dmg: base.dmg, speed: base.speed, radius: base.radius,
        critChance: base.critChance || 0, element: base.element, life: 1.6,
      };
    const element: ElementId = spec.element || base.element;
    const ctx = { def: { element }, buffs: { addStatus: mods.addStatus, critChance: critBonus }, dmgMult, basic: true };
    spawnPlayerProj(game, p.x, p.y, ang, spec, ctx);
    // Arcane Mirror: every Nth basic fires an extra bolt at another enemy
    if (mods.extraEvery && p.basicCount % mods.extraEvery === 0) {
      const other = nearestEnemy(game, p.x, p.y, target.uid, range) || target;
      spawnPlayerProj(game, p.x, p.y, Math.atan2(other.y - p.y, other.x - p.x), spec, ctx);
    }
    sfx('cast', element);
  }
}
