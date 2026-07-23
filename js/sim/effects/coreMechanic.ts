import type { CardDef, EffectCtx, EnemyState } from '../../data/types.js';
import { applyStatus, enemiesIn, hitEnemy, nearestEnemy, oldestSummonIndex, targetable } from '../combat.js';
import { floater } from '../fx.js';
import { EVT } from '../../core/events.js';
import type { GameState } from '../types.js';
import { registerEffect } from './registry.js';
import { gainRelicFlow } from './enchantActions.js';

function activate(game: GameState, id: string, dur = 8): void {
  game.core.active[id] = Math.max(game.core.active[id] || 0, dur);
}

function strongestEnemy(game: GameState): EnemyState | null {
  let target: EnemyState | null = null;
  for (const enemy of game.enemies) {
    if (!targetable(enemy)) continue;
    if (!target || enemy.maxHp > target.maxHp || (enemy.def.boss && !target.def.boss)) target = enemy;
  }
  return target;
}

function heal(game: GameState, amount: number): void {
  const applied = Math.min(amount, game.player.maxHp - game.player.hp);
  if (applied <= 0) return;
  game.player.hp += applied;
  floater(game, game.player.x, game.player.y - 30, '+' + Math.round(applied) + ' HEALTH', '#7fd6a8', 13);
}

function context(def: CardDef, ctx?: EffectCtx): EffectCtx {
  return ctx || {
    def,
    buffs: { dmgMult: 1, costMult: 1, channelMult: 1, radiusMult: 1, critChance: 0, repeat: 0, addStatus: [] },
    dmgMult: 1,
    radMult: 1,
    preview: null,
    lvl: 1,
    upgradeRank: 0,
  };
}

registerEffect('healthCost', (game, eff) => {
  const paid = Math.min(eff.amount, Math.max(0, game.player.hp - 1));
  game.player.hp -= paid;
  if (paid > 0) floater(game, game.player.x, game.player.y - 28, '-' + paid + ' HEALTH', '#d05c9b', 13);
});

registerEffect('healOverTime', (game, eff, ctx) => {
  const rank = ctx.upgradeRank || 0;
  const total = eff.amount * (rank === 1 ? 1.2 : rank >= 2 ? 1.4 : 1);
  game.core.healing.push({ remaining: eff.dur, rate: total / eff.dur });
});

registerEffect('consumeStatus', (game, eff, ctx) => {
  let target: EnemyState | null = null;
  let best = 0;
  for (const enemy of game.enemies) {
    if (!targetable(enemy)) continue;
    const stacks = enemy.statuses[eff.status]?.stacks || 0;
    if (stacks > best) {
      best = stacks;
      target = enemy;
    }
  }
  if (!target || best < (eff.minStacks || 1)) {
    const fallback = target || nearestEnemy(game, game.player.x, game.player.y);
    if (fallback && eff.fallbackStacks) applyStatus(game, fallback, eff.status, eff.fallbackStacks);
    return;
  }
  const retained = (target.def.boss || target.def.rival) ? (eff.retainOnBoss || 0) : 0;
  const consumed = Math.min(eff.maxStacks, Math.max(0, best - retained));
  const status = target.statuses[eff.status];
  if (status) {
    status.stacks -= consumed;
    if (status.stacks <= 0) {
      delete target.statuses[eff.status];
      game.bus.emit(EVT.statusExpired, { enemy: target, status: eff.status });
    }
  }
  hitEnemy(game, target, consumed * eff.damagePerStack, ctx, {});
});

registerEffect('coreMechanic', (game, eff, ctx) => {
  const id = eff.id;
  if (eff.dur) activate(game, id, eff.dur);

  if (id === 'toxicDart') {
    const target = strongestEnemy(game);
    if (target?.statuses.poison && (game.core.cooldowns.toxicDart || 0) <= 0) {
      game.engine.gainFlow(1, 'toxic_dart');
      game.core.cooldowns.toxicDart = 2;
    }
  } else if (id === 'silentVerdict') {
    const marked = game.enemies.find((enemy) => targetable(enemy) && enemy.mark && enemy.mark.t > 0);
    const target = marked || strongestEnemy(game);
    if (!target) return;
    const recent = (game.core.recentCrits.get(target.uid) || []).filter((t) => game.runTime - t <= 5);
    hitEnemy(game, target, 22 + 6 * Math.min(5, recent.length), ctx, {});
    if (target.dead) game.engine.gainFlow(2, 'silent_verdict');
  } else if (id === 'darkSacrifice') {
    let x = game.player.x;
    let y = game.player.y;
    let damage = 12;
    const hasSummon = game.summons.length > 0;
    if (hasSummon) {
      const summon = game.summons.splice(oldestSummonIndex(game.summons), 1)[0];
      game.bus.emit(EVT.summonSacrificed, { summon });
      x = summon.x;
      y = summon.y;
      damage = 24;
      heal(game, 12);
    } else {
      if (game.engine.flow >= 2) game.engine.flow -= 2;
      heal(game, 6);
    }
    for (const enemy of enemiesIn(game, x, y, 105)) {
      hitEnemy(game, enemy, damage, ctx, { status: ['poison', hasSummon ? 2 : 1] });
    }
  } else if (id === 'challenge') {
    const target = strongestEnemy(game);
    if (target) {
      target.mark = { t: eff.dur || 10, amp: 1.2, crit: 0 };
      game.core.challengedUid = target.uid;
      activate(game, id, eff.dur || 10);
    }
  } else if (id === 'doom') {
    const target = strongestEnemy(game);
    if (target) game.core.dooms.push({ enemy: target, t: eff.dur || 6, damage: 30 });
  } else if (id === 'wolfAspect') {
    game.engine.powers = game.engine.powers.filter((power: { id: string }) => power.id !== 'bear_aspect');
    delete game.core.active.bearAspect;
    activate(game, id, eff.dur || 8);
  } else if (id === 'bearAspect') {
    game.engine.powers = game.engine.powers.filter((power: { id: string }) => power.id !== 'wolf_aspect');
    delete game.core.active.wolfAspect;
    activate(game, id, eff.dur || 8);
  } else if (id === 'renewal') {
    game.player.vx = 0;
    game.player.vy = 0;
  } else if (id === 'apocalypse') {
    for (const summon of game.summons) {
      summon.fireRate *= 0.65;
      summon.dmg *= 1.25;
    }
  } else if (id === 'guardianRoar') {
    // "weaken their attacks" — a brief stun; active Aspects strengthen it,
    // and each Aspect's own theme adds a benefit on top
    const wolf = (game.core.active.wolfAspect || 0) > 0;
    const bear = (game.core.active.bearAspect || 0) > 0;
    const stun = bear ? 1.2 : wolf ? 1.6 : 0.8;
    for (const enemy of enemiesIn(game, game.player.x, game.player.y, 190)) {
      enemy.stun = Math.max(enemy.stun, stun);
    }
    if (bear) heal(game, 10);
    // extend Wolf Aspect, but never past its own base duration — otherwise
    // spamming this card (no internal cooldown) keeps the Aspect alive forever
    if (wolf) activate(game, 'wolfAspect', Math.min((game.core.active.wolfAspect || 0) + 2, 8));
  } else if (id !== 'deathmark' && id !== 'hexOfFrailty') {
    activate(game, id, eff.dur || 8);
  }
});

export function updateCoreMechanics(game: GameState, dt: number): void {
  for (const [id, time] of Object.entries(game.core.active)) {
    const next = time - dt;
    if (next <= 0) delete game.core.active[id];
    else game.core.active[id] = next;
  }
  for (const [id, time] of Object.entries(game.core.cooldowns)) {
    game.core.cooldowns[id] = Math.max(0, time - dt);
  }

  for (const job of game.core.healing) {
    const step = Math.min(job.remaining, dt);
    job.remaining -= step;
    game.core.healAccumulator += step * job.rate;
  }
  game.core.healing = game.core.healing.filter((job) => job.remaining > 0);
  for (const power of game.engine.powers as Array<{ spec: { healingPerSecond?: number } }>) {
    if (power.spec.healingPerSecond) game.core.healAccumulator += power.spec.healingPerSecond * dt;
  }
  if (game.core.healAccumulator >= 1) {
    const amount = Math.floor(game.core.healAccumulator);
    game.core.healAccumulator -= amount;
    heal(game, amount);
  }

  // Dark Prophecy (design doc §9.2): +40% Doom detonation damage, and a
  // killing detonation restores 2 Spirit — checked here rather than as an
  // enchant since Doom's detonation isn't itself a card resolution and
  // doesn't emit cardResolved/enemyHit.
  const darkProphecyActive = game.relics.some((r) => r.id === 'dark_prophecy');
  for (const doom of game.core.dooms) {
    doom.t -= dt;
    if (doom.t <= 0 && !doom.enemy.dead) {
      const damage = darkProphecyActive ? doom.damage * 1.4 : doom.damage;
      hitEnemy(game, doom.enemy, damage, context({
        id: 'doom', name: 'Doom', school: 'Warlock', cat: 'Power', rarity: 'Common',
        cost: 0, channel: 0, targeting: 'strongest', tags: ['Affliction', 'Curse'],
        glyph: '☠', element: 'shadow', text: '', effects: [],
      }), {});
      if (darkProphecyActive && doom.enemy.dead) gainRelicFlow(game, 2, 'dark_prophecy');
    }
  }
  game.core.dooms = game.core.dooms.filter((doom) => doom.t > 0 && !doom.enemy.dead);

  const cutoff = game.runTime - 5;
  for (const [uid, times] of game.core.recentCrits) {
    const recent = times.filter((time) => time >= cutoff);
    if (recent.length) game.core.recentCrits.set(uid, recent);
    else game.core.recentCrits.delete(uid);
  }
}

export function recordCoreCritical(game: GameState, enemy: EnemyState): void {
  const times = game.core.recentCrits.get(enemy.uid) || [];
  times.push(game.runTime);
  game.core.recentCrits.set(enemy.uid, times);
}

export function coreCardDamageMultiplier(game: GameState): number {
  let mult = 1;
  for (const power of game.engine.powers as Array<{ spec: { cardDamageMult?: number } }>) {
    if (power.spec.cardDamageMult) mult *= power.spec.cardDamageMult;
  }
  return mult;
}

