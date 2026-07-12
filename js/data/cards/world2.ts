import type { CardDef } from '../types.js';

const cards: CardDef[] = [];
function card(def: CardDef): CardDef { cards.push(def); return def; }

// ═══ WORLD II — THE EMBER WASTES ═══ obtained only once you reach it ═══

card({ id: 'phoenix_attunement', name: 'Phoenix Attunement', school: 'Mage', cat: 'Power', rarity: 'Uncommon', world: 2,
  cost: 3, channel: 0.6, dur: 8, targeting: 'none', tags: ['Fire', 'Attunement'], glyph: '🜂', element: 'fire',
  text: 'For 8s your bolts become phoenix fire: bigger blasts, deeper Burn.',
  effects: [{ type: 'power', dur: 8, power: { basicOverride: { dmg: 12, speed: 520, radius: 8, explode: { r: 90, dmg: 9 }, status: ['burn', 2], element: 'fire' } } }] });

card({ id: 'solar_lance', name: 'Solar Lance', school: 'Mage', cat: 'Signature', sub: 'AoE', rarity: 'Rare', world: 2,
  cost: 4, channel: 1.6, targeting: 'nearest', tags: ['Fire', 'Pierce'], glyph: '☀', element: 'fire',
  text: 'Channel a lance of dawn, then pierce everything in a line.',
  effects: [{ type: 'proj', dmg: 46, speed: 900, radius: 10, pierce: 99, status: ['burn', 2] }] });

card({ id: 'cinder_storm', name: 'Cinder Storm', school: 'Mage', cat: 'Signature', sub: 'Sustained', rarity: 'Uncommon', world: 2,
  cost: 4, channel: 0.9, targeting: 'nearest', tags: ['Fire', 'Sustained'], glyph: '✹', element: 'fire',
  text: 'For 3s, a storm of embers sprays toward your enemies.',
  effects: [{ type: 'sustained', dur: 3, tick: 0.22, do: { proj: { dmg: 6, speed: 400, radius: 6, spread: 0.9, life: 1.2, status: ['burn', 1] } } }] });

card({ id: 'ash_veil', name: 'Ash Veil', school: 'Mage', cat: 'Technique', rarity: 'Common', world: 2,
  cost: 2, channel: 0.5, targeting: 'self', tags: ['Defense', 'Utility'], glyph: '♒', element: 'shadow',
  text: 'A cloak of ash follows you, slowing enemies. Gain 10 Armor.',
  effects: [{ type: 'zone', r: 140, duration: 3.5, tickDmg: 0, tickRate: 0.5, slow: 0.5, follow: true }, { type: 'armor', amount: 10 }] });

card({ id: 'magma_stance', name: 'Magma Stance', school: 'Warrior', cat: 'Power', rarity: 'Uncommon', world: 2,
  cost: 3, channel: 0.5, dur: 7, targeting: 'none', tags: ['Fire', 'Melee', 'Stance'], glyph: '♨', element: 'fire',
  text: 'For 7s your swings arc wider, hit harder, and set flesh alight.',
  effects: [{ type: 'power', dur: 7, power: { arcMult: 1.4, dmgMult: 1.2, addStatus: ['burn', 2], element: 'fire' } }] });

card({ id: 'eruption', name: 'Eruption', school: 'Warrior', cat: 'Signature', sub: 'AoE', rarity: 'Rare', world: 2,
  cost: 4, channel: 1.9, targeting: 'self', preview: { r: 175 }, tags: ['Fire', 'AoE'], glyph: '⛰', element: 'fire',
  text: 'The ground splits and the mountain answers: heavy damage, Burn, and a blastwave.',
  effects: [{ type: 'aoe', r: 175, dmg: 48, status: ['burn', 3], knockback: 200, shake: 15 }] });

card({ id: 'molten_charge', name: 'Molten Charge', school: 'Warrior', cat: 'Technique', rarity: 'Uncommon', world: 2,
  cost: 2, channel: 0.5, dur: 8, targeting: 'self', tags: ['Movement', 'Dash', 'Fire'], glyph: '➶', element: 'fire',
  text: 'For 8s your Dash becomes Molten Charge: drag enemies through fire.',
  effects: [{ type: 'dashOverride', dur: 8, move: { kind: 'charge', dist: 260, dmg: 20, gather: 140, status: ['burn', 2], cd: 1.0 } }] });

card({ id: 'tempered_will', name: 'Tempered Will', school: 'Warrior', cat: 'Technique', rarity: 'Common', world: 2,
  cost: 2, channel: 0.5, targeting: 'self', tags: ['Defense', 'Flow'], glyph: '⚒', element: 'gold',
  text: 'Forge yourself anew: gain 18 Armor and 3 Flow over 2 seconds.',
  effects: [{ type: 'armor', amount: 18 }, { type: 'flowOverTime', amount: 3, dur: 2 }] });

card({ id: 'ember_blades', name: 'Ember Blades', school: 'Rogue', cat: 'Power', rarity: 'Uncommon', world: 2,
  cost: 3, channel: 0.5, dur: 7, targeting: 'none', tags: ['Fire', 'Stance'], glyph: '🜏', element: 'fire',
  text: 'For 7s: knives fly 20% faster, burn on hit, and crit more often.',
  effects: [{ type: 'power', dur: 7, power: { basicOverride: { dmg: 6, speed: 820, radius: 4, critChance: 0.18, status: ['burn', 1], element: 'fire' }, rateMult: 0.8 } }] });

card({ id: 'firetrap', name: 'Firetrap', school: 'Rogue', cat: 'Technique', rarity: 'Uncommon', world: 2,
  cost: 2, channel: 0.5, targeting: 'self', tags: ['Trap', 'Fire'], glyph: '⚸', element: 'fire',
  text: 'A buried ember charge: snaps shut with fire on the first enemy in.',
  effects: [{ type: 'trap', arm: 0.6, r: 95, dmg: 30, root: 1, status: ['burn', 3], ttl: 25 }] });

card({ id: 'mirage_storm', name: 'Mirage Storm', school: 'Rogue', cat: 'Signature', sub: 'Sustained', rarity: 'Rare', world: 2,
  cost: 4, channel: 1.0, targeting: 'self', tags: ['Projectile', 'Sustained'], glyph: '❂', element: 'fire',
  text: 'For 2.4s, waves of mirage knives shimmer out in every direction.',
  effects: [{ type: 'sustained', dur: 2.4, tick: 0.4, do: { proj: { dmg: 9, speed: 640, radius: 5, count: 10, ring: true, critChance: 0.25 } } }] });

card({ id: 'ash_bomb', name: 'Ash Bomb', school: 'Rogue', cat: 'Technique', rarity: 'Common', world: 2,
  cost: 2, channel: 0.6, targeting: 'self', preview: { r: 140 }, tags: ['Fire', 'AoE'], glyph: '♒', element: 'fire',
  text: 'A smothering cloud of hot ash: slows and singes everything inside.',
  effects: [{ type: 'zone', r: 140, duration: 4, tickDmg: 5, tickRate: 0.5, slow: 0.6, status: ['burn', 1] }] });

card({ id: 'gilded_engine', name: 'Gilded Engine', school: 'Colorless', cat: 'Power', rarity: 'Uncommon', world: 2,
  cost: 1, channel: 0.5, targeting: 'none', tags: ['Flow', 'Draw'], glyph: '⚙', element: 'gold',
  text: 'Gain 4 Flow over 1.5s and draw one card.',
  effects: [{ type: 'flowOverTime', amount: 4, dur: 1.5 }, { type: 'draw', n: 1 }] });

card({ id: 'phoenix_echo', name: 'Phoenix Echo', school: 'Colorless', cat: 'Power', rarity: 'Uncommon', world: 2,
  cost: 2, channel: 0.5, targeting: 'none', tags: ['Power', 'Trigger'], glyph: '🜂', element: 'gold',
  text: 'For 30s: whenever a Power expires, gain 3 Flow from its ashes.',
  effects: [{ type: 'enchant', dur: 30, on: ['powerExpired'], do: { flow: 3 } }] });

card({ id: 'transmute', name: 'Transmute', school: 'Colorless', cat: 'Power', rarity: 'Common', world: 2,
  cost: 1, channel: 0.4, targeting: 'none', tags: ['Draw'], glyph: '☿', element: 'gold',
  text: 'Draw two cards into the queue. Grants no Flow.',
  effects: [{ type: 'draw', n: 2 }] });

card({ id: 'worldheart', name: 'Worldheart', school: 'Colorless', cat: 'Power', rarity: 'Rare', world: 2,
  cost: 3, channel: 0.7, targeting: 'none', tags: ['Defense', 'Flow'], glyph: '❂', element: 'gold',
  text: 'Draw on the realm itself: 15 Armor and 6 Flow over 4 seconds.',
  effects: [{ type: 'armor', amount: 15 }, { type: 'flowOverTime', amount: 6, dur: 4 }] });

card({ id: 'worldfire', name: 'Worldfire', school: 'Colorless', cat: 'Signature', sub: 'AoE', rarity: 'Legendary', world: 2,
  cost: 6, channel: 2.0, targeting: 'self', preview: { r: 240 }, tags: ['Fire', 'AoE', 'Flow'], glyph: '☩', element: 'fire',
  text: 'Set the realm itself alight: a vast burning field, and 6 Flow as it feeds you.',
  effects: [{ type: 'zone', r: 240, duration: 6, tickDmg: 9, tickRate: 0.5, status: ['burn', 1] }, { type: 'flowOverTime', amount: 6, dur: 6 }] });

// Card System v2 (rework_cards.md) §19: world re-curation to 6 cards/world
// is out of scope for this pass — kept registered, excluded from live pools.
for (const c of cards) c.disabled = true;

export const WORLD2_CARDS = cards;
