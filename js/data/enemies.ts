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

  // ═══ World III: The Drowned Courts — an aristocracy that would not stop
  // dancing when the sea came in. The tide is the theme made mechanical:
  // currents that drag you where you did not choose to stand, brine that
  // lingers on the marble, and a court that heals its own. ═══
  pallid: { id: 'pallid', name: 'Pallid Courtier', role: 'swarm', hp: 26, speed: 138, radius: 13,
    dmg: 10, behavior: 'chase', color: '#1e3440', glow: '#7ee8d0', shards: 1 },
  mote: { id: 'mote', name: 'Brine Mote', role: 'exploder', hp: 18, speed: 112, radius: 14,
    dmg: 20, behavior: 'exploder', fuse: 0.95, boomR: 92, boomHazard: { r: 62, dmg: 5, dur: 4.5 },
    color: '#14303a', glow: '#8fd8ff', shards: 1 },
  siren: { id: 'siren', name: 'Court Siren', role: 'controller', hp: 40, speed: 88, radius: 15,
    dmg: 10, behavior: 'siren', pullEvery: 5.5, pullR: 320, pullForce: 210,
    color: '#2a2440', glow: '#c9a0ff', shards: 2 },
  lancer: { id: 'lancer', name: 'Tide Lancer', role: 'skirmisher', hp: 58, speed: 62, radius: 19,
    dmg: 13, behavior: 'lunge', lungeRange: 210, lungeTel: 0.6, lungeSpeed: 500, lungeChain: 2,
    color: '#1c3a44', glow: '#5fd8c8', shards: 2 },
  urchin: { id: 'urchin', name: 'Reef Urchin', role: 'turret', hp: 62, speed: 0, radius: 16,
    dmg: 9, behavior: 'urchin', range: 520, volleyEvery: 3.4, volleyCount: 12, projSpeed: 240,
    color: '#20283a', glow: '#8fb8ff', shards: 2 },
  maw: { id: 'maw', name: 'Undertow Maw', role: 'vortex', hp: 74, speed: 0, radius: 18,
    dmg: 12, behavior: 'undertow', range: 560, pullEvery: 6, pullR: 260, pullForce: 200,
    color: '#0e2028', glow: '#4a90d9', shards: 3 },
  chorister: { id: 'chorister', name: 'Grief Chorister', role: 'support', hp: 46, speed: 104, radius: 14,
    dmg: 7, behavior: 'mender', healEvery: 4.5, healR: 250, healAmt: 9,
    color: '#2e3444', glow: '#e6e0f2', shards: 3 },
  seneschal: { id: 'seneschal', name: 'The Tidebound Seneschal', role: 'elite', hp: 420, speed: 56, radius: 30,
    dmg: 20, behavior: 'warden', waveEvery: 7, waveR: 340, waveTel: 0.95, waveDmg: 22,
    summonEvery: 9, summonId: 'pallid',
    elite: true, color: '#182c38', glow: '#7ee8d0', shards: 10 },

  // ── World III bosses — three regents of the drowned court ──
  sunless_queen: { id: 'sunless_queen', name: 'The Sunless Queen', role: 'boss', hp: 1900, speed: 48, radius: 34,
    dmg: 20, behavior: 'boss_queen', boss: true, minion: 'pallid', color: '#141e30', glow: '#e6e0f2', shards: 22 },
  regent: { id: 'regent', name: 'The Undertow Regent', role: 'boss', hp: 2100, speed: 40, radius: 40,
    dmg: 24, behavior: 'boss_regent', boss: true, color: '#0c2230', glow: '#4a90d9', shards: 22 },
  reliquary: { id: 'reliquary', name: 'The Weeping Reliquary', role: 'boss', hp: 1600, speed: 0, radius: 38,
    dmg: 18, behavior: 'boss_reliquary', boss: true, minion: 'mote', color: '#242a3a', glow: '#c9a0ff', shards: 22 },

  // ═══ World IV: The Hollow Choir — a basilica whose congregation sang
  // until the song took everything, and kept singing. The echo is the theme
  // made mechanical: strikes that land where you stood a beat ago, bells
  // that ring in bands, and a choir that answers the horde with more of it.
  // The realm's one rule: never stand where you already stood. ═══
  hollow: { id: 'hollow', name: 'Hollowed Votary', role: 'swarm', hp: 34, speed: 140, radius: 13,
    dmg: 11, behavior: 'chase', color: '#2a2438', glow: '#b48cff', shards: 1 },
  penitent: { id: 'penitent', name: 'Ringing Penitent', role: 'exploder', hp: 24, speed: 116, radius: 14,
    dmg: 22, behavior: 'exploder', fuse: 0.9, boomR: 96, boomHazard: { r: 64, dmg: 5, dur: 4.5, kind: 'toll' },
    color: '#332a20', glow: '#e8dcc0', shards: 1 },
  lector: { id: 'lector', name: 'Hymn Lector', role: 'sniper', hp: 46, speed: 58, radius: 16,
    dmg: 14, behavior: 'ranged', range: 400, fireRate: 2.6, projSpeed: 205, color: '#241c30', glow: '#8fa8ff', shards: 2 },
  sexton: { id: 'sexton', name: 'Bell-Sexton', role: 'charger', hp: 100, speed: 68, radius: 22,
    dmg: 19, behavior: 'charger', chargeRange: 430, chargeTel: 0.8, chargeSpeed: 720, chargeDist: 540,
    color: '#2e2418', glow: '#d9985b', shards: 3 },
  toller: { id: 'toller', name: 'Funeral Toll', role: 'turret', hp: 72, speed: 0, radius: 18,
    dmg: 13, behavior: 'toller', range: 620, waveEvery: 4.4, waveR: 260, waveTel: 1.1, waveDmg: 14,
    color: '#201a2c', glow: '#c9a0ff', shards: 2 },
  echoer: { id: 'echoer', name: 'Reverberant Shade', role: 'assassin', hp: 48, speed: 150, radius: 14,
    dmg: 13, behavior: 'echoer', echoEvery: 3.2, echoDelay: 1.2, echoR: 80, echoDmg: 15,
    color: '#1c1826', glow: '#e6e0f2', shards: 3 },
  chorus: { id: 'chorus', name: 'Hollow Chorus', role: 'support', hp: 52, speed: 100, radius: 15,
    dmg: 8, behavior: 'chorus', summonEvery: 7, color: '#2e2a3a', glow: '#b48cff', shards: 3 },
  maestro: { id: 'maestro', name: 'The Hollow Maestro', role: 'elite', hp: 460, speed: 56, radius: 30,
    dmg: 22, behavior: 'warden', waveEvery: 7, waveR: 340, waveTel: 0.95, waveDmg: 24,
    summonEvery: 9, summonId: 'hollow',
    elite: true, color: '#221a30', glow: '#c9a0ff', shards: 10 },

  // ── World IV bosses — three voices of the hollowed basilica ──
  carillon: { id: 'carillon', name: 'The Ninefold Carillon', role: 'boss', hp: 2300, speed: 30, radius: 42,
    dmg: 24, behavior: 'boss_carillon', boss: true, color: '#241c14', glow: '#d9985b', shards: 26 },
  antiphon: { id: 'antiphon', name: 'The Antiphon', role: 'boss', hp: 2050, speed: 170, radius: 30,
    dmg: 20, behavior: 'boss_antiphon', boss: true, color: '#262038', glow: '#e6e0f2', shards: 26 },
  silence: { id: 'silence', name: 'The Grand Silence', role: 'boss', hp: 2500, speed: 42, radius: 40,
    dmg: 22, behavior: 'boss_silence', boss: true, minion: 'hollow', color: '#100c1c', glow: '#b48cff', shards: 26 },
} satisfies Record<string, EnemyDef>;
