// ── Arcana Engine · card pipeline ──────────────────────────────────────────
// Deck → Draw → Queue → Channel → Resolve / Stay Active → Discard → Shuffle
// The engine is automatic; the player never casts manually. World-facing
// behavior (spawning projectiles, enchant actions, previews) is delegated
// through callbacks set by world.js so this file stays DOM- and canvas-free.
//
// Rhythm rules (see roadmap.md): cards take real time — channels are long,
// Powers stay active for seconds, sustained casts block the pipeline, and a
// short gap follows every resolve so the queue visibly accumulates.

import { CARDS, ELEMENT_COLORS, SCHOOL_COLORS } from './data.js';
import { EVT } from './core/events.js';
import { makeUidCounter } from './core/ids.js';
import { makeRng } from './core/rng.js';
import { runQueueOp } from './engine/queueOps.js';

// Cards carry a level: duplicates combined at a Sanctuary grow stronger.
export function makeCard(id, lvl = 0, uid = 0) {
  const def = CARDS[id];
  if (!def) throw new Error('unknown card: ' + id);
  return { uid, def, cost: def.cost, lvl };
}

const ENCHANT_EVENTS = [EVT.statusApplied, EVT.enemyKilled, EVT.perfectDodge, EVT.queueEmpty,
  EVT.playerHit, EVT.cardResolved, EVT.powerExpired, EVT.trapTriggered];

export class CardEngine {
  constructor(bus, rng = makeRng(Date.now())) {
    this.bus = bus;
    this.rng = rng;
    this.cardIds = makeUidCounter();
    this.deck = []; this.discard = []; this.queue = [];
    this.channel = null;           // {inst, t, dur, buffs, cost, preview}
    this.flow = 4; this.maxFlow = 10;
    this.drawInterval = 1.0; this.drawTimer = 0.5; this.queueCap = 6;
    this.gapT = 0;                 // readability breath after each resolve
    this.modStack = [];            // pending modifiers: {name, glyph, color, match, count, buff}
    this.enchants = [];            // active triggers: {name, glyph, color, timeLeft, on, filter, chance, do, relic}
    this.powers = [];              // ACTIVE powers: {id, name, glyph, color, school, timeLeft, dur, spec}
    this.flowJobs = [];            // battery-style flow over time
    this.flushMode = null;         // {charges, costMult} — queued cards channel at 3× speed
    this.hasteMult = 1; this.hasteTimer = 0;
    this.nextChannelMult = 1;      // one-shot channel haste (Assassin's Needle etc.)
    this.channelMultGlobal = 1;    // relic stat (Cracked Hourglass)
    this.powerDurMult = 1;         // relic stat (Eternal Sigil)
    this.sustainedActive = false;  // set by world.js while a sustained cast runs
    this.lastResolvedId = null;
    this.combo = 0; this.comboTimer = 0;
    this.uiDirty = true;
    // set by world.js:
    this.resolveCard = null;       // (inst, buffs, preview, i) => void
    this.computePreview = null;    // (def, buffs) => preview | null
    this.runEnchantAction = null;  // (doSpec, payload, ench) => void
    this.followPos = null;         // {x, y} — set every frame so self-centered previews can follow the player
    const dispatch = (ev) => (p) => this.dispatchEnchants(ev, p);
    for (const ev of ENCHANT_EVENTS) bus.on(ev, dispatch(ev));
  }

  makeCard(id, lvl = 0) {
    return makeCard(id, lvl, this.cardIds.next());
  }

  setDeck(entries) {
    this.deck = entries.map(e => typeof e === 'string' ? this.makeCard(e) : this.makeCard(e.id, e.lvl || 0));
    this.shuffleArray(this.deck);
    this.discard = []; this.queue = []; this.channel = null;
    this.powers = []; this.flushMode = null; this.gapT = 0;
    this.uiDirty = true;
  }

  shuffleArray(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = this.rng.int(i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
  }

  gainFlow(amount, source = '') {
    if (amount <= 0) return;
    const before = this.flow;
    this.flow = Math.min(this.maxFlow, this.flow + amount);
    if (this.flow > before) this.bus.emit(EVT.flowGained, { amount: this.flow - before, source });
  }

  drawCard(reason = 'auto') {
    if (this.queue.length >= this.queueCap) return false;
    if (this.deck.length === 0) {
      if (this.discard.length === 0) return false;
      this.deck = this.discard; this.discard = [];
      this.shuffleArray(this.deck);
      this.bus.emit(EVT.deckShuffled, {});
    }
    const inst = this.deck.pop();
    this.queue.push(inst);
    this.uiDirty = true;
    this.bus.emit(EVT.cardDrawn, { inst, reason });
    return true;
  }

  // Match pending modifiers against a card; consume them and merge buffs.
  collectBuffs(def) {
    const buffs = { dmgMult: 1, costMult: 1, channelMult: 1, radiusMult: 1, critChance: 0, repeat: 0, addStatus: [] };
    for (const m of this.modStack) {
      const mt = m.match || {};
      if (mt.school && def.school !== mt.school) continue;
      if (mt.cat && def.cat !== mt.cat) continue;
      if (mt.tags && !mt.tags.some(t => def.tags.includes(t))) continue;
      const b = m.buff;
      if (b.dmgMult != null) buffs.dmgMult *= b.dmgMult;
      if (b.costMult != null) buffs.costMult *= b.costMult;
      if (b.channelMult != null) buffs.channelMult *= b.channelMult;
      if (b.radiusMult != null) buffs.radiusMult *= b.radiusMult;
      if (b.critChance) buffs.critChance += b.critChance;
      if (b.repeat) buffs.repeat += b.repeat;
      if (b.addStatus) buffs.addStatus.push(b.addStatus);
      m.count -= 1;
      m.consumed = m.count <= 0;
    }
    this.modStack = this.modStack.filter(m => !m.consumed);
    return buffs;
  }

  effectiveCost(inst, buffs) {
    return Math.max(0, Math.ceil(inst.cost * buffs.costMult));
  }

  startChannel() {
    const inst = this.queue[0];
    const def = inst.def;
    const buffs = this.collectBuffs(def);
    let cost = this.effectiveCost(inst, buffs);
    let flushSpeed = 1;
    if (this.flushMode && this.flushMode.charges > 0) {
      cost = Math.max(0, Math.ceil(cost * this.flushMode.costMult));
      flushSpeed = 0.35;
      this.flushMode.charges -= 1;
      if (this.flushMode.charges <= 0) this.flushMode = null;
    }
    if (this.flow < cost) return false; // canAfford() pre-checked; still guard
    this.flow -= cost;
    this.queue.shift();
    let dur = def.channel * buffs.channelMult * this.channelMultGlobal * this.nextChannelMult * flushSpeed;
    this.nextChannelMult = 1;
    dur = Math.max(0, dur);
    const preview = this.computePreview ? this.computePreview(def, buffs) : null;
    this.channel = { inst, t: 0, dur, buffs, cost, preview };
    this.uiDirty = true;
    this.bus.emit(EVT.channelStart, { inst, dur, cost });
    return true;
  }

  // Dry-run affordability check (does not consume modifiers).
  canAfford(inst) {
    let costMult = 1;
    for (const m of this.modStack) {
      const mt = m.match || {}; const def = inst.def;
      if (mt.school && def.school !== mt.school) continue;
      if (mt.cat && def.cat !== mt.cat) continue;
      if (mt.tags && !mt.tags.some(t => def.tags.includes(t))) continue;
      if (m.buff.costMult != null) costMult *= m.buff.costMult;
    }
    if (this.flushMode && this.flushMode.charges > 0) costMult *= this.flushMode.costMult;
    return this.flow >= Math.max(0, Math.ceil(inst.cost * costMult));
  }

  finishChannel() {
    const ch = this.channel;
    this.channel = null;
    this.doResolve(ch.inst, ch.buffs, ch.preview);
  }

  doResolve(inst, buffs, preview) {
    const repeats = 1 + (buffs.repeat || 0);
    for (let i = 0; i < repeats; i++) {
      if (this.resolveCard) this.resolveCard(inst, buffs, preview, i);
    }
    this.lastResolvedId = inst.def.id;
    this.lastResolvedLvl = inst.lvl || 0;
    this.discard.push(inst);
    this.gapT = 0.55; // the breath: let the player read what just happened
    this.uiDirty = true;
    // combo chain: resolves within 4s of each other build combo
    this.combo = this.comboTimer > 0 ? this.combo + 1 : 1;
    this.comboTimer = 4;
    if (this.combo > 1 && this.combo % 5 === 0) this.gainFlow(2, 'combo');
    this.bus.emit(EVT.comboChanged, { combo: this.combo });
    this.bus.emit(EVT.cardResolved, { inst, buffs });
    if (this.queue.length === 0 && !this.channel) this.bus.emit(EVT.queueEmpty, {});
  }

  // ── Powers: cards that stay active, modifying the basic attack ──
  addPower(def, eff, durMult = 1) {
    const dur = (eff.dur || 6) * this.powerDurMult * durMult;
    // re-applying the same power refreshes it instead of stacking
    const existing = this.powers.find(pw => pw.id === def.id);
    if (existing) { existing.timeLeft = dur; existing.dur = dur; this.uiDirty = true; return; }
    this.powers.push({
      id: def.id, name: def.name, glyph: def.glyph,
      color: ELEMENT_COLORS[def.element] || SCHOOL_COLORS[def.school],
      school: def.school, timeLeft: dur, dur, spec: eff.power || {},
    });
    this.bus.emit(EVT.powerGained, { id: def.id, school: def.school });
    this.uiDirty = true;
  }

  extendPowers(sec) {
    for (const pw of this.powers) { pw.timeLeft += sec; pw.dur += sec; }
    this.uiDirty = true;
  }

  // Merge every active power's basic-attack modifications.
  basicMods() {
    const m = { override: null, addStatus: [], arcMult: 1, dmgMult: 1, rateMult: 1, extraEvery: 0 };
    for (const pw of this.powers) {
      const s = pw.spec;
      if (s.basicOverride) m.override = s.basicOverride;
      if (s.addStatus) m.addStatus.push(s.addStatus);
      if (s.arcMult) m.arcMult *= s.arcMult;
      if (s.dmgMult) m.dmgMult *= s.dmgMult;
      if (s.rateMult) m.rateMult *= s.rateMult;
      if (s.extraEvery) m.extraEvery = s.extraEvery;
    }
    return m;
  }

  powerChannelMult() {
    let mult = 1;
    for (const pw of this.powers) if (pw.spec.channelMult) mult *= pw.spec.channelMult;
    return mult;
  }

  queueOp(op, params = {}) {
    runQueueOp(this, op, params);
    this.uiDirty = true;
  }

  addModifier(def, effect) {
    this.modStack.push({
      name: def.name, glyph: def.glyph, color: def.element,
      match: effect.match || {}, count: effect.count || 1, buff: effect.buff,
    });
    this.uiDirty = true;
  }

  addEnchant(spec, label) {
    this.enchants.push({
      name: label.name, glyph: label.glyph, color: label.color,
      timeLeft: spec.dur ?? Infinity, on: spec.on, filter: spec.filter || null,
      chance: spec.chance ?? 1, do: spec.do, relic: !spec.dur,
    });
    this.uiDirty = true;
  }

  dispatchEnchants(eventName, payload) {
    for (const e of this.enchants) {
      if (!e.on.includes(eventName)) continue;
      if (e.filter) {
        if (e.filter.status && payload.status !== e.filter.status) continue;
        if (e.filter.hasStatus && !(payload.enemy && payload.enemy.statuses[e.filter.hasStatus])) continue;
        if (e.filter.school && payload.school !== e.filter.school) continue;
      }
      if (e.chance < 1 && !this.rng.chance(e.chance)) continue;
      if (this.runEnchantAction) this.runEnchantAction(e.do, payload, e);
    }
  }

  update(dt) {
    // timers
    if (this.comboTimer > 0) { this.comboTimer -= dt; if (this.comboTimer <= 0) { this.combo = 0; this.bus.emit(EVT.comboChanged, { combo: 0 }); } }
    if (this.hasteTimer > 0) { this.hasteTimer -= dt; if (this.hasteTimer <= 0) this.hasteMult = 1; }
    if (this.gapT > 0) this.gapT -= dt;
    for (const j of this.flowJobs) {
      const give = Math.min(dt / j.dur * j.amount, j.remaining);
      j.acc = (j.acc || 0) + give; j.remaining -= give;
      if (j.acc >= 1) { const whole = Math.floor(j.acc); j.acc -= whole; this.gainFlow(whole, 'battery'); }
    }
    this.flowJobs = this.flowJobs.filter(j => j.remaining > 0.01);

    // active powers tick down; expiry is an event (Elemental Cycle listens)
    let powerExpired = false;
    for (const pw of this.powers) {
      pw.timeLeft -= dt;
      if (pw.timeLeft <= 0) { powerExpired = true; this.bus.emit(EVT.powerExpired, { id: pw.id, school: pw.school }); }
    }
    if (powerExpired) { this.powers = this.powers.filter(pw => pw.timeLeft > 0); this.uiDirty = true; }

    let expired = false;
    for (const e of this.enchants) { if (e.timeLeft !== Infinity) { e.timeLeft -= dt; if (e.timeLeft <= 0) expired = true; } }
    if (expired) { this.enchants = this.enchants.filter(e => e.timeLeft > 0 || e.timeLeft === Infinity); this.uiDirty = true; }

    // automatic draw
    this.drawTimer -= dt;
    if (this.drawTimer <= 0) {
      this.drawTimer = this.drawInterval;
      this.drawCard();
    }

    // channel pipeline — waits for the gap and for sustained casts to finish
    if (!this.channel && !this.sustainedActive && this.gapT <= 0 &&
        this.queue.length > 0 && this.canAfford(this.queue[0])) {
      this.startChannel();
    }
    if (this.channel) {
      this.channel.t += dt * this.hasteMult * (1 / this.powerChannelMult());
      // self-centered previews follow the player
      if (this.channel.preview && this.channel.preview.follow && this.followPos) {
        this.channel.preview.x = this.followPos.x;
        this.channel.preview.y = this.followPos.y;
      }
      if (this.channel.t >= this.channel.dur) this.finishChannel();
    }
  }
}
