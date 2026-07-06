// ── Arcana Engine · world simulation ───────────────────────────────────────
// Player, enemies, effect resolver, statuses, waves, boss, hazards, juice.

import { CARDS, RELICS, ENEMIES, ENCOUNTERS, ELEMENT_COLORS, SCHOOL_COLORS, STARTING_DECK, CARD_LIST } from './data.js';
import { EventBus, CardEngine, makeCard } from './engine.js';
import { sfx } from './audio.js';

export const ARENA = { w: 1760, h: 1320 };

const STATUS_DEFS = {
  burn: { dps: 3.0, dur: 3.0, color: ELEMENT_COLORS.fire },
  poison: { dps: 1.6, dur: 6.0, color: ELEMENT_COLORS.poison },
  bleed: { dps: 2.2, dur: 4.0, color: '#ff5d6a' },
  chill: { dps: 0, dur: 2.2, color: ELEMENT_COLORS.frost },
};

export function createGame() {
  const bus = new EventBus();
  const engine = new CardEngine(bus);
  const game = {
    bus, engine,
    state: 'title', // title | combat | banner | reward | gameover | victory
    time: 0, hitstop: 0, slowmo: 0,
    player: {
      x: ARENA.w / 2, y: ARENA.h / 2 + 200, vx: 0, vy: 0, r: 14,
      hp: 100, maxHp: 100, armor: 0, speed: 235,
      facing: -Math.PI / 2, moveDir: { x: 0, y: -1 },
      dashT: 0, dashCd: 0, dashDir: { x: 0, y: -1 }, iframes: 0, untargetable: 0,
      dodgeCredited: false, touchCd: 0, trail: [],
    },
    enemies: [], projectiles: [], enemyProjectiles: [], zones: [], telegraphs: [],
    summons: [], pickups: [], particles: [], floaters: [], fx: [],
    relics: [], relicRadiusMult: 1, hasDuelist: false,
    camera: { x: ARENA.w / 2, y: ARENA.h / 2, shake: 0 },
    arena: buildArena(),
    encounterIdx: 0, waveIdx: 0, spawnQueue: [], waveBreather: 0, encounterDone: false,
    banner: null, pendingReward: null, rewardQueue: [],
    stolen: null, dangerT: 0, kills: 0, runTime: 0,
    deckIds: STARTING_DECK.slice(),
    uiDirty: true,
  };

  engine.setDeck(game.deckIds);

  // ── engine ↔ world wiring ──
  engine.resolveCard = (inst, buffs, preview) => resolveCard(game, inst, buffs, preview);
  engine.computePreview = (def, buffs) => computePreview(game, def, buffs);
  engine.runEnchantAction = (doSpec, payload, ench) => runEnchantAction(game, doSpec, payload, ench);

  bus.on('cardResolved', ({ inst }) => {
    sfx('resolve', inst.def.element);
    spark(game, game.player.x, game.player.y, colorOf(inst.def), 6, 90);
  });
  bus.on('cardDrawn', () => sfx('draw'));
  bus.on('flowGained', ({ amount }) => {
    for (let i = 0; i < Math.min(amount * 2, 8); i++)
      game.particles.push(mote(game.player.x, game.player.y, '#ffd97a'));
  });
  bus.on('perfectDodge', () => {
    engine.gainFlow(2, 'dodge');
    floater(game, game.player.x, game.player.y - 30, 'PERFECT', '#ffd97a', 18);
    game.slowmo = 0.22; sfx('perfect');
  });
  return game;
}

function buildArena() {
  const cx = ARENA.w / 2, cy = ARENA.h / 2;
  return {
    pillars: [
      { x: cx - 520, y: cy - 330, r: 42 }, { x: cx + 520, y: cy - 330, r: 42 },
      { x: cx - 520, y: cy + 330, r: 42 }, { x: cx + 520, y: cy + 330, r: 42 },
    ],
    inkPools: [
      { x: cx - 270, y: cy + 230, r: 110 }, { x: cx + 330, y: cy - 260, r: 90 },
    ],
    shrines: [
      { x: cx - 620, y: cy, r: 26, cd: 0 }, { x: cx + 620, y: cy, r: 26, cd: 0 },
    ],
    candles: [
      { x: cx - 380, y: cy - 420 }, { x: cx + 380, y: cy - 420 },
      { x: cx - 640, y: cy + 380 }, { x: cx + 640, y: cy + 380 }, { x: cx, y: cy - 520 },
    ],
  };
}

export function colorOf(def) { return ELEMENT_COLORS[def.element] || SCHOOL_COLORS[def.school]; }

// ═══ helper queries ═══
function nearestEnemy(game, x, y, excludeUid) {
  let best = null, bd = Infinity;
  for (const e of game.enemies) {
    if (e.state === 'spawn' || e.uid === excludeUid) continue;
    const d = (e.x - x) ** 2 + (e.y - y) ** 2;
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}
function enemiesIn(game, x, y, r) {
  return game.enemies.filter(e => e.state !== 'spawn' && Math.hypot(e.x - x, e.y - y) <= r + e.r);
}
export function floater(game, x, y, txt, color, size = 13, crit = false) {
  game.floaters.push({ x: x + (Math.random() * 20 - 10), y, txt, color, t: 0, life: crit ? 1.1 : 0.8, size: crit ? size * 1.5 : size, crit });
}
function spark(game, x, y, color, n = 8, speed = 160, life = 0.5) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = speed * (0.4 + Math.random() * 0.8);
    game.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0, life: life * (0.6 + Math.random() * 0.8), size: 2 + Math.random() * 3, color, add: true, drag: 3 });
  }
}
function mote(x, y, color) {
  const a = Math.random() * Math.PI * 2;
  return { x: x + Math.cos(a) * 26, y: y + Math.sin(a) * 26, vx: Math.cos(a) * 40, vy: Math.sin(a) * 40 - 60, t: 0, life: 0.7, size: 2.5, color, add: true, drag: 2 };
}
function ringFx(game, x, y, r, color, life = 0.45) { game.fx.push({ kind: 'ring', x, y, r, color, t: 0, life }); }
function shake(game, amt) { game.camera.shake = Math.min(26, game.camera.shake + amt); }

// ═══ damage ═══
function applyStatus(game, e, status, stacks) {
  if (e.def.boss && (status === 'chill')) stacks = Math.min(stacks, 1);
  const sd = STATUS_DEFS[status];
  if (!sd) return;
  const cur = e.statuses[status];
  if (cur) { cur.stacks += stacks; cur.t = sd.dur; }
  else e.statuses[status] = { stacks, t: sd.dur };
  game.bus.emit('statusApplied', { enemy: e, status, x: e.x, y: e.y });
}

function damageEnemy(game, e, amount, opts = {}) {
  if (e.state === 'spawn' || e.dead) return;
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
  sfx(e.def.boss ? 'bossdie' : 'kill');
  if (e.def.elite || e.def.boss) { shake(game, 10); game.hitstop = Math.max(game.hitstop, 0.09); }
  for (let i = 0; i < e.def.shards; i++) {
    const a = Math.random() * Math.PI * 2, s = 60 + Math.random() * 90;
    game.pickups.push({ x: e.x, y: e.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, kind: 'shard', t: 0 });
  }
  if (!e.def.boss && Math.random() < 0.07)
    game.pickups.push({ x: e.x, y: e.y, vx: 0, vy: -40, kind: 'heart', t: 0 });
  game.bus.emit('enemyKilled', { enemy: e, x: e.x, y: e.y });
}

function damagePlayer(game, amount, srcX, srcY) {
  const p = game.player;
  if (game.state !== 'combat') return;
  if (p.untargetable > 0) return;
  if (p.iframes > 0) {
    if (!p.dodgeCredited && p.dashT > 0) { p.dodgeCredited = true; game.bus.emit('perfectDodge', {}); }
    return;
  }
  let dmg = amount;
  if (p.armor > 0) { const ab = Math.min(p.armor, dmg); p.armor -= ab; dmg -= ab; floater(game, p.x, p.y - 24, 'BLOCK ' + ab, '#ffd97a', 12); }
  if (dmg > 0) {
    p.hp -= dmg;
    floater(game, p.x, p.y - 26, '-' + dmg, '#ff5d6a', 15);
    shake(game, 7); game.hitstop = Math.max(game.hitstop, 0.05);
    sfx('hurt');
    p.iframes = Math.max(p.iframes, 0.5);
    game.bus.emit('playerHit', { amount: dmg });
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
  let dmgMult = buffs.dmgMult || 1;
  if (game.hasDuelist && def.school === 'Warrior' && game.engine.queue.length <= 1) dmgMult *= 1.6;
  const radMult = (buffs.radiusMult || 1) * game.relicRadiusMult;
  const ctx = { def, buffs, dmgMult, radMult, preview };
  for (const eff of def.effects) runEffect(game, eff, ctx);
  game.fx.push({ kind: 'cast', x: p.x, y: p.y, color: colorOf(def), t: 0, life: 0.35 });
}

function hitEnemy(game, e, rawDmg, ctx, eff, opts = {}) {
  const critChance = (eff.critChance || 0) + (ctx.buffs.critChance || 0);
  const crit = Math.random() < critChance;
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

function runEffect(game, eff, ctx) {
  const p = game.player;
  const engine = game.engine;
  switch (eff.type) {

    case 'proj': {
      const n = eff.count || 1;
      const base = aimAngle(game);
      for (let i = 0; i < n; i++) {
        const a = eff.ring ? base + (i / n) * Math.PI * 2
                           : base + (n > 1 ? (i - (n - 1) / 2) * 0.16 : 0);
        game.projectiles.push({
          x: p.x, y: p.y, vx: Math.cos(a) * eff.speed, vy: Math.sin(a) * eff.speed,
          r: eff.radius, dmg: eff.dmg, eff, ctx, pierce: eff.pierce || 0,
          life: eff.life || 2.2, t: 0, boomerang: eff.boomerang, phase: 0,
          rehit: eff.rehit ? new Map() : null, color: ELEMENT_COLORS[ctx.def.element],
          hit: new Set(),
        });
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
        if (eff.freeze) e.freeze = Math.max(e.freeze || 0, e.def.boss ? eff.freeze * 0.25 : eff.freeze);
        if (eff.stun) e.stun = Math.max(e.stun || 0, e.def.boss ? eff.stun * 0.25 : eff.stun);
        if (eff.root) e.root = Math.max(e.root || 0, e.def.boss ? 0 : eff.root);
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
        x, y, r: eff.r * ctx.radMult, t: 0, duration: eff.duration,
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
        if (e.state === 'spawn') continue;
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
      let cur = nearestEnemy(game, p.x, p.y);
      let px = p.x, py = p.y;
      const struck = new Set();
      for (let j = 0; j <= eff.jumps && cur; j++) {
        struck.add(cur.uid);
        game.fx.push({ kind: 'bolt', x1: px, y1: py, x2: cur.x, y2: cur.y, color: ELEMENT_COLORS.lightning, t: 0, life: 0.22 });
        hitEnemy(game, cur, eff.dmg, ctx, eff);
        px = cur.x; py = cur.y;
        let next = null, bd = eff.range * eff.range;
        for (const e of game.enemies) {
          if (e.state === 'spawn' || struck.has(e.uid) || e.dead) continue;
          const d = (e.x - px) ** 2 + (e.y - py) ** 2;
          if (d < bd) { bd = d; next = e; }
        }
        cur = next;
      }
      sfx('zap');
      break;
    }

    case 'blink': {
      let a;
      const t = nearestEnemy(game, p.x, p.y);
      if (eff.away && t) a = Math.atan2(p.y - t.y, p.x - t.x);
      else a = Math.atan2(p.moveDir.y, p.moveDir.x);
      spark(game, p.x, p.y, colorOf(ctx.def), 10, 140);
      p.x = clampX(p.x + Math.cos(a) * eff.dist); p.y = clampY(p.y + Math.sin(a) * eff.dist);
      if (eff.untargetable) p.untargetable = Math.max(p.untargetable, eff.untargetable);
      spark(game, p.x, p.y, colorOf(ctx.def), 10, 140);
      sfx('blink');
      break;
    }

    case 'dashAttack': {
      const a = aimAngle(game);
      const x0 = p.x, y0 = p.y;
      p.x = clampX(p.x + Math.cos(a) * eff.dist); p.y = clampY(p.y + Math.sin(a) * eff.dist);
      for (const e of game.enemies) {
        if (e.state === 'spawn') continue;
        if (distToSegment(e.x, e.y, x0, y0, p.x, p.y) < 60 + e.r) {
          hitEnemy(game, e, eff.dmg, ctx, eff);
          if (!e.dead && eff.knockback) { const ka = Math.atan2(e.y - y0, e.x - x0); e.kvx = Math.cos(ka) * eff.knockback; e.kvy = Math.sin(ka) * eff.knockback; e.kt = 0.25; }
        }
      }
      game.fx.push({ kind: 'streak', x1: x0, y1: y0, x2: p.x, y2: p.y, color: '#e8dcc0', t: 0, life: 0.3 });
      shake(game, 5); sfx('charge');
      break;
    }

    case 'armor': p.armor = Math.min(60, p.armor + eff.amount); floater(game, p.x, p.y - 30, '+' + eff.amount + ' ARMOR', '#ffd97a', 13); sfx('armor'); break;
    case 'stabilize': {
      const amt = game.engine.queue.length >= eff.threshold ? eff.high : eff.low;
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
      if (t) { t.mark = { t: eff.dur, amp: eff.amp }; floater(game, t.x, t.y - t.r - 10, 'MARKED', '#a98fe0', 12); }
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
  if (doSpec.flow) game.engine.gainFlow(doSpec.flow, 'enchant');
  if (doSpec.draw) for (let i = 0; i < doSpec.draw; i++) game.engine.drawCard('enchant');
  if (doSpec.nextChannelMult) game.engine.nextChannelMult = doSpec.nextChannelMult;
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

function clampX(x) { return Math.max(40, Math.min(ARENA.w - 40, x)); }
function clampY(y) { return Math.max(40, Math.min(ARENA.h - 40, y)); }
function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy;
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

// ═══ enemies ═══
let EUID = 1;
function spawnEnemy(game, id, x, y) {
  const def = ENEMIES[id];
  const e = {
    uid: EUID++, def, x, y, hp: def.hp, maxHp: def.hp, r: def.radius,
    statuses: {}, state: 'spawn', stateT: 0.7, hitFlash: 0, freeze: 0, stun: 0, root: 0,
    kvx: 0, kvy: 0, kt: 0, touchCd: 0, fireT: 1 + Math.random(), mark: null,
    wobble: Math.random() * Math.PI * 2, lungeCd: 1.5, waveCd: def.waveEvery || 0,
    bossPhase: 1, bossAttackT: 2.2, bossAttackIdx: 0, dead: false,
  };
  game.enemies.push(e);
  game.fx.push({ kind: 'spawn', x, y, r: def.radius * 2, color: def.glow, t: 0, life: 0.7 });
  return e;
}

function edgeSpawnPoint() {
  const side = (Math.random() * 4) | 0, m = 70;
  if (side === 0) return { x: m + Math.random() * (ARENA.w - 2 * m), y: m };
  if (side === 1) return { x: m + Math.random() * (ARENA.w - 2 * m), y: ARENA.h - m };
  if (side === 2) return { x: m, y: m + Math.random() * (ARENA.h - 2 * m) };
  return { x: ARENA.w - m, y: m + Math.random() * (ARENA.h - 2 * m) };
}

function updateEnemy(game, e, dt) {
  const p = game.player;
  e.wobble += dt * 4;
  if (e.hitFlash > 0) e.hitFlash -= dt;
  if (e.kt > 0) { e.x = clampX(e.x + e.kvx * dt); e.y = clampY(e.y + e.kvy * dt); e.kt -= dt; }
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

  for (const pool of game.arena.inkPools)
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
  } else if (b === 'lunge') {
    updateLunger(game, e, dt, dist, ux, uy, spd, rooted);
  } else if (b === 'boss') {
    updateBoss(game, e, dt, dist, ux, uy, spd);
  }
  e.x = clampX(e.x); e.y = clampY(e.y);
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
    if (e.stateT <= 0) { e.state = 'active'; e.lungeCd = 2.2; }
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
      const d = Math.hypot(p.x - e.x, p.y - e.y) || 1;
      e.lungeDir = { x: (p.x - e.x) / d, y: (p.y - e.y) / d };
      sfx('tel');
    } else {
      e.x += ux * spd * dt; e.y += uy * spd * dt;
    }
  }
  touchAttack(game, e, dist, dt);
}

// ═══ boss: The Gilded Librarian ═══
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
      spawnEnemy(game, 'book', e.x + Math.cos(a) * 70, e.y + Math.sin(a) * 70);
    }
    sfx('summon');
  } else if (atk === 'pages') {
    for (let i = 0; i < 3; i++) {
      const x = p.x + (i - 1) * 190 + (Math.random() * 80 - 40);
      game.telegraphs.push({
        shape: 'rect', x, y: p.y, w: 130, h: 460, t: 0, dur: 1.15 + i * 0.18, color: '#ffd97a',
        onDone: (g) => {
          if (Math.abs(g.player.x - x) < 65 + g.player.r && Math.abs(g.player.y - p.y) < 230 + g.player.r) damagePlayer(g, 20, x, p.y);
          g.fx.push({ kind: 'rectblast', x, y: p.y, w: 130, h: 460, color: '#ffd97a', t: 0, life: 0.4 });
          shake(g, 8); sfx('slam');
        },
      });
    }
    sfx('tel');
  } else if (atk === 'runes') {
    const n = e.bossPhase === 2 ? 4 : 3;
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * Math.PI * 2, d = Math.random() * 160;
      const x = clampX(p.x + Math.cos(ang) * d), y = clampY(p.y + Math.sin(ang) * d);
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
  if (e.bossPhase === 2 && Math.random() < 0.6) {
    const x = clampX(p.x + (Math.random() * 700 - 350)), y = clampY(p.y + (Math.random() * 700 - 350));
    game.telegraphs.push({
      shape: 'circle', x, y, r: 100, t: 0, dur: 1.6, color: '#8f6fff',
      onDone: (g) => {
        if (Math.hypot(g.player.x - x, g.player.y - y) < 100 + g.player.r) damagePlayer(g, 12, x, y);
        g.fx.push({ kind: 'blast', x, y, r: 100, color: '#8f6fff', t: 0, life: 0.4 });
      },
    });
  }
}

// ═══ waves & encounters ═══
export function startRun(game) {
  game.state = 'combat';
  game.encounterIdx = 0; game.kills = 0; game.runTime = 0;
  game.player.hp = game.player.maxHp; game.player.armor = 0;
  game.player.x = ARENA.w / 2; game.player.y = ARENA.h / 2 + 200;
  game.engine.setDeck(game.deckIds);
  game.engine.flow = 4;
  startEncounter(game);
}

function startEncounter(game) {
  const enc = ENCOUNTERS[game.encounterIdx];
  game.waveIdx = -1; game.encounterDone = false;
  game.enemies = []; game.enemyProjectiles = []; game.zones = []; game.telegraphs = []; game.pickups = [];
  game.banner = { title: enc.name.toUpperCase(), sub: enc.sub, t: 2.4 };
  game.waveBreather = 1.6;
  sfx(enc.boss ? 'bossintro' : 'wave');
}

function startNextWave(game) {
  const enc = ENCOUNTERS[game.encounterIdx];
  game.waveIdx++;
  if (game.waveIdx >= enc.waves.length) { game.encounterDone = true; return; }
  const wave = enc.waves[game.waveIdx];
  let delay = 0;
  for (const [id, count] of wave) {
    for (let i = 0; i < count; i++) {
      const pt = ENEMIES[id].boss ? { x: ARENA.w / 2, y: ARENA.h / 2 - 260 } : edgeSpawnPoint();
      game.spawnQueue.push({ id, x: pt.x, y: pt.y, t: delay });
      delay += 0.14;
    }
  }
  if (!enc.boss) game.banner = { title: `WAVE ${game.waveIdx + 1} / ${enc.waves.length}`, sub: '', t: 1.4 };
}

function finishEncounter(game) {
  const wasBoss = ENCOUNTERS[game.encounterIdx].boss;
  if (wasBoss) { game.state = 'victory'; sfx('victory'); return; }
  // build reward drafts
  game.rewardQueue = [makeCardReward(game)];
  if (game.encounterIdx === 1) game.rewardQueue.push(makeRelicReward(game));
  game.pendingReward = game.rewardQueue.shift();
  game.state = 'reward';
  game.uiDirty = true;
  sfx('reward');
}

const RARITY_WEIGHT = { Common: 55, Uncommon: 30, Rare: 12, Legendary: 3 };
function makeCardReward(game) {
  const opts = [];
  const pool = CARD_LIST.filter(c => !STARTING_DECK.includes(c.id) || true);
  let guard = 200;
  while (opts.length < 3 && guard-- > 0) {
    let total = 0;
    for (const c of pool) total += RARITY_WEIGHT[c.rarity];
    let roll = Math.random() * total;
    let pick = pool[0];
    for (const c of pool) { roll -= RARITY_WEIGHT[c.rarity]; if (roll <= 0) { pick = c; break; } }
    if (!opts.includes(pick)) opts.push(pick);
  }
  return { type: 'card', options: opts };
}
function makeRelicReward(game) {
  const owned = new Set(game.relics.map(r => r.id));
  const pool = Object.values(RELICS).filter(r => !owned.has(r.id));
  const opts = [];
  while (opts.length < Math.min(3, pool.length)) {
    const pick = pool[(Math.random() * pool.length) | 0];
    if (!opts.includes(pick)) opts.push(pick);
  }
  return { type: 'relic', options: opts };
}

export function applyReward(game, choice) {
  if (choice) {
    if (game.pendingReward.type === 'card') {
      game.deckIds.push(choice.id);
      game.engine.deck.push(makeCard(choice.id));
      game.engine.shuffleArray(game.engine.deck);
    } else {
      applyRelic(game, choice.id);
    }
  }
  if (game.rewardQueue.length > 0) {
    game.pendingReward = game.rewardQueue.shift();
    game.uiDirty = true;
    return;
  }
  game.pendingReward = null;
  game.encounterIdx++;
  game.player.hp = Math.min(game.player.maxHp, game.player.hp + 20);
  game.state = 'combat';
  startEncounter(game);
}

function applyRelic(game, id) {
  const relic = RELICS[id];
  game.relics.push(relic);
  if (relic.stats) {
    if (relic.stats.maxFlow) game.engine.maxFlow += relic.stats.maxFlow;
    if (relic.stats.channelMult) game.engine.channelMultGlobal *= relic.stats.channelMult;
    if (relic.stats.radiusMult) game.relicRadiusMult *= relic.stats.radiusMult;
    if (relic.stats.duelist) game.hasDuelist = true;
  }
  if (relic.enchant) game.engine.addEnchant(relic.enchant, { name: relic.name, glyph: relic.glyph, color: relic.color });
  game.uiDirty = true;
}

// ═══ master update ═══
export function updateGame(game, dt, input) {
  game.time += dt;
  if (game.state !== 'combat') return;
  if (game.hitstop > 0) { game.hitstop -= dt; return; }
  let ts = 1;
  if (game.slowmo > 0) { game.slowmo -= dt; ts = 0.35; }
  dt *= ts;
  game.runTime += dt;

  updatePlayer(game, dt, input);

  // engine
  const eng = game.engine;
  eng.followPos = { x: game.player.x, y: game.player.y };
  eng.update(dt);

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

  // spawns
  for (const s of game.spawnQueue) s.t -= dt;
  for (const s of game.spawnQueue.filter(s => s.t <= 0)) spawnEnemy(game, s.id, s.x, s.y);
  game.spawnQueue = game.spawnQueue.filter(s => s.t > 0);

  // enemies
  for (const e of game.enemies) if (!e.dead) updateEnemy(game, e, dt);
  game.enemies = game.enemies.filter(e => !e.dead);

  updateProjectiles(game, dt);
  updateZones(game, dt);
  updateTelegraphs(game, dt);
  updateSummons(game, dt);
  updatePickups(game, dt);
  updateCosmetics(game, dt);

  // waves
  if (game.enemies.length === 0 && game.spawnQueue.length === 0) {
    if (game.encounterDone) { finishEncounter(game); return; }
    game.waveBreather -= dt;
    if (game.waveBreather <= 0) { startNextWave(game); game.waveBreather = 1.6; }
  }

  // camera
  const cam = game.camera;
  cam.x += (game.player.x - cam.x) * Math.min(1, dt * 5);
  cam.y += (game.player.y - cam.y) * Math.min(1, dt * 5);
  cam.shake = Math.max(0, cam.shake - dt * 40);

  if (game.banner) { game.banner.t -= dt; if (game.banner.t <= 0) game.banner = null; }
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
    p.dashT = 0.22; p.dashCd = 0.9; p.iframes = Math.max(p.iframes, 0.3);
    p.dashDir = { ...p.moveDir }; p.dodgeCredited = false;
    game.bus.emit('dash', {}); sfx('dash');
  }
  input.dash = false;

  let speed = p.speed;
  for (const pool of game.arena.inkPools)
    if (Math.hypot(p.x - pool.x, p.y - pool.y) < pool.r) speed *= 0.6;

  if (p.dashT > 0) {
    p.dashT -= dt;
    p.x += p.dashDir.x * 640 * dt; p.y += p.dashDir.y * 640 * dt;
    p.trail.push({ x: p.x, y: p.y, t: 0 });
  } else {
    p.x += mx * speed * dt; p.y += my * speed * dt;
  }

  // pillar collision
  for (const pil of game.arena.pillars) {
    const d = Math.hypot(p.x - pil.x, p.y - pil.y);
    if (d < pil.r + p.r) {
      const a = Math.atan2(p.y - pil.y, p.x - pil.x);
      p.x = pil.x + Math.cos(a) * (pil.r + p.r);
      p.y = pil.y + Math.sin(a) * (pil.r + p.r);
    }
  }
  p.x = clampX(p.x); p.y = clampY(p.y);

  if (mlen > 0) p.facing = Math.atan2(my, mx);
  const t = nearestEnemy(game, p.x, p.y);
  if (t && Math.hypot(t.x - p.x, t.y - p.y) < 520) p.facing = Math.atan2(t.y - p.y, t.x - p.x);

  for (const tr of p.trail) tr.t += dt;
  p.trail = p.trail.filter(tr => tr.t < 0.3);

  // shrines
  for (const sh of game.arena.shrines) {
    sh.cd -= dt;
    if (sh.cd <= 0 && Math.hypot(p.x - sh.x, p.y - sh.y) < sh.r + p.r + 6) {
      sh.cd = 12;
      game.engine.gainFlow(3, 'shrine');
      floater(game, sh.x, sh.y - 40, '+3 FLOW', '#8fd8ff', 14);
      ringFx(game, sh.x, sh.y, 60, '#8fd8ff', 0.6);
      sfx('shrine');
    }
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
    if (pr.t > pr.life || pr.x < 0 || pr.x > ARENA.w || pr.y < 0 || pr.y > ARENA.h) pr.dead = true;
    if (pr.dead) continue;
    if (pr.rehit) for (const [k, v] of pr.rehit) { const nv = v - dt; if (nv <= 0) pr.rehit.delete(k); else pr.rehit.set(k, nv); }
    for (const e of game.enemies) {
      if (e.state === 'spawn' || e.dead) continue;
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
    if (pr.t > 4 || pr.x < 0 || pr.x > ARENA.w || pr.y < 0 || pr.y > ARENA.h) { pr.dead = true; continue; }
    const d = Math.hypot(pr.x - p.x, pr.y - p.y);
    if (d < pr.r + p.r + 4) {
      if (p.iframes > 0 && p.dashT > 0 && !p.dodgeCredited) { p.dodgeCredited = true; game.bus.emit('perfectDodge', {}); }
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
        game.projectiles.push({
          x: s.x, y: s.y, vx: Math.cos(a) * 700, vy: Math.sin(a) * 700, r: 5,
          dmg: s.dmg, eff: { critChance: 0.15 }, ctx: s.ctx, pierce: 0, life: 1.6, t: 0,
          color: ELEMENT_COLORS.shadow, hit: new Set(), rehit: null,
        });
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
