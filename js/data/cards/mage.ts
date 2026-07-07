import type { CardDef } from '../types.js';

const cards: CardDef[] = [];
function card(def: CardDef): CardDef { cards.push(def); return def; }

// ═══ MAGE ═══ magical states, sustained casting, AoE control ═══

card({ id: 'flame_attunement', name: 'Flame Attunement', school: 'Mage', cat: 'Power', rarity: 'Common',
  cost: 2, channel: 0.6, dur: 8, targeting: 'none', tags: ['Fire', 'Attunement'], glyph: '☄', element: 'fire',
  text: 'For 8s your bolts become small Fireballs that explode and apply Burn.',
  effects: [{ type: 'power', dur: 8, power: { basicOverride: { dmg: 9, speed: 500, radius: 7, explode: { r: 70, dmg: 6 }, status: ['burn', 1], element: 'fire' } } }] });

card({ id: 'frost_attunement', name: 'Frost Attunement', school: 'Mage', cat: 'Power', rarity: 'Common',
  cost: 2, channel: 0.6, dur: 8, targeting: 'none', tags: ['Frost', 'Attunement'], glyph: '❆', element: 'frost',
  text: 'For 8s your bolts become Frost Bolts that Chill and slow enemies.',
  effects: [{ type: 'power', dur: 8, power: { basicOverride: { dmg: 7, speed: 560, radius: 6, status: ['chill', 1], element: 'frost' } } }] });

card({ id: 'storm_attunement', name: 'Storm Attunement', school: 'Mage', cat: 'Power', rarity: 'Common',
  cost: 2, channel: 0.6, dur: 8, targeting: 'none', tags: ['Lightning', 'Attunement'], glyph: '↯', element: 'lightning',
  text: 'For 8s your bolts chain lightning to up to 2 nearby enemies.',
  effects: [{ type: 'power', dur: 8, power: { basicOverride: { dmg: 6, speed: 640, radius: 5, chainOnHit: { dmg: 5, jumps: 2, range: 160 }, element: 'lightning' } } }] });

card({ id: 'arcane_mirror', name: 'Arcane Mirror', school: 'Mage', cat: 'Power', rarity: 'Uncommon',
  cost: 2, channel: 0.5, dur: 10, targeting: 'none', tags: ['Arcane', 'Attunement'], glyph: '⧉', element: 'arcane',
  text: 'For 10s, every third basic attack fires an extra bolt at another enemy.',
  effects: [{ type: 'power', dur: 10, power: { extraEvery: 3 } }] });

card({ id: 'meteor', name: 'Meteor', school: 'Mage', cat: 'Spell', sub: 'AoE', rarity: 'Rare',
  cost: 5, channel: 2.4, targeting: 'nearest', preview: { r: 150 }, tags: ['Fire', 'AoE'], glyph: '✹', element: 'fire',
  text: 'A long channel. Where the circle burns, the sky falls. Heavy damage and Burn.',
  effects: [{ type: 'aoe', r: 150, dmg: 62, status: ['burn', 3], shake: 14 }] });

card({ id: 'frost_nova', name: 'Frost Nova', school: 'Mage', cat: 'Spell', sub: 'AoE', rarity: 'Common',
  cost: 3, channel: 1.6, targeting: 'self', preview: { r: 170 }, tags: ['Frost', 'AoE', 'Control'], glyph: '❄', element: 'frost',
  text: 'Channel a ring of hoarfrost around you, then freeze everything it touches.',
  effects: [{ type: 'aoe', r: 170, dmg: 12, freeze: 1.8 }] });

card({ id: 'rune_prison', name: 'Rune Prison', school: 'Mage', cat: 'Spell', sub: 'AoE', rarity: 'Uncommon',
  cost: 3, channel: 1.5, targeting: 'nearest', preview: { r: 140 }, tags: ['Control', 'AoE'], glyph: '⌘', element: 'arcane',
  text: 'A binding circle snaps shut, rooting every enemy inside.',
  effects: [{ type: 'aoe', r: 140, dmg: 8, root: 2.5 }] });

card({ id: 'arc_lightning', name: 'Arc Lightning', school: 'Mage', cat: 'Spell', sub: 'Sustained', rarity: 'Common',
  cost: 3, channel: 0.9, targeting: 'nearest', tags: ['Lightning', 'Sustained'], glyph: '↯', element: 'lightning',
  text: 'Channel for 2.5s, repeatedly chaining lightning between enemies.',
  effects: [{ type: 'sustained', dur: 2.5, tick: 0.4, do: { chain: { dmg: 9, jumps: 3, range: 190 } } }] });

card({ id: 'flame_stream', name: 'Flame Stream', school: 'Mage', cat: 'Spell', sub: 'Sustained', rarity: 'Uncommon',
  cost: 3, channel: 0.8, targeting: 'nearest', tags: ['Fire', 'Sustained'], glyph: '♨', element: 'fire',
  text: 'Channel for 3s, continuously spraying flames toward enemies.',
  effects: [{ type: 'sustained', dur: 3, tick: 0.16, do: { proj: { dmg: 5, speed: 430, radius: 7, life: 0.9, pierce: 1, spread: 0.22, status: ['burn', 1] } } }] });

card({ id: 'blizzard', name: 'Blizzard', school: 'Mage', cat: 'Spell', sub: 'AoE', rarity: 'Uncommon',
  cost: 4, channel: 1.8, targeting: 'nearest', preview: { r: 150 }, tags: ['Frost', 'AoE', 'Persistent'], glyph: '❄', element: 'frost',
  text: 'Conjure a frozen storm that gnaws and chills all inside it for 4s.',
  effects: [{ type: 'zone', r: 150, duration: 4, tickDmg: 6, tickRate: 0.5, status: ['chill', 1] }] });

card({ id: 'mana_burst', name: 'Mana Burst', school: 'Mage', cat: 'Skill', rarity: 'Common',
  cost: 1, channel: 0.5, targeting: 'self', preview: { r: 130 }, tags: ['Arcane', 'AoE', 'Flow'], glyph: '❋', element: 'arcane',
  text: 'A pulse of raw arcana. Gain 1 Flow for each enemy struck.',
  effects: [{ type: 'aoe', r: 130, dmg: 8, flowPerHit: 1 }] });

card({ id: 'teleport', name: 'Teleport', school: 'Mage', cat: 'Skill', rarity: 'Common',
  cost: 1, channel: 0.5, dur: 8, targeting: 'self', tags: ['Movement', 'Dash', 'Arcane'], glyph: '✧', element: 'arcane',
  text: 'For 8s your Dash becomes Teleport: fold space in your movement direction.',
  effects: [{ type: 'dashOverride', dur: 8, move: { kind: 'blink', dist: 240, cd: 0.9 } }] });

card({ id: 'elemental_cycle', name: 'Elemental Cycle', school: 'Mage', cat: 'Engine', rarity: 'Rare',
  cost: 2, channel: 0.6, targeting: 'none', tags: ['Attunement', 'Engine'], glyph: '☯', element: 'arcane',
  text: 'For 30s: whenever a Mage Power expires, a different Attunement is queued for free.',
  effects: [{ type: 'enchant', dur: 30, on: ['powerExpired'], filter: { school: 'Mage' }, do: { cycleAttunement: true } }] });

card({ id: 'pyromancy', name: 'Pyromancy', school: 'Mage', cat: 'Trigger', rarity: 'Uncommon',
  cost: 2, channel: 0.6, targeting: 'none', tags: ['Fire', 'Trigger'], glyph: '♕', element: 'fire',
  text: 'For 25s: whenever Burn is applied, a small burst of fire erupts there.',
  effects: [{ type: 'enchant', dur: 25, on: ['statusApplied'], filter: { status: 'burn' }, do: { burst: { r: 60, dmg: 6, element: 'fire' } } }] });

card({ id: 'time_warp', name: 'Time Warp', school: 'Mage', cat: 'Engine', rarity: 'Rare',
  cost: 2, channel: 0.4, targeting: 'none', tags: ['Channel', 'Engine'], glyph: '⌛', element: 'arcane',
  text: 'For 6s, all channeling runs at double speed.',
  effects: [{ type: 'haste', mult: 2, dur: 6 }] });

card({ id: 'arcane_singularity', name: 'Arcane Singularity', school: 'Mage', cat: 'Spell', sub: 'AoE', rarity: 'Legendary',
  cost: 6, channel: 2.6, targeting: 'nearest', preview: { r: 210 }, tags: ['Arcane', 'AoE', 'Control'], glyph: '✦', element: 'arcane',
  text: 'Channel a collapsing star. Everything inside is dragged in, rooted, and unmade.',
  effects: [{ type: 'aoe', r: 210, dmg: 68, root: 1.5, knockback: -260, shake: 20 }] });

export const MAGE_CARDS = cards;
