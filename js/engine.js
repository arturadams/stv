// ── Arcana Engine · card pipeline ──────────────────────────────────────────
// Deck → Draw → Queue → Channel → Resolve → Discard → Shuffle
// The engine is automatic; the player never casts manually. World-facing
// behavior (spawning projectiles, enchant actions, previews) is delegated
// through callbacks set by world.js so this file stays DOM- and canvas-free.

import { CARDS } from './data.js';

export class EventBus {
  constructor() { this.map = new Map(); }
  on(name, fn) {
    if (!this.map.has(name)) this.map.set(name, []);
    this.map.get(name).push(fn);
  }
  emit(name, payload = {}) {
    const fns = this.map.get(name);
    if (fns) for (const fn of fns.slice()) fn(payload);
  }
}

let UID = 1;
export function makeCard(id) {
  const def = CARDS[id];
  if (!def) throw new Error('unknown card: ' + id);
  return { uid: UID++, def, cost: def.cost };
}

export class CardEngine {
  constructor(bus) {
    this.bus = bus;
    this.deck = []; this.discard = []; this.queue = [];
    this.channel = null;           // {inst, t, dur, buffs, cost, preview}
    this.flow = 4; this.maxFlow = 10;
    this.drawInterval = 0.85; this.drawTimer = 0.4; this.queueCap = 6;
    this.modStack = [];            // pending modifiers: {name, glyph, color, match, count, buff}
    this.enchants = [];            // active triggers: {name, glyph, color, timeLeft, on, filter, chance, do, relic}
    this.flowJobs = [];            // battery-style flow over time
    this.hasteMult = 1; this.hasteTimer = 0;
    this.nextChannelMult = 1;      // one-shot channel haste (Assassin's Needle etc.)
    this.channelMultGlobal = 1;    // relic stat (Cracked Hourglass)
    this.lastResolvedId = null;
    this.combo = 0; this.comboTimer = 0;
    this.uiDirty = true;
    // set by world.js:
    this.resolveCard = null;       // (inst, buffs) => void
    this.computePreview = null;    // (def, buffs) => preview | null
    this.runEnchantAction = null;  // (doSpec, payload, label) => void
    const dispatch = (ev) => (p) => this.dispatchEnchants(ev, p);
    for (const ev of ['statusApplied', 'enemyKilled', 'perfectDodge', 'queueEmpty', 'playerHit', 'cardResolved'])
      bus.on(ev, dispatch(ev));
  }

  setDeck(ids) {
    this.deck = ids.map(makeCard);
    this.shuffleArray(this.deck);
    this.discard = []; this.queue = []; this.channel = null;
    this.uiDirty = true;
  }

  shuffleArray(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [a[i], a[j]] = [a[j], a[i]];
    }
  }

  gainFlow(amount, source = '') {
    if (amount <= 0) return;
    const before = this.flow;
    this.flow = Math.min(this.maxFlow, this.flow + amount);
    if (this.flow > before) this.bus.emit('flowGained', { amount: this.flow - before, source });
  }

  drawCard(reason = 'auto') {
    if (this.queue.length >= this.queueCap) return false;
    if (this.deck.length === 0) {
      if (this.discard.length === 0) return false;
      this.deck = this.discard; this.discard = [];
      this.shuffleArray(this.deck);
      this.bus.emit('deckShuffled', {});
    }
    const inst = this.deck.pop();
    this.queue.push(inst);
    this.uiDirty = true;
    this.bus.emit('cardDrawn', { inst, reason });
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
    const cost = this.effectiveCost(inst, buffs);
    if (this.flow < cost) {
      // Not enough Flow: un-consume nothing (buffs already taken) would be
      // unfair, so we only collect buffs when the cast is certain. Re-check
      // cost with a dry run first — see update() which calls canAfford().
      return false;
    }
    this.flow -= cost;
    this.queue.shift();
    let dur = def.channel * buffs.channelMult * this.channelMultGlobal * this.nextChannelMult;
    this.nextChannelMult = 1;
    dur = Math.max(0, dur);
    const preview = this.computePreview ? this.computePreview(def, buffs) : null;
    this.channel = { inst, t: 0, dur, buffs, cost, preview };
    this.uiDirty = true;
    this.bus.emit('channelStart', { inst, dur, cost });
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
    this.discard.push(inst);
    this.uiDirty = true;
    // combo chain: resolves within 3s of each other build combo
    this.combo = this.comboTimer > 0 ? this.combo + 1 : 1;
    this.comboTimer = 3;
    if (this.combo > 1 && this.combo % 5 === 0) this.gainFlow(2, 'combo');
    this.bus.emit('comboChanged', { combo: this.combo });
    this.bus.emit('cardResolved', { inst, buffs });
    if (this.queue.length === 0 && !this.channel) this.bus.emit('queueEmpty', {});
  }

  // Resolve queued cards immediately, front to back, while Flow lasts.
  flush(costMult = 1) {
    let guard = 24; // hard cap; Flush can never resolve infinite cards
    while (this.queue.length > 0 && guard-- > 0) {
      const inst = this.queue[0];
      const buffs = this.collectBuffs(inst.def);
      const cost = Math.max(0, Math.ceil(this.effectiveCost(inst, buffs) * costMult));
      if (this.flow < cost) break;
      this.flow -= cost;
      this.queue.shift();
      const preview = this.computePreview ? this.computePreview(inst.def, buffs) : null;
      this.doResolve(inst, buffs, preview);
    }
    this.uiDirty = true;
  }

  queueOp(op, params = {}) {
    switch (op) {
      case 'duplicateNext': {
        const next = this.queue[0];
        if (next) this.queue.splice(1, 0, { uid: UID++, def: next.def, cost: next.cost, copy: true });
        break;
      }
      case 'reverse': this.queue.reverse(); break;
      case 'flush': this.flush(params.costMult ?? 1); break;
      case 'echoLast': {
        if (this.lastResolvedId) {
          const inst = makeCard(this.lastResolvedId);
          inst.cost += 1;
          this.queue.push(inst);
          this.bus.emit('cardQueued', { inst });
        }
        break;
      }
      case 'shuffleAll':
        this.deck.push(...this.discard); this.discard = [];
        this.shuffleArray(this.deck);
        this.bus.emit('deckShuffled', {});
        break;
      case 'purge': {
        let refund = 0;
        for (const inst of this.queue) refund += inst.cost;
        this.discard.push(...this.queue); this.queue = [];
        this.gainFlow(Math.floor(refund / 2), 'purge');
        this.bus.emit('queueEmpty', {});
        break;
      }
    }
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
      }
      if (e.chance < 1 && Math.random() > e.chance) continue;
      if (this.runEnchantAction) this.runEnchantAction(e.do, payload, e);
    }
  }

  update(dt) {
    // timers
    if (this.comboTimer > 0) { this.comboTimer -= dt; if (this.comboTimer <= 0) { this.combo = 0; this.bus.emit('comboChanged', { combo: 0 }); } }
    if (this.hasteTimer > 0) { this.hasteTimer -= dt; if (this.hasteTimer <= 0) this.hasteMult = 1; }
    for (const j of this.flowJobs) {
      const give = Math.min(dt / j.dur * j.amount, j.remaining);
      j.acc = (j.acc || 0) + give; j.remaining -= give;
      if (j.acc >= 1) { const whole = Math.floor(j.acc); j.acc -= whole; this.gainFlow(whole, 'battery'); }
    }
    this.flowJobs = this.flowJobs.filter(j => j.remaining > 0.01);
    let expired = false;
    for (const e of this.enchants) { if (e.timeLeft !== Infinity) { e.timeLeft -= dt; if (e.timeLeft <= 0) expired = true; } }
    if (expired) { this.enchants = this.enchants.filter(e => e.timeLeft > 0 || e.timeLeft === Infinity); this.uiDirty = true; }

    // automatic draw
    this.drawTimer -= dt;
    if (this.drawTimer <= 0) {
      this.drawTimer = this.drawInterval;
      this.drawCard();
    }

    // channel pipeline
    if (!this.channel && this.queue.length > 0 && this.canAfford(this.queue[0])) {
      this.startChannel();
    }
    if (this.channel) {
      this.channel.t += dt * this.hasteMult;
      // self-centered previews follow the player
      if (this.channel.preview && this.channel.preview.follow && this.followPos) {
        this.channel.preview.x = this.followPos.x;
        this.channel.preview.y = this.followPos.y;
      }
      if (this.channel.t >= this.channel.dur) this.finishChannel();
    }
  }
}
