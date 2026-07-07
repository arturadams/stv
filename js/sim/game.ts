import { ATTUNEMENT_IDS, ELEMENT_COLORS, SCHOOL_COLORS, STARTING_DECKS } from '../data/index.js';
import type {
  Buffs, CardDef, CardInstance, EffectCtx, EffectPreview, EffectSpec, EnchantDo, EnemyState,
} from '../data/types.js';
import { CardEngine } from '../engine.js';
import { EVT, EventBus } from '../core/events.js';
import { makeUidCounter } from '../core/ids.js';
import { distToSegment, wrapAngle } from '../core/math.js';
import { makeRng } from '../core/rng.js';
import { sfx } from '../audio.js';
import {
  aimAngle, applyStatus, chainFrom, damageEnemy, enemiesIn, hitEnemy, nearestEnemy, spawnPlayerProj, targetable,
} from './combat.js';
import { floater, mote, shake, spark } from './fx.js';
import { clampToRegion } from './map/chunks.js';
import { bossCleared } from './map/features.js';
import { classChannelMult, gainOpportunity } from './player.js';
import { duelVictory } from './run/matchmaking.js';
import type { GameState } from './types.js';

// ═══ game creation ═══
export function createGame(opts: { seed?: number } = {}): GameState {
  const rng = makeRng(opts.seed);
  const bus = new EventBus();
  const engine = new CardEngine(bus, rng);
  const game: GameState = {
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
    dashOverride: null, // a card owning the Dash
    enemies: [], projectiles: [], enemyProjectiles: [], zones: [], telegraphs: [],
    summons: [], pickups: [], particles: [], floaters: [], fx: [],
    sustains: [], traps: [],
    relics: [], relicRadiusMult: 1, hasDuelist: false, hasCrossClass: false,
    camera: { x: 0, y: 0, shake: 0 },
    chunks: new Map(),
    zoneRegion: null,
    activeBoss: null,
    // matchmaking / rival encounters
    mm: { state: 'idle', nextT: 40, searchT: 0, timeout: 9 },
    rival: null, // neutral rival during the choice moment
    ally: null, // partied rival
    encounterPause: false,
    banner: null, pendingReward: null, rewardQueue: [],
    stolen: null, dangerT: 0, kills: 0, runTime: 0, campsCleared: 0, bossesSlain: 0, duelsWon: 0,
    spawnT: 1.5,
    gold: 30, sanctuary: null,
    deckIds: STARTING_DECKS.mage.map((id) => ({ id, lvl: 0 })),
    stateLabel: '',
    uiDirty: true,
  };

  engine.setDeck(game.deckIds);

  // ── engine ↔ world wiring ──
  engine.resolveCard = (inst: CardInstance, buffs: Buffs, preview: EffectPreview | null) => resolveCard(game, inst, buffs, preview);
  engine.computePreview = (def: CardDef, buffs: Buffs) => computePreview(game, def, buffs);
  engine.runEnchantAction = (doSpec: EnchantDo, payload: EnchantPayload, ench?: EnchantRef) => runEnchantAction(game, doSpec, payload, ench);
  engine.classChannelMult = (def: CardDef) => classChannelMult(game, def);

  bus.on(EVT.cardResolved, ({ inst }) => {
    sfx('resolve', inst.def.element);
    spark(game, game.player.x, game.player.y, colorOf(inst.def), 6, 90);
  });
  bus.on(EVT.cardDrawn, () => sfx('draw'));
  bus.on(EVT.flowGained, ({ amount }) => {
    for (let i = 0; i < Math.min(amount * 2, 8); i++) {
      game.particles.push(mote(game, game.player.x, game.player.y, '#ffd97a'));
    }
  });
  bus.on(EVT.perfectDodge, () => {
    engine.gainFlow(2, 'dodge');
    gainOpportunity(game, 1);
    floater(game, game.player.x, game.player.y - 30, 'PERFECT', '#ffd97a', 18);
    game.slowmo = 0.22;
    sfx('perfect');
  });
  bus.on(EVT.trapTriggered, () => gainOpportunity(game, 1));
  bus.on(EVT.enemyKilled, ({ enemy }) => {
    if (enemy.def.rival) duelVictory(game, enemy);
    else if (enemy.def.boss && game.zoneRegion?.kind === 'boss') bossCleared(game);
  });
  bus.on(EVT.powerGained, () => sfx('enchant'));
  return game;
}

export function colorOf(def: CardDef): string {
  return ELEMENT_COLORS[def.element] || SCHOOL_COLORS[def.school];
}

// ═══ channel preview ═══
function computePreview(game: GameState, def: CardDef, buffs: Buffs): EffectPreview | null {
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
function resolveCard(game: GameState, inst: CardInstance, buffs: Buffs, preview: EffectPreview | null): void {
  const def = inst.def;
  const p = game.player;
  const lvl = inst.lvl || 0; // combined duplicates: +25% damage, +8% area, +15% durations per level
  let dmgMult = (buffs.dmgMult || 1) * (1 + 0.25 * lvl);
  if (game.hasDuelist && def.school === 'Warrior' && game.engine.queue.length <= 1) dmgMult *= 1.6;
  const radMult = (buffs.radiusMult || 1) * game.relicRadiusMult * (1 + 0.08 * lvl);
  let critBonus = buffs.critChance || 0;
  if (game.playerClass === 'rogue') critBonus += game.opportunity * 0.03;
  const ctx: EffectCtx = { def, buffs: { ...buffs, critChance: critBonus }, dmgMult, radMult, preview, lvl };
  for (const eff of def.effects) runEffect(game, eff, ctx);
  game.fx.push({ kind: 'cast', x: p.x, y: p.y, color: colorOf(def), t: 0, life: 0.35 });
}

function runEffect(game: GameState, eff: EffectSpec, ctx: EffectCtx): void {
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
      let x: number;
      let y: number;
      if (eff.atFacing != null) {
        const a = aimAngle(game);
        x = p.x + Math.cos(a) * eff.atFacing;
        y = p.y + Math.sin(a) * eff.atFacing;
      } else if (ctx.preview && !ctx.preview.reticle) {
        x = ctx.preview.x;
        y = ctx.preview.y;
      } else if (ctx.def.targeting === 'self') {
        x = p.x;
        y = p.y;
      } else {
        const t = nearestEnemy(game, p.x, p.y);
        x = t ? t.x : p.x;
        y = t ? t.y : p.y;
      }
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
        if (eff.knockback) {
          const a = Math.atan2(e.y - y, e.x - x);
          e.kvx = Math.cos(a) * eff.knockback;
          e.kvy = Math.sin(a) * eff.knockback;
          e.kt = 0.25;
        }
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
      let x: number;
      let y: number;
      const follow = !!eff.follow;
      if (follow || ctx.def.targeting === 'self') {
        x = p.x;
        y = p.y;
      } else if (ctx.preview) {
        x = ctx.preview.x;
        y = ctx.preview.y;
      } else {
        const t = nearestEnemy(game, p.x, p.y);
        x = t ? t.x : p.x;
        y = t ? t.y : p.y;
      }
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
        if (!e.dead && eff.knockback) {
          e.kvx = Math.cos(a0) * eff.knockback;
          e.kvy = Math.sin(a0) * eff.knockback;
          e.kt = 0.2;
        }
      }
      game.fx.push({ kind: 'arc', x: p.x, y: p.y, ang: a0, arc: half * 2, range, color: ELEMENT_COLORS[ctx.def.element] || '#e8dcc0', t: 0, life: 0.28 });
      shake(game, 4);
      sfx('slash');
      break;
    }

    case 'chain': {
      const start = nearestEnemy(game, p.x, p.y);
      if (start) chainFrom(game, start, eff, ctx, p.x, p.y);
      break;
    }

    case 'blink': {
      let a: number;
      const t = nearestEnemy(game, p.x, p.y);
      if (eff.away && t) a = Math.atan2(p.y - t.y, p.x - t.x);
      else a = Math.atan2(p.moveDir.y, p.moveDir.x);
      spark(game, p.x, p.y, colorOf(ctx.def), 10, 140);
      p.x += Math.cos(a) * eff.dist;
      p.y += Math.sin(a) * eff.dist;
      clampToRegion(game, p);
      if (eff.untargetable) p.untargetable = Math.max(p.untargetable, eff.untargetable);
      if (eff.empower) {
        p.empower = { ...eff.empower };
        floater(game, p.x, p.y - 30, 'EMPOWERED', '#a98fe0', 12);
      }
      spark(game, p.x, p.y, colorOf(ctx.def), 10, 140);
      sfx('blink');
      break;
    }

    case 'dashAttack': {
      const a = aimAngle(game);
      const x0 = p.x;
      const y0 = p.y;
      p.x += Math.cos(a) * eff.dist;
      p.y += Math.sin(a) * eff.dist;
      clampToRegion(game, p);
      for (const e of game.enemies) {
        if (!targetable(e)) continue;
        if (distToSegment(e.x, e.y, x0, y0, p.x, p.y) < 60 + e.r) {
          hitEnemy(game, e, eff.dmg, ctx, eff);
          if (e.dead) continue;
          if (eff.gather) { // drag enemies along toward the destination
            const ka = Math.atan2(p.y - e.y, p.x - e.x);
            e.kvx = Math.cos(ka) * eff.gather;
            e.kvy = Math.sin(ka) * eff.gather;
            e.kt = 0.3;
          } else if (eff.knockback) {
            const ka = Math.atan2(e.y - y0, e.x - x0);
            e.kvx = Math.cos(ka) * eff.knockback;
            e.kvy = Math.sin(ka) * eff.knockback;
            e.kt = 0.25;
          }
        }
      }
      game.fx.push({ kind: 'streak', x1: x0, y1: y0, x2: p.x, y2: p.y, color: '#e8dcc0', t: 0, life: 0.3 });
      shake(game, 5);
      sfx('charge');
      break;
    }

    case 'armor':
      p.armor = Math.min(60, p.armor + eff.amount);
      floater(game, p.x, p.y - 30, '+' + eff.amount + ' ARMOR', '#ffd97a', 13);
      sfx('armor');
      break;
    case 'stabilize': {
      const amt = engine.powers.length > 0 ? eff.high : eff.low;
      p.armor = Math.min(60, p.armor + amt);
      floater(game, p.x, p.y - 30, '+' + amt + ' ARMOR', '#ffd97a', 13);
      sfx('armor');
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
      if (t) {
        t.mark = { t: eff.dur, amp: eff.amp, crit: eff.crit || 0 };
        floater(game, t.x, t.y - t.r - 10, 'MARKED', '#a98fe0', 12);
      }
      break;
    }
    case 'summon': {
      game.summons.push({ kind: eff.kind, x: p.x + 30, y: p.y + 10, t: 0, dur: eff.dur, fireT: 0.3, fireRate: eff.fireRate, dmg: eff.dmg, ctx });
      sfx('enchant');
      break;
    }
  }
}

// The card engine calls this generically for every enchant/relic trigger; the
// payload shape depends on which event fired it (see core/events.ts's
// EventMap). Only the fields actually read here are typed.
export interface EnchantPayload {
  id?: string;
  x?: number;
  y?: number;
  enemy?: EnemyState;
}
export interface EnchantRef {
  color: string;
  relic?: boolean;
}

function runEnchantAction(game: GameState, doSpec: EnchantDo, payload: EnchantPayload, ench?: EnchantRef): void {
  const p = game.player;
  const engine = game.engine;
  if (doSpec.flow) engine.gainFlow(doSpec.flow, 'enchant');
  if (doSpec.flowIfNear && nearestEnemy(game, p.x, p.y, undefined, 260)) engine.gainFlow(doSpec.flowIfNear, 'momentum');
  if (doSpec.draw) for (let i = 0; i < doSpec.draw; i++) engine.drawCard('enchant');
  if (doSpec.nextChannelMult) engine.nextChannelMult = doSpec.nextChannelMult;
  if (doSpec.cycleAttunement) {
    const opts = ATTUNEMENT_IDS.filter((id) => id !== payload.id);
    const inst = engine.makeCard(game.rng.pick(opts)) as CardInstance;
    inst.cost = 0;
    engine.queue.unshift(inst);
    engine.uiDirty = true;
    game.bus.emit(EVT.cardQueued, { inst });
    floater(game, p.x, p.y - 38, 'THE CYCLE TURNS', '#b48cff', 12);
  }
  if (doSpec.burst) {
    const x = payload.x ?? p.x;
    const y = payload.y ?? p.y;
    const b = doSpec.burst;
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
    const enemy = payload.enemy;
    for (const e of enemiesIn(game, enemy.x, enemy.y, s.r)) {
      if (e !== enemy && !e.dead) applyStatus(game, e, s.status, s.stacks);
    }
    game.fx.push({ kind: 'blast', x: enemy.x, y: enemy.y, r: s.r, color: ELEMENT_COLORS.poison, t: 0, life: 0.4 });
  }
  if (ench && !ench.relic) spark(game, p.x, p.y, ench.color, 4, 80);
}
