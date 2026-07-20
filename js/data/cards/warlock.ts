import type { CardDef } from '../types.js';

const cards: CardDef[] = [];
function card(def: CardDef): CardDef { cards.push(def); return def; }

// ═══ WARLOCK ═══ corruption, curses, and power borrowed at a price ═══

card({ id: 'fel_infusion', name: 'Fel Infusion', school: 'Warlock', cat: 'Power', rarity: 'Common',
  cost: 2, channel: 0.6, dur: 8, targeting: 'none', tags: ['Fire', 'Pact'], glyph: '♨', element: 'fire',
  text: 'For 8s your Eldritch Bolts become Fel Bolts that explode and apply Burn.',
  effects: [{ type: 'power', dur: 8, power: { basicOverride: { dmg: 10, speed: 500, radius: 7, explode: { r: 62, dmg: 5 }, status: ['burn', 1], element: 'fire' } } }] });

card({ id: 'cursed_bolts', name: 'Cursed Bolts', school: 'Warlock', cat: 'Power', rarity: 'Common',
  cost: 2, channel: 0.6, dur: 9, targeting: 'none', tags: ['Curse', 'Shadow'], glyph: '‡', element: 'shadow',
  text: 'For 9s every third Eldritch Bolt splits toward a second victim.',
  effects: [{ type: 'power', dur: 9, power: { extraEvery: 3 } }] });

card({ id: 'pact_of_haste', name: 'Pact of Haste', school: 'Warlock', cat: 'Power', rarity: 'Uncommon',
  cost: 2, channel: 0.5, dur: 8, targeting: 'none', tags: ['Pact', 'Corruption'], glyph: '⌛', element: 'shadow',
  text: 'For 8s attack 25% faster and channel 20% faster.',
  effects: [{ type: 'power', dur: 8, power: { rateMult: 0.75, channelMult: 0.8 } }] });

card({ id: 'shadow_barrage', name: 'Shadow Barrage', school: 'Warlock', cat: 'Spell', sub: 'Sustained', rarity: 'Common',
  cost: 3, channel: 0.9, targeting: 'nearest', tags: ['Shadow', 'Sustained'], glyph: '➵', element: 'shadow',
  text: 'For 2.2s, loose a stream of seeking shadow bolts into the nearest enemy.',
  effects: [{ type: 'sustained', dur: 2.2, tick: 0.28, do: { proj: { dmg: 8, speed: 620, radius: 6, life: 1.3, spread: 0.12, element: 'shadow' } } }] });

card({ id: 'hellfire', name: 'Hellfire', school: 'Warlock', cat: 'Spell', sub: 'AoE', rarity: 'Common',
  cost: 3, channel: 1.5, targeting: 'nearest', preview: { r: 145 }, tags: ['Fire', 'AoE'], glyph: '♨', element: 'fire',
  text: 'Open a furnace beneath the nearest pack, dealing damage and heavy Burn.',
  effects: [{ type: 'aoe', r: 145, dmg: 19, status: ['burn', 3], shake: 7 }] });

card({ id: 'demon_skin', name: 'Demon Skin', school: 'Warlock', cat: 'Skill', rarity: 'Common',
  cost: 1, channel: 0.4, targeting: 'self', tags: ['Pact', 'Defense'], glyph: '♢', element: 'shadow',
  text: 'Borrow a demon\'s hide. Gain 15 Armor.',
  effects: [{ type: 'armor', amount: 15 }] });

card({ id: 'fear', name: 'Fear', school: 'Warlock', cat: 'Skill', rarity: 'Common',
  cost: 2, channel: 0.6, targeting: 'self', preview: { r: 150 }, tags: ['Curse', 'Control'], glyph: '◉', element: 'shadow',
  text: 'Crush nearby minds with a vision of the void, rooting and driving enemies back.',
  effects: [{ type: 'aoe', r: 150, dmg: 6, root: 1.6, knockback: 190 }] });

card({ id: 'dark_bargain', name: 'Dark Bargain', school: 'Warlock', cat: 'Skill', rarity: 'Uncommon',
  cost: 1, channel: 0.4, targeting: 'none', tags: ['Pact', 'Flow'], glyph: '⚖', element: 'gold',
  text: 'Sign in blood and gain 5 Flow over 4s.',
  effects: [{ type: 'flowOverTime', amount: 5, dur: 4 }] });

card({ id: 'rain_of_fire', name: 'Rain of Fire', school: 'Warlock', cat: 'Spell', sub: 'AoE', rarity: 'Uncommon',
  cost: 4, channel: 1.6, targeting: 'nearest', preview: { r: 160 }, tags: ['Fire', 'Persistent'], glyph: '☄', element: 'fire',
  text: 'Burn a circle into the world for 5s; enemies inside are repeatedly ignited.',
  effects: [{ type: 'zone', r: 160, duration: 5, tickDmg: 7, tickRate: 0.5, status: ['burn', 1] }] });

card({ id: 'life_drain', name: 'Life Drain', school: 'Warlock', cat: 'Spell', sub: 'Sustained', rarity: 'Uncommon',
  cost: 3, channel: 1.0, targeting: 'nearest', tags: ['Shadow', 'Healing', 'Sustained'], glyph: '§', element: 'shadow',
  text: 'Drain the nearest foes with shadow for 2.4s and restore 8 Health.',
  effects: [
    { type: 'sustained', dur: 2.4, tick: 0.4, do: { chain: { dmg: 9, jumps: 2, range: 150 } } },
    { type: 'heal', amount: 8 },
  ] });

card({ id: 'doom', name: 'Doom', school: 'Warlock', cat: 'Modifier', rarity: 'Uncommon',
  cost: 2, channel: 0.6, targeting: 'nearest', tags: ['Curse', 'Mark'], glyph: '☠', element: 'shadow',
  text: 'Pronounce Doom on the nearest enemy for 10s. It takes 45% more damage.',
  effects: [{ type: 'mark', dur: 10, amp: 1.45, crit: 0.1 }] });

card({ id: 'burning_pact', name: 'Burning Pact', school: 'Warlock', cat: 'Modifier', rarity: 'Uncommon',
  cost: 2, channel: 0.5, targeting: 'none', tags: ['Pact', 'Fire', 'Modifier'], glyph: '⛧', element: 'fire',
  text: 'Your next 3 Warlock cards deal 40% more damage and apply Burn.',
  effects: [{ type: 'mod', match: { school: 'Warlock' }, count: 3, buff: { dmgMult: 1.4, addStatus: ['burn', 1] } }] });

card({ id: 'infernal_gate', name: 'Infernal Gate', school: 'Warlock', cat: 'Spell', sub: 'Summon', rarity: 'Rare',
  cost: 4, channel: 1.8, targeting: 'self', tags: ['Demon', 'Minion'], glyph: '⌾', element: 'fire',
  text: 'Open a gate and bind two lesser demons to your side for 14s.',
  effects: [
    { type: 'summon', kind: 'clone', dur: 14, fireRate: 0.75, dmg: 9 },
    { type: 'summon', kind: 'clone', dur: 14, fireRate: 0.85, dmg: 10 },
  ] });

card({ id: 'malefic_echo', name: 'Malefic Echo', school: 'Warlock', cat: 'Engine', rarity: 'Rare',
  cost: 3, channel: 0.7, targeting: 'none', tags: ['Curse', 'Engine'], glyph: '⧉', element: 'shadow',
  text: 'The next Warlock Spell repeats once at 85% power.',
  effects: [{ type: 'mod', match: { school: 'Warlock', cat: 'Spell' }, count: 1, buff: { repeat: 1, dmgMult: 0.85 } }] });

card({ id: 'apocalypse', name: 'Apocalypse', school: 'Warlock', cat: 'Spell', sub: 'AoE', rarity: 'Legendary',
  cost: 6, channel: 2.6, targeting: 'self', preview: { r: 225 }, tags: ['Fire', 'Shadow', 'AoE'], glyph: '☢', element: 'fire',
  text: 'Let the contract come due. An immense blast burns, poisons, and scatters everything nearby.',
  effects: [
    { type: 'aoe', r: 225, dmg: 68, status: ['burn', 4], knockback: 220, shake: 20 },
    { type: 'zone', r: 180, duration: 4, tickDmg: 8, tickRate: 0.5, status: ['poison', 1] },
  ] });

export const WARLOCK_CARDS = cards;
