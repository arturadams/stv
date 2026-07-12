import type { CardDef } from '../types.js';

const cards: CardDef[] = [];
function card(def: CardDef): CardDef { cards.push(def); return def; }

// ═══ WARRIOR ═══ physical, aggressive, momentum-based ═══

card({ id: 'cleaving_stance', name: 'Cleaving Stance', school: 'Warrior', cat: 'Power', rarity: 'Common',
  cost: 2, channel: 0.5, dur: 7, targeting: 'none', tags: ['Melee', 'Stance'], glyph: '⚔', element: 'physical',
  text: 'For 7s your swings carve a far wider arc and hit 25% harder.',
  effects: [{ type: 'power', dur: 7, power: { arcMult: 1.8, dmgMult: 1.25 } }] });

card({ id: 'burning_blade', name: 'Burning Blade', school: 'Warrior', cat: 'Power', rarity: 'Common',
  cost: 2, channel: 0.5, dur: 7, targeting: 'none', tags: ['Fire', 'Melee', 'Stance'], glyph: '⸸', element: 'fire',
  text: 'For 7s your swings ignite, applying Burn on every hit.',
  effects: [{ type: 'power', dur: 7, power: { addStatus: ['burn', 2], element: 'fire' } }],
  disabled: true });

card({ id: 'blood_rage', name: 'Blood Rage', school: 'Warrior', cat: 'Power', rarity: 'Uncommon',
  cost: 3, channel: 0.5, dur: 8, targeting: 'none', tags: ['Rage', 'Stance'], glyph: '♅', element: 'fire',
  text: 'For 8s: attack 35% faster and channel 25% faster. Taking damage extends it 1s.',
  effects: [{ type: 'power', dur: 8, power: { rateMult: 0.65, channelMult: 0.75, extendOnHit: 1 } }] });

card({ id: 'charge', name: 'Charge', school: 'Warrior', cat: 'Technique', rarity: 'Common',
  cost: 2, channel: 0.5, dur: 8, targeting: 'self', tags: ['Movement', 'Dash', 'Melee'], glyph: '➶', element: 'physical',
  text: 'For 8s your Dash becomes Charge: crash through enemies, dragging them with you.',
  effects: [{ type: 'dashOverride', dur: 8, move: { kind: 'charge', dist: 240, dmg: 15, gather: 120, cd: 1.0 } }] });

card({ id: 'shield_wall', name: 'Shield Wall', school: 'Warrior', cat: 'Technique', rarity: 'Common',
  cost: 2, channel: 0.5, targeting: 'self', tags: ['Defense'], glyph: '⛨', element: 'gold',
  text: 'Raise a rampart of golden wards. Gain 25 Armor.',
  effects: [{ type: 'armor', amount: 25 }],
  disabled: true });

card({ id: 'iron_skin', name: 'Iron Skin', school: 'Warrior', cat: 'Technique', rarity: 'Common',
  cost: 1, channel: 0.5, targeting: 'self', tags: ['Defense'], glyph: '❖', element: 'gold',
  text: 'Your skin turns to living iron. Gain 12 Armor.',
  effects: [{ type: 'armor', amount: 12 }] });

card({ id: 'thunder_hammer', name: 'Thunder Hammer', school: 'Warrior', cat: 'Signature', sub: 'AoE', rarity: 'Uncommon',
  cost: 3, channel: 1.1, targeting: 'nearest', tags: ['Lightning', 'Melee', 'AoE'], glyph: '⚒', element: 'lightning',
  text: 'Wind up a heavy strike that detonates into a stunning shockwave.',
  effects: [{ type: 'arc', dmg: 22, range: 120, arc: 110 }, { type: 'aoe', r: 110, dmg: 12, stun: 0.7, atFacing: 95 }] });

card({ id: 'whirlwind', name: 'Whirlwind', school: 'Warrior', cat: 'Signature', sub: 'Sustained', rarity: 'Common',
  cost: 3, channel: 0.7, targeting: 'self', tags: ['Melee', 'Sustained', 'AoE'], glyph: '✺', element: 'physical',
  text: 'Spin for 2s, repeatedly slashing everything around you.',
  effects: [{ type: 'sustained', dur: 2, tick: 0.33, do: { pulse: { r: 150, dmg: 9, knockback: 60 } } }] });

card({ id: 'earthquake', name: 'Earthquake', school: 'Warrior', cat: 'Signature', sub: 'AoE', rarity: 'Rare',
  cost: 4, channel: 2.0, targeting: 'self', preview: { r: 190 }, tags: ['AoE', 'Stun'], glyph: '♁', element: 'physical',
  text: 'Long channel. The floor splits in a shockwave that stuns all around you.',
  effects: [{ type: 'aoe', r: 190, dmg: 38, stun: 1.5, shake: 16 }] });

card({ id: 'execute', name: 'Execute', school: 'Warrior', cat: 'Technique', rarity: 'Uncommon',
  cost: 3, channel: 0.5, targeting: 'nearest', tags: ['Melee', 'Finisher'], glyph: '☠', element: 'physical',
  text: 'A merciless strike. Deals 3.5× damage to enemies below 35% health.',
  effects: [{ type: 'arc', dmg: 13, range: 125, arc: 90, executeBelow: 0.35, executeMult: 3.5 }] });

card({ id: 'throw_axe', name: 'Throw Axe', school: 'Warrior', cat: 'Technique', rarity: 'Common',
  cost: 2, channel: 0.5, targeting: 'nearest', tags: ['Projectile', 'Physical'], glyph: '⚚', element: 'physical',
  text: 'Hurl a spinning axe that pierces enemies and returns to your hand.',
  effects: [{ type: 'proj', dmg: 13, speed: 480, radius: 14, pierce: 5, boomerang: true }],
  disabled: true });

card({ id: 'riposte', name: 'Riposte', school: 'Warrior', cat: 'Power', rarity: 'Uncommon',
  cost: 2, channel: 0.5, targeting: 'none', tags: ['Counter', 'Trigger'], glyph: '☍', element: 'physical',
  text: 'For 25s: after a perfect dodge, a counter slash strikes nearby enemies.',
  effects: [{ type: 'enchant', dur: 25, on: ['perfectDodge'], do: { counterArc: { dmg: 26, range: 140 } } }] });

card({ id: 'battle_cry', name: 'Battle Cry', school: 'Warrior', cat: 'Power', rarity: 'Uncommon',
  cost: 2, channel: 0.5, targeting: 'none', tags: ['Buff'], glyph: '♯', element: 'gold',
  text: 'Your next 3 Warrior cards deal 50% more damage.',
  effects: [{ type: 'mod', match: { school: 'Warrior' }, count: 3, buff: { dmgMult: 1.5 } }],
  disabled: true });

card({ id: 'titanfall', name: 'Titanfall', school: 'Warrior', cat: 'Signature', sub: 'AoE', rarity: 'Legendary',
  cost: 5, channel: 2.2, targeting: 'self', preview: { r: 230 }, tags: ['Physical', 'AoE'], glyph: '♆', element: 'gold',
  text: 'Channel a colossal impact zone around you — then bring the sky down on it.',
  effects: [{ type: 'aoe', r: 230, dmg: 85, stun: 1.2, shake: 22 }] });

export const WARRIOR_CARDS = cards;
