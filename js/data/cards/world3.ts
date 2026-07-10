import type { CardDef } from '../types.js';

const cards: CardDef[] = [];
function card(def: CardDef): CardDef { cards.push(def); return def; }

// ═══ WORLD III — THE DROWNED COURTS ═══ obtained only once you reach it ═══

card({ id: 'tide_attunement', name: 'Tide Attunement', school: 'Mage', cat: 'Power', rarity: 'Uncommon', world: 3,
  cost: 3, channel: 0.6, dur: 8, targeting: 'none', tags: ['Frost', 'Attunement'], glyph: '♆', element: 'frost',
  text: 'For 8s your bolts become the tide: they pass through one body and Chill the next.',
  effects: [{ type: 'power', dur: 8, power: { basicOverride: { dmg: 11, speed: 500, radius: 9, pierce: 1, status: ['chill', 1], element: 'frost' } } }] });

card({ id: 'crush_depth', name: 'Crush Depth', school: 'Mage', cat: 'Spell', sub: 'AoE', rarity: 'Rare', world: 3,
  cost: 4, channel: 1.8, targeting: 'self', preview: { r: 185 }, tags: ['Frost', 'AoE'], glyph: '⏚', element: 'frost',
  text: 'The pressure of the deep sea arrives all at once: heavy damage, a moment frozen, and Chill.',
  effects: [{ type: 'aoe', r: 185, dmg: 44, freeze: 0.7, status: ['chill', 2], shake: 13 }] });

card({ id: 'maelstrom', name: 'Maelstrom', school: 'Mage', cat: 'Spell', sub: 'Sustained', rarity: 'Uncommon', world: 3,
  cost: 4, channel: 0.9, targeting: 'self', tags: ['Frost', 'Sustained'], glyph: '🌀', element: 'frost',
  text: 'For 3s the sea turns around you, battering everything it can reach outward.',
  effects: [{ type: 'sustained', dur: 3, tick: 0.35, do: { pulse: { r: 150, dmg: 7, knockback: 60 } } }] });

card({ id: 'still_water', name: 'Still Water', school: 'Mage', cat: 'Skill', rarity: 'Common', world: 3,
  cost: 2, channel: 0.5, targeting: 'self', preview: { r: 140 }, tags: ['Frost', 'Control'], glyph: '☽', element: 'frost',
  text: 'One held breath: everything near you stops moving for a beat.',
  effects: [{ type: 'aoe', r: 140, dmg: 8, freeze: 0.8, status: ['chill', 1] }] });

card({ id: 'breaker_stance', name: 'Breaker Stance', school: 'Warrior', cat: 'Power', rarity: 'Uncommon', world: 3,
  cost: 3, channel: 0.5, dur: 7, targeting: 'none', tags: ['Frost', 'Melee', 'Stance'], glyph: '≋', element: 'frost',
  text: 'For 7s you swing like surf on rock: wider, harder, and everything struck is Chilled.',
  effects: [{ type: 'power', dur: 7, power: { arcMult: 1.3, dmgMult: 1.25, addStatus: ['chill', 1], element: 'frost' } }] });

card({ id: 'breach', name: 'Breach', school: 'Warrior', cat: 'Spell', sub: 'AoE', rarity: 'Rare', world: 3,
  cost: 4, channel: 1.9, targeting: 'self', preview: { r: 170 }, tags: ['Frost', 'AoE'], glyph: '⛆', element: 'frost',
  text: 'The seafloor heaves and throws the court off its feet: heavy damage and a long shove.',
  effects: [{ type: 'aoe', r: 170, dmg: 46, status: ['chill', 2], knockback: 280, shake: 15 }] });

card({ id: 'undertow_rush', name: 'Undertow Rush', school: 'Warrior', cat: 'Skill', rarity: 'Uncommon', world: 3,
  cost: 2, channel: 0.5, dur: 8, targeting: 'self', tags: ['Movement', 'Dash', 'Frost'], glyph: '➾', element: 'frost',
  text: 'For 8s your Dash becomes the undertow: drag enemies with you, chilled to the bone.',
  effects: [{ type: 'dashOverride', dur: 8, move: { kind: 'charge', dist: 280, dmg: 18, gather: 150, status: ['chill', 1], cd: 0.9 } }] });

card({ id: 'drowned_resolve', name: 'Drowned Resolve', school: 'Warrior', cat: 'Skill', rarity: 'Common', world: 3,
  cost: 2, channel: 0.5, targeting: 'self', tags: ['Defense', 'Flow'], glyph: '⚓', element: 'gold',
  text: 'What the sea could not kill, the court cannot: gain 16 Armor and 4 Flow over 2.5s.',
  effects: [{ type: 'armor', amount: 16 }, { type: 'flowOverTime', amount: 4, dur: 2.5 }] });

card({ id: 'pearl_knives', name: 'Pearl Knives', school: 'Rogue', cat: 'Power', rarity: 'Uncommon', world: 3,
  cost: 3, channel: 0.5, dur: 7, targeting: 'none', tags: ['Frost', 'Stance'], glyph: '❖', element: 'frost',
  text: 'For 7s: knives of cold nacre — faster, sharper, and every cut Chills.',
  effects: [{ type: 'power', dur: 7, power: { basicOverride: { dmg: 6, speed: 800, radius: 4, critChance: 0.16, status: ['chill', 1], element: 'frost' }, rateMult: 0.8 } }] });

card({ id: 'drowning_snare', name: 'Drowning Snare', school: 'Rogue', cat: 'Skill', rarity: 'Uncommon', world: 3,
  cost: 2, channel: 0.5, targeting: 'self', tags: ['Trap', 'Frost'], glyph: '⚸', element: 'frost',
  text: 'A noose of cold water under the tiles: holds the first enemy in and Chills the rest.',
  effects: [{ type: 'trap', arm: 0.6, r: 95, dmg: 26, root: 1.4, status: ['chill', 2], ttl: 25 }] });

card({ id: 'squall', name: 'Squall', school: 'Rogue', cat: 'Spell', sub: 'Sustained', rarity: 'Rare', world: 3,
  cost: 4, channel: 1.0, targeting: 'self', tags: ['Projectile', 'Sustained'], glyph: '☄', element: 'frost',
  text: 'For 2.4s, sheets of sleet-knives lash out in every direction.',
  effects: [{ type: 'sustained', dur: 2.4, tick: 0.4, do: { proj: { dmg: 9, speed: 620, radius: 5, count: 10, ring: true, critChance: 0.2, status: ['chill', 1] } } }] });

card({ id: 'brine_burst', name: 'Brine Burst', school: 'Rogue', cat: 'Skill', rarity: 'Common', world: 3,
  cost: 2, channel: 0.6, targeting: 'self', preview: { r: 140 }, tags: ['Frost', 'AoE'], glyph: '♒', element: 'frost',
  text: 'A shattered flask of the cold deep: a pool that slows and Chills everything wading in it.',
  effects: [{ type: 'zone', r: 140, duration: 4, tickDmg: 4, tickRate: 0.5, slow: 0.5, status: ['chill', 1] }] });

card({ id: 'ebb_and_flow', name: 'Ebb and Flow', school: 'Colorless', cat: 'Engine', rarity: 'Uncommon', world: 3,
  cost: 1, channel: 0.5, targeting: 'none', tags: ['Flow', 'Draw'], glyph: '☾', element: 'gold',
  text: 'The tide goes out and comes back richer: 5 Flow over 2.5s and draw one card.',
  effects: [{ type: 'flowOverTime', amount: 5, dur: 2.5 }, { type: 'draw', n: 1 }] });

card({ id: 'slipstream', name: 'Slipstream', school: 'Colorless', cat: 'Trigger', rarity: 'Uncommon', world: 3,
  cost: 2, channel: 0.5, targeting: 'none', tags: ['Movement', 'Trigger'], glyph: '≈', element: 'gold',
  text: 'For 30s: whenever you Dash, the current carries you — gain 2 Flow.',
  effects: [{ type: 'enchant', dur: 30, on: ['dash'], do: { flow: 2 } }] });

card({ id: 'deep_current', name: 'Deep Current', school: 'Colorless', cat: 'Engine', rarity: 'Common', world: 3,
  cost: 1, channel: 0.4, targeting: 'none', tags: ['Flow', 'Draw'], glyph: '∿', element: 'gold',
  text: 'Draw one card and gain 2 Flow as the current passes through you.',
  effects: [{ type: 'draw', n: 1 }, { type: 'flowOverTime', amount: 2, dur: 1 }] });

card({ id: 'worldflood', name: 'Worldflood', school: 'Colorless', cat: 'Spell', sub: 'AoE', rarity: 'Legendary', world: 3,
  cost: 6, channel: 2.0, targeting: 'self', preview: { r: 240 }, tags: ['Frost', 'AoE', 'Flow'], glyph: '☩', element: 'frost',
  text: 'Let the sea back in: a vast drowning field that slows and Chills, and 6 Flow as it rises.',
  effects: [{ type: 'zone', r: 240, duration: 6, tickDmg: 7, tickRate: 0.5, slow: 0.5, status: ['chill', 1] }, { type: 'flowOverTime', amount: 6, dur: 6 }] });

export const WORLD3_CARDS = cards;
