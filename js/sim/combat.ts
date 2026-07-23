import { ELEMENT_COLORS } from '../data/index.js';
import type {
  ChainSpec,
  EnemyState,
  ProjectileSpec,
  StatusApp,
  StatusName,
} from '../data/types.js';
import { EVT } from '../core/events.js';
import { sfx } from '../audio.js';
import { floater, impact, ringFx, shake, spark } from './fx.js';
import { campCleared } from './map/features.js';
import { worldDef } from './map/chunks.js';
import { spawnEnemy } from './entities/spawn.js';
import { gainRunXp } from './run/talents.js';
import type { CombatCtx, GameState, Summon } from './types.js';
import type { FeatureState } from './map/features.js';

// shared "oldest summon" tie-break used by every summon-eviction path
// (cap eviction, Dark Sacrifice, Deathly Pact) so they can't drift apart
export function oldestSummonIndex(summons: readonly Summon[]): number {
  let oldest = 0;
  for (let i = 1; i < summons.length; i++) {
    if (summons[i].t > summons[oldest].t) oldest = i;
  }
  return oldest;
}

export interface StatusDef {
  dps: number;
  dur: number;
  color: string;
}

export const STATUS_DEFS: Record<StatusName, StatusDef> = {
  burn: { dps: 3, dur: 3, color: ELEMENT_COLORS.fire },
  poison: { dps: 1.6, dur: 6, color: ELEMENT_COLORS.poison },
  bleed: { dps: 2.2, dur: 4, color: '#ff5d6a' },
  chill: { dps: 0, dur: 2.2, color: ELEMENT_COLORS.frost },
};

// design doc §15 — reused by relic damage-reduction stat-hooks in later phases
export const MAX_DAMAGE_REDUCTION = 0.6;

export type CombatState = FeatureState & Pick<
  GameState,
  | 'bus'
  | 'hitstop'
  | 'encounterPause'
  | 'state'
  | 'playerClass'
  | 'runTime'
  | 'lastCombatT'
  | 'resourceMeters'
  | 'projectiles'
>;

// §6's "active combat" definition (rework_cards.md): a boss/duel zone is
// live, the player dealt or took damage in the last 5s, or a hostile enemy
// is within combat range. Gates passive resource regen — see
// player.ts's tickResourceRegen.
const ACTIVE_COMBAT_RADIUS = 230;

export function isActiveCombat(game: CombatState): boolean {
  if (game.zoneRegion?.kind === 'boss' || game.zoneRegion?.kind === 'duel') return true;
  if (game.runTime - game.lastCombatT < 5) return true;
  const p = game.player;
  return game.enemies.some((e) => targetable(e) && Math.hypot(e.x - p.x, e.y - p.y) < ACTIVE_COMBAT_RADIUS);
}

export interface DamageOpts {
  crit?: boolean;
  color?: string;
  quiet?: boolean;
  dot?: boolean;
}

export interface HitSpec {
  critChance?: number;
  status?: StatusApp;
}

// CardEngine itself isn't typed until R3.6 — this narrows just the shape
// damagePlayer reads from `engine.powers` (extendOnHit-on-hit power refresh).
interface PowerRef {
  timeLeft: number;
  spec: { extendOnHit?: number; damageReduction?: number; cardLifeSteal?: number };
}

export function targetable(enemy: EnemyState): boolean {
  return !enemy.dead && enemy.state !== 'spawn' && enemy.state !== 'vanish';
}

export function nearestEnemy(
  game: Pick<CombatState, 'enemies'>,
  x: number,
  y: number,
  excludeUid?: number,
  maxDistance = Infinity,
): EnemyState | null {
  let best: EnemyState | null = null;
  let bestDistance = maxDistance * maxDistance;
  for (const enemy of game.enemies) {
    if (!targetable(enemy) || enemy.uid === excludeUid) continue;
    const distance = (enemy.x - x) ** 2 + (enemy.y - y) ** 2;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = enemy;
    }
  }
  return best;
}

export function enemiesIn(
  game: Pick<CombatState, 'enemies'>,
  x: number,
  y: number,
  radius: number,
): EnemyState[] {
  return game.enemies.filter(
    (enemy) =>
      targetable(enemy) &&
      Math.hypot(enemy.x - x, enemy.y - y) <= radius + enemy.r,
  );
}

export function threatOf(
  game: Pick<CombatState, 'player' | 'runTime' | 'kills' | 'world'>,
): number {
  const distance = Math.hypot(game.player.x, game.player.y);
  return (
    1 +
    game.runTime / 55 +
    game.kills / 50 +
    distance / 3800
  ) * worldDef(game).threatMult;
}

export function applyStatus(
  game: Pick<CombatState, 'bus'>,
  enemy: EnemyState,
  status: StatusName,
  stacks: number,
): void {
  if ((enemy.def.boss || enemy.def.rival) && status === 'chill') {
    stacks = Math.min(stacks, 1);
  }
  const definition = STATUS_DEFS[status];
  if (!definition) return;
  const current = enemy.statuses[status];
  if (current) {
    current.stacks += stacks;
    current.t = definition.dur;
  } else {
    enemy.statuses[status] = { stacks, t: definition.dur };
  }
  game.bus.emit(EVT.statusApplied, {
    enemy,
    status,
    x: enemy.x,
    y: enemy.y,
  });
}

// returns the actual damage applied (post-mark, post-crit, rounded) so
// callers that report it (e.g. EVT.criticalHit) match what really landed
export function damageEnemy(
  game: CombatState,
  enemy: EnemyState,
  amount: number,
  opts: DamageOpts = {},
): number {
  if (!targetable(enemy)) return 0;
  game.lastCombatT = game.runTime;
  let damage = amount;
  if (enemy.mark && enemy.mark.t > 0) damage *= enemy.mark.amp;
  if (opts.crit) damage *= 2;
  damage = Math.max(1, Math.round(damage));
  enemy.hp -= damage;
  enemy.hitFlash = 0.12;
  floater(
    game,
    enemy.x,
    enemy.y - enemy.r - 6,
    String(damage),
    opts.crit ? '#ffd97a' : (opts.color || '#f2ead6'),
    opts.crit ? 15 : 12,
    opts.crit,
  );
  if (opts.crit) sfx('crit');
  else if (!opts.quiet) sfx('hit');
  if (enemy.def.boss) checkBossHealthThreshold(game, enemy);
  if (enemy.hp <= 0) killEnemy(game, enemy, opts);
  return damage;
}

// generic, additive 15%-of-maxHp threshold ping for relics — independent of
// each boss's own hardcoded 50% phase-swap check in js/sim/ai/*.ts, which
// this does not replace or interact with
function checkBossHealthThreshold(game: CombatState, enemy: EnemyState): void {
  const pct = Math.max(0, enemy.hp) / enemy.maxHp;
  const band = Math.floor(pct / 0.15);
  if (enemy.lastThresholdBand === undefined) {
    enemy.lastThresholdBand = band;
    return;
  }
  // fire once per band actually crossed (a single burst that drops several
  // bands at once still pings each one), and re-arm bands the boss heals
  // back through so a later drop can fire them again
  for (let b = enemy.lastThresholdBand - 1; b >= band; b--) {
    game.bus.emit(EVT.bossHealthThreshold, { enemy, pct });
  }
  enemy.lastThresholdBand = band;
}

export function killEnemy(
  game: CombatState,
  enemy: EnemyState,
  _opts: DamageOpts = {},
): void {
  if (enemy.dead) return;
  enemy.dead = true;
  game.kills++;
  spark(
    game,
    enemy.x,
    enemy.y,
    enemy.def.glow,
    enemy.def.boss ? 40 : 14,
    220,
    0.7,
  );
  ringFx(game, enemy.x, enemy.y, enemy.r * 2.2, enemy.def.glow, 0.4);
  sfx(enemy.def.boss || enemy.def.rival ? 'bossdie' : 'kill');
  if (enemy.def.elite || enemy.def.boss || enemy.def.rival) {
    shake(game, 10);
    game.hitstop = Math.max(game.hitstop, 0.09);
  }
  for (let i = 0; i < enemy.def.shards; i++) {
    const angle = game.rng.range(0, Math.PI * 2);
    const speed = 60 + game.rng.float() * 90;
    game.pickups.push({
      x: enemy.x,
      y: enemy.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      kind: 'shard',
      t: 0,
    });
  }
  if (!enemy.def.boss && !enemy.def.rival && game.rng.chance(0.07)) {
    game.pickups.push({
      x: enemy.x,
      y: enemy.y,
      vx: 0,
      vy: -40,
      kind: 'heart',
      t: 0,
    });
  }
  if (enemy.def.deathBurst) {
    const burst = enemy.def.deathBurst;
    if (
      Math.hypot(game.player.x - enemy.x, game.player.y - enemy.y) <
      burst.r + game.player.r
    ) {
      damagePlayer(game, burst.dmg, enemy.x, enemy.y);
    }
    game.fx.push({
      kind: 'blast',
      x: enemy.x,
      y: enemy.y,
      r: burst.r,
      color: enemy.def.glow,
      t: 0,
      life: 0.4,
    });
    sfx('boom');
  }
  if (enemy.def.deathSpawn) {
    const split = enemy.def.deathSpawn;
    for (let i = 0; i < split.count; i++) {
      const angle = (i / split.count) * Math.PI * 2 + game.rng.range(0, 0.8);
      spawnEnemy(
        game,
        split.id,
        enemy.x + Math.cos(angle) * (enemy.r + 6),
        enemy.y + Math.sin(angle) * (enemy.r + 6),
      );
    }
    sfx('summon');
  }
  if (enemy.def.elite || enemy.def.rival) {
    game.pickups.push({
      x: enemy.x,
      y: enemy.y,
      vx: 0,
      vy: -50,
      kind: 'gold',
      value: 6,
      t: 0,
    });
  } else if (!enemy.def.boss && game.rng.chance(0.3)) {
    game.pickups.push({
      x: enemy.x,
      y: enemy.y,
      vx: game.rng.range(-40, 40),
      vy: -40,
      kind: 'gold',
      value: 1 + game.rng.int(2),
      t: 0,
    });
  }

  if (game.playerClass === 'rogue' && enemy.statuses.poison) {
    game.engine.gainFlow(1, 'poisoned_kill');
  }
  if (game.playerClass === 'necromancer') {
    game.engine.gainFlow(1, 'kill');
  }

  if (enemy.campRef) {
    enemy.campRef.alive -= 1;
    if (enemy.campRef.alive <= 0 && enemy.campRef.engaged) {
      campCleared(game, enemy.campRef);
    }
  }
  if (!enemy.def.minion) gainRunXp(game, 1);
  game.bus.emit(EVT.enemyKilled, { enemy, x: enemy.x, y: enemy.y });
}

export function damagePlayer(
  game: CombatState,
  amount: number,
  sourceX?: number,
  sourceY?: number,
): void {
  const player = game.player;
  if (game.state !== 'combat' || game.encounterPause) return;
  if (player.untargetable > 0) return;
  if (player.iframes > 0) {
    if (!player.dodgeCredited && player.dashT > 0) {
      player.dodgeCredited = true;
      game.bus.emit(EVT.perfectDodge, { x: player.x, y: player.y });
    }
    return;
  }
  game.lastCombatT = game.runTime;
  let damage = amount;
  let reductionFraction = 0;
  for (const power of game.engine.powers as PowerRef[]) {
    if (power.spec.damageReduction) {
      reductionFraction = 1 - (1 - reductionFraction) * (1 - power.spec.damageReduction);
    }
  }
  // Ancient Bark (design doc §8.3): a flat relic-granted reduction, stacked
  // the same way as Powers — still subject to the cap below, which is the
  // "respect the global damage-reduction cap" the card text asks for
  for (const relic of game.relics) {
    if (relic.stats?.damageReductionFlat) {
      reductionFraction = 1 - (1 - reductionFraction) * (1 - relic.stats.damageReductionFlat);
    }
  }
  // design doc §15: combined damage reduction from every source (Powers,
  // relics) may never exceed this cap, so stacking mitigation can't approach
  // invulnerability — relics may raise the cap itself (game.damageReductionCap)
  // but MAX_DAMAGE_REDUCTION remains the floor a fresh run starts at
  damage *= 1 - Math.min(reductionFraction, game.damageReductionCap);
  // Veteran's Instinct: the first Heavy hit (10+ raw damage) each encounter
  // is reduced 30% (reset by relicMechanics.ts's resetOutsideCombat)
  if (!game.relicState.veteransInstinctUsed && amount >= 10 && game.relics.some((r) => r.id === 'veterans_instinct')) {
    game.relicState.veteransInstinctUsed = true;
    damage *= 0.7;
  }
  if ((game.core.active.deathlyPact || 0) > 0 &&
      (amount >= 12 || player.hp - damage < player.maxHp * 0.25)) {
    if (game.summons.length > 0) {
      const summon = game.summons.splice(oldestSummonIndex(game.summons), 1)[0];
      game.bus.emit(EVT.summonSacrificed, { summon });
      for (const enemy of enemiesIn(game, summon.x, summon.y, 100)) {
        damageEnemy(game, enemy, 16, { color: '#a77ac7' });
      }
      damage *= 0.3;
    } else {
      damage *= 0.7;
    }
    delete game.core.active.deathlyPact;
  }
  if ((game.core.active.guardedStance || 0) > 0 && amount >= 10 &&
      (game.core.cooldowns.guardedStance || 0) <= 0) {
    for (const enemy of enemiesIn(game, player.x, player.y, 130)) damageEnemy(game, enemy, 12, { color: '#ffd97a' });
    game.engine.gainFlow(1, 'guarded_stance');
    game.core.cooldowns.guardedStance = 2;
  }
  // Living Bark: "briefly root attackers" — approximate the attacker as the
  // nearest enemy to the hit's source position, rate-limited so continuous
  // contact damage doesn't re-root every frame
  if ((game.core.active.livingBark || 0) > 0 && (game.core.cooldowns.livingBark || 0) <= 0) {
    const attacker = nearestEnemy(game, sourceX ?? player.x, sourceY ?? player.y, undefined, 140);
    if (attacker) {
      attacker.root = Math.max(attacker.root, 0.6);
      game.core.cooldowns.livingBark = 1.5;
    }
  }
  if (player.armor > 0) {
    const absorbed = Math.min(player.armor, damage);
    player.armor -= absorbed;
    damage -= absorbed;
    floater(game, player.x, player.y - 24, 'BLOCK ' + absorbed, '#ffd97a', 12);
    if (game.playerClass === 'warrior' && game.resourceMeters.armorBlockCd <= 0) {
      game.engine.gainFlow(1, 'armor_block');
      game.resourceMeters.armorBlockCd = 1.5;
    }
  }
  if (damage <= 0) return;

  player.hp -= damage;
  floater(game, player.x, player.y - 26, '-' + damage, '#ff5d6a', 15);
  shake(game, 7);
  game.hitstop = Math.max(game.hitstop, 0.05);
  sfx('hurt');
  player.iframes = Math.max(player.iframes, 0.5);
  if (
    (game.playerClass === 'warrior' || game.playerClass === 'warlock') &&
    game.resourceMeters.damageTakenCd <= 0
  ) {
    game.engine.gainFlow(1, 'damage_taken');
    game.resourceMeters.damageTakenCd = 2;
  }
  for (const power of game.engine.powers as PowerRef[]) {
    if (power.spec.extendOnHit) power.timeLeft += power.spec.extendOnHit;
  }
  game.bus.emit(EVT.playerHit, { amount: damage });
  if (player.hp <= 0) {
    // The Undying Ember: once per world, survive lethal damage at 1 HP
    if (!game.relicState.undyingEmberUsed && game.relics.some((r) => r.id === 'the_undying_ember')) {
      game.relicState.undyingEmberUsed = true;
      player.hp = 1;
      player.iframes = Math.max(player.iframes, 1.2);
      floater(game, player.x, player.y - 40, 'THE EMBER HOLDS', '#ff8a4a', 15);
      return;
    }
    player.hp = 0;
    game.state = 'gameover';
    sfx('death');
  }
}

// returns the actual damage applied (see damageEnemy) so callers that need
// the real number (lifesteal, crit-damage-based relics) don't have to
// re-derive an approximation of mark/crit/rounding themselves
export function hitEnemy(
  game: CombatState,
  enemy: EnemyState,
  rawDamage: number,
  context: CombatCtx,
  effect: HitSpec,
  opts: DamageOpts = {},
): number {
  let critChance =
    (effect.critChance || 0) + (context.buffs.critChance || 0);
  if (enemy.mark && enemy.mark.t > 0 && enemy.mark.crit) {
    critChance += enemy.mark.crit;
  }
  const crit = game.rng.chance(critChance);
  // relic-sourced damage never grants on-hit resources or feeds crit-chain
  // tracking, so a relic burst can't recursively trigger another relic or a
  // class's on-hit resource gain (design doc §3.5/§14) — everything that
  // must skip for relic damage lives in this one block, not scattered guards
  const relicSourced = !!context.relicId;
  if (!relicSourced) {
    if (crit) {
      const history = game.core.recentCrits.get(enemy.uid) || [];
      history.push(game.runTime);
      game.core.recentCrits.set(enemy.uid, history);
    }
    if (context.basic && game.playerClass === 'warrior' &&
        (game.core.active.bloodRage || 0) > 0 && (game.core.cooldowns.bloodRage || 0) <= 0) {
      game.engine.gainFlow(1, 'blood_rage');
      game.core.cooldowns.bloodRage = 1;
    }
    if (context.basic && (game.playerClass === 'mage' || game.playerClass === 'warlock')) {
      game.resourceMeters.hitCount += 1;
      const threshold = game.playerClass === 'mage' ? 4 : 3;
      if (game.resourceMeters.hitCount >= threshold) {
        game.resourceMeters.hitCount = 0;
        game.engine.gainFlow(1, game.playerClass === 'mage' ? 'arcane_bolt' : 'eldritch_bolt');
      }
    }
    if (!context.basic) {
      const steal = (game.engine.powers as PowerRef[]).reduce((sum, power) => sum + (power.spec.cardLifeSteal || 0), 0);
      if (steal > 0) game.player.hp = Math.min(game.player.maxHp, game.player.hp + rawDamage * context.dmgMult * steal);
    }
    if (crit && game.playerClass === 'rogue' && game.resourceMeters.critCd <= 0) {
      game.engine.gainFlow(1, 'critical_hit');
      game.resourceMeters.critCd = 2;
    }
  }
  const applied = damageEnemy(game, enemy, rawDamage * context.dmgMult, {
    crit,
    color: ELEMENT_COLORS[context.def.element],
    ...opts,
  });
  if (!relicSourced) {
    game.bus.emit(EVT.enemyHit, { enemy, dmg: applied, basic: !!context.basic });
    if (crit) game.bus.emit(EVT.criticalHit, { enemy, dmg: applied });
  }
  if (enemy.dead) return applied;
  if (effect.status) {
    applyStatus(game, enemy, effect.status[0], effect.status[1]);
  }
  for (const status of context.buffs.addStatus || []) {
    applyStatus(game, enemy, status[0], status[1]);
  }
  return applied;
}

export function aimAngle(
  game: Pick<CombatState, 'player' | 'enemies'>,
): number {
  const player = game.player;
  const target = nearestEnemy(game, player.x, player.y);
  return target
    ? Math.atan2(target.y - player.y, target.x - player.x)
    : player.facing;
}

export function chainFrom(
  game: CombatState,
  start: EnemyState,
  spec: ChainSpec,
  context: CombatCtx,
  fromX: number,
  fromY: number,
): void {
  let current: EnemyState | null = start;
  let previousX = fromX;
  let previousY = fromY;
  const struck = new Set<number>();
  for (let jump = 0; jump <= spec.jumps && current; jump++) {
    struck.add(current.uid);
    game.fx.push({
      kind: 'bolt',
      x1: previousX,
      y1: previousY,
      x2: current.x,
      y2: current.y,
      color: ELEMENT_COLORS.lightning,
      t: 0,
      life: 0.22,
    });
    // endpoint impact: star flash, sparks, brief circular refraction
    impact(game, current.x, current.y, ELEMENT_COLORS.lightning);
    ringFx(game, current.x, current.y, current.r + 10, ELEMENT_COLORS.lightning, 0.22);
    const applied = hitEnemy(game, current, spec.dmg, context, spec);
    if (spec.lifesteal) {
      const player = game.player;
      player.hp = Math.min(player.maxHp, player.hp + applied * spec.lifesteal);
    }
    previousX = current.x;
    previousY = current.y;
    let next: EnemyState | null = null;
    let bestDistance = spec.range * spec.range;
    for (const enemy of game.enemies) {
      if (enemy.state === 'spawn' || struck.has(enemy.uid) || enemy.dead) {
        continue;
      }
      const distance =
        (enemy.x - previousX) ** 2 + (enemy.y - previousY) ** 2;
      if (distance < bestDistance) {
        bestDistance = distance;
        next = enemy;
      }
    }
    current = next;
  }
  sfx('zap');
}

export function spawnPlayerProj(
  game: Pick<CombatState, 'projectiles'>,
  x: number,
  y: number,
  angle: number,
  spec: ProjectileSpec,
  context: CombatCtx,
): void {
  game.projectiles.push({
    x,
    y,
    vx: Math.cos(angle) * spec.speed,
    vy: Math.sin(angle) * spec.speed,
    r: spec.radius,
    dmg: spec.dmg,
    eff: spec,
    ctx: context,
    pierce: spec.pierce || 0,
    life: spec.life || 2.2,
    t: 0,
    boomerang: spec.boomerang,
    phase: 0,
    rehit: spec.rehit ? new Map<number, number>() : null,
    color: ELEMENT_COLORS[spec.element || context.def.element] || '#fff',
    hit: new Set<number>(),
  });
}
