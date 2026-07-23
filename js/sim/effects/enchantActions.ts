import { ATTUNEMENT_IDS, ELEMENT_COLORS } from '../../data/index.js';
import type { Buffs, CardInstance, EnchantDo, EnemyState, StatusName } from '../../data/types.js';
import { EVT } from '../../core/events.js';
import { sfx } from '../../audio.js';
import { STATUS_DEFS, applyStatus, damageEnemy, enemiesIn, nearestEnemy } from '../combat.js';
import { floater, spark } from '../fx.js';
import type { GameState, Summon } from '../types.js';

// The card engine calls this generically for every enchant/relic trigger; the
// payload shape depends on which event fired it (see core/events.ts's
// EventMap). Only the fields actually read here are typed.
export interface EnchantPayload {
  id?: string;
  x?: number;
  y?: number;
  enemy?: EnemyState;
  inst?: CardInstance;
  buffs?: Buffs;
  dmg?: number;
  pct?: number;
  status?: StatusName;
  amount?: number;
  summon?: Summon;
}
export interface EnchantCounterState {
  value: number;
  max: number;
  label: string;
}
export interface EnchantRef {
  name: string;
  color: string;
  relic?: boolean;
  uncapped?: boolean;
  counter: EnchantCounterState | null;
}

type EnchantActionHandler<K extends keyof EnchantDo> = (
  game: GameState,
  value: NonNullable<EnchantDo[K]>,
  payload: EnchantPayload,
  ench?: EnchantRef,
) => void;

const handlers = new Map<keyof EnchantDo, EnchantActionHandler<keyof EnchantDo>>();

export function registerEnchantAction<K extends keyof EnchantDo>(key: K, fn: EnchantActionHandler<K>): void {
  handlers.set(key, fn as EnchantActionHandler<keyof EnchantDo>);
}

// design doc §15: relic-generated resource should not exceed 4 per 5s,
// tracked independently of passive class regen (which doesn't count against
// this cap). Every relic-sourced flow grant routes through this — plain
// card-cast temporary enchants (which also use the 'flow' action key) are
// not capped, since the safety cap is specifically about relics.
//
// A true sliding window (drop grants older than the window instead of
// resetting a bucket on a timer) — a fixed-reset bucket lets up to 2x the
// cap through in a short span if a grant lands right before the reset.
interface RelicFlowGrant {
  time: number;
  amount: number;
}

const RELIC_FLOW_CAP = 4;
const RELIC_FLOW_WINDOW_SECONDS = 5;

export function gainRelicFlow(game: GameState, amount: number, relicId: string): void {
  if (amount <= 0) return;
  const key = 'flowGrants';
  const perRelic = (game.relicState[key] as Record<string, RelicFlowGrant[]> | undefined) || {};
  game.relicState[key] = perRelic;
  const cutoff = game.runTime - RELIC_FLOW_WINDOW_SECONDS;
  const grants = (perRelic[relicId] || []).filter((g) => g.time >= cutoff);
  const grantedInWindow = grants.reduce((sum, g) => sum + g.amount, 0);
  const allowed = Math.max(0, RELIC_FLOW_CAP - grantedInWindow);
  const granted = Math.min(amount, allowed);
  if (granted > 0) grants.push({ time: game.runTime, amount: granted });
  perRelic[relicId] = grants;
  if (granted <= 0) return;
  game.engine.gainFlow(granted, relicId);
}

registerEnchantAction('flow', (game, value, _payload, ench) => {
  if (ench?.relic && !ench.uncapped) gainRelicFlow(game, value, ench.name);
  else game.engine.gainFlow(value, ench?.relic ? ench.name : 'enchant');
});

registerEnchantAction('flowIfNear', (game, value, _payload, ench) => {
  const p = game.player;
  if (!nearestEnemy(game, p.x, p.y, undefined, 260)) return;
  if (ench?.relic) gainRelicFlow(game, value, ench.name);
  else game.engine.gainFlow(value, 'momentum');
});

registerEnchantAction('draw', (game, value) => {
  for (let i = 0; i < value; i++) game.engine.drawCard('enchant');
});

registerEnchantAction('nextChannelMult', (game, value) => {
  game.engine.nextChannelMult = value;
});

registerEnchantAction('cycleAttunement', (game, _value, payload) => {
  const p = game.player;
  const opts = ATTUNEMENT_IDS.filter((id) => id !== payload.id);
  const inst = game.engine.makeCard(game.rng.pick(opts)) as CardInstance;
  inst.cost = 0;
  game.engine.queue.unshift(inst);
  game.engine.uiDirty = true;
  game.bus.emit(EVT.cardQueued, { inst });
  floater(game, p.x, p.y - 38, 'THE CYCLE TURNS', '#b48cff', 12);
});

function applyBurst(game: GameState, value: NonNullable<EnchantDo['burst']>, payload: EnchantPayload): void {
  const p = game.player;
  const x = payload.x ?? p.x;
  const y = payload.y ?? p.y;
  for (const e of enemiesIn(game, x, y, value.r)) damageEnemy(game, e, value.dmg, { color: ELEMENT_COLORS[value.element], quiet: true });
  game.fx.push({ kind: 'blast', x, y, r: value.r, color: ELEMENT_COLORS[value.element], t: 0, life: 0.35 });
}

registerEnchantAction('burst', (game, value, payload) => applyBurst(game, value, payload));

registerEnchantAction('counterArc', (game, value) => {
  const p = game.player;
  for (const e of enemiesIn(game, p.x, p.y, value.range)) damageEnemy(game, e, value.dmg, { color: '#e8dcc0' });
  game.fx.push({ kind: 'arc', x: p.x, y: p.y, ang: p.facing, arc: Math.PI * 2, range: value.range, color: '#e8dcc0', t: 0, life: 0.3 });
  sfx('slash');
});

registerEnchantAction('spreadStatus', (game, value, payload) => {
  const enemy = payload.enemy;
  if (!enemy) return;
  for (const e of enemiesIn(game, enemy.x, enemy.y, value.r)) {
    if (e !== enemy && !e.dead) applyStatus(game, e, value.status, value.stacks);
  }
  game.fx.push({ kind: 'blast', x: enemy.x, y: enemy.y, r: value.r, color: ELEMENT_COLORS.poison, t: 0, life: 0.4 });
});

// design doc §3.4 — a visible, capped counter living on the enchant record
// itself, so any relic can count toward a threshold without bespoke state.
// Reset happens explicitly ('resetCounter') or by relic-specific logic
// (see js/sim/effects/relicMechanics.ts for time-based resets).
registerEnchantAction('incrementCounter', (game, value, _payload, ench) => {
  if (!ench) return;
  if (!ench.counter) ench.counter = { value: 0, max: value.max, label: value.label };
  ench.counter.value = Math.min(ench.counter.max, ench.counter.value + 1);
  game.uiDirty = true;
});

registerEnchantAction('resetCounter', (game, _value, _payload, ench) => {
  if (ench?.counter) ench.counter.value = 0;
  game.uiDirty = true;
});

registerEnchantAction('healPercentOfDamage', (game, value, payload) => {
  if (!payload.dmg) return;
  const applied = Math.min(payload.dmg * value, game.player.maxHp - game.player.hp);
  if (applied <= 0) return;
  game.player.hp += applied;
  floater(game, game.player.x, game.player.y - 30, '+' + Math.round(applied) + ' HEALTH', '#7fd6a8', 13);
});

registerEnchantAction('healFlat', (game, value) => {
  const applied = Math.min(value, game.player.maxHp - game.player.hp);
  if (applied <= 0) return;
  game.player.hp += applied;
  floater(game, game.player.x, game.player.y - 30, '+' + Math.round(applied) + ' HEALTH', '#7fd6a8', 13);
});

registerEnchantAction('armorFlat', (game, value) => {
  game.player.armor += value;
  floater(game, game.player.x, game.player.y - 30, '+' + value + ' ARMOR', '#ffd97a', 13);
});

// the common "count N qualifying events, then fire once and reset" relic
// shape (Hunter's Bell-style counters without the debounce/idle-reset
// complexity that needs bespoke relicState) in a single action
registerEnchantAction('stackAndTrigger', (game, value, payload, ench) => {
  if (!ench) return;
  if (!ench.counter) ench.counter = { value: 0, max: value.max, label: value.label };
  ench.counter.value += 1;
  game.uiDirty = true;
  if (ench.counter.value < ench.counter.max) return;
  ench.counter.value = 0;
  if (value.onFull.burst) applyBurst(game, value.onFull.burst, payload);
  if (value.onFull.flow) {
    if (ench.relic) gainRelicFlow(game, value.onFull.flow, ench.name);
    else game.engine.gainFlow(value.onFull.flow, 'enchant');
  }
  if (value.onFull.armor) game.player.armor += value.onFull.armor;
});

registerEnchantAction('ampOnStatus', (game, value, payload) => {
  const enemy = payload.enemy;
  const status = payload.status;
  if (!enemy || !status) return;
  const dur = STATUS_DEFS[status]?.dur || 3;
  const existing = enemy.mark;
  // don't clobber a stronger/longer mark from Deathmark, Challenge, Hex of
  // Frailty, etc. — keep whichever amp/duration is currently better
  enemy.mark = {
    t: Math.max(dur, existing?.t || 0),
    amp: Math.max(value.amp, existing?.amp || 0),
    crit: existing?.crit || 0,
  };
});

// Phoenix Ember: reads the stack count the status system already tracks on
// the enemy rather than keeping separate relic state — once at/above the
// threshold, detonate and roll the stack count back so it can't refire on
// every subsequent tick while stacks are still at/above threshold. "Once per
// target every 3s" (design doc §4.2) still allows a second detonation once
// stacks rebuild past the threshold again, so a per-(relic,target) cooldown
// caps how soon that can happen, rather than being unlimited.
registerEnchantAction('explodeAtStacks', (game, value, payload, ench) => {
  const enemy = payload.enemy;
  if (!enemy || !ench) return;
  const st = enemy.statuses[value.status];
  if (!st || st.stacks < value.threshold) return;
  const key = 'explodeAtStacks';
  const cooldowns = (game.relicState[key] as Record<string, number> | undefined) || {};
  const cdKey = ench.name + ':' + enemy.uid;
  if ((cooldowns[cdKey] || 0) > game.runTime) return;
  cooldowns[cdKey] = game.runTime + 3;
  game.relicState[key] = cooldowns;
  st.stacks = value.threshold - 1;
  for (const e of enemiesIn(game, enemy.x, enemy.y, value.r)) damageEnemy(game, e, value.dmg, { color: ELEMENT_COLORS[value.element], quiet: true });
  game.fx.push({ kind: 'blast', x: enemy.x, y: enemy.y, r: value.r, color: ELEMENT_COLORS[value.element], t: 0, life: 0.35 });
});

// applyStatus re-emits EVT.statusApplied, the very event this listens on —
// guarded the same way Echo guards against retriggering itself, so a 25%-
// chance relic can't chain into a second (much rarer, but non-zero) proc
// re-entering this same handler
let addingStackToSelf = false;
registerEnchantAction('addStackToSelf', (game, value, payload) => {
  if (addingStackToSelf) return;
  const enemy = payload.enemy;
  if (!enemy) return;
  addingStackToSelf = true;
  try {
    applyStatus(game, enemy, value.status, value.stacks);
  } finally {
    addingStackToSelf = false;
  }
});

// Same fixed order as the original if-chain — every real card's `do:` spec
// sets exactly one of these keys, so order is cosmetic in practice, but this
// keeps the dispatcher visibly equivalent to what it replaces.
const ENCHANT_ACTION_KEYS: (keyof EnchantDo)[] = [
  'flow', 'flowIfNear', 'draw', 'nextChannelMult', 'cycleAttunement', 'burst', 'counterArc', 'spreadStatus',
  'incrementCounter', 'resetCounter', 'healPercentOfDamage', 'healFlat', 'armorFlat', 'echo', 'stackAndTrigger', 'ampOnStatus',
  'stackAndEcho', 'explodeAtStacks', 'addStackToSelf',
];

export function runEnchantAction(game: GameState, doSpec: EnchantDo, payload: EnchantPayload, ench?: EnchantRef): void {
  for (const key of ENCHANT_ACTION_KEYS) {
    const value = doSpec[key];
    if (!value) continue;
    const handler = handlers.get(key);
    if (handler) handler(game, value, payload, ench);
  }
  const p = game.player;
  if (ench && !ench.relic) spark(game, p.x, p.y, ench.color, 4, 80);
}
