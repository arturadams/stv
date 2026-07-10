import type { WorldDef } from './types.js';
import { BIOME_IDS } from './biomes.js';

// ── Worlds ── five realms of increasing cruelty. World 1–2 have full content;
// 3–5 are declared (names, scaling) and reuse World 2 sets until authored.
// Each world fields three original bosses — its gates cycle through them.
const W2_TIERS = [
  { id: 'imp', minThreat: 0, w: 9 }, { id: 'mortar', minThreat: 0, w: 4 },
  { id: 'shardling', minThreat: 1.2, w: 5 }, { id: 'vent', minThreat: 2.0, w: 3 },
  { id: 'stalker', minThreat: 2.5, w: 4 }, { id: 'cinder_ram', minThreat: 3.2, w: 3 },
  { id: 'bellows', minThreat: 3.8, w: 2 }, { id: 'kiln_warden', minThreat: 5.5, w: 1 },
];
const W2_BIOMES = ['cinder', 'obsidian', 'sulfur', 'pyre'];
const W2_BOSSES = ['sovereign', 'colossus', 'phoenix'];
export const WORLDS = [
  { num: 1, name: 'THE SUNKEN REALM', sub: 'World I', sky: '#05060f',
    biomes: BIOME_IDS, bosses: ['librarian', 'leviathan', 'unwritten_king'],
    guardian: 'guardian', threatMult: 1,
    tiers: [
      { id: 'wisp', minThreat: 0, w: 10 }, { id: 'sentinel', minThreat: 1.4, w: 5 },
      { id: 'horror', minThreat: 1.9, w: 4 }, { id: 'knight', minThreat: 2.8, w: 3 },
      { id: 'custodian', minThreat: 4.5, w: 1 },
    ] },
  { num: 2, name: 'THE EMBER WASTES', sub: 'World II', sky: '#0c0505',
    biomes: W2_BIOMES, bosses: W2_BOSSES, guardian: 'kiln_warden',
    threatMult: 1.9, tiers: W2_TIERS },
  { num: 3, name: 'THE DROWNED COURTS', sub: 'World III', sky: '#04080c',
    biomes: W2_BIOMES, bosses: W2_BOSSES, guardian: 'kiln_warden',
    threatMult: 2.9, tiers: W2_TIERS },
  { num: 4, name: 'THE HOLLOW CHOIR', sub: 'World IV', sky: '#080410',
    biomes: W2_BIOMES, bosses: W2_BOSSES, guardian: 'kiln_warden',
    threatMult: 4.1, tiers: W2_TIERS },
  { num: 5, name: 'THE LAST ARCANUM', sub: 'World V', sky: '#0a0803',
    biomes: W2_BIOMES, bosses: W2_BOSSES, guardian: 'kiln_warden',
    threatMult: 5.5, tiers: W2_TIERS },
] satisfies WorldDef[];

// ── Rival souls ── simulated player encounters ──
export const RIVAL_ADJECTIVES = ['Ravenous', 'Hollow', 'Gilded', 'Whispering', 'Ashen',
  'Feral', 'Umbral', 'Wandering', 'Silent', 'Forsaken', 'Radiant', 'Grim'];
