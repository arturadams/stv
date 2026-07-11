import type { BiomeDef } from './types.js';

// ── Biomes ── the infinite cursed realm, region by region ──
// `theme` picks the world's visual language: floor treatment, prop styles,
// light sources and atmosphere all branch on it (see render.js).
export const BIOMES = {
  // World I — the Sunken Realm: candle-lit arcane stonework.
  archive: { id: 'archive', name: 'The Sunken Archive', theme: 'arcane', floor: [17, 20, 42], tileVar: [14, 13, 16],
    grout: 'rgba(5,6,15,0.85)', accent: '#d9b45b', deco: '✦✧☽⎘', hazard: 'rgba(8,6,18,0.92)', hazardEdge: 'rgba(143,111,255,0.25)' },
  ashen: { id: 'ashen', name: 'The Ashen Reach', theme: 'arcane', floor: [30, 20, 16], tileVar: [16, 10, 8],
    grout: 'rgba(12,6,4,0.85)', accent: '#ff8a4a', deco: '♨✹⸸♅', hazard: 'rgba(30,10,6,0.9)', hazardEdge: 'rgba(255,138,74,0.3)' },
  verdant: { id: 'verdant', name: 'The Blighted Garden', theme: 'arcane', floor: [13, 28, 20], tileVar: [8, 14, 10],
    grout: 'rgba(4,10,6,0.85)', accent: '#4fbf7a', deco: '☽♃❦☘', hazard: 'rgba(8,22,10,0.9)', hazardEdge: 'rgba(138,222,106,0.3)' },
  umbral: { id: 'umbral', name: 'The Umbral Fen', theme: 'arcane', floor: [22, 16, 40], tileVar: [12, 10, 18],
    grout: 'rgba(8,5,15,0.85)', accent: '#8f6fff', deco: '☾⚉♰⚸', hazard: 'rgba(12,8,26,0.92)', hazardEdge: 'rgba(169,143,224,0.3)' },
  // World II — the Ember Wastes: cracked basalt, everything lit from below.
  cinder: { id: 'cinder', name: 'The Cinder Steppes', theme: 'ember', floor: [38, 16, 10], tileVar: [18, 8, 6],
    grout: 'rgba(12,4,2,0.85)', accent: '#ff8a4a', deco: '✹♨⸸✦', hazard: 'rgba(48,14,4,0.92)', hazardEdge: 'rgba(255,138,74,0.4)' },
  obsidian: { id: 'obsidian', name: 'The Obsidian Flats', theme: 'ember', floor: [16, 12, 22], tileVar: [10, 8, 12],
    grout: 'rgba(4,3,8,0.9)', accent: '#a98fe0', deco: '♆❖☿✧', hazard: 'rgba(10,6,18,0.92)', hazardEdge: 'rgba(169,143,224,0.35)' },
  sulfur: { id: 'sulfur', name: 'The Sulfur Fens', theme: 'ember', floor: [34, 30, 10], tileVar: [14, 12, 6],
    grout: 'rgba(10,9,2,0.85)', accent: '#ffe66d', deco: '☣♃❋♒', hazard: 'rgba(36,32,6,0.92)', hazardEdge: 'rgba(255,230,109,0.3)' },
  pyre: { id: 'pyre', name: 'The Endless Pyre', theme: 'ember', floor: [30, 10, 14], tileVar: [16, 6, 8],
    grout: 'rgba(9,3,4,0.85)', accent: '#ff5d6a', deco: '♰☠⚸♅', hazard: 'rgba(38,8,10,0.92)', hazardEdge: 'rgba(255,93,106,0.35)' },
  // World III — the Drowned Courts: pale marble under cold water, verdigris
  // and pearl. Everything World II scorched black, this world bleaches.
  ballroom: { id: 'ballroom', name: 'The Flooded Ballroom', theme: 'abyss', floor: [30, 48, 56], tileVar: [14, 16, 16],
    grout: 'rgba(4,12,16,0.85)', accent: '#7ee8d0', deco: '♛♫⚜✧', hazard: 'rgba(6,24,26,0.92)', hazardEdge: 'rgba(126,232,208,0.35)' },
  gardens: { id: 'gardens', name: 'The Kelp Gardens', theme: 'abyss', floor: [14, 38, 31], tileVar: [8, 16, 13],
    grout: 'rgba(2,10,8,0.85)', accent: '#5fd8a0', deco: '❧☙♆❀', hazard: 'rgba(4,22,16,0.92)', hazardEdge: 'rgba(95,216,160,0.35)' },
  mausoleum: { id: 'mausoleum', name: 'The Pearl Mausoleum', theme: 'abyss', floor: [42, 42, 54], tileVar: [14, 14, 17],
    grout: 'rgba(8,8,14,0.85)', accent: '#e6e0f2', deco: '⚱♰☽✧', hazard: 'rgba(16,16,28,0.92)', hazardEdge: 'rgba(230,224,242,0.3)' },
  trench: { id: 'trench', name: 'The Abyssal Trench', theme: 'abyss', floor: [5, 12, 24], tileVar: [4, 8, 14],
    grout: 'rgba(1,4,10,0.9)', accent: '#4a90d9', deco: '♆⚓✵☠', hazard: 'rgba(3,10,22,0.94)', hazardEdge: 'rgba(74,144,217,0.35)' },
  // World IV — the Hollow Choir: a basilica gone bone-pale and resonant.
  // Everything World III drowned, this world emptied: dust, votive light,
  // and floors etched with the ripples of a song that never stopped.
  nave: { id: 'nave', name: 'The Voiceless Nave', theme: 'requiem', floor: [24, 20, 36], tileVar: [12, 10, 16],
    grout: 'rgba(8,6,16,0.85)', accent: '#b48cff', deco: '♰♪☽✧', hazard: 'rgba(14,8,26,0.92)', hazardEdge: 'rgba(180,140,255,0.3)' },
  ossuary: { id: 'ossuary', name: 'The Singing Ossuary', theme: 'requiem', floor: [34, 30, 24], tileVar: [15, 13, 10],
    grout: 'rgba(12,10,6,0.85)', accent: '#e8dcc0', deco: '⚱☠♩✦', hazard: 'rgba(26,22,14,0.92)', hazardEdge: 'rgba(232,220,192,0.3)' },
  belfry: { id: 'belfry', name: 'The Toppled Belfry', theme: 'requiem', floor: [28, 22, 14], tileVar: [14, 11, 8],
    grout: 'rgba(10,7,4,0.85)', accent: '#d9985b', deco: '♫✵⚸♪', hazard: 'rgba(24,16,8,0.92)', hazardEdge: 'rgba(217,152,91,0.35)' },
  organum: { id: 'organum', name: 'The Organum Deep', theme: 'requiem', floor: [16, 16, 32], tileVar: [10, 10, 16],
    grout: 'rgba(5,5,12,0.85)', accent: '#8fa8ff', deco: '∿♪❖✧', hazard: 'rgba(10,10,24,0.92)', hazardEdge: 'rgba(143,168,255,0.3)' },
} satisfies Record<string, BiomeDef>;
export const BIOME_IDS = ['archive', 'ashen', 'verdant', 'umbral'];
