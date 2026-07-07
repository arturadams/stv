import { describe, expect, it } from 'vitest';

import type {
  BiomeDef,
  BossScript,
  Chunk,
  ClassDef,
  EnemyDef,
  EnemyState,
  RivalSoul,
  Sanctuary,
  WorldDef,
  ZoneRegion,
} from '../js/data/types.js';

const sentinel = {
  id: 'sentinel',
  name: 'Glyph Sentinel',
  role: 'sniper',
  hp: 24,
  speed: 72,
  radius: 16,
  dmg: 10,
  behavior: 'ranged',
  range: 320,
  fireRate: 2.3,
  projSpeed: 250,
  color: '#2c3a55',
  glow: '#8fd8ff',
  shards: 1,
} satisfies EnemyDef;

const custodian = {
  id: 'pyre_custodian',
  name: 'Pyre Custodian',
  role: 'elite',
  hp: 340,
  speed: 64,
  radius: 29,
  dmg: 20,
  behavior: 'lunge',
  lungeRange: 220,
  lungeTel: 0.65,
  lungeSpeed: 540,
  lungeChain: 1,
  waveEvery: 4.5,
  waveR: 180,
  waveTel: 1,
  waveDmg: 20,
  summonEvery: 8,
  summonId: 'imp',
  elite: true,
  color: '#3a2012',
  glow: '#ffb347',
  shards: 8,
} satisfies EnemyDef;

const enemy = {
  uid: 1,
  def: sentinel,
  x: 100,
  y: 200,
  hp: 24,
  maxHp: 24,
  r: 16,
  statuses: { chill: { stacks: 2, t: 3, acc: 0.25 } },
  state: 'active',
  stateT: 0,
  hitFlash: 0,
  freeze: 0,
  stun: 0,
  root: 0,
  kvx: 0,
  kvy: 0,
  kt: 0,
  touchCd: 0,
  mark: null,
  wobble: 1.2,
  dead: false,
  ai: { fireT: 1.4 },
} satisfies EnemyState;

const mage = {
  id: 'mage',
  name: 'Mage',
  school: 'Mage',
  color: '#8f6fff',
  glyph: '✦',
  tagline: 'Arcane bolts',
  desc: 'Fires arcane bolts.',
  basic: {
    kind: 'proj',
    name: 'Arcane Bolt',
    dmg: 6,
    rate: 0.55,
    speed: 600,
    radius: 5,
    range: 470,
    element: 'arcane',
  },
  resource: null,
} satisfies ClassDef;

const warrior = {
  id: 'warrior',
  name: 'Warrior',
  school: 'Warrior',
  color: '#d05648',
  glyph: '⚔',
  tagline: 'Melee arcs',
  desc: 'Swings a spectral blade.',
  basic: {
    kind: 'arc',
    name: 'Blade Swing',
    dmg: 10,
    rate: 0.8,
    range: 125,
    arc: 100,
    element: 'physical',
    knockback: 60,
  },
  resource: { key: 'rage', name: 'RAGE', max: 100, color: '#ff6a4a' },
} satisfies ClassDef;

const biome = {
  id: 'archive',
  name: 'The Sunken Archive',
  floor: [17, 20, 42],
  tileVar: [14, 13, 16],
  grout: 'rgba(5,6,15,0.85)',
  accent: '#d9b45b',
  deco: '✦✧☽⎘',
  hazard: 'rgba(8,6,18,0.92)',
  hazardEdge: 'rgba(143,111,255,0.25)',
} satisfies BiomeDef;

const world = {
  num: 1,
  name: 'THE SUNKEN REALM',
  sub: 'World I',
  sky: '#05060f',
  biomes: ['archive'],
  boss: 'librarian',
  threatMult: 1,
  tiers: [{ id: 'wisp', minThreat: 0, w: 10 }],
} satisfies WorldDef;

const script = {
  moveBand: [220, 380],
  phases: [
    {
      hpBelow: 1,
      attackInterval: 4.2,
      attacks: [
        { kind: 'summonRing', id: 'book', count: 3, radius: 70 },
        { kind: 'lineSlams', count: 3, spacing: 190, width: 130, height: 460, damage: 20, telegraph: 1.15 },
        { kind: 'runeCircles', count: 3, radius: 130, damage: 18, telegraph: 1.3, spread: 160 },
        { kind: 'cardTheft', dur: 6 },
      ],
    },
    {
      hpBelow: 0.5,
      banner: { title: 'THE ARCHIVE AWAKENS', sub: 'The Librarian misfires reality itself' },
      attackInterval: 3.4,
      speedMult: 1.35,
      misfire: { chance: 0.6, radius: 100, damage: 12, telegraph: 1.6, spread: 350 },
      attacks: [{ kind: 'summonRing', id: 'book', count: 4 }],
    },
  ],
} satisfies BossScript;

const rival = {
  cls: 'rogue',
  name: 'Ashen Rogue',
  featured: [],
  color: '#4fbf7a',
  x: 10,
  y: 20,
  wob: 0,
} satisfies RivalSoul;

const sanctuary = {
  x: 160,
  y: 160,
  r: 190,
  seed: 1234,
  lock: false,
  stock: null,
} satisfies Sanctuary;

const chunk = {
  cx: 0,
  cy: 0,
  biome,
  pillars: [{ x: 100, y: 100, r: 30 }],
  pools: [],
  candles: [],
  deco: [{ x: 80, y: 90, rot: 0, kind: 'rune', g: 1 }],
  sanctuary,
} satisfies Chunk;

const zone = { x: 0, y: 0, r: 500, kind: 'duel' } satisfies ZoneRegion;

// @ts-expect-error behavior ids are closed
const invalidBehavior: EnemyDef = { ...sentinel, behavior: 'teleporter' };
// @ts-expect-error enemy definitions require combat damage
const invalidEnemy: EnemyDef = { id: 'bad', name: 'Bad', role: 'bad', hp: 1, speed: 1, radius: 1, behavior: 'chase', color: '#000', glow: '#fff', shards: 0 };
// @ts-expect-error projectile basics require projectile speed
const invalidBasic: ClassDef = { ...mage, basic: { kind: 'proj', name: 'Bad', dmg: 1, rate: 1, radius: 1, range: 1, element: 'arcane' } };
// @ts-expect-error boss attack kinds are closed
const invalidAttack: BossScript = { phases: [{ hpBelow: 1, attackInterval: 1, attacks: [{ kind: 'laser', damage: 10 }] }] };
// @ts-expect-error zone kinds are closed
const invalidZone: ZoneRegion = { x: 0, y: 0, r: 1, kind: 'sanctuary' };

describe('enemy and world domain types', () => {
  it('accepts current enemy, class, and world data shapes', () => {
    expect([sentinel, custodian]).toHaveLength(2);
    expect([mage, warrior]).toHaveLength(2);
    expect(world.biomes).toEqual(['archive']);
  });

  it('models runtime world entities and boss scripts', () => {
    expect(enemy.ai).toEqual({ fireT: 1.4 });
    expect(script.phases[0].attacks).toHaveLength(4);
    expect(chunk.sanctuary).toBe(sanctuary);
    expect(rival.cls).toBe('rogue');
    expect(zone.kind).toBe('duel');
  });

  it('keeps invalid type fixtures compile-only', () => {
    expect([invalidBehavior, invalidEnemy, invalidBasic, invalidAttack, invalidZone]).toHaveLength(5);
  });
});
