import type { CardDef } from '../types.js';

const cards: CardDef[] = [];
function card(def: CardDef): CardDef { cards.push(def); return def; }

// ═══ NECROMANCER ═══ souls, attrition, and an army that outlives its master ═══

card({ id: 'bone_legion', name: 'Bone Legion', school: 'Necromancer', cat: 'Power', rarity: 'Common',
  cost: 2, channel: 0.6, dur: 9, targeting: 'none', tags: ['Bone', 'Minion'], glyph: '☠', element: 'shadow',
  text: 'For 9s every third Bone Shard calls a second shard from the grave.',
  effects: [{ type: 'power', dur: 9, power: { extraEvery: 3 } }] });

card({ id: 'grave_miasma', name: 'Grave Miasma', school: 'Necromancer', cat: 'Power', rarity: 'Common',
  cost: 2, channel: 0.6, dur: 8, targeting: 'none', tags: ['Poison', 'Curse'], glyph: '☣', element: 'poison',
  text: 'For 8s your Bone Shards trail grave-rot and apply Poison.',
  effects: [{ type: 'power', dur: 8, power: { addStatus: ['poison', 2], element: 'poison' } }] });

card({ id: 'dread_command', name: 'Dread Command', school: 'Necromancer', cat: 'Power', rarity: 'Uncommon', disabled: true,
  cost: 2, channel: 0.7, dur: 8, targeting: 'none', tags: ['Soul', 'Minion'], glyph: '♛', element: 'shadow',
  text: 'For 8s your attacks become 25% stronger and 20% faster.',
  effects: [{ type: 'power', dur: 8, power: { dmgMult: 1.25, rateMult: 0.8 } }] });

card({ id: 'raise_dead', name: 'Raise Dead', school: 'Necromancer', cat: 'Signature', sub: 'Summon', rarity: 'Common',
  cost: 3, channel: 1.1, targeting: 'self', tags: ['Minion', 'Shadow'], glyph: '♙', element: 'shadow',
  text: 'Raise a skeletal archer that follows you and fires at nearby enemies for 12s.',
  effects: [{ type: 'summon', kind: 'clone', dur: 12, fireRate: 0.9, dmg: 7 }] });

card({ id: 'bone_spear', name: 'Bone Spear', school: 'Necromancer', cat: 'Technique', rarity: 'Common',
  cost: 2, channel: 0.5, targeting: 'nearest', tags: ['Bone', 'Projectile'], glyph: '➳', element: 'physical',
  text: 'Launch a cruel spear of bone that punches through a line of enemies.',
  effects: [{ type: 'proj', dmg: 22, speed: 720, radius: 7, life: 1.4, pierce: 4, element: 'physical' }] });

card({ id: 'grave_grasp', name: 'Grave Grasp', school: 'Necromancer', cat: 'Technique', rarity: 'Common',
  cost: 2, channel: 0.7, targeting: 'nearest', preview: { r: 130 }, tags: ['Control', 'AoE'], glyph: '⌘', element: 'shadow',
  text: 'Dead hands tear through the ground, damaging and rooting enemies in the circle.',
  effects: [{ type: 'aoe', r: 130, dmg: 10, root: 2.2 }] });

card({ id: 'soul_ward', name: 'Soul Ward', school: 'Necromancer', cat: 'Technique', rarity: 'Common',
  cost: 1, channel: 0.4, targeting: 'self', tags: ['Soul', 'Defense'], glyph: '◈', element: 'shadow',
  text: 'Bind the restless dead around you. Gain 14 Armor.',
  effects: [{ type: 'armor', amount: 14 }] });

card({ id: 'wraith_walk', name: 'Wraith Walk', school: 'Necromancer', cat: 'Technique', rarity: 'Uncommon',
  cost: 1, channel: 0.4, dur: 9, targeting: 'self', tags: ['Movement', 'Dash', 'Shadow'], glyph: '♧', element: 'shadow',
  text: 'For 9s your Dash becomes Wraith Walk, blinking through danger while untargetable.',
  effects: [{ type: 'dashOverride', dur: 9, move: { kind: 'blink', dist: 220, cd: 0.85, untargetable: 0.25 } }] });

card({ id: 'plague_ground', name: 'Plague Ground', school: 'Necromancer', cat: 'Signature', sub: 'AoE', rarity: 'Common',
  cost: 3, channel: 1.4, targeting: 'nearest', preview: { r: 145 }, tags: ['Poison', 'Persistent'], glyph: '☣', element: 'poison',
  text: 'Blight the earth for 4s, poisoning everything that crosses it.',
  effects: [{ type: 'zone', r: 145, duration: 4, tickDmg: 5, tickRate: 0.5, status: ['poison', 1], slow: 0.18 }] });

card({ id: 'bone_storm', name: 'Bone Storm', school: 'Necromancer', cat: 'Signature', sub: 'Sustained', rarity: 'Uncommon',
  cost: 4, channel: 1.0, targeting: 'self', tags: ['Bone', 'Sustained', 'AoE'], glyph: '✺', element: 'physical',
  text: 'For 2.4s, volleys of bone erupt in every direction around you.',
  effects: [{ type: 'sustained', dur: 2.4, tick: 0.4, do: { proj: { dmg: 8, speed: 500, radius: 5, life: 1.1, count: 8, ring: true, pierce: 1, element: 'physical' } } }] });

card({ id: 'corpse_bloom', name: 'Corpse Bloom', school: 'Necromancer', cat: 'Signature', sub: 'AoE', rarity: 'Rare', disabled: true,
  cost: 4, channel: 1.8, targeting: 'nearest', preview: { r: 165 }, tags: ['Poison', 'AoE'], glyph: '❋', element: 'poison',
  text: 'A garden of carrion bursts from below, dealing heavy damage and spreading Poison.',
  effects: [{ type: 'aoe', r: 165, dmg: 42, status: ['poison', 4], knockback: 80, shake: 10 }] });

card({ id: 'frailty', name: 'Frailty', school: 'Necromancer', cat: 'Power', rarity: 'Uncommon', disabled: true,
  cost: 2, channel: 0.5, targeting: 'nearest', tags: ['Curse', 'Mark'], glyph: '†', element: 'shadow',
  text: 'Curse the nearest enemy for 9s. It takes 40% more damage.',
  effects: [{ type: 'mark', dur: 9, amp: 1.4 }] });

card({ id: 'death_knell', name: 'Death Knell', school: 'Necromancer', cat: 'Power', rarity: 'Uncommon', disabled: true,
  cost: 2, channel: 0.6, targeting: 'none', tags: ['Soul', 'Trigger', 'Flow'], glyph: '◉', element: 'shadow',
  text: 'For 25s, each enemy death grants 1 Flow.',
  effects: [{ type: 'enchant', dur: 25, on: ['enemyKilled'], do: { flow: 1 } }] });

card({ id: 'dark_covenant', name: 'Dark Covenant', school: 'Necromancer', cat: 'Technique', rarity: 'Rare', disabled: true,
  cost: 2, channel: 0.6, targeting: 'none', tags: ['Minion', 'Modifier'], glyph: '⛧', element: 'shadow',
  text: 'Your next 2 Minion cards repeat once and deal 25% more damage.',
  effects: [{ type: 'mod', match: { school: 'Necromancer', tags: ['Minion'] }, count: 2, buff: { repeat: 1, dmgMult: 1.25 } }] });

card({ id: 'army_of_the_dead', name: 'Army of the Dead', school: 'Necromancer', cat: 'Signature', sub: 'Summon', rarity: 'Legendary',
  cost: 5, channel: 2.5, targeting: 'self', tags: ['Minion', 'Soul'], glyph: '♚', element: 'shadow',
  text: 'Tear open the ossuary and raise four relentless shades for 18s.',
  effects: [
    { type: 'summon', kind: 'clone', dur: 18, fireRate: 0.7, dmg: 9 },
    { type: 'summon', kind: 'clone', dur: 18, fireRate: 0.75, dmg: 9 },
    { type: 'summon', kind: 'clone', dur: 18, fireRate: 0.8, dmg: 9 },
    { type: 'summon', kind: 'clone', dur: 18, fireRate: 0.85, dmg: 9 },
  ] });

export const NECROMANCER_CARDS = cards;
