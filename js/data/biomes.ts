import type { BiomeDef } from './types.js';

// ── Biomes ── the infinite cursed realm, region by region ──
export const BIOMES = {
  archive: { id: 'archive', name: 'The Sunken Archive', floor: [17, 20, 42], tileVar: [14, 13, 16],
    grout: 'rgba(5,6,15,0.85)', accent: '#d9b45b', deco: '✦✧☽⎘', hazard: 'rgba(8,6,18,0.92)', hazardEdge: 'rgba(143,111,255,0.25)' },
  ashen: { id: 'ashen', name: 'The Ashen Reach', floor: [30, 20, 16], tileVar: [16, 10, 8],
    grout: 'rgba(12,6,4,0.85)', accent: '#ff8a4a', deco: '♨✹⸸♅', hazard: 'rgba(30,10,6,0.9)', hazardEdge: 'rgba(255,138,74,0.3)' },
  verdant: { id: 'verdant', name: 'The Blighted Garden', floor: [13, 28, 20], tileVar: [8, 14, 10],
    grout: 'rgba(4,10,6,0.85)', accent: '#4fbf7a', deco: '☽♃❦☘', hazard: 'rgba(8,22,10,0.9)', hazardEdge: 'rgba(138,222,106,0.3)' },
  umbral: { id: 'umbral', name: 'The Umbral Fen', floor: [22, 16, 40], tileVar: [12, 10, 18],
    grout: 'rgba(8,5,15,0.85)', accent: '#8f6fff', deco: '☾⚉♰⚸', hazard: 'rgba(12,8,26,0.92)', hazardEdge: 'rgba(169,143,224,0.3)' },
  // World II
  cinder: { id: 'cinder', name: 'The Cinder Steppes', floor: [38, 16, 10], tileVar: [18, 8, 6],
    grout: 'rgba(12,4,2,0.85)', accent: '#ff8a4a', deco: '✹♨⸸✦', hazard: 'rgba(48,14,4,0.92)', hazardEdge: 'rgba(255,138,74,0.4)' },
  obsidian: { id: 'obsidian', name: 'The Obsidian Flats', floor: [16, 12, 22], tileVar: [10, 8, 12],
    grout: 'rgba(4,3,8,0.9)', accent: '#a98fe0', deco: '♆❖☿✧', hazard: 'rgba(10,6,18,0.92)', hazardEdge: 'rgba(169,143,224,0.35)' },
  sulfur: { id: 'sulfur', name: 'The Sulfur Fens', floor: [34, 30, 10], tileVar: [14, 12, 6],
    grout: 'rgba(10,9,2,0.85)', accent: '#ffe66d', deco: '☣♃❋♒', hazard: 'rgba(36,32,6,0.92)', hazardEdge: 'rgba(255,230,109,0.3)' },
  pyre: { id: 'pyre', name: 'The Endless Pyre', floor: [30, 10, 14], tileVar: [16, 6, 8],
    grout: 'rgba(9,3,4,0.85)', accent: '#ff5d6a', deco: '♰☠⚸♅', hazard: 'rgba(38,8,10,0.92)', hazardEdge: 'rgba(255,93,106,0.35)' },
  // World III — the Drowned Courts: pale marble under cold water, verdigris
  // and pearl. Everything World II scorched black, this world bleaches.
  ballroom: { id: 'ballroom', name: 'The Flooded Ballroom', floor: [18, 32, 40], tileVar: [12, 14, 14],
    grout: 'rgba(4,12,16,0.85)', accent: '#7ee8d0', deco: '♛♫⚜✧', hazard: 'rgba(6,24,26,0.92)', hazardEdge: 'rgba(126,232,208,0.35)' },
  gardens: { id: 'gardens', name: 'The Kelp Gardens', floor: [9, 30, 25], tileVar: [6, 14, 12],
    grout: 'rgba(2,10,8,0.85)', accent: '#5fd8a0', deco: '❧☙♆❀', hazard: 'rgba(4,22,16,0.92)', hazardEdge: 'rgba(95,216,160,0.35)' },
  mausoleum: { id: 'mausoleum', name: 'The Pearl Mausoleum', floor: [28, 28, 38], tileVar: [12, 12, 15],
    grout: 'rgba(8,8,14,0.85)', accent: '#e6e0f2', deco: '⚱♰☽✧', hazard: 'rgba(16,16,28,0.92)', hazardEdge: 'rgba(230,224,242,0.3)' },
  trench: { id: 'trench', name: 'The Abyssal Trench', floor: [5, 12, 24], tileVar: [4, 8, 14],
    grout: 'rgba(1,4,10,0.9)', accent: '#4a90d9', deco: '♆⚓✵☠', hazard: 'rgba(3,10,22,0.94)', hazardEdge: 'rgba(74,144,217,0.35)' },
} satisfies Record<string, BiomeDef>;
export const BIOME_IDS = ['archive', 'ashen', 'verdant', 'umbral'];
