// ── Arcana Engine · world simulation ───────────────────────────────────────
// Player + basic attacks, class resources, infinite procedural map, enemies,
// effect resolver, sustained casts, traps, rival encounters, boss gates.
// This file touches no DOM — the entire game simulates headlessly in Node.

import {
  CARDS, CARD_LIST, RELICS, ENEMIES, CLASSES, WORLDS,
  ELEMENT_COLORS, SCHOOL_COLORS, STARTING_DECKS, ATTUNEMENT_IDS, RIVAL_ADJECTIVES,
} from './data.js';
import { CardEngine } from './engine.js';
import { EVT, EventBus } from './core/events.js';
import { makeUidCounter } from './core/ids.js';
import { distToSegment, wrapAngle } from './core/math.js';
import { makeRng } from './core/rng.js';
import { floater, mote, ringFx, shake, spark } from './sim/fx.js';
import {
  aimAngle,
  applyStatus as applyStatusImpl,
  chainFrom,
  damageEnemy as damageEnemyImpl,
  enemiesIn,
  hitEnemy,
  nearestEnemy,
  spawnPlayerProj,
  targetable,
  threatOf,
} from './sim/combat.js';
import {
  CHUNK, biomeOf, chunksNear, clampToRegion, getChunk, worldDef,
} from './sim/map/chunks.js';
import {
  bossCleared, campCleared, engageBossGate, updateWorldFeatures,
} from './sim/map/features.js';
import {
  classChannelMult, gainOpportunity, gainRage, updatePlayer,
} from './sim/player.js';
import { updateBasicAttack } from './sim/basicAttack.js';
import { updateSustains } from './sim/entities/sustains.js';
import { updateTraps } from './sim/entities/traps.js';
import { updateProjectiles } from './sim/entities/projectiles.js';
import { updateZones } from './sim/entities/zones.js';
import { updateTelegraphs } from './sim/entities/telegraphs.js';
import { updateSummons } from './sim/entities/summons.js';
import { updatePickups } from './sim/entities/pickups.js';
import { updateCosmetics } from './sim/entities/cosmetics.js';
import { spawnEnemy as spawnEnemyImpl, spawnPointNear } from './sim/entities/spawn.js';
import { updateEnemy } from './sim/ai/index.js';
import { updateAlly } from './sim/ai/ally.js';
import { updateAmbientSpawns } from './sim/run/spawning.js';
import { sfx } from './audio.js';

export function spawnEnemy(...args) { return spawnEnemyImpl(...args); }

export { floater } from './sim/fx.js';
export { CHUNK, biomeOf, getChunk, worldDef };
export { engageBossGate };

export function applyStatus(...args) { return applyStatusImpl(...args); }
export function damageEnemy(...args) { return damageEnemyImpl(...args); }

// ═══ meta progression ═══ reaching a world once unlocks its card set for
// every later run — even back in World 1 there's a chance to draft it.
const META_KEY = 'arcana_meta';
function loadMeta() {
  try {
    if (typeof localStorage !== 'undefined') return JSON.parse(localStorage.getItem(META_KEY)) || {};
  } catch (e) { /* private mode etc. — fall back to memory */ }
  return {};
}
const META = { unlockedWorld: 1, ...loadMeta() };
export function metaUnlockedWorld() { return META.unlockedWorld || 1; }
function recordWorldReached(n) {
  if (n <= (META.unlockedWorld || 1)) return;
  META.unlockedWorld = n;
  try { if (typeof localStorage !== 'undefined') localStorage.setItem(META_KEY, JSON.stringify(META)); } catch (e) { /* ignore */ }
}
export function resetMetaProgress() {
  META.unlockedWorld = 1;
  try { if (typeof localStorage !== 'undefined') localStorage.removeItem(META_KEY); } catch (e) { /* ignore */ }
}

// ═══ game creation ═══
/** @returns {import('./sim/types.js').GameState} */
export function createGame(opts = {}) {
  const rng = makeRng(opts.seed);
  const bus = new EventBus();
  const engine = new CardEngine(bus, rng);
  const game = {
    bus, engine, rng, enemyIds: makeUidCounter(),
    state: 'title', // title | combat | reward | gameover
    time: 0, hitstop: 0, slowmo: 0,
    worldSeed: rng.int(0x7fffffff),
    world: 1,
    playerClass: 'mage',
    player: {
      x: 0, y: 0, vx: 0, vy: 0, r: 14,
      hp: 100, maxHp: 100, armor: 0, speed: 235,
      facing: -Math.PI / 2, moveDir: { x: 0, y: -1 },
      dashT: 0, dashCd: 0, dashDir: { x: 0, y: -1 }, iframes: 0, untargetable: 0,
      dodgeCredited: false, touchCd: 0, trail: [],
      attackT: 0.5, basicCount: 0, empower: null,
    },
    // class resources
    rage: 0, rageDecayT: 0, opportunity: 0,
    dashOverride: null,      // {def, spec, timeLeft, dur, color} — a card owning the Dash
    enemies: [], projectiles: [], enemyProjectiles: [], zones: [], telegraphs: [],
    summons: [], pickups: [], particles: [], floaters: [], fx: [],
    sustains: [], traps: [],
    relics: [], relicRadiusMult: 1, hasDuelist: false, hasCrossClass: false,
    camera: { x: 0, y: 0, shake: 0 },
    chunks: new Map(),
    zoneRegion: null,        // {x, y, r, kind: 'boss'|'duel', landmark?}
    activeBoss: null,
    // matchmaking / rival encounters
    mm: { state: 'idle', nextT: 40, searchT: 0, timeout: 9 },
    rival: null,             // neutral rival during the choice moment
    ally: null,              // partied rival
    encounterPause: false,
    banner: null, pendingReward: null, rewardQueue: [],
    stolen: null, dangerT: 0, kills: 0, runTime: 0, campsCleared: 0, bossesSlain: 0, duelsWon: 0,
    spawnT: 1.5,
    gold: 30, sanctuary: null,
    deckIds: STARTING_DECKS.mage.map(id => ({ id, lvl: 0 })),
    stateLabel: '',
    uiDirty: true,
  };

  engine.setDeck(game.deckIds);

  // ── engine ↔ world wiring ──
  engine.resolveCard = (inst, buffs, preview) => resolveCard(game, inst, buffs, preview);
  engine.computePreview = (def, buffs) => computePreview(game, def, buffs);
  engine.runEnchantAction = (doSpec, payload, ench) => runEnchantAction(game, doSpec, payload, ench);
  engine.classChannelMult = (def) => classChannelMult(game, def);

  bus.on(EVT.cardResolved, ({ inst }) => {
    sfx('resolve', inst.def.element);
    spark(game, game.player.x, game.player.y, colorOf(inst.def), 6, 90);
  });
  bus.on(EVT.cardDrawn, () => sfx('draw'));
  bus.on(EVT.flowGained, ({ amount }) => {
    for (let i = 0; i < Math.min(amount * 2, 8); i++)
      game.particles.push(mote(game, game.player.x, game.player.y, '#ffd97a'));
  });
  bus.on(EVT.perfectDodge, () => {
    engine.gainFlow(2, 'dodge');
    gainOpportunity(game, 1);
    floater(game, game.player.x, game.player.y - 30, 'PERFECT', '#ffd97a', 18);
    game.slowmo = 0.22; sfx('perfect');
  });
  bus.on(EVT.trapTriggered, () => gainOpportunity(game, 1));
  bus.on(EVT.enemyKilled, ({ enemy }) => {
    if (enemy.def.rival) duelVictory(game, enemy);
    else if (enemy.def.boss && game.zoneRegion?.kind === 'boss') bossCleared(game);
  });
  bus.on(EVT.powerGained, () => sfx('enchant'));
  return game;
}

/** @param {{ element?: string, school?: string }} def @returns {string} */
export function colorOf(def) { return ELEMENT_COLORS[def.element] || SCHOOL_COLORS[def.school]; }

// ═══ channel preview ═══
function computePreview(game, def, buffs) {
  const p = game.player;
  const radMult = (buffs.radiusMult || 1) * game.relicRadiusMult;
  const color = colorOf(def);
  if (def.preview) {
    const r = def.preview.r * radMult;
    if (def.targeting === 'self') return { x: p.x, y: p.y, r, follow: true, color };
    const t = nearestEnemy(game, p.x, p.y);
    return t ? { x: t.x, y: t.y, r, follow: false, color }
             : { x: p.x + Math.cos(p.facing) * 180, y: p.y + Math.sin(p.facing) * 180, r, follow: false, color };
  }
  if (def.targeting === 'nearest') {
    const t = nearestEnemy(game, p.x, p.y);
    if (t) return { enemy: t, r: 24, reticle: true, color, x: t.x, y: t.y };
  }
  return null;
}

// ═══ effect resolver ═══ every card flows through here; no one-off logic ═══
function resolveCard(game, inst, buffs, preview) {
  const def = inst.def;
  const p = game.player;
  const lvl = inst.lvl || 0; // combined duplicates: +25% damage, +8% area, +15% durations per level
  let dmgMult = (buffs.dmgMult || 1) * (1 + 0.25 * lvl);
  if (game.hasDuelist && def.school === 'Warrior' && game.engine.queue.length <= 1) dmgMult *= 1.6;
  const radMult = (buffs.radiusMult || 1) * game.relicRadiusMult * (1 + 0.08 * lvl);
  let critBonus = buffs.critChance || 0;
  if (game.playerClass === 'rogue') critBonus += game.opportunity * 0.03;
  const ctx = { def, buffs: { ...buffs, critChance: critBonus }, dmgMult, radMult, preview, lvl };
  for (const eff of def.effects) runEffect(game, eff, ctx);
  game.fx.push({ kind: 'cast', x: p.x, y: p.y, color: colorOf(def), t: 0, life: 0.35 });
}

function runEffect(game, eff, ctx) {
  const p = game.player;
  const engine = game.engine;
  switch (eff.type) {

    case 'power': engine.addPower(ctx.def, eff, 1 + 0.15 * (ctx.lvl || 0)); break;

    case 'sustained': {
      game.sustains.push({
        def: ctx.def, ctx, t: 0, dur: eff.dur * (1 + 0.15 * (ctx.lvl || 0)), tick: eff.tick, tickT: 0, do: eff.do,
        color: colorOf(ctx.def),
      });
      engine.sustainedActive = true;
      sfx('zone', ctx.def.element);
      break;
    }

    case 'trap': {
      game.traps.push({
        x: p.x, y: p.y, r: eff.r * ctx.radMult, armT: eff.arm, ttl: eff.ttl,
        dmg: eff.dmg, root: eff.root || 0, status: eff.status || null, ctx,
        color: colorOf(ctx.def),
      });
      sfx('engine');
      break;
    }

    case 'extendPower': engine.extendPowers(eff.sec); sfx('enchant'); break;

    // repositioning cards are not cast — they become your Dash for a while
    case 'dashOverride': {
      const dur = eff.dur * (1 + 0.15 * (ctx.lvl || 0));
      game.dashOverride = { def: ctx.def, spec: eff.move, timeLeft: dur, dur, color: colorOf(ctx.def) };
      floater(game, p.x, p.y - 34, `DASH → ${ctx.def.name.toUpperCase()}`, colorOf(ctx.def), 13);
      sfx('enchant');
      break;
    }

    case 'proj': {
      const n = eff.count || 1;
      const base = aimAngle(game);
      for (let i = 0; i < n; i++) {
        const a = eff.ring ? base + (i / n) * Math.PI * 2
                           : base + (n > 1 ? (i - (n - 1) / 2) * 0.16 : 0);
        spawnPlayerProj(game, p.x, p.y, a, eff, ctx);
      }
      sfx('cast', ctx.def.element);
      break;
    }

    case 'aoe': {
      let x, y;
      if (eff.atFacing != null) { const a = aimAngle(game); x = p.x + Math.cos(a) * eff.atFacing; y = p.y + Math.sin(a) * eff.atFacing; }
      else if (ctx.preview && !ctx.preview.reticle) { x = ctx.preview.x; y = ctx.preview.y; }
      else if (ctx.def.targeting === 'self') { x = p.x; y = p.y; }
      else { const t = nearestEnemy(game, p.x, p.y); x = t ? t.x : p.x; y = t ? t.y : p.y; }
      const r = eff.r * ctx.radMult;
      let hits = 0;
      for (const e of enemiesIn(game, x, y, r)) {
        hits++;
        if (eff.dmg > 0) hitEnemy(game, e, eff.dmg, ctx, eff);
        if (e.dead) continue;
        const hardy = e.def.boss || e.def.rival;
        if (eff.freeze) e.freeze = Math.max(e.freeze || 0, hardy ? eff.freeze * 0.25 : eff.freeze);
        if (eff.stun) e.stun = Math.max(e.stun || 0, hardy ? eff.stun * 0.25 : eff.stun);
        if (eff.root) e.root = Math.max(e.root || 0, hardy ? 0 : eff.root);
        if (eff.knockback) { const a = Math.atan2(e.y - y, e.x - x); e.kvx = Math.cos(a) * eff.knockback; e.kvy = Math.sin(a) * eff.knockback; e.kt = 0.25; }
      }
      if (eff.flowPerHit) engine.gainFlow(hits * eff.flowPerHit, 'manaburst');
      game.fx.push({ kind: 'blast', x, y, r, color: ELEMENT_COLORS[ctx.def.element] || colorOf(ctx.def), t: 0, life: 0.5 });
      spark(game, x, y, ELEMENT_COLORS[ctx.def.element] || '#fff', Math.min(6 + r / 12, 26), r * 1.6, 0.55);
      shake(game, eff.shake || Math.min(4 + r / 40, 10));
      if ((eff.shake || 0) >= 14) game.hitstop = Math.max(game.hitstop, 0.08);
      sfx('blast', ctx.def.element);
      break;
    }

    case 'zone': {
      let x, y, follow = !!eff.follow;
      if (follow || ctx.def.targeting === 'self') { x = p.x; y = p.y; }
      else if (ctx.preview) { x = ctx.preview.x; y = ctx.preview.y; }
      else { const t = nearestEnemy(game, p.x, p.y); x = t ? t.x : p.x; y = t ? t.y : p.y; }
      game.zones.push({
        x, y, r: eff.r * ctx.radMult, t: 0, duration: eff.duration * (1 + 0.15 * (ctx.lvl || 0)),
        tickDmg: eff.tickDmg, tickRate: eff.tickRate || 0.5, tickT: 0,
        status: eff.status || null, slow: eff.slow || 0, follow,
        color: ELEMENT_COLORS[ctx.def.element], element: ctx.def.element, ctx,
      });
      sfx('zone', ctx.def.element);
      break;
    }

    case 'arc': {
      const a0 = aimAngle(game);
      const half = (eff.arc * Math.PI / 180) / 2;
      const range = eff.range * ctx.radMult;
      for (const e of game.enemies) {
        if (!targetable(e)) continue;
        const d = Math.hypot(e.x - p.x, e.y - p.y);
        if (d > range + e.r) continue;
        let da = Math.atan2(e.y - p.y, e.x - p.x) - a0;
        da = wrapAngle(da);
        if (Math.abs(da) > half + 0.25) continue;
        let dmg = eff.dmg;
        if (eff.executeBelow && e.hp / e.maxHp < eff.executeBelow) dmg *= eff.executeMult;
        hitEnemy(game, e, dmg, ctx, eff);
        if (!e.dead && eff.knockback) { e.kvx = Math.cos(a0) * eff.knockback; e.kvy = Math.sin(a0) * eff.knockback; e.kt = 0.2; }
      }
      game.fx.push({ kind: 'arc', x: p.x, y: p.y, ang: a0, arc: half * 2, range, color: ELEMENT_COLORS[ctx.def.element] || '#e8dcc0', t: 0, life: 0.28 });
      shake(game, 4); sfx('slash');
      break;
    }

    case 'chain': {
      const start = nearestEnemy(game, p.x, p.y);
      if (start) chainFrom(game, start, eff, ctx, p.x, p.y);
      break;
    }

    case 'blink': {
      let a;
      const t = nearestEnemy(game, p.x, p.y);
      if (eff.away && t) a = Math.atan2(p.y - t.y, p.x - t.x);
      else a = Math.atan2(p.moveDir.y, p.moveDir.x);
      spark(game, p.x, p.y, colorOf(ctx.def), 10, 140);
      p.x += Math.cos(a) * eff.dist; p.y += Math.sin(a) * eff.dist;
      clampToRegion(game, p);
      if (eff.untargetable) p.untargetable = Math.max(p.untargetable, eff.untargetable);
      if (eff.empower) { p.empower = { ...eff.empower }; floater(game, p.x, p.y - 30, 'EMPOWERED', '#a98fe0', 12); }
      spark(game, p.x, p.y, colorOf(ctx.def), 10, 140);
      sfx('blink');
      break;
    }

    case 'dashAttack': {
      const a = aimAngle(game);
      const x0 = p.x, y0 = p.y;
      p.x += Math.cos(a) * eff.dist; p.y += Math.sin(a) * eff.dist;
      clampToRegion(game, p);
      for (const e of game.enemies) {
        if (!targetable(e)) continue;
        if (distToSegment(e.x, e.y, x0, y0, p.x, p.y) < 60 + e.r) {
          hitEnemy(game, e, eff.dmg, ctx, eff);
          if (e.dead) continue;
          if (eff.gather) { // drag enemies along toward the destination
            const ka = Math.atan2(p.y - e.y, p.x - e.x);
            e.kvx = Math.cos(ka) * eff.gather; e.kvy = Math.sin(ka) * eff.gather; e.kt = 0.3;
          } else if (eff.knockback) {
            const ka = Math.atan2(e.y - y0, e.x - x0);
            e.kvx = Math.cos(ka) * eff.knockback; e.kvy = Math.sin(ka) * eff.knockback; e.kt = 0.25;
          }
        }
      }
      game.fx.push({ kind: 'streak', x1: x0, y1: y0, x2: p.x, y2: p.y, color: '#e8dcc0', t: 0, life: 0.3 });
      shake(game, 5); sfx('charge');
      break;
    }

    case 'armor': p.armor = Math.min(60, p.armor + eff.amount); floater(game, p.x, p.y - 30, '+' + eff.amount + ' ARMOR', '#ffd97a', 13); sfx('armor'); break;
    case 'stabilize': {
      const amt = engine.powers.length > 0 ? eff.high : eff.low;
      p.armor = Math.min(60, p.armor + amt); floater(game, p.x, p.y - 30, '+' + amt + ' ARMOR', '#ffd97a', 13); sfx('armor');
      break;
    }
    case 'draw': for (let i = 0; i < eff.n; i++) engine.drawCard('card'); break;
    case 'queueOp': engine.queueOp(eff.op, { costMult: eff.costMult }); sfx('engine'); break;
    case 'mod': engine.addModifier(ctx.def, eff); sfx('engine'); break;
    case 'enchant': engine.addEnchant(eff, { name: ctx.def.name, glyph: ctx.def.glyph, color: colorOf(ctx.def) }); sfx('enchant'); break;
    case 'haste': engine.hasteMult = eff.mult; engine.hasteTimer = eff.dur; sfx('enchant'); break;
    case 'flowOverTime': engine.flowJobs.push({ amount: eff.amount, dur: eff.dur, remaining: eff.amount }); sfx('engine'); break;
    case 'mark': {
      const t = nearestEnemy(game, p.x, p.y);
      if (t) { t.mark = { t: eff.dur, amp: eff.amp, crit: eff.crit || 0 }; floater(game, t.x, t.y - t.r - 10, 'MARKED', '#a98fe0', 12); }
      break;
    }
    case 'summon': {
      game.summons.push({ kind: eff.kind, x: p.x + 30, y: p.y + 10, t: 0, dur: eff.dur, fireT: 0.3, fireRate: eff.fireRate, dmg: eff.dmg, ctx });
      sfx('enchant');
      break;
    }
  }
}

function runEnchantAction(game, doSpec, payload, ench) {
  const p = game.player;
  const engine = game.engine;
  if (doSpec.flow) engine.gainFlow(doSpec.flow, 'enchant');
  if (doSpec.flowIfNear && nearestEnemy(game, p.x, p.y, undefined, 260)) engine.gainFlow(doSpec.flowIfNear, 'momentum');
  if (doSpec.draw) for (let i = 0; i < doSpec.draw; i++) engine.drawCard('enchant');
  if (doSpec.nextChannelMult) engine.nextChannelMult = doSpec.nextChannelMult;
  if (doSpec.cycleAttunement) {
    const opts = ATTUNEMENT_IDS.filter(id => id !== payload.id);
    const inst = game.engine.makeCard(game.rng.pick(opts));
    inst.cost = 0;
    engine.queue.unshift(inst);
    engine.uiDirty = true;
    game.bus.emit(EVT.cardQueued, { inst });
    floater(game, p.x, p.y - 38, 'THE CYCLE TURNS', '#b48cff', 12);
  }
  if (doSpec.burst) {
    const x = payload.x ?? p.x, y = payload.y ?? p.y, b = doSpec.burst;
    for (const e of enemiesIn(game, x, y, b.r)) damageEnemy(game, e, b.dmg, { color: ELEMENT_COLORS[b.element], quiet: true });
    game.fx.push({ kind: 'blast', x, y, r: b.r, color: ELEMENT_COLORS[b.element], t: 0, life: 0.35 });
  }
  if (doSpec.counterArc) {
    const c = doSpec.counterArc;
    for (const e of enemiesIn(game, p.x, p.y, c.range)) damageEnemy(game, e, c.dmg, { color: '#e8dcc0' });
    game.fx.push({ kind: 'arc', x: p.x, y: p.y, ang: p.facing, arc: Math.PI * 2, range: c.range, color: '#e8dcc0', t: 0, life: 0.3 });
    sfx('slash');
  }
  if (doSpec.spreadStatus && payload.enemy) {
    const s = doSpec.spreadStatus;
    for (const e of enemiesIn(game, payload.enemy.x, payload.enemy.y, s.r)) {
      if (e !== payload.enemy && !e.dead) applyStatus(game, e, s.status, s.stacks);
    }
    game.fx.push({ kind: 'blast', x: payload.enemy.x, y: payload.enemy.y, r: s.r, color: ELEMENT_COLORS.poison, t: 0, life: 0.4 });
  }
  if (ench && !ench.relic) spark(game, p.x, p.y, ench.color, 4, 80);
}

// ═══ run lifecycle ═══

// Every run starts with a rolled hand: 9 randomized Commons and 1 Uncommon,
// class-focused, guaranteed playable (Powers + a Spell + a Skill). Cards from
// meta-unlocked later worlds have a small chance to appear.
export function rollStartingDeck(classId, unlockedWorld = 1, world = 1, rng = makeRng(Date.now())) {
  const school = CLASSES[classId].school;
  const maxW = Math.max(world, unlockedWorld);
  const weightOf = (c) => {
    if ((c.world || 1) > maxW) return 0;
    let w = c.school === school ? 1 : c.school === 'Colorless' ? 0.45 : 0;
    if ((c.world || 1) > world) w *= 0.4;
    return w;
  };
  const commons = CARD_LIST.filter(c => c.rarity === 'Common' && weightOf(c) > 0);
  const uncommons = CARD_LIST.filter(c => c.rarity === 'Uncommon' && weightOf(c) > 0);
  const deck = [];
  const copies = new Map();
  const take = (pool) => {
    const avail = pool.filter(c => (copies.get(c.id) || 0) < 2);
    if (!avail.length) return null;
    let total = 0; for (const c of avail) total += weightOf(c);
    let roll = rng.float() * total;
    let pick = avail[0];
    for (const c of avail) { roll -= weightOf(c); if (roll <= 0) { pick = c; break; } }
    copies.set(pick.id, (copies.get(pick.id) || 0) + 1);
    deck.push({ id: pick.id, lvl: 0 });
    return pick;
  };
  // playability guarantees, then random fill
  take(commons.filter(c => c.cat === 'Power' && c.school === school));
  take(commons.filter(c => c.cat === 'Power' && c.school === school));
  take(commons.filter(c => c.cat === 'Spell' && c.school === school));
  take(commons.filter(c => c.cat === 'Skill' && c.school === school));
  let guard = 80;
  while (deck.length < 9 && guard-- > 0) take(commons);
  take(uncommons.length ? uncommons : commons);
  return deck;
}

// Rolled before the run so the player can SEE the hand and pick a world.
export function prepareRun(game, classId, world = 1) {
  return { classId, world, deck: rollStartingDeck(classId, metaUnlockedWorld(), world, game.rng) };
}

export function startRun(game, classId = 'mage', opts = {}) {
  game.playerClass = classId;
  game.world = Math.min(Math.max(opts.world || 1, 1), WORLDS.length);
  recordWorldReached(game.world);
  const deck = opts.deck || rollStartingDeck(classId, metaUnlockedWorld(), game.world, game.rng);
  game.deckIds = deck.map(e => typeof e === 'string' ? { id: e, lvl: 0 } : { id: e.id, lvl: e.lvl || 0 });
  game.gold = 30; game.sanctuary = null;
  game.relics = [];
  game.relicRadiusMult = 1; game.hasDuelist = false; game.hasCrossClass = false;
  game.state = 'combat';
  game.kills = 0; game.runTime = 0; game.campsCleared = 0; game.bossesSlain = 0; game.duelsWon = 0;
  game.rage = 0; game.opportunity = 0; game.dashOverride = null;
  game.worldSeed = opts.seed ?? game.rng.int(0x7fffffff);
  game.chunks = new Map();
  game.player.hp = game.player.maxHp; game.player.armor = 0;
  game.player.x = CHUNK / 2; game.player.y = CHUNK / 2;
  game.player.attackT = 0.5; game.player.basicCount = 0; game.player.empower = null;
  game.camera.x = game.player.x; game.camera.y = game.player.y;
  game.enemies = []; game.projectiles = []; game.enemyProjectiles = [];
  game.zones = []; game.telegraphs = []; game.pickups = []; game.sustains = []; game.traps = [];
  game.summons = [];
  game.zoneRegion = null; game.activeBoss = null;
  game.mm = { state: 'idle', nextT: 40, searchT: 0, timeout: 9 };
  game.rival = null; game.ally = null; game.encounterPause = false;
  game.stolen = null; game.pendingReward = null; game.rewardQueue = [];
  const engine = game.engine;
  engine.setDeck(game.deckIds);
  engine.flow = 4; engine.maxFlow = 10;
  engine.modStack = []; engine.enchants = []; engine.flowJobs = [];
  engine.hasteMult = 1; engine.hasteTimer = 0; engine.combo = 0;
  engine.channelMultGlobal = 1; engine.powerDurMult = 1; engine.sustainedActive = false;
  engine.drawTimer = 0.5;
  const cls = CLASSES[classId];
  game.banner = { title: worldDef(game).name, sub: `${cls.name} — ${cls.tagline}`, t: 2.6 };
  game.uiDirty = true;
  sfx('wave');
}

// ═══ rewards ═══
const RARITY_WEIGHT = { Common: 55, Uncommon: 30, Rare: 12, Legendary: 3 };
// Drafts favor your own school for synergy; some Colorless glue; other
// schools only with the Prismatic Codex relic. Each world's card set unlocks
// on arrival there — and stays meta-unlocked for every later run, with a
// reduced chance when you're playing an earlier world.
export function draftWeight(game, c) {
  const cardWorld = c.world || 1;
  const here = game.world || 1;
  if (cardWorld > Math.max(here, metaUnlockedWorld())) return 0; // never reached
  const school = CLASSES[game.playerClass].school;
  let w = RARITY_WEIGHT[c.rarity];
  if (cardWorld > here) w *= 0.3;              // meta-unlocked bleed-down: a chance, not the norm
  else if (cardWorld === here && cardWorld > 1) w *= 1.6; // the fresh set is favored
  if (c.school === school) return w;
  if (c.school === 'Colorless') return w * 0.35;
  return game.hasCrossClass ? w * 0.2 : 0;
}
export function makeCardReward(game) {
  const pool = CARD_LIST.filter(c => draftWeight(game, c) > 0);
  const opts = [];
  let guard = 200;
  while (opts.length < 3 && guard-- > 0) {
    let total = 0;
    for (const c of pool) total += draftWeight(game, c);
    let roll = game.rng.float() * total;
    let pick = pool[0];
    for (const c of pool) { roll -= draftWeight(game, c); if (roll <= 0) { pick = c; break; } }
    if (!opts.includes(pick)) opts.push(pick);
  }
  return { type: 'card', options: opts };
}
export function makeRelicReward(game) {
  const owned = new Set(game.relics.map(r => r.id));
  const pool = Object.values(RELICS).filter(r => !owned.has(r.id));
  if (pool.length === 0) return makeCardReward(game);
  const opts = [];
  let guard = 60;
  while (opts.length < Math.min(3, pool.length) && guard-- > 0) {
    const pick = game.rng.pick(pool);
    if (!opts.includes(pick)) opts.push(pick);
  }
  return { type: 'relic', options: opts };
}

export function offerReward(game, reward, heading) {
  game.rewardQueue.push({ ...reward, heading });
  if (!game.pendingReward) {
    game.pendingReward = game.rewardQueue.shift();
    game.state = 'reward';
    game.uiDirty = true;
    sfx('reward');
  }
}

export function applyReward(game, choice) {
  if (choice && game.pendingReward) {
    if (game.pendingReward.type === 'card') {
      game.deckIds.push({ id: choice.id, lvl: 0 });
      game.engine.deck.push(game.engine.makeCard(choice.id));
      game.engine.shuffleArray(game.engine.deck);
    } else {
      applyRelic(game, choice.id);
    }
  } else if (!choice) {
    game.player.hp = Math.min(game.player.maxHp, game.player.hp + 15);
  }
  if (game.rewardQueue.length > 0) {
    game.pendingReward = game.rewardQueue.shift();
    game.uiDirty = true;
    return;
  }
  game.pendingReward = null;
  game.state = 'combat';
  game.uiDirty = true;
}

function applyRelic(game, id) {
  const relic = RELICS[id];
  game.relics.push(relic);
  if (relic.stats) {
    if (relic.stats.maxFlow) game.engine.maxFlow += relic.stats.maxFlow;
    if (relic.stats.channelMult) game.engine.channelMultGlobal *= relic.stats.channelMult;
    if (relic.stats.radiusMult) game.relicRadiusMult *= relic.stats.radiusMult;
    if (relic.stats.powerDurMult) game.engine.powerDurMult *= relic.stats.powerDurMult;
    if (relic.stats.duelist) game.hasDuelist = true;
    if (relic.stats.crossClass) game.hasCrossClass = true;
  }
  if (relic.enchant) game.engine.addEnchant(relic.enchant, { name: relic.name, glyph: relic.glyph, color: relic.color });
  game.uiDirty = true;
}

// ═══ world progression: step through the portal a slain boss leaves behind ═══
export function advanceWorld(game, opts = {}) {
  if (game.world >= WORLDS.length) return;
  game.world++;
  recordWorldReached(game.world);
  const w = worldDef(game);
  game.worldSeed = opts.seed ?? game.rng.int(0x7fffffff);
  game.chunks = new Map();
  game.enemies = []; game.projectiles = []; game.enemyProjectiles = [];
  game.zones = []; game.telegraphs = []; game.pickups = []; game.sustains = []; game.traps = [];
  game.summons = [];
  game.engine.sustainedActive = false;
  game.zoneRegion = null; game.activeBoss = null;
  game.mm = { state: 'idle', nextT: game.rng.range(50, 80), searchT: 0, timeout: 9 };
  game.rival = null; game.ally = null; game.encounterPause = false;
  game.stolen = null; game.sanctuary = null;
  game.player.x = CHUNK / 2; game.player.y = CHUNK / 2;
  game.camera.x = game.player.x; game.camera.y = game.player.y;
  game.player.hp = Math.min(game.player.maxHp, game.player.hp + 40);
  game.banner = { title: w.name, sub: `${w.sub} — the realm grows crueler`, t: 3.2 };
  game.uiDirty = true;
  sfx('victory');
}

// ═══ sanctuaries: rest, trade, and combine duplicate cards ═══
export const CARD_PRICES = { Common: 25, Uncommon: 40, Rare: 70, Legendary: 120 };
export const MAX_CARD_LVL = 3;
export function sellPrice(entry) {
  const def = CARDS[entry.id];
  return Math.floor(CARD_PRICES[def.rarity] / 2) + (entry.lvl || 0) * 15;
}

// The merchant's stock is small and seeded: the same sanctuary always offers
// the same few cards (until bought), no matter when you arrive.
function buildStock(game, s) {
  if (s.stock) return;
  const rng = makeRng(s.seed);
  const pool = CARD_LIST.filter(c => draftWeight(game, c) > 0);
  s.stock = [];
  let guard = 80;
  while (s.stock.length < 4 && guard-- > 0) {
    let total = 0;
    for (const c of pool) total += draftWeight(game, c);
    let roll = rng.float() * total;
    let pick = pool[0];
    for (const c of pool) { roll -= draftWeight(game, c); if (roll <= 0) { pick = c; break; } }
    if (!s.stock.includes(pick)) s.stock.push(pick);
  }
}

export function openSanctuary(game, s) {
  s.lock = true;
  buildStock(game, s);
  game.sanctuary = s;
  game.state = 'sanctuary';
  game.player.hp = Math.min(game.player.maxHp, game.player.hp + 20);
  game.banner = { title: 'SANCTUARY', sub: 'The wards hold. Rest, trade, refine your deck.', t: 2.4 };
  game.uiDirty = true;
  sfx('shrine');
}

export function buyCard(game, idx) {
  const s = game.sanctuary;
  if (!s || !s.stock || !s.stock[idx]) return false;
  const def = s.stock[idx];
  const price = CARD_PRICES[def.rarity];
  if (game.gold < price) return false;
  game.gold -= price;
  s.stock.splice(idx, 1);
  game.deckIds.push({ id: def.id, lvl: 0 });
  game.uiDirty = true;
  sfx('reward');
  return true;
}

export function sellCard(game, id, lvl) {
  if (game.deckIds.length <= 6) return false; // never sell below a playable deck
  const i = game.deckIds.findIndex(e => e.id === id && (e.lvl || 0) === lvl);
  if (i < 0) return false;
  game.gold += sellPrice(game.deckIds[i]);
  game.deckIds.splice(i, 1);
  game.uiDirty = true;
  sfx('shard');
  return true;
}

// two identical cards of the same level fuse into one, a level higher
export function combineCards(game, id, lvl) {
  if (lvl >= MAX_CARD_LVL) return false;
  const idxs = [];
  game.deckIds.forEach((e, i) => { if (e.id === id && (e.lvl || 0) === lvl) idxs.push(i); });
  if (idxs.length < 2) return false;
  game.deckIds.splice(idxs[1], 1);
  game.deckIds[idxs[0]].lvl = lvl + 1;
  game.uiDirty = true;
  sfx('enchant');
  return true;
}

export function leaveSanctuary(game) {
  game.sanctuary = null;
  game.engine.setDeck(game.deckIds); // the rest reshuffles everything fresh
  game.state = 'combat';
  game.banner = { title: 'THE ROAD CALLS', sub: '', t: 1.4 };
  game.uiDirty = true;
  sfx('wave');
}

// ═══ matchmaking — rival soul encounters ═══
function makeRivalSoul(game) {
  const classIds = Object.keys(CLASSES);
  const cls = game.rng.pick(classIds);
  const cdef = CLASSES[cls];
  const name = `${game.rng.pick(RIVAL_ADJECTIVES)} ${cdef.name}`;
  // featured cards: the build identity — 1 Power, 1 Spell, 1 other, 1 Colorless
  const school = cdef.school;
  const pick = (fn) => {
    const pool = CARD_LIST.filter(c => (c.world || 1) <= (game.world || 1) && fn(c));
    return game.rng.pick(pool);
  };
  const featured = [];
  const used = new Set();
  const add = (c) => { if (c && !used.has(c.id)) { used.add(c.id); featured.push(c); } };
  add(pick(c => c.school === school && c.cat === 'Power'));
  add(pick(c => c.school === school && c.cat === 'Spell'));
  add(pick(c => c.school === school && !used.has(c.id)));
  add(pick(c => c.school === 'Colorless' && !used.has(c.id)));
  return { cls, name, featured, color: cdef.color };
}

function updateMatchmaking(game, dt) {
  const mm = game.mm;
  if (game.zoneRegion || game.state !== 'combat') return;
  if (mm.state === 'idle') {
    mm.nextT -= dt;
    if (mm.nextT <= 0) {
      mm.state = 'searching';
      mm.searchT = mm.timeout;
      game.banner = { title: 'A PRESENCE STIRS', sub: 'The realm seeks a rival soul…', t: 2.2 };
      sfx('enchant');
    }
  } else if (mm.state === 'searching') {
    mm.searchT -= dt;
    // hidden search — the world keeps flowing, no waiting screen
    if (game.rng.chance(0.13 * dt * 10)) return foundRival(game);
    if (mm.searchT <= 0) return matchmakingFallback(game);
  }
}

export function foundRival(game) {
  const mm = game.mm;
  mm.state = 'choice';
  const soul = makeRivalSoul(game);
  const p = game.player;
  const a = game.rng.range(0, Math.PI * 2);
  game.rival = { ...soul, x: p.x + Math.cos(a) * 380, y: p.y + Math.sin(a) * 380, wob: 0 };
  game.encounterPause = true; // the world holds its breath
  game.banner = { title: 'PLAYER ENCOUNTERED', sub: soul.name, t: 3 };
  game.uiDirty = true;
  sfx('bossintro');
}

export function matchmakingFallback(game) {
  const mm = game.mm;
  mm.state = 'idle';
  mm.nextT = game.rng.range(70, 110);
  game.banner = { title: 'NO RIVAL SOUL ANSWERED THE CALL', sub: 'A guardian has awakened instead', t: 3 };
  const threat = threatOf(game);
  const pt = spawnPointNear(game, 480, 600);
  spawnEnemy(game, 'guardian', pt.x, pt.y, { hpMult: 1 + threat * 0.15 });
  for (let i = 0; i < 3; i++) {
    const q = spawnPointNear(game, 420, 560);
    spawnEnemy(game, worldDef(game).tiers[0].id, q.x, q.y, { hpMult: 1 + threat * 0.1 });
  }
  sfx('bossintro');
}

export function resolveEncounterChoice(game, mine) {
  const mm = game.mm;
  if (mm.state !== 'choice' || !game.rival) return;
  const rivalWants = game.rng.chance(0.55) ? 'party' : 'fight';
  game.encounterPause = false;
  if (mine === 'fight' || rivalWants === 'fight') {
    if (mine !== 'fight') game.banner = { title: 'THE RIVAL DRAWS STEEL', sub: `${game.rival.name} refuses your pact`, t: 2.4 };
    startDuel(game);
  } else {
    startParty(game);
  }
  game.uiDirty = true;
}

function startDuel(game) {
  const mm = game.mm;
  const r = game.rival;
  const p = game.player;
  mm.state = 'duel';
  const cx = (p.x + r.x) / 2, cy = (p.y + r.y) / 2;
  game.zoneRegion = { x: cx, y: cy, r: 500, kind: 'duel' };
  // the duel zone empties of lesser threats
  for (const e of game.enemies) if (!e.def.boss) e.dead = true;
  game.enemies = game.enemies.filter(e => !e.dead);
  const threat = threatOf(game);
  const rivalDef = {
    id: 'rival', name: r.name, role: 'rival', hp: Math.round(180 + threat * 45), speed: 225,
    radius: 15, dmg: 10, behavior: 'rival', rival: true,
    color: '#161b30', glow: r.color, shards: 8,
  };
  spawnEnemy(game, rivalDef, r.x, r.y, { featured: r.featured, cls: r.cls });
  game.rival = null;
  game.banner = { title: 'DUEL', sub: 'Only one soul leaves the circle', t: 2.4 };
  sfx('bossphase');
}

function duelVictory(game, e) {
  game.duelsWon++;
  game.zoneRegion = null;
  game.mm = { state: 'idle', nextT: game.rng.range(75, 120), searchT: 0, timeout: 9 };
  game.player.hp = Math.min(game.player.maxHp, game.player.hp + 25);
  game.gold += 30;
  game.engine.gainFlow(5, 'duel');
  game.banner = { title: 'THE RIVAL SOUL YIELDS', sub: 'Its cards scatter — take any', t: 2.6 };
  // the spoils of a duel: any of the LOSER's cards, even off-class
  const spoils = e.featured && e.featured.length
    ? { type: 'card', options: e.featured.slice() }
    : makeCardReward(game);
  offerReward(game, spoils, `Claim any card from ${e.def.name}`);
  sfx('victory');
}

function startParty(game) {
  const mm = game.mm;
  const r = game.rival;
  mm.state = 'party';
  game.ally = {
    ...r, t: 0, dur: 90, attackT: 0.6, castT: 4,
    hp: 1, // cosmetic — allies are untargetable spirits
  };
  game.rival = null;
  game.banner = { title: 'PARTY FORMED', sub: `${game.ally.name} walks beside you — the realm answers in kind`, t: 3 };
  sfx('victory');
}


// ═══ master update ═══
export function updateGame(game, dt, input) {
  game.time += dt;
  if (game.state !== 'combat') return;
  if (game.hitstop > 0) { game.hitstop -= dt; return; }
  let ts = 1;
  if (game.slowmo > 0) { game.slowmo -= dt; ts = 0.35; }
  dt *= ts;

  // the choice moment: world holds still, only cosmetics breathe
  if (game.encounterPause) {
    if (game.rival) game.rival.wob = (game.rival.wob || 0) + dt;
    updateCosmetics(game, dt);
    updateStateLabel(game);
    if (game.banner) { game.banner.t -= dt; if (game.banner.t <= 0) game.banner = null; }
    return;
  }

  game.runTime += dt;

  updatePlayer(game, dt, input);
  chunksNear(game, game.player.x, game.player.y, 3); // keep the world generated ahead

  // engine
  const eng = game.engine;
  eng.followPos = { x: game.player.x, y: game.player.y };
  eng.update(dt);

  updateBasicAttack(game, dt);
  updateSustains(game, dt);
  updateTraps(game, dt);

  // class resources
  if (game.rageDecayT > 0) game.rageDecayT -= dt;
  else if (game.rage > 0) game.rage = Math.max(0, game.rage - 4 * dt);

  // the card that owns the Dash counts down
  if (game.dashOverride) {
    game.dashOverride.timeLeft -= dt;
    if (game.dashOverride.timeLeft <= 0) {
      floater(game, game.player.x, game.player.y - 30, 'DASH RESTORED', '#d9b45b', 11);
      game.dashOverride = null;
    }
  }

  // proximity flow: staying near danger builds momentum
  const near = game.enemies.some(e => e.state !== 'spawn' && Math.hypot(e.x - game.player.x, e.y - game.player.y) < 230);
  if (near) {
    game.dangerT += dt;
    if (game.dangerT >= 2) { game.dangerT = 0; eng.gainFlow(1, 'danger'); }
  }

  // stolen card returns
  if (game.stolen) {
    game.stolen.t -= dt;
    if (game.stolen.t <= 0) {
      eng.queue.unshift(game.stolen.inst);
      game.stolen = null; eng.uiDirty = true;
      floater(game, game.player.x, game.player.y - 40, 'CARD RETURNED', '#ffd97a', 13);
    }
  }

  updateWorldFeatures(game, dt);
  updateAmbientSpawns(game, dt);
  updateMatchmaking(game, dt);
  updateAlly(game, dt);

  // enemies
  for (const e of game.enemies) if (!e.dead) updateEnemy(game, e, dt);
  game.enemies = game.enemies.filter(e => !e.dead);

  updateProjectiles(game, dt);
  updateZones(game, dt);
  updateTelegraphs(game, dt);
  updateSummons(game, dt);
  updatePickups(game, dt);
  updateCosmetics(game, dt);
  updateStateLabel(game);

  // camera
  const cam = game.camera;
  cam.x += (game.player.x - cam.x) * Math.min(1, dt * 5);
  cam.y += (game.player.y - cam.y) * Math.min(1, dt * 5);
  cam.shake = Math.max(0, cam.shake - dt * 40);

  if (game.banner) { game.banner.t -= dt; if (game.banner.t <= 0) game.banner = null; }
}

function updateStateLabel(game) {
  const p = game.player;
  const biome = biomeOf(Math.floor(p.x / CHUNK), Math.floor(p.y / CHUNK), game.worldSeed, worldDef(game).biomes);
  let label = `${worldDef(game).sub} · ${biome.name}`;
  if (game.zoneRegion) label = game.zoneRegion.kind === 'duel' ? 'DUEL ZONE' : `${label} — Boss Gate`;
  else if (game.mm.state === 'party' && game.ally) label += ` — Party of 2`;
  else if (game.mm.state === 'searching') label += ' — seeking a rival soul…';
  game.stateLabel = label;
}

