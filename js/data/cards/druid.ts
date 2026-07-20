import type { CardDef } from '../types.js';

const cards: CardDef[] = [];
function card(def: CardDef): CardDef { cards.push(def); return def; }

// ═══ DRUID ═══ shapeshifting, renewal, and control of the living world ═══

card({ id: 'wolf_aspect', name: 'Wolf Aspect', school: 'Druid', cat: 'Power', rarity: 'Common',
  cost: 2, channel: 0.5, dur: 8, targeting: 'none', tags: ['Beast', 'Shapeshift'], glyph: '◁', element: 'physical',
  text: 'For 8s your claws strike 30% faster and deal 10% more damage.',
  effects: [{ type: 'power', dur: 8, power: { rateMult: 0.7, dmgMult: 1.1 } }] });

card({ id: 'bear_aspect', name: 'Bear Aspect', school: 'Druid', cat: 'Power', rarity: 'Common',
  cost: 2, channel: 0.6, dur: 8, targeting: 'none', tags: ['Beast', 'Shapeshift'], glyph: '◆', element: 'physical',
  text: 'For 8s your claws sweep 70% wider and deal 30% more damage.',
  effects: [{ type: 'power', dur: 8, power: { arcMult: 1.7, dmgMult: 1.3 } }] });

card({ id: 'venom_aspect', name: 'Venom Aspect', school: 'Druid', cat: 'Power', rarity: 'Uncommon', disabled: true,
  cost: 2, channel: 0.6, dur: 9, targeting: 'none', tags: ['Beast', 'Poison', 'Shapeshift'], glyph: '♜', element: 'poison',
  text: 'For 9s your claws drip venom and apply Poison on every hit.',
  effects: [{ type: 'power', dur: 9, power: { addStatus: ['poison', 2], element: 'poison' } }] });

card({ id: 'pounce', name: 'Pounce', school: 'Druid', cat: 'Technique', rarity: 'Common',
  cost: 2, channel: 0.4, targeting: 'nearest', tags: ['Beast', 'Movement', 'Melee'], glyph: '➶', element: 'physical',
  text: 'Leap through the nearest pack, raking and knocking aside everything in your path.',
  effects: [{ type: 'dashAttack', dist: 210, dmg: 17, gather: 90, knockback: 80 }] });

card({ id: 'barkskin', name: 'Barkskin', school: 'Druid', cat: 'Technique', rarity: 'Common',
  cost: 1, channel: 0.4, targeting: 'self', tags: ['Nature', 'Defense'], glyph: '♧', element: 'physical',
  text: 'Living bark closes around you. Gain 16 Armor.',
  effects: [{ type: 'armor', amount: 16 }] });

card({ id: 'renewal', name: 'Renewal', school: 'Druid', cat: 'Technique', rarity: 'Uncommon',
  cost: 2, channel: 0.7, targeting: 'self', tags: ['Nature', 'Healing'], glyph: '✚', element: 'gold',
  text: 'Call the sap upward and restore 22 Health.',
  effects: [{ type: 'heal', amount: 22 }] });

card({ id: 'entangling_roots', name: 'Entangling Roots', school: 'Druid', cat: 'Signature', sub: 'AoE', rarity: 'Common',
  cost: 3, channel: 1.3, targeting: 'nearest', preview: { r: 150 }, tags: ['Nature', 'Control', 'AoE'], glyph: '⌘', element: 'physical',
  text: 'Roots erupt in a wide circle, damaging and binding every enemy they catch.',
  effects: [{ type: 'aoe', r: 150, dmg: 11, root: 2.6 }] });

card({ id: 'hurricane', name: 'Hurricane', school: 'Druid', cat: 'Signature', sub: 'Sustained', rarity: 'Common',
  cost: 3, channel: 0.9, targeting: 'self', tags: ['Storm', 'Sustained', 'AoE'], glyph: '◌', element: 'lightning',
  text: 'Become the eye of a 2.5s storm that batters enemies away from you.',
  effects: [{ type: 'sustained', dur: 2.5, tick: 0.42, do: { pulse: { r: 155, dmg: 8, knockback: 105 } } }] });

card({ id: 'moonbeam', name: 'Moonbeam', school: 'Druid', cat: 'Signature', sub: 'AoE', rarity: 'Uncommon',
  cost: 3, channel: 1.2, targeting: 'nearest', preview: { r: 125 }, tags: ['Nature', 'Persistent'], glyph: '☾', element: 'arcane',
  text: 'Fix a column of moonlight for 4s, burning everything beneath it.',
  effects: [{ type: 'zone', r: 125, duration: 4, tickDmg: 8, tickRate: 0.5, slow: 0.15 }] });

card({ id: 'lightning_bloom', name: 'Lightning Bloom', school: 'Druid', cat: 'Signature', rarity: 'Uncommon',
  cost: 3, channel: 1.0, targeting: 'nearest', tags: ['Storm', 'Nature'], glyph: '↯', element: 'lightning',
  text: 'Plant lightning in the nearest enemy; it branches through up to five others.',
  effects: [{ type: 'chain', dmg: 14, jumps: 5, range: 190, status: ['chill', 1] }] });

card({ id: 'thorn_volley', name: 'Thorn Volley', school: 'Druid', cat: 'Signature', sub: 'Sustained', rarity: 'Uncommon', disabled: true,
  cost: 3, channel: 0.8, targeting: 'nearest', tags: ['Nature', 'Projectile', 'Sustained'], glyph: '✣', element: 'poison',
  text: 'For 2s, loose a relentless stream of piercing, venomous thorns.',
  effects: [{ type: 'sustained', dur: 2, tick: 0.25, do: { proj: { dmg: 7, speed: 680, radius: 4, life: 1.2, pierce: 2, spread: 0.1, status: ['poison', 1], element: 'poison' } } }] });

card({ id: 'natures_bounty', name: "Nature's Bounty", school: 'Druid', cat: 'Power', rarity: 'Uncommon', disabled: true,
  cost: 2, channel: 0.6, targeting: 'none', tags: ['Nature', 'Trigger', 'Flow'], glyph: '❦', element: 'gold',
  text: 'For 24s, applying Poison or Chill grants 1 Flow.',
  effects: [
    { type: 'enchant', dur: 24, on: ['statusApplied'], filter: { status: 'poison' }, do: { flow: 1 } },
    { type: 'enchant', dur: 24, on: ['statusApplied'], filter: { status: 'chill' }, do: { flow: 1 } },
  ] });

card({ id: 'primal_fury', name: 'Primal Fury', school: 'Druid', cat: 'Technique', rarity: 'Rare', disabled: true,
  cost: 2, channel: 0.5, targeting: 'none', tags: ['Beast', 'Modifier'], glyph: '♈', element: 'physical',
  text: 'Your next 3 Druid cards deal 45% more damage and affect a wider area.',
  effects: [{ type: 'mod', match: { school: 'Druid' }, count: 3, buff: { dmgMult: 1.45, radiusMult: 1.2 } }] });

card({ id: 'starfall', name: 'Starfall', school: 'Druid', cat: 'Signature', sub: 'AoE', rarity: 'Rare', disabled: true,
  cost: 5, channel: 2.1, targeting: 'nearest', preview: { r: 185 }, tags: ['Nature', 'Arcane', 'AoE'], glyph: '✦', element: 'arcane',
  text: 'Call a rain of cold stars onto a vast circle, freezing survivors in place.',
  effects: [{ type: 'aoe', r: 185, dmg: 52, freeze: 1.2, shake: 13 }] });

card({ id: 'world_tree', name: 'World Tree', school: 'Druid', cat: 'Signature', sub: 'AoE', rarity: 'Legendary',
  cost: 5, channel: 2.5, targeting: 'self', preview: { r: 220 }, tags: ['Nature', 'Healing', 'AoE'], glyph: '♣', element: 'gold',
  text: 'Raise an ancient tree: heal 30 Health, gain 20 Armor, and crush nearby enemies.',
  effects: [
    { type: 'heal', amount: 30 },
    { type: 'armor', amount: 20 },
    { type: 'aoe', r: 220, dmg: 58, root: 2, knockback: 120, shake: 16 },
  ] });

export const DRUID_CARDS = cards;
