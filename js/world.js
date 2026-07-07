// ── Arcana Engine · world simulation ───────────────────────────────────────
// Player + basic attacks, class resources, infinite procedural map, enemies,
// effect resolver, sustained casts, traps, rival encounters, boss gates.
// This file touches no DOM — the entire game simulates headlessly in Node.

import {
  CARDS, CARD_LIST, RELICS, ENEMIES, CLASSES, BIOMES, BIOME_IDS, WORLDS,
  ELEMENT_COLORS, SCHOOL_COLORS, STARTING_DECKS, ATTUNEMENT_IDS, RIVAL_ADJECTIVES,
} from './data.js';
import { CardEngine } from './engine.js';
import { EVT, EventBus } from './core/events.js';
import { makeUidCounter } from './core/ids.js';
import { hash2, makeRng } from './core/rng.js';
import { sfx } from './audio.js';

export const CHUNK = 560;

const STATUS_DEFS = {
  burn: { dps: 3.0, dur: 3.0, color: ELEMENT_COLORS.fire },
  poison: { dps: 1.6, dur: 6.0, color: ELEMENT_COLORS.poison },
  bleed: { dps: 2.2, dur: 4.0, color: '#ff5d6a' },
  chill: { dps: 0, dur: 2.2, color: ELEMENT_COLORS.frost },
};

// ═══ deterministic procedural helpers ═══

export function worldDef(game) {
  return WORLDS[Math.min(game.world || 1, WORLDS.length) - 1];
}

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

export function biomeOf(cx, cy, seed, biomeIds = BIOME_IDS) {
  const rx = Math.floor(cx / 6), ry = Math.floor(cy / 6);
  if (rx === 0 && ry === 0) return BIOMES[biomeIds[0]]; // home region
  return BIOMES[biomeIds[hash2(rx, ry, seed + 77) % biomeIds.length]];
}

// ═══ game creation ═══
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
  bus.on(EVT.powerGained, () => sfx('enchant'));
  return game;
}

export function colorOf(def) { return ELEMENT_COLORS[def.element] || SCHOOL_COLORS[def.school]; }

// ═══ infinite procedural map ═══
function chunkKey(cx, cy) { return cx + ',' + cy; }

export function getChunk(game, cx, cy) {
  const key = chunkKey(cx, cy);
  let ch = game.chunks.get(key);
  if (ch) return ch;
  const rng = makeRng(hash2(cx, cy, game.worldSeed));
  const bx = cx * CHUNK, by = cy * CHUNK;
  const dist = Math.max(Math.abs(cx), Math.abs(cy)); // chebyshev distance from origin
  const at = (m = 80) => ({ x: bx + m + rng.float() * (CHUNK - 2 * m), y: by + m + rng.float() * (CHUNK - 2 * m) });
  ch = { cx, cy, biome: biomeOf(cx, cy, game.worldSeed, worldDef(game).biomes), pillars: [], pools: [], candles: [], deco: [] };

  const nPil = rng.chance(0.55) ? 0 : 1 + rng.int(2);
  for (let i = 0; i < nPil; i++) { const p = at(70); ch.pillars.push({ x: p.x, y: p.y, r: 26 + rng.float() * 20 }); }
  if (rng.chance(0.22)) { const p = at(120); ch.pools.push({ x: p.x, y: p.y, r: 70 + rng.float() * 50 }); }
  const nCd = rng.int(3);
  for (let i = 0; i < nCd; i++) ch.candles.push(at(50));
  for (let i = 0; i < 4 + rng.int(4); i++) ch.deco.push({ ...at(30), rot: rng.float() * Math.PI * 2, kind: rng.chance(0.6) ? 'card' : 'rune', g: rng.int(4) });
  if (rng.chance(0.06) && dist >= 1) ch.shrine = { ...at(90), r: 26, cd: 0 };
  if (rng.chance(0.11) && dist >= 2) {
    const p = at(180);
    ch.camp = { x: p.x, y: p.y, r: 230, size: 4 + Math.min(6, dist), cleared: false, engaged: false, alive: 0 };
  }
  if (rng.chance(0.035) && dist >= 4) {
    const p = at(200);
    ch.landmark = { x: p.x, y: p.y, r: 120, zoneR: 430, cleared: false, engaged: false };
  }
  if (rng.chance(0.05) && dist >= 1 && !ch.camp) ch.treasure = { ...at(90), opened: false };
  // sanctuaries: warded rest sites with a merchant and a card table
  if (rng.chance(0.055) && dist >= 2 && !ch.camp && !ch.landmark)
    ch.sanctuary = { ...at(160), r: 190, seed: hash2(cx, cy, game.worldSeed + 1234), lock: false, stock: null };
  // keep the very first screen clean
  if (cx === 0 && cy === 0) { ch.pillars = ch.pillars.slice(0, 1); ch.pools = []; ch.shrine = { x: bx + 140, y: by + 140, r: 26, cd: 0 }; }
  game.chunks.set(key, ch);
  return ch;
}

function chunksNear(game, x, y, radius = 1) {
  const cx = Math.floor(x / CHUNK), cy = Math.floor(y / CHUNK);
  const out = [];
  for (let dy = -radius; dy <= radius; dy++)
    for (let dx = -radius; dx <= radius; dx++)
      out.push(getChunk(game, cx + dx, cy + dy));
  return out;
}

function clampToRegion(game, obj, pad = 0) {
  const z = game.zoneRegion;
  if (!z) return;
  const dx = obj.x - z.x, dy = obj.y - z.y;
  const d = Math.hypot(dx, dy);
  const max = z.r - (obj.r || 12) - pad;
  if (d > max) { obj.x = z.x + dx / d * max; obj.y = z.y + dy / d * max; }
}

// ═══ helper queries ═══
function nearestEnemy(game, x, y, excludeUid, maxDist = Infinity) {
  let best = null, bd = maxDist * maxDist;
  for (const e of game.enemies) {
    if (!targetable(e) || e.uid === excludeUid) continue;
    const d = (e.x - x) ** 2 + (e.y - y) ** 2;
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}
function enemiesIn(game, x, y, r) {
  return game.enemies.filter(e => targetable(e) && Math.hypot(e.x - x, e.y - y) <= r + e.r);
}
export function floater(game, x, y, txt, color, size = 13, crit = false) {
  game.floaters.push({ x: x + game.rng.range(-10, 10), y, txt, color, t: 0, life: crit ? 1.1 : 0.8, size: crit ? size * 1.5 : size, crit });
}
function spark(game, x, y, color, n = 8, speed = 160, life = 0.5) {
  for (let i = 0; i < n; i++) {
    const a = game.rng.range(0, Math.PI * 2), s = speed * (0.4 + game.rng.float() * 0.8);
    game.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0, life: life * (0.6 + game.rng.float() * 0.8), size: 2 + game.rng.float() * 3, color, add: true, drag: 3 });
  }
}
function mote(game, x, y, color) {
  const a = game.rng.range(0, Math.PI * 2);
  return { x: x + Math.cos(a) * 26, y: y + Math.sin(a) * 26, vx: Math.cos(a) * 40, vy: Math.sin(a) * 40 - 60, t: 0, life: 0.7, size: 2.5, color, add: true, drag: 2 };
}
function ringFx(game, x, y, r, color, life = 0.45) { game.fx.push({ kind: 'ring', x, y, r, color, t: 0, life }); }
function shake(game, amt) { game.camera.shake = Math.min(26, game.camera.shake + amt); }

function threatOf(game) {
  const dist = Math.hypot(game.player.x, game.player.y);
  return (1 + game.runTime / 55 + game.kills / 50 + dist / 3800) * worldDef(game).threatMult;
}

// vanished stalkers and still-spawning enemies can't be hit or targeted
function targetable(e) { return !e.dead && e.state !== 'spawn' && e.state !== 'vanish'; }

// ═══ class resources ═══
function gainRage(game, n) {
  if (game.playerClass !== 'warrior') return;
  game.rage = Math.min(100, game.rage + n);
  game.rageDecayT = 2.5;
}
function gainOpportunity(game, n) {
  if (game.playerClass !== 'rogue') return;
  const before = game.opportunity;
  game.opportunity = Math.min(CLASSES.rogue.resource.max, game.opportunity + n);
  if (game.opportunity > before) floater(game, game.player.x, game.player.y - 34, 'OPPORTUNITY', '#8ade6a', 11);
}
function classChannelMult(game, def) {
  if (game.playerClass === 'warrior' && def.school === 'Warrior' && game.rage > 0) {
    return 1 / (1 + (game.rage / 100) * 0.8); // up to 80% faster at full Rage
  }
  if (game.playerClass === 'rogue' && def.school === 'Rogue' && game.opportunity > 0) {
    game.opportunity -= 1; // spend a stack to quicken the card
    floater(game, game.player.x, game.player.y - 30, 'QUICKENED', '#8ade6a', 12);
    return 0.6;
  }
  return 1;
}

// ═══ damage ═══
export function applyStatus(game, e, status, stacks) {
  if ((e.def.boss || e.def.rival) && status === 'chill') stacks = Math.min(stacks, 1);
  const sd = STATUS_DEFS[status];
  if (!sd) return;
  const cur = e.statuses[status];
  if (cur) { cur.stacks += stacks; cur.t = sd.dur; }
  else e.statuses[status] = { stacks, t: sd.dur };
  game.bus.emit(EVT.statusApplied, { enemy: e, status, x: e.x, y: e.y });
}

export function damageEnemy(game, e, amount, opts = {}) {
  if (!targetable(e)) return;
  let dmg = amount;
  if (e.mark && e.mark.t > 0) dmg *= e.mark.amp;
  if (opts.crit) dmg *= 2;
  dmg = Math.max(1, Math.round(dmg));
  e.hp -= dmg; e.hitFlash = 0.12;
  floater(game, e.x, e.y - e.r - 6, String(dmg), opts.crit ? '#ffd97a' : (opts.color || '#f2ead6'), opts.crit ? 15 : 12, opts.crit);
  if (opts.crit) sfx('crit'); else if (!opts.quiet) sfx('hit');
  if (e.hp <= 0) killEnemy(game, e, opts);
}

function killEnemy(game, e, opts = {}) {
  if (e.dead) return;
  e.dead = true;
  game.kills++;
  spark(game, e.x, e.y, e.def.glow, e.def.boss ? 40 : 14, 220, 0.7);
  ringFx(game, e.x, e.y, e.r * 2.2, e.def.glow, 0.4);
  sfx(e.def.boss || e.def.rival ? 'bossdie' : 'kill');
  if (e.def.elite || e.def.boss || e.def.rival) { shake(game, 10); game.hitstop = Math.max(game.hitstop, 0.09); }
  for (let i = 0; i < e.def.shards; i++) {
    const a = game.rng.range(0, Math.PI * 2), s = 60 + game.rng.float() * 90;
    game.pickups.push({ x: e.x, y: e.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, kind: 'shard', t: 0 });
  }
  if (!e.def.boss && !e.def.rival && game.rng.chance(0.07))
    game.pickups.push({ x: e.x, y: e.y, vx: 0, vy: -40, kind: 'heart', t: 0 });
  // World II+: some enemies detonate on death — dying close to them hurts
  if (e.def.deathBurst) {
    const b = e.def.deathBurst;
    if (Math.hypot(game.player.x - e.x, game.player.y - e.y) < b.r + game.player.r)
      damagePlayer(game, b.dmg, e.x, e.y);
    game.fx.push({ kind: 'blast', x: e.x, y: e.y, r: b.r, color: e.def.glow, t: 0, life: 0.4 });
    sfx('boom');
  }
  // gold: the sanctuary economy
  if (e.def.elite || e.def.rival) game.pickups.push({ x: e.x, y: e.y, vx: 0, vy: -50, kind: 'gold', value: 6, t: 0 });
  else if (!e.def.boss && game.rng.chance(0.3))
    game.pickups.push({ x: e.x, y: e.y, vx: game.rng.range(-40, 40), vy: -40, kind: 'gold', value: 1 + game.rng.int(2), t: 0 });

  // class resources on kills
  const p = game.player;
  if (Math.hypot(e.x - p.x, e.y - p.y) < 170) gainRage(game, 6);
  gainOpportunity(game, e.statuses.poison ? 2 : 1);

  if (e.campRef) { e.campRef.alive -= 1; if (e.campRef.alive <= 0 && e.campRef.engaged) campCleared(game, e.campRef); }
  if (e.def.rival) { duelVictory(game, e); return; }
  if (e.def.boss && game.zoneRegion && game.zoneRegion.kind === 'boss') bossCleared(game);
  game.bus.emit(EVT.enemyKilled, { enemy: e, x: e.x, y: e.y });
}

function damagePlayer(game, amount, srcX, srcY) {
  const p = game.player;
  if (game.state !== 'combat' || game.encounterPause) return;
  if (p.untargetable > 0) return;
  if (p.iframes > 0) {
    if (!p.dodgeCredited && p.dashT > 0) { p.dodgeCredited = true; game.bus.emit(EVT.perfectDodge, {}); }
    return;
  }
  let dmg = amount;
  if (p.armor > 0) {
    const ab = Math.min(p.armor, dmg); p.armor -= ab; dmg -= ab;
    floater(game, p.x, p.y - 24, 'BLOCK ' + ab, '#ffd97a', 12);
    gainRage(game, 4);
  }
  if (dmg > 0) {
    p.hp -= dmg;
    floater(game, p.x, p.y - 26, '-' + dmg, '#ff5d6a', 15);
    shake(game, 7); game.hitstop = Math.max(game.hitstop, 0.05);
    sfx('hurt');
    p.iframes = Math.max(p.iframes, 0.5);
    gainRage(game, 10);
    for (const pw of game.engine.powers) if (pw.spec.extendOnHit) pw.timeLeft += pw.spec.extendOnHit;
    game.bus.emit(EVT.playerHit, { amount: dmg });
    if (p.hp <= 0) { p.hp = 0; game.state = 'gameover'; sfx('death'); }
  }
}

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

function hitEnemy(game, e, rawDmg, ctx, eff, opts = {}) {
  let critChance = (eff.critChance || 0) + (ctx.buffs.critChance || 0);
  if (e.mark && e.mark.t > 0 && e.mark.crit) critChance += e.mark.crit;
  const crit = game.rng.chance(critChance);
  damageEnemy(game, e, rawDmg * ctx.dmgMult, { crit, color: ELEMENT_COLORS[ctx.def.element], ...opts });
  if (e.dead) return;
  if (eff.status) applyStatus(game, e, eff.status[0], eff.status[1]);
  for (const st of ctx.buffs.addStatus || []) applyStatus(game, e, st[0], st[1]);
}

function aimAngle(game) {
  const p = game.player;
  const t = nearestEnemy(game, p.x, p.y);
  return t ? Math.atan2(t.y - p.y, t.x - p.x) : p.facing;
}

function chainFrom(game, start, spec, ctx, fromX, fromY) {
  let cur = start;
  let px = fromX, py = fromY;
  const struck = new Set();
  for (let j = 0; j <= spec.jumps && cur; j++) {
    struck.add(cur.uid);
    game.fx.push({ kind: 'bolt', x1: px, y1: py, x2: cur.x, y2: cur.y, color: ELEMENT_COLORS.lightning, t: 0, life: 0.22 });
    hitEnemy(game, cur, spec.dmg, ctx, spec);
    px = cur.x; py = cur.y;
    let next = null, bd = spec.range * spec.range;
    for (const e of game.enemies) {
      if (e.state === 'spawn' || struck.has(e.uid) || e.dead) continue;
      const d = (e.x - px) ** 2 + (e.y - py) ** 2;
      if (d < bd) { bd = d; next = e; }
    }
    cur = next;
  }
  sfx('zap');
}

function spawnPlayerProj(game, x, y, angle, spec, ctx) {
  game.projectiles.push({
    x, y, vx: Math.cos(angle) * spec.speed, vy: Math.sin(angle) * spec.speed,
    r: spec.radius, dmg: spec.dmg, eff: spec, ctx, pierce: spec.pierce || 0,
    life: spec.life || 2.2, t: 0, boomerang: spec.boomerang, phase: 0,
    rehit: spec.rehit ? new Map() : null,
    color: ELEMENT_COLORS[spec.element || ctx.def.element] || '#fff',
    hit: new Set(),
  });
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
        while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
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

function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy;
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

// ═══ the basic attack — the constant action layer; NOT a card ═══
function updateBasicAttack(game, dt) {
  const p = game.player;
  const cls = CLASSES[game.playerClass];
  if (!cls) return;
  const mods = game.engine.basicMods();
  p.attackT -= dt;
  if (p.attackT > 0) return;

  const base = cls.basic;
  const range = base.kind === 'arc' ? base.range * mods.arcMult * 0.6 + base.range : base.range;
  const target = nearestEnemy(game, p.x, p.y, undefined, range);
  if (!target) { p.attackT = 0.08; return; }
  p.attackT = base.rate * mods.rateMult;

  let dmgMult = mods.dmgMult;
  if (game.playerClass === 'warrior') dmgMult *= 1 + game.rage / 200; // Rage empowers swings
  let critBonus = 0;
  if (game.playerClass === 'rogue') critBonus += game.opportunity * 0.03;
  if (p.empower) { dmgMult *= p.empower.mult; critBonus += p.empower.crit || 0; p.empower = null; }

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
      while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
      if (Math.abs(da) > half + 0.2) continue;
      hits++;
      hitEnemy(game, e, base.dmg, ctx, { critChance: 0 }, { quiet: hits > 1 });
      if (!e.dead && base.knockback) { e.kvx = Math.cos(ang) * base.knockback; e.kvy = Math.sin(ang) * base.knockback; e.kt = 0.15; }
    }
    gainRage(game, 2 + hits * 2);
    game.fx.push({ kind: 'arc', x: p.x, y: p.y, ang, arc: half * 2, range: reach, color: ELEMENT_COLORS[base.element], t: 0, life: 0.22 });
    sfx('slash');
  } else {
    // projectile bolt / knife — possibly transformed by an active Power
    const spec = mods.override
      ? { ...mods.override, life: 1.6 }
      : { dmg: base.dmg, speed: base.speed, radius: base.radius, critChance: base.critChance || 0, element: base.element, life: 1.6 };
    const ctx = { def: { element: spec.element || base.element }, buffs: { addStatus: mods.addStatus, critChance: critBonus }, dmgMult, basic: true };
    spawnPlayerProj(game, p.x, p.y, ang, spec, ctx);
    // Arcane Mirror: every Nth basic fires an extra bolt at another enemy
    if (mods.extraEvery && p.basicCount % mods.extraEvery === 0) {
      const other = nearestEnemy(game, p.x, p.y, target.uid, range) || target;
      spawnPlayerProj(game, p.x, p.y, Math.atan2(other.y - p.y, other.x - p.x), spec, ctx);
    }
    sfx('cast', spec.element || base.element);
  }
}

// ═══ sustained casts — the card keeps casting while active ═══
function updateSustains(game, dt) {
  for (const s of game.sustains) {
    s.t += dt;
    s.tickT -= dt;
    if (s.tickT <= 0) {
      s.tickT = s.tick;
      const d = s.do;
      if (d.chain) {
        const start = nearestEnemy(game, game.player.x, game.player.y, undefined, d.chain.range + 120);
        if (start) chainFrom(game, start, d.chain, s.ctx, game.player.x, game.player.y);
      } else if (d.proj) {
        const p = game.player;
        const n = d.proj.count || 1;
        const base = aimAngle(game) + (d.proj.ring ? s.t * 1.3 : 0); // rings slowly rotate wave to wave
        for (let i = 0; i < n; i++) {
          let a = d.proj.ring ? base + (i / n) * Math.PI * 2 : base + (game.rng.float() - 0.5) * (d.proj.spread || 0);
          spawnPlayerProj(game, p.x, p.y, a, d.proj, s.ctx);
        }
        sfx('cast', s.def.element);
      } else if (d.pulse) {
        const p = game.player;
        for (const e of enemiesIn(game, p.x, p.y, d.pulse.r)) {
          hitEnemy(game, e, d.pulse.dmg, s.ctx, d.pulse, { quiet: true });
          if (!e.dead && d.pulse.knockback) {
            const a = Math.atan2(e.y - p.y, e.x - p.x);
            e.kvx = Math.cos(a) * d.pulse.knockback; e.kvy = Math.sin(a) * d.pulse.knockback; e.kt = 0.15;
          }
        }
        game.fx.push({ kind: 'arc', x: p.x, y: p.y, ang: s.t * 9, arc: Math.PI * 1.2, range: d.pulse.r, color: s.color, t: 0, life: 0.2 });
        sfx('slash');
      }
    }
  }
  game.sustains = game.sustains.filter(s => s.t < s.dur);
  game.engine.sustainedActive = game.sustains.length > 0;
}

// ═══ traps ═══
function updateTraps(game, dt) {
  for (const tr of game.traps) {
    if (tr.armT > 0) { tr.armT -= dt; continue; }
    tr.ttl -= dt;
    if (tr.ttl <= 0) { tr.dead = true; continue; }
    for (const e of game.enemies) {
      if (!targetable(e)) continue;
      if (Math.hypot(e.x - tr.x, e.y - tr.y) > tr.r * 0.55 + e.r) continue;
      // sprung!
      for (const o of enemiesIn(game, tr.x, tr.y, tr.r)) {
        hitEnemy(game, o, tr.dmg, tr.ctx, { critChance: 0 });
        if (o.dead) continue;
        if (tr.root && !o.def.boss && !o.def.rival) o.root = Math.max(o.root || 0, tr.root);
        if (tr.status) applyStatus(game, o, tr.status[0], tr.status[1]);
      }
      game.fx.push({ kind: 'blast', x: tr.x, y: tr.y, r: tr.r, color: tr.color, t: 0, life: 0.4 });
      shake(game, 5); sfx('boom');
      tr.dead = true;
      game.bus.emit(EVT.trapTriggered, { x: tr.x, y: tr.y });
      break;
    }
  }
  game.traps = game.traps.filter(tr => !tr.dead);
}

// ═══ enemies ═══
function spawnEnemy(game, idOrDef, x, y, opts = {}) {
  const def = typeof idOrDef === 'string' ? ENEMIES[idOrDef] : idOrDef;
  const hp = Math.round(def.hp * (opts.hpMult || 1));
  const e = {
    uid: game.enemyIds.next(), def, x, y, hp, maxHp: hp, r: def.radius,
    statuses: {}, state: 'spawn', stateT: 0.7, hitFlash: 0, freeze: 0, stun: 0, root: 0,
    kvx: 0, kvy: 0, kt: 0, touchCd: 0, fireT: 1 + game.rng.float(), mark: null,
    wobble: game.rng.range(0, Math.PI * 2), lungeCd: 1.5, waveCd: def.waveEvery || 0,
    bossPhase: 1, bossAttackT: 2.2, bossAttackIdx: 0, dead: false,
    campRef: opts.campRef || null,
    // rival-only fields
    featured: opts.featured || null, cls: opts.cls || null,
    attackT: 1.2, castT: 5 + game.rng.float() * 3, casting: null, strafeT: 0, strafeDir: 1,
  };
  game.enemies.push(e);
  game.fx.push({ kind: 'spawn', x, y, r: def.radius * 2, color: def.glow, t: 0, life: 0.7 });
  return e;
}

function spawnPointNear(game, minR = 620, maxR = 800) {
  const p = game.player;
  const a = game.rng.range(0, Math.PI * 2);
  const d = game.rng.range(minR, maxR);
  return { x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d };
}

function updateEnemy(game, e, dt) {
  const p = game.player;
  e.wobble += dt * 4;
  if (e.hitFlash > 0) e.hitFlash -= dt;
  if (e.kt > 0) { e.x += e.kvx * dt; e.y += e.kvy * dt; e.kt -= dt; }
  if (e.mark) { e.mark.t -= dt; if (e.mark.t <= 0) e.mark = null; }

  if (e.state === 'spawn') { e.stateT -= dt; if (e.stateT <= 0) e.state = 'active'; return; }

  // status ticks
  let slowFactor = 1;
  for (const [name, st] of Object.entries(e.statuses)) {
    const sd = STATUS_DEFS[name];
    st.t -= dt;
    if (sd.dps > 0) {
      st.acc = (st.acc || 0) + sd.dps * st.stacks * dt;
      if (st.acc >= 1) {
        const whole = Math.floor(st.acc); st.acc -= whole;
        damageEnemy(game, e, whole, { color: sd.color, quiet: true, dot: true });
        if (e.dead) return;
      }
    }
    if (name === 'chill') slowFactor *= 0.5;
    if (st.t <= 0) delete e.statuses[name];
  }
  if (e.freeze > 0) { e.freeze -= dt; return; }
  if (e.stun > 0) { e.stun -= dt; return; }
  const rooted = e.root > 0; if (rooted) e.root -= dt;

  for (const ch of chunksNear(game, e.x, e.y, 1))
    for (const pool of ch.pools)
      if (Math.hypot(e.x - pool.x, e.y - pool.y) < pool.r) slowFactor *= 0.7;
  for (const z of game.zones)
    if (z.slow && Math.hypot(e.x - z.x, e.y - z.y) < z.r) slowFactor *= z.slow;

  const spd = e.def.speed * slowFactor;
  const dx = p.x - e.x, dy = p.y - e.y, dist = Math.hypot(dx, dy) || 1;
  const ux = dx / dist, uy = dy / dist;

  const b = e.def.behavior;
  if (b === 'chase') {
    if (!rooted) {
      e.x += (ux * spd + Math.cos(e.wobble) * 22) * dt;
      e.y += (uy * spd + Math.sin(e.wobble * 1.3) * 22) * dt;
    }
    touchAttack(game, e, dist, dt);
  } else if (b === 'ranged') {
    if (!rooted) {
      if (dist > e.def.range) { e.x += ux * spd * dt; e.y += uy * spd * dt; }
      else if (dist < e.def.range * 0.6) { e.x -= ux * spd * dt; e.y -= uy * spd * dt; }
      else { e.x += -uy * spd * 0.6 * dt; e.y += ux * spd * 0.6 * dt; }
    }
    e.fireT -= dt;
    if (e.fireT <= 0 && dist < e.def.range * 1.25) {
      e.fireT = e.def.fireRate;
      const a = Math.atan2(dy, dx);
      game.enemyProjectiles.push({ x: e.x, y: e.y, vx: Math.cos(a) * e.def.projSpeed, vy: Math.sin(a) * e.def.projSpeed, r: 7, dmg: e.def.dmg, color: e.def.glow, t: 0 });
      sfx('efire');
    }
    touchAttack(game, e, dist, dt);
  } else if (b === 'exploder') {
    if (e.state === 'fuse') {
      e.stateT -= dt;
      if (e.stateT <= 0) {
        const r = e.def.boomR;
        if (Math.hypot(p.x - e.x, p.y - e.y) < r + p.r) damagePlayer(game, e.def.dmg, e.x, e.y);
        for (const o of enemiesIn(game, e.x, e.y, r)) if (o !== e) damageEnemy(game, o, e.def.dmg * 0.5, { quiet: true });
        game.fx.push({ kind: 'blast', x: e.x, y: e.y, r, color: e.def.glow, t: 0, life: 0.5 });
        shake(game, 8); sfx('boom');
        killEnemy(game, e, {});
      }
      return;
    }
    if (!rooted) { e.x += ux * spd * dt; e.y += uy * spd * dt; }
    if (dist < 95) {
      e.state = 'fuse'; e.stateT = e.def.fuse;
      game.telegraphs.push({ shape: 'circle', x: e.x, y: e.y, r: e.def.boomR, t: 0, dur: e.def.fuse, color: e.def.glow, decorative: true });
      sfx('fuse');
    }
  } else if (b === 'stalker') {
    // phase-shifts through ash, reappearing at the player's flank
    e.stalkT = (e.stalkT ?? 3) - dt;
    if (e.state === 'vanish') {
      e.stateT -= dt;
      if (e.stateT <= 0) {
        const a = game.rng.range(0, Math.PI * 2);
        e.x = p.x + Math.cos(a) * 170; e.y = p.y + Math.sin(a) * 170;
        e.state = 'active'; e.stalkT = game.rng.range(3.5, 5);
        game.fx.push({ kind: 'spawn', x: e.x, y: e.y, r: e.r * 2, color: e.def.glow, t: 0, life: 0.5 });
        sfx('blink');
      }
      return;
    }
    if (e.stalkT <= 0 && dist > 130) {
      e.state = 'vanish'; e.stateT = 0.9;
      spark(game, e.x, e.y, e.def.glow, 8, 120);
      sfx('blink');
    } else if (!rooted) { e.x += ux * spd * dt; e.y += uy * spd * dt; }
    touchAttack(game, e, dist, dt);
  } else if (b === 'mortar') {
    // artillery: lobs telegraphed magma at your feet; backs off if crowded
    if (!rooted && dist < 180) { e.x -= ux * spd * dt; e.y -= uy * spd * dt; }
    e.fireT -= dt;
    if (e.fireT <= 0 && dist < e.def.range) {
      e.fireT = e.def.fireRate;
      const tx = p.x + game.rng.range(-40, 40), ty = p.y + game.rng.range(-40, 40);
      const def = e.def;
      game.telegraphs.push({
        shape: 'circle', x: tx, y: ty, r: def.mortarR, t: 0, dur: def.mortarTel, color: def.glow,
        onDone: (g) => {
          if (Math.hypot(g.player.x - tx, g.player.y - ty) < def.mortarR + g.player.r) damagePlayer(g, def.dmg, tx, ty);
          g.fx.push({ kind: 'blast', x: tx, y: ty, r: def.mortarR, color: def.glow, t: 0, life: 0.5 });
          sfx('boom');
        },
      });
      sfx('tel');
    }
  } else if (b === 'lunge') {
    // elites that call reinforcements
    if (e.def.summonEvery) {
      e.summonCd = (e.summonCd ?? e.def.summonEvery) - dt;
      if (e.summonCd <= 0 && dist < 600) {
        e.summonCd = e.def.summonEvery;
        for (let i = 0; i < 2; i++) {
          const a = game.rng.range(0, Math.PI * 2);
          spawnEnemy(game, e.def.summonId || 'wisp', e.x + Math.cos(a) * 60, e.y + Math.sin(a) * 60);
        }
        sfx('summon');
      }
    }
    updateLunger(game, e, dt, dist, ux, uy, spd, rooted);
  } else if (b === 'boss') {
    updateBoss(game, e, dt, dist, ux, uy, spd);
  } else if (b === 'rival') {
    updateRivalDuel(game, e, dt, dist, ux, uy, spd, rooted);
  }
  clampToRegion(game, e);
  // sanctuary wards: enemies cannot enter the rest circle
  for (const ch of chunksNear(game, e.x, e.y, 1)) {
    if (!ch.sanctuary) continue;
    const s = ch.sanctuary;
    const d = Math.hypot(e.x - s.x, e.y - s.y);
    if (d < s.r + e.r) {
      const a = Math.atan2(e.y - s.y, e.x - s.x);
      e.x = s.x + Math.cos(a) * (s.r + e.r);
      e.y = s.y + Math.sin(a) * (s.r + e.r);
    }
  }
}

function touchAttack(game, e, dist, dt) {
  const p = game.player;
  e.touchCd -= dt;
  if (dist < e.r + p.r + 2 && e.touchCd <= 0) {
    e.touchCd = 0.8;
    damagePlayer(game, e.def.dmg, e.x, e.y);
  }
}

function updateLunger(game, e, dt, dist, ux, uy, spd, rooted) {
  const p = game.player;
  e.lungeCd -= dt;
  if (e.state === 'telegraph') {
    e.stateT -= dt;
    if (e.stateT <= 0) { e.state = 'lunging'; e.stateT = 0.35; sfx('lunge'); }
    return;
  }
  if (e.state === 'lunging') {
    e.stateT -= dt;
    e.x += e.lungeDir.x * e.def.lungeSpeed * dt;
    e.y += e.lungeDir.y * e.def.lungeSpeed * dt;
    if (dist < e.r + p.r + 6) damagePlayer(game, e.def.dmg, e.x, e.y);
    if (e.stateT <= 0) {
      // World II knights chain a second lunge before resting
      if ((e.chainLeft || 0) > 0) {
        e.chainLeft--;
        e.state = 'telegraph'; e.stateT = 0.35;
        const d = Math.hypot(p.x - e.x, p.y - e.y) || 1;
        e.lungeDir = { x: (p.x - e.x) / d, y: (p.y - e.y) / d };
        sfx('tel');
      } else { e.state = 'active'; e.lungeCd = 2.2; }
    }
    return;
  }
  // elite shockwave
  if (e.def.waveEvery) {
    e.waveCd -= dt;
    if (e.waveCd <= 0 && dist < e.def.waveR * 1.5) {
      e.waveCd = e.def.waveEvery;
      const ex = e.x, ey = e.y;
      game.telegraphs.push({
        shape: 'circle', x: ex, y: ey, r: e.def.waveR, t: 0, dur: e.def.waveTel, color: e.def.glow,
        onDone: (g) => {
          if (Math.hypot(g.player.x - ex, g.player.y - ey) < e.def.waveR + g.player.r) damagePlayer(g, e.def.waveDmg, ex, ey);
          g.fx.push({ kind: 'blast', x: ex, y: ey, r: e.def.waveR, color: e.def.glow, t: 0, life: 0.5 });
          shake(g, 9); sfx('boom');
        },
      });
      sfx('fuse');
    }
  }
  if (!rooted) {
    if (dist < e.def.lungeRange && e.lungeCd <= 0) {
      e.state = 'telegraph'; e.stateT = e.def.lungeTel;
      e.chainLeft = e.def.lungeChain || 0;
      const d = Math.hypot(p.x - e.x, p.y - e.y) || 1;
      e.lungeDir = { x: (p.x - e.x) / d, y: (p.y - e.y) / d };
      sfx('tel');
    } else {
      e.x += ux * spd * dt; e.y += uy * spd * dt;
    }
  }
  touchAttack(game, e, dist, dt);
}

// ═══ rival duel AI — readable, telegraphed, no one-shot chaos ═══
function updateRivalDuel(game, e, dt, dist, ux, uy, spd, rooted) {
  const p = game.player;
  const cls = e.cls || 'mage';
  const band = cls === 'warrior' ? [120, 220] : cls === 'rogue' ? [200, 320] : [260, 400];

  // movement: hold the distance band, strafe
  e.strafeT -= dt;
  if (e.strafeT <= 0) { e.strafeT = game.rng.range(1, 2.2); e.strafeDir = game.rng.chance(0.5) ? -1 : 1; }
  if (!rooted && !e.casting) {
    if (dist > band[1]) { e.x += ux * spd * dt; e.y += uy * spd * dt; }
    else if (dist < band[0]) { e.x -= ux * spd * 0.9 * dt; e.y -= uy * spd * 0.9 * dt; }
    e.x += -uy * spd * 0.55 * e.strafeDir * dt;
    e.y += ux * spd * 0.55 * e.strafeDir * dt;
  }

  // featured-card cast: a big visible channel with a telegraph
  e.castT -= dt;
  if (e.casting) {
    e.casting.t += dt;
    if (e.casting.t >= e.casting.dur) e.casting = null;
  } else if (e.castT <= 0) {
    e.castT = game.rng.range(6.5, 9);
    const spells = (e.featured || []).filter(d => d.cat === 'Spell' || d.cat === 'Power');
    const card = spells.length ? game.rng.pick(spells) : null;
    const castDur = 1.8;
    e.casting = { def: card, t: 0, dur: castDur };
    const tx = p.x, ty = p.y;
    const color = card ? colorOf(card) : e.def.glow;
    game.telegraphs.push({
      shape: 'circle', x: tx, y: ty, r: 135, t: 0, dur: castDur, color,
      onDone: (g) => {
        if (Math.hypot(g.player.x - tx, g.player.y - ty) < 135 + g.player.r) damagePlayer(g, 20, tx, ty);
        g.fx.push({ kind: 'blast', x: tx, y: ty, r: 135, color, t: 0, life: 0.5 });
        shake(g, 8); sfx('boom');
      },
    });
    sfx('tel');
    return;
  }

  // basic attacks per class — readable projectile speeds
  e.attackT -= dt;
  if (e.attackT <= 0 && !e.casting) {
    if (cls === 'warrior') {
      if (dist < 170) {
        e.attackT = 1.5;
        const ex = e.x, ey = e.y, ang = Math.atan2(p.y - ey, p.x - ex);
        game.telegraphs.push({
          shape: 'circle', x: ex + Math.cos(ang) * 90, y: ey + Math.sin(ang) * 90, r: 90, t: 0, dur: 0.55, color: e.def.glow,
          onDone: (g) => {
            const hx = ex + Math.cos(ang) * 90, hy = ey + Math.sin(ang) * 90;
            if (Math.hypot(g.player.x - hx, g.player.y - hy) < 90 + g.player.r) damagePlayer(g, 14, hx, hy);
            g.fx.push({ kind: 'arc', x: ex, y: ey, ang, arc: 1.6, range: 150, color: e.def.glow, t: 0, life: 0.25 });
            sfx('slash');
          },
        });
      } else e.attackT = 0.4;
    } else {
      e.attackT = cls === 'rogue' ? 1.0 : 1.4;
      const a = Math.atan2(p.y - e.y, p.x - e.x);
      const speed = cls === 'rogue' ? 420 : 310;
      game.enemyProjectiles.push({ x: e.x, y: e.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r: cls === 'rogue' ? 6 : 9, dmg: cls === 'rogue' ? 8 : 11, color: e.def.glow, t: 0 });
      sfx('efire');
    }
  }
  touchAttack(game, e, dist, dt);
}

// ═══ boss: The Gilded Librarian (boss gates + fallback guardian fights) ═══
function updateBoss(game, e, dt, dist, ux, uy, spd) {
  const p = game.player;
  if (e.bossPhase === 1 && e.hp < e.maxHp * 0.5) {
    e.bossPhase = 2;
    game.banner = { title: 'THE ARCHIVE AWAKENS', sub: 'The Librarian misfires reality itself', t: 2.2 };
    shake(game, 14); sfx('bossphase');
  }
  // drift: hold mid range
  if (dist > 380) { e.x += ux * spd * dt; e.y += uy * spd * dt; }
  else if (dist < 220) { e.x -= ux * spd * dt; e.y -= uy * spd * dt; }

  touchAttack(game, e, dist, dt);
  e.bossAttackT -= dt * (e.bossPhase === 2 ? 1.35 : 1);
  if (e.bossAttackT > 0) return;
  e.bossAttackT = e.bossPhase === 2 ? 3.4 : 4.2;
  const attacks = ['books', 'pages', 'runes', 'theft'];
  const atk = attacks[e.bossAttackIdx % attacks.length];
  e.bossAttackIdx++;

  if (atk === 'books') {
    const n = e.bossPhase === 2 ? 4 : 3;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      spawnEnemy(game, e.def.minion || 'book', e.x + Math.cos(a) * 70, e.y + Math.sin(a) * 70);
    }
    sfx('summon');
  } else if (atk === 'pages') {
    for (let i = 0; i < 3; i++) {
      const x = p.x + (i - 1) * 190 + game.rng.range(-40, 40);
      const y = p.y;
      game.telegraphs.push({
        shape: 'rect', x, y, w: 130, h: 460, t: 0, dur: 1.15 + i * 0.18, color: '#ffd97a',
        onDone: (g) => {
          if (Math.abs(g.player.x - x) < 65 + g.player.r && Math.abs(g.player.y - y) < 230 + g.player.r) damagePlayer(g, 20, x, y);
          g.fx.push({ kind: 'rectblast', x, y, w: 130, h: 460, color: '#ffd97a', t: 0, life: 0.4 });
          shake(g, 8); sfx('slam');
        },
      });
    }
    sfx('tel');
  } else if (atk === 'runes') {
    const n = e.bossPhase === 2 ? 4 : 3;
    for (let i = 0; i < n; i++) {
      const ang = game.rng.range(0, Math.PI * 2), d = game.rng.float() * 160;
      const x = p.x + Math.cos(ang) * d, y = p.y + Math.sin(ang) * d;
      game.telegraphs.push({
        shape: 'circle', x, y, r: 130, t: 0, dur: 1.3 + i * 0.15, color: '#c23b4a',
        onDone: (g) => {
          if (Math.hypot(g.player.x - x, g.player.y - y) < 130 + g.player.r) damagePlayer(g, 18, x, y);
          g.fx.push({ kind: 'blast', x, y, r: 130, color: '#c23b4a', t: 0, life: 0.5 });
          sfx('boom');
        },
      });
    }
    sfx('tel');
  } else if (atk === 'theft') {
    const q = game.engine.queue;
    if (q.length > 0 && !game.stolen) {
      const inst = q.shift();
      game.stolen = { inst, t: 6 };
      game.engine.uiDirty = true;
      game.banner = { title: 'CARD STOLEN', sub: `The Librarian takes “${inst.def.name}”`, t: 1.8 };
      game.fx.push({ kind: 'bolt', x1: p.x, y1: p.y, x2: e.x, y2: e.y, color: '#ffd97a', t: 0, life: 0.4 });
      sfx('theft');
    }
  }
  // phase 2 misfires: stray rune circles anywhere near the player
  if (e.bossPhase === 2 && game.rng.chance(0.6)) {
    const x = p.x + (game.rng.float() * 700 - 350), y = p.y + (game.rng.float() * 700 - 350);
    game.telegraphs.push({
      shape: 'circle', x, y, r: 100, t: 0, dur: 1.6, color: '#8f6fff',
      onDone: (g) => {
        if (Math.hypot(g.player.x - x, g.player.y - y) < 100 + g.player.r) damagePlayer(g, 12, x, y);
        g.fx.push({ kind: 'blast', x, y, r: 100, color: '#8f6fff', t: 0, life: 0.4 });
      },
    });
  }
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
function makeRelicReward(game) {
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

function offerReward(game, reward, heading) {
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

// ═══ world features: camps, boss gates, shrines, treasure ═══
function campComposition(game, threat) {
  const tiers = worldDef(game).tiers.filter(t => threat >= t.minThreat);
  return tiers.map((t, i) => {
    if (ENEMIES[t.id].elite) return game.rng.chance(0.4) ? [t.id, 1] : null;
    return [t.id, i === 0 ? 3 + game.rng.int(3) : 1 + game.rng.int(2)];
  }).filter(Boolean);
}

function engageCamp(game, camp) {
  camp.engaged = true;
  const threat = threatOf(game);
  const hpMult = 1 + (threat - 1) * 0.12;
  let count = 0;
  for (const [id, n] of campComposition(game, threat)) {
    for (let i = 0; i < n; i++) {
      const a = game.rng.range(0, Math.PI * 2), d = 40 + game.rng.float() * (camp.r - 60);
      spawnEnemy(game, id, camp.x + Math.cos(a) * d, camp.y + Math.sin(a) * d, { hpMult, campRef: camp });
      count++;
    }
  }
  camp.alive = count;
  game.banner = { title: 'ENEMY CAMP', sub: 'Corrupted arcana defends its hoard', t: 1.8 };
  sfx('wave');
}

function campCleared(game, camp) {
  camp.cleared = true;
  game.campsCleared++;
  for (let i = 0; i < 5; i++) {
    const a = game.rng.range(0, Math.PI * 2);
    game.pickups.push({ x: camp.x, y: camp.y, vx: Math.cos(a) * 90, vy: Math.sin(a) * 90, kind: 'shard', t: 0 });
  }
  game.banner = { title: 'CAMP CLEARED', sub: '', t: 1.5 };
  game.gold += 15;
  floater(game, camp.x, camp.y - 40, '+15◈', '#ffd97a', 14);
  ringFx(game, camp.x, camp.y, camp.r, '#ffd97a', 0.8);
  if (game.rng.chance(0.5)) offerReward(game, makeCardReward(game), 'The hoard yields a card');
  sfx('reward');
}

export function engageBossGate(game, landmark) {
  landmark.engaged = true;
  game.zoneRegion = { x: landmark.x, y: landmark.y, r: landmark.zoneR, kind: 'boss', landmark };
  const threat = threatOf(game);
  const bossId = worldDef(game).boss;
  game.activeBoss = spawnEnemy(game, bossId, landmark.x, landmark.y - 120, { hpMult: 0.75 + threat * 0.12 / worldDef(game).threatMult });
  game.banner = { title: ENEMIES[bossId].name.toUpperCase(), sub: 'A boss gate seals behind you', t: 2.6 };
  sfx('bossintro');
}

function bossCleared(game) {
  const lm = game.zoneRegion && game.zoneRegion.landmark;
  if (lm) { lm.cleared = true; lm.portal = game.world < WORLDS.length; }
  game.zoneRegion = null;
  game.activeBoss = null;
  game.bossesSlain++;
  game.gold += 40;
  game.player.hp = Math.min(game.player.maxHp, game.player.hp + 30);
  game.banner = {
    title: 'THE GATE FALLS SILENT',
    sub: lm && lm.portal ? 'A relic surfaces — and a passage to the next world opens' : 'A relic surfaces from the wreckage',
    t: 2.8,
  };
  offerReward(game, makeRelicReward(game), 'Choose a relic');
  sfx('victory');
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

function updateWorldFeatures(game, dt) {
  const p = game.player;
  for (const ch of chunksNear(game, p.x, p.y, 2)) {
    // shrines: +3 Flow on touch
    if (ch.shrine) {
      const sh = ch.shrine;
      sh.cd -= dt;
      if (sh.cd <= 0 && Math.hypot(p.x - sh.x, p.y - sh.y) < sh.r + p.r + 6) {
        sh.cd = 12;
        game.engine.gainFlow(3, 'shrine');
        floater(game, sh.x, sh.y - 40, '+3 FLOW', '#8fd8ff', 14);
        ringFx(game, sh.x, sh.y, 60, '#8fd8ff', 0.6);
        sfx('shrine');
      }
    }
    // treasure caches
    if (ch.treasure && !ch.treasure.opened && Math.hypot(p.x - ch.treasure.x, p.y - ch.treasure.y) < 34) {
      ch.treasure.opened = true;
      ringFx(game, ch.treasure.x, ch.treasure.y, 70, '#ffd97a', 0.7);
      if (game.rng.chance(0.6)) offerReward(game, makeCardReward(game), 'The cache holds a card');
      else {
        for (let i = 0; i < 6; i++) {
          const a = game.rng.range(0, Math.PI * 2);
          game.pickups.push({ x: ch.treasure.x, y: ch.treasure.y, vx: Math.cos(a) * 100, vy: Math.sin(a) * 100, kind: 'shard', t: 0 });
        }
        p.hp = Math.min(p.maxHp, p.hp + 10);
        game.gold += 15;
        floater(game, p.x, p.y - 30, 'CACHE +15◈', '#ffd97a', 14);
      }
      sfx('reward');
    }
    if (game.zoneRegion) continue; // no new fights while a region is sealed
    // sanctuaries: step onto the hearth to rest
    if (ch.sanctuary) {
      const s = ch.sanctuary;
      const d = Math.hypot(p.x - s.x, p.y - s.y);
      if (s.lock && d > 110) s.lock = false;
      if (!s.lock && d < 48) openSanctuary(game, s);
    }
    // enemy camps
    if (ch.camp && !ch.camp.cleared && !ch.camp.engaged &&
        Math.hypot(p.x - ch.camp.x, p.y - ch.camp.y) < ch.camp.r + 240) {
      engageCamp(game, ch.camp);
    }
    // boss gates
    if (ch.landmark && !ch.landmark.cleared && !ch.landmark.engaged &&
        Math.hypot(p.x - ch.landmark.x, p.y - ch.landmark.y) < ch.landmark.zoneR - 90) {
      engageBossGate(game, ch.landmark);
    }
    // the portal to the next world, left where a boss fell
    if (ch.landmark && ch.landmark.portal &&
        Math.hypot(p.x - ch.landmark.x, p.y - ch.landmark.y) < 42) {
      ch.landmark.portal = false;
      advanceWorld(game);
      return;
    }
  }
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

// ═══ ambient enemy pressure ═══
function updateAmbientSpawns(game, dt) {
  if (game.zoneRegion || game.encounterPause || game.mm.state === 'choice') return;
  // resting players are left alone
  for (const ch of chunksNear(game, game.player.x, game.player.y, 1))
    if (ch.sanctuary && Math.hypot(game.player.x - ch.sanctuary.x, game.player.y - ch.sanctuary.y) < ch.sanctuary.r) return;
  const threat = threatOf(game);
  let budget = Math.min(4 + threat * 1.6, 16);
  if (game.ally) budget *= 1.7; // party pressure
  const ambient = game.enemies.filter(e => !e.campRef && !e.def.boss && !e.def.rival).length;
  game.spawnT -= dt;
  if (game.spawnT <= 0 && ambient < budget) {
    game.spawnT = game.rng.range(1, 2.6);
    const tiers = worldDef(game).tiers;
    const pool = tiers.filter(tier => threat >= tier.minThreat);
    let total = 0; for (const tier of pool) total += tier.w;
    let roll = game.rng.float() * total;
    let pick = pool[0];
    for (const tier of pool) { roll -= tier.w; if (roll <= 0) { pick = tier; break; } }
    const pt = spawnPointNear(game);
    const hpMult = (1 + (threat - 1) * 0.12) * (game.ally ? 1.25 : 1);
    const n = pick.id === tiers[0].id ? 2 + game.rng.int(2) : 1;
    for (let i = 0; i < n; i++)
      spawnEnemy(game, pick.id, pt.x + game.rng.range(-40, 40), pt.y + game.rng.range(-40, 40), { hpMult });
  }
  // cull enemies that fell too far behind (the world is infinite)
  for (const e of game.enemies) {
    if (!e.campRef && !e.def.boss && !e.def.rival &&
        Math.hypot(e.x - game.player.x, e.y - game.player.y) > 1700) e.dead = true;
  }
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

function updateAlly(game, dt) {
  const al = game.ally;
  if (!al) return;
  const p = game.player;
  al.t += dt; al.wob += dt * 3;
  if (al.t >= al.dur) {
    game.banner = { title: 'THE SOULS PART WAYS', sub: `${al.name} fades back into the realm`, t: 2.6 };
    game.ally = null;
    game.mm = { state: 'idle', nextT: game.rng.range(80, 120), searchT: 0, timeout: 9 };
    sfx('theft');
    return;
  }
  // follow at the player's shoulder
  const tx = p.x + Math.cos(al.wob * 0.3) * 70, ty = p.y + Math.sin(al.wob * 0.3) * 70;
  al.x += (tx - al.x) * Math.min(1, dt * 2.6);
  al.y += (ty - al.y) * Math.min(1, dt * 2.6);
  // basic attacks at the nearest enemy
  al.attackT -= dt;
  const target = nearestEnemy(game, al.x, al.y, undefined, 460);
  if (al.attackT <= 0 && target) {
    al.attackT = al.cls === 'rogue' ? 0.45 : al.cls === 'warrior' ? 0.8 : 0.6;
    const a = Math.atan2(target.y - al.y, target.x - al.x);
    const ctx = { def: { element: al.cls === 'mage' ? 'arcane' : 'physical' }, buffs: {}, dmgMult: 1 };
    spawnPlayerProj(game, al.x, al.y, a, { dmg: 6, speed: 640, radius: 4, critChance: 0.1, element: ctx.def.element, life: 1.4 }, ctx);
    sfx('cast', ctx.def.element);
  }
  // featured cast: a friendly AoE on a cluster, telegraphed
  al.castT -= dt;
  if (al.castT <= 0 && target) {
    al.castT = game.rng.range(8, 11);
    const tx2 = target.x, ty2 = target.y;
    const card = al.featured.find(c => c.cat === 'Spell') || al.featured[0];
    const color = card ? colorOf(card) : al.color;
    al.casting = { def: card, t: 0, dur: 1.4 };
    game.telegraphs.push({
      shape: 'circle', x: tx2, y: ty2, r: 120, t: 0, dur: 1.4, color, friendly: true,
      onDone: (g) => {
        for (const e of enemiesIn(g, tx2, ty2, 120)) damageEnemy(g, e, 18, { color });
        g.fx.push({ kind: 'blast', x: tx2, y: ty2, r: 120, color, t: 0, life: 0.5 });
        sfx('boom');
      },
    });
    sfx('tel');
  }
  if (al.casting) { al.casting.t += dt; if (al.casting.t >= al.casting.dur) al.casting = null; }
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

function updatePlayer(game, dt, input) {
  const p = game.player;
  let mx = 0, my = 0;
  if (input.left) mx -= 1; if (input.right) mx += 1;
  if (input.up) my -= 1; if (input.down) my += 1;
  const mlen = Math.hypot(mx, my);
  if (mlen > 0) { mx /= mlen; my /= mlen; p.moveDir = { x: mx, y: my }; }

  p.dashCd -= dt; p.iframes -= dt; p.untargetable -= dt; p.touchCd -= dt;

  if (input.dash && p.dashCd <= 0) {
    const ov = game.dashOverride;
    if (ov) {
      p.dashCd = ov.spec.cd || 0.9;
      performOverrideDash(game, ov);
    } else {
      p.dashT = 0.22; p.dashCd = 0.9; p.iframes = Math.max(p.iframes, 0.3);
      p.dashDir = { ...p.moveDir }; p.dodgeCredited = false;
    }
    game.bus.emit(EVT.dash, {}); sfx('dash');
  }
  input.dash = false;

  let speed = p.speed;
  for (const ch of chunksNear(game, p.x, p.y, 1))
    for (const pool of ch.pools)
      if (Math.hypot(p.x - pool.x, p.y - pool.y) < pool.r) speed *= 0.6;

  if (p.dashT > 0) {
    p.dashT -= dt;
    p.x += p.dashDir.x * 640 * dt; p.y += p.dashDir.y * 640 * dt;
    p.trail.push({ x: p.x, y: p.y, t: 0 });
  } else {
    p.x += mx * speed * dt; p.y += my * speed * dt;
  }

  // pillar collision from nearby chunks
  for (const ch of chunksNear(game, p.x, p.y, 1)) {
    for (const pil of ch.pillars) {
      const d = Math.hypot(p.x - pil.x, p.y - pil.y);
      if (d < pil.r + p.r) {
        const a = Math.atan2(p.y - pil.y, p.x - pil.x);
        p.x = pil.x + Math.cos(a) * (pil.r + p.r);
        p.y = pil.y + Math.sin(a) * (pil.r + p.r);
      }
    }
  }
  clampToRegion(game, p);

  if (mlen > 0) p.facing = Math.atan2(my, mx);
  const t = nearestEnemy(game, p.x, p.y);
  if (t && Math.hypot(t.x - p.x, t.y - p.y) < 520) p.facing = Math.atan2(t.y - p.y, t.x - p.x);

  for (const tr of p.trail) tr.t += dt;
  p.trail = p.trail.filter(tr => tr.t < 0.3);
}

// the card-granted dash: Teleport / Shadowstep / Charge replace the plain dodge
function performOverrideDash(game, ov) {
  const p = game.player;
  const s = ov.spec;
  const dir = (p.moveDir.x || p.moveDir.y) ? p.moveDir : { x: Math.cos(p.facing), y: Math.sin(p.facing) };
  const x0 = p.x, y0 = p.y;
  p.dodgeCredited = false;
  p.iframes = Math.max(p.iframes, 0.35);
  p.dashT = 0.1; p.dashDir = { x: 0, y: 0 }; // grazing projectiles still count as perfect dodges
  spark(game, x0, y0, ov.color, 10, 140);
  p.x += dir.x * s.dist; p.y += dir.y * s.dist;
  clampToRegion(game, p);
  for (let i = 1; i <= 4; i++)
    p.trail.push({ x: x0 + (p.x - x0) * i / 4, y: y0 + (p.y - y0) * i / 4, t: 0, color: ov.color });
  if (s.kind === 'blink') {
    if (s.untargetable) p.untargetable = Math.max(p.untargetable, s.untargetable);
    if (s.empower) { p.empower = { ...s.empower }; floater(game, p.x, p.y - 30, 'EMPOWERED', ov.color, 12); }
    spark(game, p.x, p.y, ov.color, 10, 140);
    sfx('blink');
  } else { // charge: damage and drag everything along the path
    const ctx = { def: { element: ov.def.element || 'physical' }, buffs: {}, dmgMult: 1 };
    for (const e of game.enemies) {
      if (!targetable(e)) continue;
      if (distToSegment(e.x, e.y, x0, y0, p.x, p.y) < 60 + e.r) {
        hitEnemy(game, e, s.dmg, ctx, { critChance: 0 });
        if (!e.dead && s.status) applyStatus(game, e, s.status[0], s.status[1]);
        if (!e.dead && s.gather) {
          const ka = Math.atan2(p.y - e.y, p.x - e.x);
          e.kvx = Math.cos(ka) * s.gather; e.kvy = Math.sin(ka) * s.gather; e.kt = 0.3;
        }
      }
    }
    game.fx.push({ kind: 'streak', x1: x0, y1: y0, x2: p.x, y2: p.y, color: ov.color, t: 0, life: 0.3 });
    shake(game, 5); sfx('charge');
  }
}

function updateProjectiles(game, dt) {
  const p = game.player;
  // player projectiles
  for (const pr of game.projectiles) {
    pr.t += dt;
    if (pr.boomerang) {
      if (pr.phase === 0 && pr.t > 0.55) {
        pr.phase = 1;
        pr.hit.clear();
      }
      if (pr.phase === 1) {
        const a = Math.atan2(p.y - pr.y, p.x - pr.x);
        const sp = Math.hypot(pr.vx, pr.vy);
        pr.vx = Math.cos(a) * sp; pr.vy = Math.sin(a) * sp;
        if (Math.hypot(p.x - pr.x, p.y - pr.y) < 24) pr.dead = true;
      }
    }
    pr.x += pr.vx * dt; pr.y += pr.vy * dt;
    if (pr.t > pr.life || Math.hypot(pr.x - p.x, pr.y - p.y) > 1600) pr.dead = true;
    if (pr.dead) continue;
    if (pr.rehit) for (const [k, v] of pr.rehit) { const nv = v - dt; if (nv <= 0) pr.rehit.delete(k); else pr.rehit.set(k, nv); }
    for (const e of game.enemies) {
      if (!targetable(e)) continue;
      if (Math.hypot(e.x - pr.x, e.y - pr.y) > e.r + pr.r) continue;
      if (pr.rehit) {
        if (pr.rehit.has(e.uid)) continue;
        pr.rehit.set(e.uid, pr.eff.rehit);
      } else {
        if (pr.hit.has(e.uid)) continue;
        pr.hit.add(e.uid);
      }
      hitEnemy(game, e, pr.dmg, pr.ctx, pr.eff);
      spark(game, pr.x, pr.y, pr.color, 5, 120, 0.35);
      if (pr.ctx.basic) gainRage(game, 2);
      if (pr.eff.chainOnHit && !e.dead) chainFrom(game, e, pr.eff.chainOnHit, pr.ctx, pr.x, pr.y);
      if (pr.eff.explode) {
        const ex = pr.eff.explode;
        for (const o of enemiesIn(game, pr.x, pr.y, ex.r)) if (o !== e && !o.dead) hitEnemy(game, o, ex.dmg, pr.ctx, pr.eff, { quiet: true });
        game.fx.push({ kind: 'blast', x: pr.x, y: pr.y, r: ex.r, color: pr.color, t: 0, life: 0.4 });
        shake(game, 3); sfx('boom');
      }
      if (!pr.rehit) {
        if (pr.pierce > 0) pr.pierce--; else { pr.dead = true; break; }
      }
    }
  }
  game.projectiles = game.projectiles.filter(pr => !pr.dead);

  // enemy projectiles
  for (const pr of game.enemyProjectiles) {
    pr.t += dt;
    pr.x += pr.vx * dt; pr.y += pr.vy * dt;
    if (pr.t > 4 || Math.hypot(pr.x - p.x, pr.y - p.y) > 1600) { pr.dead = true; continue; }
    const d = Math.hypot(pr.x - p.x, pr.y - p.y);
    if (d < pr.r + p.r + 4) {
      if (p.iframes > 0 && p.dashT > 0 && !p.dodgeCredited) { p.dodgeCredited = true; game.bus.emit(EVT.perfectDodge, {}); }
      else if (p.iframes <= 0 && p.untargetable <= 0) { damagePlayer(game, pr.dmg, pr.x, pr.y); pr.dead = true; }
    }
  }
  game.enemyProjectiles = game.enemyProjectiles.filter(pr => !pr.dead);
}

function updateZones(game, dt) {
  const p = game.player;
  for (const z of game.zones) {
    z.t += dt;
    if (z.follow) { z.x = p.x; z.y = p.y; }
    z.tickT -= dt;
    if (z.tickT <= 0 && z.tickDmg > 0) {
      z.tickT = z.tickRate;
      for (const e of enemiesIn(game, z.x, z.y, z.r)) {
        damageEnemy(game, e, z.tickDmg * (z.ctx ? z.ctx.dmgMult : 1), { color: z.color, quiet: true });
        if (!e.dead && z.status) applyStatus(game, e, z.status[0], z.status[1]);
      }
    }
  }
  game.zones = game.zones.filter(z => z.t < z.duration);
}

function updateTelegraphs(game, dt) {
  for (const tg of game.telegraphs) {
    tg.t += dt;
    if (tg.t >= tg.dur) { tg.done = true; if (tg.onDone) tg.onDone(game); }
  }
  game.telegraphs = game.telegraphs.filter(tg => !tg.done);
}

function updateSummons(game, dt) {
  const p = game.player;
  for (const s of game.summons) {
    s.t += dt;
    // hover near the player
    const dx = p.x + 40 - s.x, dy = p.y - 20 - s.y;
    s.x += dx * dt * 3; s.y += dy * dt * 3;
    s.fireT -= dt;
    if (s.fireT <= 0) {
      const t = nearestEnemy(game, s.x, s.y);
      if (t) {
        s.fireT = s.fireRate;
        const a = Math.atan2(t.y - s.y, t.x - s.x);
        spawnPlayerProj(game, s.x, s.y, a, { dmg: s.dmg, speed: 700, radius: 5, critChance: 0.15, element: 'shadow', life: 1.6 }, s.ctx);
        sfx('cast', 'shadow');
      }
    }
  }
  game.summons = game.summons.filter(s => s.t < s.dur);
}

function updatePickups(game, dt) {
  const p = game.player;
  for (const pk of game.pickups) {
    pk.t += dt;
    const d = Math.hypot(p.x - pk.x, p.y - pk.y);
    if (d < 120) { // magnetism
      const a = Math.atan2(p.y - pk.y, p.x - pk.x);
      const pull = 420 * (1 - d / 130);
      pk.vx += Math.cos(a) * pull * dt * 8; pk.vy += Math.sin(a) * pull * dt * 8;
    }
    pk.vx *= 1 - Math.min(1, dt * 4); pk.vy *= 1 - Math.min(1, dt * 4);
    pk.x += pk.vx * dt; pk.y += pk.vy * dt;
    if (d < p.r + 12) {
      pk.dead = true;
      if (pk.kind === 'shard') { game.engine.gainFlow(1, 'shard'); sfx('shard'); }
      else if (pk.kind === 'gold') { game.gold += pk.value || 1; floater(game, p.x, p.y - 26, `+${pk.value || 1}◈`, '#ffd97a', 12); sfx('shard'); }
      else { p.hp = Math.min(p.maxHp, p.hp + 10); floater(game, p.x, p.y - 26, '+10', '#7fe08a', 13); sfx('heal'); }
    }
    if (pk.t > 14) pk.dead = true;
  }
  game.pickups = game.pickups.filter(pk => !pk.dead);
}

function updateCosmetics(game, dt) {
  for (const pt of game.particles) {
    pt.t += dt;
    if (pt.drag) { pt.vx *= 1 - Math.min(1, dt * pt.drag); pt.vy *= 1 - Math.min(1, dt * pt.drag); }
    pt.x += pt.vx * dt; pt.y += pt.vy * dt;
  }
  game.particles = game.particles.filter(pt => pt.t < pt.life);
  if (game.particles.length > 600) game.particles.splice(0, game.particles.length - 600);
  for (const f of game.floaters) { f.t += dt; f.y -= 34 * dt; }
  game.floaters = game.floaters.filter(f => f.t < f.life);
  for (const fx of game.fx) fx.t += dt;
  game.fx = game.fx.filter(fx => fx.t < fx.life);
}
