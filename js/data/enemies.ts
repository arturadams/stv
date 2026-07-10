import type { EnemyDef } from './types.js';

// ── Enemies ── corrupted arcana of the cursed realm ──
export const ENEMIES = {
  // ═══ World I: The Sunken Realm — drowned scholarship, ink and gilt ═══
  wisp: { id: 'wisp', name: 'Ink Wisp', role: 'swarm', hp: 14, speed: 118, radius: 13,
    dmg: 8, behavior: 'chase', color: '#3f3560', glow: '#8f6fff', shards: 1 },
  sentinel: { id: 'sentinel', name: 'Glyph Sentinel', role: 'sniper', hp: 24, speed: 72, radius: 16,
    dmg: 10, behavior: 'ranged', range: 320, fireRate: 2.3, projSpeed: 250, color: '#2c3a55', glow: '#8fd8ff', shards: 1 },
  horror: { id: 'horror', name: 'Tome Horror', role: 'exploder', hp: 18, speed: 132, radius: 15,
    dmg: 22, behavior: 'exploder', fuse: 1.0, boomR: 95, color: '#4a2635', glow: '#ff8a4a', shards: 1 },
  knight: { id: 'knight', name: 'Cursed Knight', role: 'tank', hp: 60, speed: 55, radius: 21,
    dmg: 14, behavior: 'lunge', lungeRange: 180, lungeTel: 0.65, lungeSpeed: 460, color: '#23283d', glow: '#c23b4a', shards: 2 },
  custodian: { id: 'custodian', name: 'Gilded Custodian', role: 'elite', hp: 210, speed: 62, radius: 28,
    dmg: 18, behavior: 'lunge', lungeRange: 210, lungeTel: 0.7, lungeSpeed: 520,
    waveEvery: 5, waveR: 170, waveTel: 1.0, waveDmg: 16,
    elite: true, color: '#3a3020', glow: '#ffd97a', shards: 6 },
  guardian: { id: 'guardian', name: 'Awoken Guardian', role: 'elite', hp: 320, speed: 66, radius: 30,
    dmg: 20, behavior: 'lunge', lungeRange: 230, lungeTel: 0.75, lungeSpeed: 540,
    waveEvery: 4.5, waveR: 190, waveTel: 1.1, waveDmg: 18,
    elite: true, color: '#26203a', glow: '#b48cff', shards: 10 },
  book: { id: 'book', name: 'Cursed Book', role: 'minion', hp: 8, speed: 168, radius: 11,
    dmg: 9, behavior: 'chase', color: '#402d20', glow: '#ff8a4a', shards: 0 },

  // ── World I bosses — three keepers of the drowned archive ──
  librarian: { id: 'librarian', name: 'The Gilded Librarian', role: 'boss', hp: 950, speed: 40, radius: 34,
    dmg: 16, behavior: 'boss', boss: true, minion: 'book', color: '#231a38', glow: '#ffd97a', shards: 12 },
  leviathan: { id: 'leviathan', name: 'The Ink Leviathan', role: 'boss', hp: 1050, speed: 210, radius: 30,
    dmg: 18, behavior: 'boss_leviathan', boss: true, color: '#131b33', glow: '#5fa8ff', shards: 14 },
  unwritten_king: { id: 'unwritten_king', name: 'The Unwritten King', role: 'boss', hp: 1000, speed: 46, radius: 32,
    dmg: 16, behavior: 'boss_king', boss: true, minion: 'sentinel', color: '#191430', glow: '#e8dcc0', shards: 14 },

  // ═══ World II: The Ember Wastes — the forge that outlived its makers.
  // Heat is the theme made mechanical: burning ground, eruptions, splitting
  // slag, and a choir that stokes the horde to a frenzy. ═══
  imp: { id: 'imp', name: 'Ember Imp', role: 'swarm', hp: 20, speed: 150, radius: 12,
    dmg: 9, behavior: 'chase', deathBurst: { r: 70, dmg: 8 }, color: '#4a2418', glow: '#ff8a4a', shards: 1 },
  mortar: { id: 'mortar', name: 'Magma Maw', role: 'artillery', hp: 40, speed: 40, radius: 18,
    dmg: 16, behavior: 'mortar', range: 640, fireRate: 3.2, mortarR: 110, mortarTel: 1.4,
    color: '#3a1c12', glow: '#ffb347', shards: 2 },
  stalker: { id: 'stalker', name: 'Ash Stalker', role: 'assassin', hp: 34, speed: 175, radius: 14,
    dmg: 13, behavior: 'stalker', color: '#241a20', glow: '#a98fe0', shards: 2 },
  shardling: { id: 'shardling', name: 'Obsidian Shardling', role: 'splitter', hp: 32, speed: 92, radius: 17,
    dmg: 11, behavior: 'chase', deathSpawn: { id: 'sliver', count: 3 },
    color: '#1d1626', glow: '#a98fe0', shards: 2 },
  sliver: { id: 'sliver', name: 'Glass Sliver', role: 'minion', hp: 6, speed: 215, radius: 8,
    dmg: 5, behavior: 'chase', color: '#241c30', glow: '#c9b6ff', shards: 0 },
  vent: { id: 'vent', name: 'Brimstone Vent', role: 'turret', hp: 55, speed: 0, radius: 17,
    dmg: 12, behavior: 'geyser', range: 560, ventEvery: 3.8, ventR: 66, ventDmg: 14,
    color: '#3a3410', glow: '#ffe66d', shards: 2 },
  cinder_ram: { id: 'cinder_ram', name: 'Cinder Ram', role: 'charger', hp: 90, speed: 72, radius: 22,
    dmg: 18, behavior: 'charger', chargeRange: 420, chargeTel: 0.85, chargeSpeed: 700, chargeDist: 520,
    color: '#38160e', glow: '#ff5d3a', shards: 3 },
  bellows: { id: 'bellows', name: 'Bellows Cantor', role: 'support', hp: 48, speed: 108, radius: 15,
    dmg: 8, behavior: 'stoker', stokeEvery: 6, stokeR: 260,
    color: '#2e1a10', glow: '#ffb347', shards: 3 },
  kiln_warden: { id: 'kiln_warden', name: 'The Kiln Warden', role: 'elite', hp: 380, speed: 58, radius: 30,
    dmg: 20, behavior: 'warden', waveEvery: 7, waveR: 340, waveTel: 0.95, waveDmg: 20,
    summonEvery: 9, summonId: 'imp',
    elite: true, color: '#33200e', glow: '#ffb347', shards: 10 },

  // ── World II bosses — three tyrants of the dead forge ──
  sovereign: { id: 'sovereign', name: 'The Cinder Sovereign', role: 'boss', hp: 1500, speed: 44, radius: 36,
    dmg: 20, behavior: 'boss_sovereign', boss: true, minion: 'imp', color: '#33140f', glow: '#ff8a4a', shards: 18 },
  colossus: { id: 'colossus', name: 'The Slagheart Colossus', role: 'boss', hp: 1750, speed: 34, radius: 44,
    dmg: 24, behavior: 'boss_colossus', boss: true, color: '#241108', glow: '#ff7a2f', shards: 18 },
  phoenix: { id: 'phoenix', name: 'The Pyre Matriarch', role: 'boss', hp: 1300, speed: 150, radius: 30,
    dmg: 18, behavior: 'boss_phoenix', boss: true, color: '#3a1410', glow: '#ffb347', shards: 18 },
} satisfies Record<string, EnemyDef>;
