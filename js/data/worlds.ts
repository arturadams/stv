import type { WorldDef } from './types.js';
import { BIOME_IDS } from './biomes.js';

// ── Worlds ── five realms of increasing cruelty. World 1–2 have full content;
// 3–5 are declared (names, scaling) and reuse World 2 sets until authored.
const W2_TIERS = [
  { id: 'imp', minThreat: 0, w: 10 }, { id: 'mortar', minThreat: 0, w: 4 },
  { id: 'stalker', minThreat: 2.5, w: 4 }, { id: 'cinder_knight', minThreat: 3.4, w: 3 },
  { id: 'pyre_custodian', minThreat: 5.5, w: 1 },
];
const W2_BIOMES = ['cinder', 'obsidian', 'sulfur', 'pyre'];
export const WORLDS = [
  { num: 1, name: 'THE SUNKEN REALM', sub: 'World I', sky: '#05060f',
    biomes: BIOME_IDS, boss: 'librarian', threatMult: 1,
    tiers: [
      { id: 'wisp', minThreat: 0, w: 10 }, { id: 'sentinel', minThreat: 1.4, w: 5 },
      { id: 'horror', minThreat: 1.9, w: 4 }, { id: 'knight', minThreat: 2.8, w: 3 },
      { id: 'custodian', minThreat: 4.5, w: 1 },
    ] },
  { num: 2, name: 'THE EMBER WASTES', sub: 'World II', sky: '#0c0505',
    biomes: W2_BIOMES, boss: 'sovereign', threatMult: 1.9, tiers: W2_TIERS },
  { num: 3, name: 'THE DROWNED COURTS', sub: 'World III', sky: '#04080c',
    biomes: W2_BIOMES, boss: 'sovereign', threatMult: 2.9, tiers: W2_TIERS },
  { num: 4, name: 'THE HOLLOW CHOIR', sub: 'World IV', sky: '#080410',
    biomes: W2_BIOMES, boss: 'sovereign', threatMult: 4.1, tiers: W2_TIERS },
  { num: 5, name: 'THE LAST ARCANUM', sub: 'World V', sky: '#0a0803',
    biomes: W2_BIOMES, boss: 'sovereign', threatMult: 5.5, tiers: W2_TIERS },
] satisfies WorldDef[];

// ── Rival souls ── simulated player encounters ──
export const RIVAL_ADJECTIVES = ['Ravenous', 'Hollow', 'Gilded', 'Whispering', 'Ashen',
  'Feral', 'Umbral', 'Wandering', 'Silent', 'Forsaken', 'Radiant', 'Grim'];
