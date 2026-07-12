import { describe, expect, it } from 'vitest';

import type { CardDef, EffectCtx, EnemyDef } from '../js/data/types.js';
import type {
  Ally,
  Banner,
  EnemyProjectile,
  Fx,
  GameState,
  MatchmakingState,
  PlayerState,
  Projectile,
  Reward,
  Telegraph,
} from '../js/sim/types.js';

const card = {
  id: 'fixture', name: 'Fixture', school: 'Mage', cat: 'Spell', rarity: 'Common',
  cost: 1, channel: 0.5, targeting: 'nearest', tags: [], glyph: '*',
  element: 'arcane', text: 'Fixture', effects: [],
} satisfies CardDef;

const enemyDef = {
  id: 'wisp', name: 'Ink Wisp', role: 'swarm', hp: 14, speed: 118,
  radius: 13, dmg: 8, behavior: 'chase', color: '#3f3560',
  glow: '#8f6fff', shards: 1,
} satisfies EnemyDef;

const context = {
  def: card,
  buffs: { dmgMult: 1, costMult: 1, channelMult: 1, radiusMult: 1, critChance: 0, repeat: 0, addStatus: [] },
  dmgMult: 1,
  radMult: 1,
  preview: null,
  lvl: 0,
} satisfies EffectCtx;

const player = {
  x: 0, y: 0, vx: 0, vy: 0, r: 14,
  hp: 100, maxHp: 100, armor: 0, speed: 235,
  facing: 0, moveDir: { x: 0, y: -1 },
  dashT: 0, dashCd: 0, dashDir: { x: 0, y: -1 },
  iframes: 0, untargetable: 0, dodgeCredited: false, touchCd: 0,
  trail: [], attackT: 0.5, basicCount: 0, empower: null,
} satisfies PlayerState;

const projectile = {
  x: 0, y: 0, vx: 600, vy: 0, r: 5, dmg: 6,
  eff: { dmg: 6, speed: 600, radius: 5, element: 'arcane' },
  ctx: context, pierce: 0, life: 2.2, t: 0, phase: 0,
  rehit: null, color: '#8f6fff', hit: new Set<number>(),
} satisfies Projectile;

const enemyProjectile = {
  x: 10, y: 20, vx: -100, vy: 0, r: 7, dmg: 8,
  color: '#ff8a4a', t: 0,
} satisfies EnemyProjectile;

const telegraph = {
  shape: 'rect', x: 0, y: 0, w: 130, h: 460,
  t: 0, dur: 1.15, color: '#ffd97a',
  onDone: (game: GameState) => { game.hitstop = 0.08; },
} satisfies Telegraph;

const effects = [
  { kind: 'ring', x: 0, y: 0, r: 80, color: '#fff', t: 0, life: 0.4 },
  { kind: 'blast', x: 0, y: 0, r: 80, color: '#fff', t: 0, life: 0.4 },
  { kind: 'rectblast', x: 0, y: 0, w: 80, h: 100, color: '#fff', t: 0, life: 0.4 },
  { kind: 'arc', x: 0, y: 0, ang: 0, arc: 1.5, range: 120, color: '#fff', t: 0, life: 0.4 },
  { kind: 'bolt', x1: 0, y1: 0, x2: 20, y2: 20, color: '#fff', t: 0, life: 0.4 },
  { kind: 'streak', x1: 0, y1: 0, x2: 20, y2: 20, color: '#fff', t: 0, life: 0.4 },
  { kind: 'cast', x: 0, y: 0, color: '#fff', t: 0, life: 0.4 },
  { kind: 'spawn', x: 0, y: 0, r: 40, color: '#fff', t: 0, life: 0.4 },
] satisfies Fx[];

const matchmaking = { state: 'choice', nextT: 40, searchT: 4, timeout: 9 } satisfies MatchmakingState;
const banner = { title: 'DUEL', sub: 'Only one soul leaves', t: 2.4 } satisfies Banner;
const reward = { type: 'card', options: [card] } satisfies Reward;

const ally = {
  cls: 'mage', name: 'Gilded Mage', featured: [card], color: '#8f6fff',
  x: 0, y: 0, wob: 0, t: 0, dur: 90, attackT: 0.6, castT: 4,
  hp: 1, casting: null,
} satisfies Ally;

const collections = {
  player,
  enemies: [],
  projectiles: [projectile],
  enemyProjectiles: [enemyProjectile],
  telegraphs: [telegraph],
  fx: effects,
  mm: matchmaking,
  banner,
  pendingReward: { ...reward, heading: 'Choose' },
  ally,
} satisfies Pick<GameState,
  'player' | 'enemies' | 'projectiles' | 'enemyProjectiles' | 'telegraphs' |
  'fx' | 'mm' | 'banner' | 'pendingReward' | 'ally'>;

// @ts-expect-error game modes are closed
const invalidMode: GameState['state'] = 'paused';
// @ts-expect-error matchmaking states are closed
const invalidMatchmaking: MatchmakingState = { state: 'matched', nextT: 0, searchT: 0, timeout: 1 };
// @ts-expect-error relic rewards contain relic definitions, not cards
const invalidReward: Reward = { type: 'relic', options: [card] };
// @ts-expect-error Fx variants require their own geometry
const invalidFx: Fx = { kind: 'arc', x: 0, y: 0, r: 10, color: '#fff', t: 0, life: 1 };

describe('game state domain types', () => {
  it('models player and runtime entity collections', () => {
    expect(collections.player.hp).toBe(100);
    expect(collections.telegraphs[0].shape).toBe('rect');
    expect(enemyDef.behavior).toBe('chase');
  });

  it('covers every current Fx renderer variant', () => {
    expect(effects).toHaveLength(8);
    expect(new Set(effects.map((effect) => effect.kind))).toHaveLength(8);
  });

  it('keeps invalid type fixtures compile-only', () => {
    expect([invalidMode, invalidMatchmaking, invalidReward, invalidFx]).toHaveLength(4);
  });
});
