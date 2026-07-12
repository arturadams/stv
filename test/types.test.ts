import { describe, expect, it } from 'vitest';

import type {
  Buffs,
  CardDef,
  EffectCtx,
  EffectSpec,
  RelicDef,
} from '../js/data/types.js';

const effects = [
  { type: 'power', dur: 8, power: { dmgMult: 1.2, addStatus: ['burn', 1] } },
  { type: 'sustained', dur: 2, tick: 0.5, do: { chain: { dmg: 4, jumps: 2, range: 100 } } },
  { type: 'trap', arm: 0.5, r: 80, dmg: 10, ttl: 20, root: 1, status: ['poison', 1] },
  { type: 'extendPower', sec: 4 },
  { type: 'dashOverride', dur: 8, move: { kind: 'blink', dist: 200, cd: 0.9 } },
  { type: 'proj', dmg: 10, speed: 500, radius: 5, status: ['chill', 1] },
  { type: 'aoe', r: 120, dmg: 20, freeze: 1, atFacing: 50 },
  { type: 'zone', r: 100, duration: 4, tickDmg: 3, tickRate: 0.5, slow: 0.7 },
  { type: 'arc', dmg: 15, range: 120, arc: 90, executeBelow: 0.3, executeMult: 3 },
  { type: 'chain', dmg: 8, jumps: 3, range: 180 },
  { type: 'blink', dist: 180, away: true, untargetable: 0.5 },
  { type: 'dashAttack', dist: 220, dmg: 18, gather: 100 },
  { type: 'armor', amount: 20 },
  { type: 'stabilize', low: 5, high: 16 },
  { type: 'draw', n: 2 },
  { type: 'queueOp', op: 'flush', costMult: 0.5 },
  { type: 'mod', match: { cat: 'Signature' }, count: 2, buff: { dmgMult: 1.5 } },
  { type: 'enchant', dur: 30, on: ['enemyKilled'], filter: { hasStatus: 'poison' }, do: { flow: 1 } },
  { type: 'haste', mult: 2, dur: 6 },
  { type: 'flowOverTime', amount: 5, dur: 3 },
  { type: 'mark', dur: 8, amp: 1.35, crit: 0.25 },
  { type: 'summon', kind: 'clone', dur: 8, fireRate: 0.7, dmg: 7 },
] satisfies EffectSpec[];

const buffs: Buffs = {
  dmgMult: 1,
  costMult: 1,
  channelMult: 1,
  radiusMult: 1,
  critChance: 0,
  repeat: 0,
  addStatus: [],
};

const card = {
  id: 'typed_fixture',
  name: 'Typed Fixture',
  school: 'Mage',
  cat: 'Signature',
  rarity: 'Rare',
  cost: 3,
  channel: 1.2,
  targeting: 'nearest',
  preview: { r: 120 },
  tags: ['AoE'],
  glyph: '*',
  element: 'arcane',
  text: 'Type fixture',
  effects,
} satisfies CardDef;

const relic = {
  id: 'typed_relic',
  name: 'Typed Relic',
  glyph: '+',
  color: '#fff',
  text: 'Type fixture',
  enchant: {
    on: ['statusApplied'],
    filter: { status: 'burn' },
    chance: 0.25,
    do: { flow: 1 },
  },
  stats: { maxFlow: 2, radiusMult: 1.1 },
} satisfies RelicDef;

const context: EffectCtx = {
  def: card,
  buffs,
  dmgMult: 1,
  radMult: 1,
  preview: null,
  lvl: 0,
};

// @ts-expect-error aoe damage is required
const invalidAoe: EffectSpec = { type: 'aoe', r: 100 };
// @ts-expect-error unknown queue operations are rejected
const invalidQueueOp: EffectSpec = { type: 'queueOp', op: 'teleport' };
// @ts-expect-error statuses are a closed vocabulary
const invalidStatus: EffectSpec = { type: 'trap', arm: 1, r: 50, dmg: 5, ttl: 10, status: ['stunned', 1] };
// @ts-expect-error enchant event names come from EventMap
const invalidEvent: EffectSpec = { type: 'enchant', on: ['enemyDefeated'], do: { flow: 1 } };

describe('card and effect domain types', () => {
  it('covers every current resolver effect type', () => {
    expect(effects).toHaveLength(22);
    expect(new Set(effects.map((effect) => effect.type))).toHaveLength(22);
  });

  it('accepts current card, relic, buffs, and context shapes', () => {
    expect(card.effects).toBe(effects);
    expect(relic.enchant?.on).toEqual(['statusApplied']);
    expect(context.buffs).toBe(buffs);
  });

  it('keeps invalid type fixtures compile-only', () => {
    expect([invalidAoe, invalidQueueOp, invalidStatus, invalidEvent]).toHaveLength(4);
  });
});
