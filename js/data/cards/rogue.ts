import type { CardDef } from '../types.js';

const cards: CardDef[] = [];
function card(def: CardDef): CardDef { cards.push(def); return def; }

// ═══ ROGUE ═══ poison, traps, mobility, precision ═══

card({ id: 'poisoned_blades', name: 'Poisoned Blades', school: 'Rogue', cat: 'Power', rarity: 'Common',
  cost: 2, channel: 0.5, dur: 7, targeting: 'none', tags: ['Poison', 'Stance'], glyph: '☽', element: 'poison',
  text: 'For 7s your knives drip venom, applying Poison on every hit.',
  effects: [{ type: 'power', dur: 7, power: { addStatus: ['poison', 2], element: 'poison' } }] });

card({ id: 'serrated_blades', name: 'Serrated Blades', school: 'Rogue', cat: 'Power', rarity: 'Common',
  cost: 2, channel: 0.5, dur: 7, targeting: 'none', tags: ['Bleed', 'Stance'], glyph: '⌁', element: 'physical',
  text: 'For 7s your knives tear flesh, applying Bleed on every hit.',
  effects: [{ type: 'power', dur: 7, power: { addStatus: ['bleed', 2] } }],
  disabled: true });

card({ id: 'shadowstep', name: 'Shadowstep', school: 'Rogue', cat: 'Technique', rarity: 'Common',
  cost: 1, channel: 0.5, dur: 8, targeting: 'self', tags: ['Movement', 'Dash', 'Shadow'], glyph: '☾', element: 'shadow',
  text: 'For 8s your Dash becomes Shadowstep: blink untargetable, empowering your next basic attack.',
  effects: [{ type: 'dashOverride', dur: 8, move: { kind: 'blink', dist: 200, untargetable: 0.7, empower: { mult: 2.2, crit: 0.5 }, cd: 0.9 } }] });

card({ id: 'trap_card', name: 'Springblade Trap', school: 'Rogue', cat: 'Technique', rarity: 'Common',
  cost: 2, channel: 0.5, targeting: 'self', tags: ['Trap'], glyph: '⚸', element: 'poison',
  text: 'Place a hidden trap. Once armed, it snaps shut on the first enemy to step in.',
  effects: [{ type: 'trap', arm: 0.6, r: 85, dmg: 24, root: 1.3, status: ['poison', 2], ttl: 25 }] });

card({ id: 'smoke_bomb', name: 'Smoke Bomb', school: 'Rogue', cat: 'Technique', rarity: 'Uncommon',
  cost: 2, channel: 0.5, targeting: 'self', preview: { r: 150 }, tags: ['Utility', 'Shadow', 'AoE'], glyph: '♒', element: 'shadow',
  text: 'A choking cloud follows you, slowing enemies inside it.',
  effects: [{ type: 'zone', r: 150, duration: 3.5, tickDmg: 0, tickRate: 0.5, slow: 0.45, follow: true }] });

card({ id: 'backstab', name: 'Backstab', school: 'Rogue', cat: 'Technique', rarity: 'Uncommon',
  cost: 2, channel: 0.5, targeting: 'nearest', tags: ['Crit', 'Melee'], glyph: '⸙', element: 'shadow',
  text: 'A treacherous strike with a 50% critical chance.',
  effects: [{ type: 'arc', dmg: 18, range: 110, arc: 70, critChance: 0.5 }] });

card({ id: 'venom_cloud', name: 'Venom Cloud', school: 'Rogue', cat: 'Signature', sub: 'AoE', rarity: 'Uncommon',
  cost: 3, channel: 1.5, targeting: 'nearest', preview: { r: 130 }, tags: ['Poison', 'AoE', 'Persistent'], glyph: '♃', element: 'poison',
  text: 'A lingering cloud that steadily poisons everything within for 5s.',
  effects: [{ type: 'zone', r: 130, duration: 5, tickDmg: 4, tickRate: 0.5, status: ['poison', 1] }] });

card({ id: 'fan_of_knives', name: 'Fan of Knives', school: 'Rogue', cat: 'Signature', sub: 'Sustained', rarity: 'Uncommon',
  cost: 3, channel: 0.7, targeting: 'self', tags: ['Projectile', 'Sustained'], glyph: '✥', element: 'physical',
  text: 'For 2s, release wave after wave of spectral knives in every direction.',
  effects: [{ type: 'sustained', dur: 2, tick: 0.5, do: { proj: { dmg: 7, speed: 620, radius: 5, count: 8, ring: true, critChance: 0.15 } } }] });

card({ id: 'knife_storm', name: 'Knife Storm', school: 'Rogue', cat: 'Signature', sub: 'Sustained', rarity: 'Rare',
  cost: 5, channel: 1.2, targeting: 'self', tags: ['Projectile', 'Sustained'], glyph: '❂', element: 'shadow',
  text: 'A 2.4s hurricane of spectral knives spirals out around you.',
  effects: [{ type: 'sustained', dur: 2.4, tick: 0.4, do: { proj: { dmg: 9, speed: 640, radius: 5, count: 12, ring: true, critChance: 0.2 } } }],
  disabled: true });

card({ id: 'deathmark', name: 'Deathmark', school: 'Rogue', cat: 'Power', rarity: 'Uncommon',
  cost: 2, channel: 0.4, targeting: 'nearest', tags: ['Execute'], glyph: '♰', element: 'shadow',
  text: 'Mark the nearest enemy for 8s. It takes 35% more damage and +25% crits from you.',
  effects: [{ type: 'mark', dur: 8, amp: 1.35, crit: 0.25 }] });

card({ id: 'toxic_reaction', name: 'Toxic Reaction', school: 'Rogue', cat: 'Power', rarity: 'Uncommon',
  cost: 2, channel: 0.6, targeting: 'none', tags: ['Poison', 'Trigger'], glyph: '☣', element: 'poison',
  text: 'For 30s: when a Poisoned enemy dies, its Poison spreads to nearby enemies.',
  effects: [{ type: 'enchant', dur: 30, on: ['enemyKilled'], filter: { hasStatus: 'poison' }, do: { spreadStatus: { status: 'poison', stacks: 3, r: 140 } } }],
  disabled: true });

card({ id: 'evasion', name: 'Evasion', school: 'Rogue', cat: 'Power', rarity: 'Uncommon',
  cost: 1, channel: 0.4, targeting: 'none', tags: ['Defense', 'Trigger'], glyph: '♞', element: 'shadow',
  text: 'For 25s: perfect dodges draw one card (but grant no Flow).',
  effects: [{ type: 'enchant', dur: 25, on: ['perfectDodge'], do: { draw: 1, noFlow: true } }],
  disabled: true });

card({ id: 'ambush', name: 'Ambush', school: 'Rogue', cat: 'Power', rarity: 'Common',
  cost: 1, channel: 0.3, targeting: 'none', tags: ['Crit'], glyph: '⚸', element: 'shadow',
  text: 'The next Rogue card gains +75% critical chance and 20% damage.',
  effects: [{ type: 'mod', match: { school: 'Rogue' }, buff: { critChance: 0.75, dmgMult: 1.2 } }],
  disabled: true });

card({ id: 'shadow_clone', name: 'Shadow Clone', school: 'Rogue', cat: 'Power', sub: 'Sustained', rarity: 'Rare',
  cost: 4, channel: 0.9, targeting: 'self', tags: ['Summon', 'Shadow'], glyph: '⚉', element: 'shadow',
  text: 'A clone of living shadow fights beside you for 8s, throwing knives.',
  effects: [{ type: 'summon', kind: 'clone', dur: 8, fireRate: 0.7, dmg: 7 }] });

card({ id: 'blade_flurry', name: 'Blade Flurry', school: 'Rogue', cat: 'Signature', sub: 'Sustained', rarity: 'Common',
  cost: 2, channel: 0.6, targeting: 'self', tags: ['Projectile', 'Sustained'], glyph: '✥', element: 'physical',
  text: 'For 1.5s, quick rings of knives whirl out around you.',
  effects: [{ type: 'sustained', dur: 1.5, tick: 0.5, do: { proj: { dmg: 6, speed: 600, radius: 5, count: 6, ring: true, critChance: 0.1 } } }],
  disabled: true });

card({ id: 'thousand_cuts', name: 'Thousand Cuts', school: 'Rogue', cat: 'Signature', sub: 'Sustained', rarity: 'Legendary',
  cost: 5, channel: 1.2, targeting: 'self', tags: ['Projectile', 'Sustained', 'Crit'], glyph: '❈', element: 'shadow',
  text: 'For 3s the air itself is made of knives. They remember every wound.',
  effects: [{ type: 'sustained', dur: 3, tick: 0.25, do: { proj: { dmg: 8, speed: 680, radius: 5, count: 6, ring: true, critChance: 0.3 } } }] });

export const ROGUE_CARDS = cards;
