// ── Arcana Engine · data layer ─────────────────────────────────────────────
// Classes, cards, relics, enemies, biomes. Everything is data; behavior lives
// in the effect resolver (world.js). No card has one-off hardcoded logic.
//
// Card categories (the new rhythm — see roadmap.md):
//   Power     — channels briefly, then stays ACTIVE 4–10s modifying the basic attack
//   Skill     — fast tactical action (0.3–0.7s channel)
//   Spell     — big moment: either an AoE channel (1.5–2.5s) or a Sustained cast
//   Trigger   — reacts to events for ~25–30s
//   Engine    — queue / Flow / duration manipulation
//   Modifier  — buffs the next matching card(s)

export const PALETTE = {
  navy: '#0b0e1d', navyDeep: '#070912', parchment: '#e8dcc0', ivory: '#f2ead6',
  gold: '#d9b45b', goldBright: '#ffe9a8', crimson: '#c23b4a', emerald: '#4fbf7a',
  frost: '#8fd8ff', violet: '#8f6fff', ink: '#1a1430',
};

export const SCHOOL_COLORS = {
  Mage: '#8f6fff', Warrior: '#d05648', Rogue: '#4fbf7a', Colorless: '#d9b45b',
};

export const ELEMENT_COLORS = {
  fire: '#ff8a4a', frost: '#8fd8ff', lightning: '#ffe66d', arcane: '#b48cff',
  poison: '#8ade6a', physical: '#e8dcc0', shadow: '#a98fe0', gold: '#ffd97a',
};

export const RARITY_COLORS = {
  Common: '#9aa0b5', Uncommon: '#7fd6a8', Rare: '#8fb8ff', Legendary: '#ffd97a',
};

// ── Classes ── each has a basic attack that is NOT a card ──
export const CLASSES = {
  mage: {
    id: 'mage', name: 'Mage', school: 'Mage', color: '#8f6fff', glyph: '✦',
    tagline: 'Arcane bolts · Attunements · Ritual spells',
    desc: 'Fires arcane bolts on its own. Attunement Powers transform the bolt into fire, frost or storm; the big spells channel over ritual circles.',
    basic: { kind: 'proj', name: 'Arcane Bolt', dmg: 6, rate: 0.55, speed: 600, radius: 5, range: 470, element: 'arcane' },
    resource: null, // Mage state = active Attunements
  },
  warrior: {
    id: 'warrior', name: 'Warrior', school: 'Warrior', color: '#d05648', glyph: '⚔',
    tagline: 'Melee arcs · Rage · Shockwaves',
    desc: 'Swings a spectral blade at anything close. Landing hits, taking damage and close kills build RAGE, which channels Warrior cards faster and harder.',
    basic: { kind: 'arc', name: 'Blade Swing', dmg: 10, rate: 0.8, range: 125, arc: 100, element: 'physical', knockback: 60 },
    resource: { key: 'rage', name: 'RAGE', max: 100, color: '#ff6a4a' },
  },
  rogue: {
    id: 'rogue', name: 'Rogue', school: 'Rogue', color: '#4fbf7a', glyph: '🜏',
    tagline: 'Fast knives · Traps · Opportunity',
    desc: 'Throws quick knives on its own. Kills, poison kills, traps and perfect dodges grant OPPORTUNITY, which quickens Rogue cards and feeds crits.',
    basic: { kind: 'proj', name: 'Swift Knife', dmg: 5, rate: 0.4, speed: 780, radius: 4, range: 430, element: 'physical', critChance: 0.1 },
    resource: { key: 'opportunity', name: 'OPPORTUNITY', max: 8, color: '#8ade6a', pips: true },
  },
};

const C = []; // card list, built below
function card(def) { C.push(def); return def; }

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

// ═══ WARRIOR ═══ physical, aggressive, momentum-based ═══

card({ id: 'cleaving_stance', name: 'Cleaving Stance', school: 'Warrior', cat: 'Power', rarity: 'Common',
  cost: 2, channel: 0.5, dur: 7, targeting: 'none', tags: ['Melee', 'Stance'], glyph: '⚔', element: 'physical',
  text: 'For 7s your swings carve a far wider arc and hit 25% harder.',
  effects: [{ type: 'power', dur: 7, power: { arcMult: 1.8, dmgMult: 1.25 } }] });

card({ id: 'burning_blade', name: 'Burning Blade', school: 'Warrior', cat: 'Power', rarity: 'Common',
  cost: 2, channel: 0.5, dur: 7, targeting: 'none', tags: ['Fire', 'Melee', 'Stance'], glyph: '⸸', element: 'fire',
  text: 'For 7s your swings ignite, applying Burn on every hit.',
  effects: [{ type: 'power', dur: 7, power: { addStatus: ['burn', 2], element: 'fire' } }] });

card({ id: 'blood_rage', name: 'Blood Rage', school: 'Warrior', cat: 'Power', rarity: 'Uncommon',
  cost: 2, channel: 0.5, dur: 8, targeting: 'none', tags: ['Rage', 'Stance'], glyph: '♅', element: 'fire',
  text: 'For 8s: attack 35% faster and channel 25% faster. Taking damage extends it 1s.',
  effects: [{ type: 'power', dur: 8, power: { rateMult: 0.65, channelMult: 0.75, extendOnHit: 1 } }] });

card({ id: 'charge', name: 'Charge', school: 'Warrior', cat: 'Skill', rarity: 'Common',
  cost: 2, channel: 0.5, dur: 8, targeting: 'self', tags: ['Movement', 'Dash', 'Melee'], glyph: '➶', element: 'physical',
  text: 'For 8s your Dash becomes Charge: crash through enemies, dragging them with you.',
  effects: [{ type: 'dashOverride', dur: 8, move: { kind: 'charge', dist: 240, dmg: 15, gather: 120, cd: 1.0 } }] });

card({ id: 'shield_wall', name: 'Shield Wall', school: 'Warrior', cat: 'Skill', rarity: 'Common',
  cost: 2, channel: 0.5, targeting: 'self', tags: ['Defense'], glyph: '⛨', element: 'gold',
  text: 'Raise a rampart of golden wards. Gain 25 Armor.',
  effects: [{ type: 'armor', amount: 25 }] });

card({ id: 'iron_skin', name: 'Iron Skin', school: 'Warrior', cat: 'Skill', rarity: 'Common',
  cost: 1, channel: 0.5, targeting: 'self', tags: ['Defense'], glyph: '❖', element: 'gold',
  text: 'Your skin turns to living iron. Gain 12 Armor.',
  effects: [{ type: 'armor', amount: 12 }] });

card({ id: 'thunder_hammer', name: 'Thunder Hammer', school: 'Warrior', cat: 'Spell', sub: 'AoE', rarity: 'Uncommon',
  cost: 3, channel: 1.1, targeting: 'nearest', tags: ['Lightning', 'Melee', 'AoE'], glyph: '⚒', element: 'lightning',
  text: 'Wind up a heavy strike that detonates into a stunning shockwave.',
  effects: [{ type: 'arc', dmg: 22, range: 120, arc: 110 }, { type: 'aoe', r: 110, dmg: 12, stun: 0.7, atFacing: 95 }] });

card({ id: 'whirlwind', name: 'Whirlwind', school: 'Warrior', cat: 'Spell', sub: 'Sustained', rarity: 'Common',
  cost: 3, channel: 0.7, targeting: 'self', tags: ['Melee', 'Sustained', 'AoE'], glyph: '✺', element: 'physical',
  text: 'Spin for 2s, repeatedly slashing everything around you.',
  effects: [{ type: 'sustained', dur: 2, tick: 0.33, do: { pulse: { r: 150, dmg: 9, knockback: 60 } } }] });

card({ id: 'earthquake', name: 'Earthquake', school: 'Warrior', cat: 'Spell', sub: 'AoE', rarity: 'Rare',
  cost: 4, channel: 2.0, targeting: 'self', preview: { r: 190 }, tags: ['AoE', 'Stun'], glyph: '♁', element: 'physical',
  text: 'Long channel. The floor splits in a shockwave that stuns all around you.',
  effects: [{ type: 'aoe', r: 190, dmg: 38, stun: 1.5, shake: 16 }] });

card({ id: 'execute', name: 'Execute', school: 'Warrior', cat: 'Skill', rarity: 'Uncommon',
  cost: 3, channel: 0.5, targeting: 'nearest', tags: ['Melee', 'Finisher'], glyph: '☠', element: 'physical',
  text: 'A merciless strike. Deals 3.5× damage to enemies below 35% health.',
  effects: [{ type: 'arc', dmg: 13, range: 125, arc: 90, executeBelow: 0.35, executeMult: 3.5 }] });

card({ id: 'throw_axe', name: 'Throw Axe', school: 'Warrior', cat: 'Skill', rarity: 'Common',
  cost: 2, channel: 0.5, targeting: 'nearest', tags: ['Projectile', 'Physical'], glyph: '⚚', element: 'physical',
  text: 'Hurl a spinning axe that pierces enemies and returns to your hand.',
  effects: [{ type: 'proj', dmg: 13, speed: 480, radius: 14, pierce: 5, boomerang: true }] });

card({ id: 'riposte', name: 'Riposte', school: 'Warrior', cat: 'Trigger', rarity: 'Uncommon',
  cost: 2, channel: 0.5, targeting: 'none', tags: ['Counter', 'Trigger'], glyph: '☍', element: 'physical',
  text: 'For 25s: after a perfect dodge, a counter slash strikes nearby enemies.',
  effects: [{ type: 'enchant', dur: 25, on: ['perfectDodge'], do: { counterArc: { dmg: 26, range: 140 } } }] });

card({ id: 'battle_cry', name: 'Battle Cry', school: 'Warrior', cat: 'Modifier', rarity: 'Uncommon',
  cost: 2, channel: 0.5, targeting: 'none', tags: ['Buff'], glyph: '♯', element: 'gold',
  text: 'Your next 3 Warrior cards deal 50% more damage.',
  effects: [{ type: 'mod', match: { school: 'Warrior' }, count: 3, buff: { dmgMult: 1.5 } }] });

card({ id: 'titanfall', name: 'Titanfall', school: 'Warrior', cat: 'Spell', sub: 'AoE', rarity: 'Legendary',
  cost: 6, channel: 2.2, targeting: 'self', preview: { r: 230 }, tags: ['Physical', 'AoE'], glyph: '♆', element: 'gold',
  text: 'Channel a colossal impact zone around you — then bring the sky down on it.',
  effects: [{ type: 'aoe', r: 230, dmg: 85, stun: 1.2, shake: 22 }] });

// ═══ ROGUE ═══ poison, traps, mobility, precision ═══

card({ id: 'poisoned_blades', name: 'Poisoned Blades', school: 'Rogue', cat: 'Power', rarity: 'Common',
  cost: 2, channel: 0.5, dur: 7, targeting: 'none', tags: ['Poison', 'Stance'], glyph: '☽', element: 'poison',
  text: 'For 7s your knives drip venom, applying Poison on every hit.',
  effects: [{ type: 'power', dur: 7, power: { addStatus: ['poison', 2], element: 'poison' } }] });

card({ id: 'serrated_blades', name: 'Serrated Blades', school: 'Rogue', cat: 'Power', rarity: 'Common',
  cost: 2, channel: 0.5, dur: 7, targeting: 'none', tags: ['Bleed', 'Stance'], glyph: '⌁', element: 'physical',
  text: 'For 7s your knives tear flesh, applying Bleed on every hit.',
  effects: [{ type: 'power', dur: 7, power: { addStatus: ['bleed', 2] } }] });

card({ id: 'shadowstep', name: 'Shadowstep', school: 'Rogue', cat: 'Skill', rarity: 'Common',
  cost: 1, channel: 0.5, dur: 8, targeting: 'self', tags: ['Movement', 'Dash', 'Shadow'], glyph: '☾', element: 'shadow',
  text: 'For 8s your Dash becomes Shadowstep: blink untargetable, empowering your next basic attack.',
  effects: [{ type: 'dashOverride', dur: 8, move: { kind: 'blink', dist: 200, untargetable: 0.7, empower: { mult: 2.2, crit: 0.5 }, cd: 0.9 } }] });

card({ id: 'trap_card', name: 'Springblade Trap', school: 'Rogue', cat: 'Skill', rarity: 'Common',
  cost: 2, channel: 0.5, targeting: 'self', tags: ['Trap'], glyph: '⚸', element: 'poison',
  text: 'Place a hidden trap. Once armed, it snaps shut on the first enemy to step in.',
  effects: [{ type: 'trap', arm: 0.6, r: 85, dmg: 24, root: 1.3, status: ['poison', 2], ttl: 25 }] });

card({ id: 'smoke_bomb', name: 'Smoke Bomb', school: 'Rogue', cat: 'Skill', rarity: 'Uncommon',
  cost: 2, channel: 0.5, targeting: 'self', preview: { r: 150 }, tags: ['Utility', 'Shadow', 'AoE'], glyph: '♒', element: 'shadow',
  text: 'A choking cloud follows you, slowing enemies inside it.',
  effects: [{ type: 'zone', r: 150, duration: 3.5, tickDmg: 0, tickRate: 0.5, slow: 0.45, follow: true }] });

card({ id: 'backstab', name: 'Backstab', school: 'Rogue', cat: 'Skill', rarity: 'Uncommon',
  cost: 2, channel: 0.5, targeting: 'nearest', tags: ['Crit', 'Melee'], glyph: '⸙', element: 'shadow',
  text: 'A treacherous strike with a 50% critical chance.',
  effects: [{ type: 'arc', dmg: 18, range: 110, arc: 70, critChance: 0.5 }] });

card({ id: 'venom_cloud', name: 'Venom Cloud', school: 'Rogue', cat: 'Spell', sub: 'AoE', rarity: 'Uncommon',
  cost: 3, channel: 1.5, targeting: 'nearest', preview: { r: 130 }, tags: ['Poison', 'AoE', 'Persistent'], glyph: '♃', element: 'poison',
  text: 'A lingering cloud that steadily poisons everything within for 5s.',
  effects: [{ type: 'zone', r: 130, duration: 5, tickDmg: 4, tickRate: 0.5, status: ['poison', 1] }] });

card({ id: 'fan_of_knives', name: 'Fan of Knives', school: 'Rogue', cat: 'Spell', sub: 'Sustained', rarity: 'Uncommon',
  cost: 3, channel: 0.7, targeting: 'self', tags: ['Projectile', 'Sustained'], glyph: '✥', element: 'physical',
  text: 'For 2s, release wave after wave of spectral knives in every direction.',
  effects: [{ type: 'sustained', dur: 2, tick: 0.5, do: { proj: { dmg: 7, speed: 620, radius: 5, count: 8, ring: true, critChance: 0.15 } } }] });

card({ id: 'knife_storm', name: 'Knife Storm', school: 'Rogue', cat: 'Spell', sub: 'Sustained', rarity: 'Rare',
  cost: 5, channel: 1.2, targeting: 'self', tags: ['Projectile', 'Sustained'], glyph: '❂', element: 'shadow',
  text: 'A 2.4s hurricane of spectral knives spirals out around you.',
  effects: [{ type: 'sustained', dur: 2.4, tick: 0.4, do: { proj: { dmg: 9, speed: 640, radius: 5, count: 12, ring: true, critChance: 0.2 } } }] });

card({ id: 'deathmark', name: 'Deathmark', school: 'Rogue', cat: 'Modifier', rarity: 'Uncommon',
  cost: 2, channel: 0.4, targeting: 'nearest', tags: ['Execute'], glyph: '♰', element: 'shadow',
  text: 'Mark the nearest enemy for 8s. It takes 35% more damage and +25% crits from you.',
  effects: [{ type: 'mark', dur: 8, amp: 1.35, crit: 0.25 }] });

card({ id: 'toxic_reaction', name: 'Toxic Reaction', school: 'Rogue', cat: 'Trigger', rarity: 'Uncommon',
  cost: 2, channel: 0.6, targeting: 'none', tags: ['Poison', 'Trigger'], glyph: '☣', element: 'poison',
  text: 'For 30s: when a Poisoned enemy dies, its Poison spreads to nearby enemies.',
  effects: [{ type: 'enchant', dur: 30, on: ['enemyKilled'], filter: { hasStatus: 'poison' }, do: { spreadStatus: { status: 'poison', stacks: 3, r: 140 } } }] });

card({ id: 'evasion', name: 'Evasion', school: 'Rogue', cat: 'Trigger', rarity: 'Uncommon',
  cost: 1, channel: 0.4, targeting: 'none', tags: ['Defense', 'Trigger'], glyph: '♞', element: 'shadow',
  text: 'For 25s: perfect dodges draw one card (but grant no Flow).',
  effects: [{ type: 'enchant', dur: 25, on: ['perfectDodge'], do: { draw: 1, noFlow: true } }] });

card({ id: 'ambush', name: 'Ambush', school: 'Rogue', cat: 'Modifier', rarity: 'Common',
  cost: 1, channel: 0.3, targeting: 'none', tags: ['Crit'], glyph: '⚸', element: 'shadow',
  text: 'The next Rogue card gains +75% critical chance and 20% damage.',
  effects: [{ type: 'mod', match: { school: 'Rogue' }, buff: { critChance: 0.75, dmgMult: 1.2 } }] });

card({ id: 'shadow_clone', name: 'Shadow Clone', school: 'Rogue', cat: 'Spell', sub: 'Sustained', rarity: 'Rare',
  cost: 3, channel: 0.9, targeting: 'self', tags: ['Summon', 'Shadow'], glyph: '⚉', element: 'shadow',
  text: 'A clone of living shadow fights beside you for 8s, throwing knives.',
  effects: [{ type: 'summon', kind: 'clone', dur: 8, fireRate: 0.7, dmg: 7 }] });

card({ id: 'blade_flurry', name: 'Blade Flurry', school: 'Rogue', cat: 'Spell', sub: 'Sustained', rarity: 'Common',
  cost: 2, channel: 0.6, targeting: 'self', tags: ['Projectile', 'Sustained'], glyph: '✥', element: 'physical',
  text: 'For 1.5s, quick rings of knives whirl out around you.',
  effects: [{ type: 'sustained', dur: 1.5, tick: 0.5, do: { proj: { dmg: 6, speed: 600, radius: 5, count: 6, ring: true, critChance: 0.1 } } }] });

card({ id: 'thousand_cuts', name: 'Thousand Cuts', school: 'Rogue', cat: 'Spell', sub: 'Sustained', rarity: 'Legendary',
  cost: 6, channel: 1.2, targeting: 'self', tags: ['Projectile', 'Sustained', 'Crit'], glyph: '❈', element: 'shadow',
  text: 'For 3s the air itself is made of knives. They remember every wound.',
  effects: [{ type: 'sustained', dur: 3, tick: 0.25, do: { proj: { dmg: 8, speed: 680, radius: 5, count: 6, ring: true, critChance: 0.3 } } }] });

// ═══ COLORLESS ═══ the glue — engines that respect the slower rhythm ═══

card({ id: 'draw', name: 'Draw', school: 'Colorless', cat: 'Engine', rarity: 'Common',
  cost: 0, channel: 0.3, targeting: 'none', tags: ['Draw'], glyph: '⎘', element: 'gold',
  text: 'Draw one card into the queue. Grants no Flow.',
  effects: [{ type: 'draw', n: 1 }] });

card({ id: 'extend', name: 'Extend', school: 'Colorless', cat: 'Engine', rarity: 'Uncommon',
  cost: 1, channel: 0.4, targeting: 'none', tags: ['Power', 'Duration'], glyph: '⟢', element: 'gold',
  text: 'Your active Powers last 4 seconds longer.',
  effects: [{ type: 'extendPower', sec: 4 }] });

card({ id: 'quickcast', name: 'Quickcast', school: 'Colorless', cat: 'Modifier', rarity: 'Common',
  cost: 1, channel: 0.3, targeting: 'none', tags: ['Channel'], glyph: '➾', element: 'gold',
  text: 'The next Spell channels 50% faster but loses 20% power.',
  effects: [{ type: 'mod', match: { cat: 'Spell' }, buff: { channelMult: 0.5, dmgMult: 0.8 } }] });

card({ id: 'grand_channel', name: 'Grand Channel', school: 'Colorless', cat: 'Modifier', rarity: 'Uncommon',
  cost: 2, channel: 0.4, targeting: 'none', tags: ['Channel'], glyph: '⌖', element: 'gold',
  text: 'The next Spell channels 60% longer but gains +70% power and +25% area.',
  effects: [{ type: 'mod', match: { cat: 'Spell' }, buff: { channelMult: 1.6, dmgMult: 1.7, radiusMult: 1.25 } }] });

card({ id: 'duplicate', name: 'Duplicate', school: 'Colorless', cat: 'Engine', rarity: 'Uncommon',
  cost: 2, channel: 0.4, targeting: 'none', tags: ['Duplicate'], glyph: '⧠', element: 'gold',
  text: 'Copy the next card in the queue. The copy costs 1 more Flow.',
  effects: [{ type: 'queueOp', op: 'duplicateNext' }] });

card({ id: 'flush_queue', name: 'Flush Queue', school: 'Colorless', cat: 'Engine', rarity: 'Rare',
  cost: 3, channel: 0.7, targeting: 'none', tags: ['Queue'], glyph: '⇶', element: 'gold',
  text: 'Golden energy floods the queue: the queued cards channel at triple speed, while Flow lasts.',
  effects: [{ type: 'queueOp', op: 'flush' }] });

card({ id: 'echo', name: 'Echo', school: 'Colorless', cat: 'Engine', rarity: 'Uncommon',
  cost: 2, channel: 0.4, targeting: 'none', tags: ['Repeat'], glyph: '⟳', element: 'gold',
  text: 'Return the last resolved card to the queue at +1 Flow cost.',
  effects: [{ type: 'queueOp', op: 'echoLast' }] });

card({ id: 'battery', name: 'Battery', school: 'Colorless', cat: 'Engine', rarity: 'Common',
  cost: 1, channel: 0.6, targeting: 'none', tags: ['Flow'], glyph: '♼', element: 'gold',
  text: 'Store momentum: gain 5 Flow over 3 seconds.',
  effects: [{ type: 'flowOverTime', amount: 5, dur: 3 }] });

card({ id: 'shuffle', name: 'Shuffle', school: 'Colorless', cat: 'Engine', rarity: 'Common',
  cost: 1, channel: 0.3, targeting: 'none', tags: ['Deck'], glyph: '♺', element: 'gold',
  text: 'Immediately shuffle the discard pile back into the deck.',
  effects: [{ type: 'queueOp', op: 'shuffleAll' }] });

card({ id: 'purge', name: 'Purge', school: 'Colorless', cat: 'Engine', rarity: 'Uncommon',
  cost: 1, channel: 0.4, targeting: 'none', tags: ['Queue'], glyph: '⌫', element: 'gold',
  text: 'Discard the current queue; gain half its total Flow cost back.',
  effects: [{ type: 'queueOp', op: 'purge' }] });

card({ id: 'overload', name: 'Overload', school: 'Colorless', cat: 'Modifier', rarity: 'Uncommon',
  cost: 2, channel: 0.4, targeting: 'none', tags: ['Risk'], glyph: '⚶', element: 'gold',
  text: 'The next Spell costs double Flow but deals 120% more damage in a wider area.',
  effects: [{ type: 'mod', match: { cat: 'Spell' }, buff: { costMult: 2, dmgMult: 2.2, radiusMult: 1.3 } }] });

card({ id: 'stabilize', name: 'Stabilize', school: 'Colorless', cat: 'Engine', rarity: 'Common',
  cost: 1, channel: 0.4, targeting: 'none', tags: ['Defense'], glyph: '⚖', element: 'gold',
  text: 'Gain 5 Armor — or 16 if a Power is active.',
  effects: [{ type: 'stabilize', low: 5, high: 16 }] });

card({ id: 'momentum', name: 'Momentum', school: 'Colorless', cat: 'Trigger', rarity: 'Uncommon',
  cost: 2, channel: 0.5, targeting: 'none', tags: ['Flow', 'Trigger'], glyph: '∞', element: 'gold',
  text: 'For 30s: whenever a card finishes, gain 1 Flow if you are near enemies.',
  effects: [{ type: 'enchant', dur: 30, on: ['cardResolved'], do: { flowIfNear: 1 } }] });

card({ id: 'grand_flush', name: 'Grand Flush', school: 'Colorless', cat: 'Engine', rarity: 'Legendary',
  cost: 6, channel: 1.2, targeting: 'none', tags: ['Queue', 'Legendary'], glyph: '☩', element: 'gold',
  text: 'Channel briefly, then the entire queue channels at triple speed for half Flow cost.',
  effects: [{ type: 'queueOp', op: 'flush', costMult: 0.5 }] });

// ═══ WORLD II — THE EMBER WASTES ═══ obtained only once you reach it ═══

card({ id: 'phoenix_attunement', name: 'Phoenix Attunement', school: 'Mage', cat: 'Power', rarity: 'Uncommon', world: 2,
  cost: 3, channel: 0.6, dur: 8, targeting: 'none', tags: ['Fire', 'Attunement'], glyph: '🜂', element: 'fire',
  text: 'For 8s your bolts become phoenix fire: bigger blasts, deeper Burn.',
  effects: [{ type: 'power', dur: 8, power: { basicOverride: { dmg: 12, speed: 520, radius: 8, explode: { r: 90, dmg: 9 }, status: ['burn', 2], element: 'fire' } } }] });

card({ id: 'solar_lance', name: 'Solar Lance', school: 'Mage', cat: 'Spell', sub: 'AoE', rarity: 'Rare', world: 2,
  cost: 4, channel: 1.6, targeting: 'nearest', tags: ['Fire', 'Pierce'], glyph: '☀', element: 'fire',
  text: 'Channel a lance of dawn, then pierce everything in a line.',
  effects: [{ type: 'proj', dmg: 46, speed: 900, radius: 10, pierce: 99, status: ['burn', 2] }] });

card({ id: 'cinder_storm', name: 'Cinder Storm', school: 'Mage', cat: 'Spell', sub: 'Sustained', rarity: 'Uncommon', world: 2,
  cost: 4, channel: 0.9, targeting: 'nearest', tags: ['Fire', 'Sustained'], glyph: '✹', element: 'fire',
  text: 'For 3s, a storm of embers sprays toward your enemies.',
  effects: [{ type: 'sustained', dur: 3, tick: 0.22, do: { proj: { dmg: 6, speed: 400, radius: 6, spread: 0.9, life: 1.2, status: ['burn', 1] } } }] });

card({ id: 'ash_veil', name: 'Ash Veil', school: 'Mage', cat: 'Skill', rarity: 'Common', world: 2,
  cost: 2, channel: 0.5, targeting: 'self', tags: ['Defense', 'Utility'], glyph: '♒', element: 'shadow',
  text: 'A cloak of ash follows you, slowing enemies. Gain 10 Armor.',
  effects: [{ type: 'zone', r: 140, duration: 3.5, tickDmg: 0, tickRate: 0.5, slow: 0.5, follow: true }, { type: 'armor', amount: 10 }] });

card({ id: 'magma_stance', name: 'Magma Stance', school: 'Warrior', cat: 'Power', rarity: 'Uncommon', world: 2,
  cost: 3, channel: 0.5, dur: 7, targeting: 'none', tags: ['Fire', 'Melee', 'Stance'], glyph: '♨', element: 'fire',
  text: 'For 7s your swings arc wider, hit harder, and set flesh alight.',
  effects: [{ type: 'power', dur: 7, power: { arcMult: 1.4, dmgMult: 1.2, addStatus: ['burn', 2], element: 'fire' } }] });

card({ id: 'eruption', name: 'Eruption', school: 'Warrior', cat: 'Spell', sub: 'AoE', rarity: 'Rare', world: 2,
  cost: 4, channel: 1.9, targeting: 'self', preview: { r: 175 }, tags: ['Fire', 'AoE'], glyph: '⛰', element: 'fire',
  text: 'The ground splits and the mountain answers: heavy damage, Burn, and a blastwave.',
  effects: [{ type: 'aoe', r: 175, dmg: 48, status: ['burn', 3], knockback: 200, shake: 15 }] });

card({ id: 'molten_charge', name: 'Molten Charge', school: 'Warrior', cat: 'Skill', rarity: 'Uncommon', world: 2,
  cost: 2, channel: 0.5, dur: 8, targeting: 'self', tags: ['Movement', 'Dash', 'Fire'], glyph: '➶', element: 'fire',
  text: 'For 8s your Dash becomes Molten Charge: drag enemies through fire.',
  effects: [{ type: 'dashOverride', dur: 8, move: { kind: 'charge', dist: 260, dmg: 20, gather: 140, status: ['burn', 2], cd: 1.0 } }] });

card({ id: 'tempered_will', name: 'Tempered Will', school: 'Warrior', cat: 'Skill', rarity: 'Common', world: 2,
  cost: 2, channel: 0.5, targeting: 'self', tags: ['Defense', 'Flow'], glyph: '⚒', element: 'gold',
  text: 'Forge yourself anew: gain 18 Armor and 3 Flow over 2 seconds.',
  effects: [{ type: 'armor', amount: 18 }, { type: 'flowOverTime', amount: 3, dur: 2 }] });

card({ id: 'ember_blades', name: 'Ember Blades', school: 'Rogue', cat: 'Power', rarity: 'Uncommon', world: 2,
  cost: 3, channel: 0.5, dur: 7, targeting: 'none', tags: ['Fire', 'Stance'], glyph: '🜏', element: 'fire',
  text: 'For 7s: knives fly 20% faster, burn on hit, and crit more often.',
  effects: [{ type: 'power', dur: 7, power: { basicOverride: { dmg: 6, speed: 820, radius: 4, critChance: 0.18, status: ['burn', 1], element: 'fire' }, rateMult: 0.8 } }] });

card({ id: 'firetrap', name: 'Firetrap', school: 'Rogue', cat: 'Skill', rarity: 'Uncommon', world: 2,
  cost: 2, channel: 0.5, targeting: 'self', tags: ['Trap', 'Fire'], glyph: '⚸', element: 'fire',
  text: 'A buried ember charge: snaps shut with fire on the first enemy in.',
  effects: [{ type: 'trap', arm: 0.6, r: 95, dmg: 30, root: 1, status: ['burn', 3], ttl: 25 }] });

card({ id: 'mirage_storm', name: 'Mirage Storm', school: 'Rogue', cat: 'Spell', sub: 'Sustained', rarity: 'Rare', world: 2,
  cost: 4, channel: 1.0, targeting: 'self', tags: ['Projectile', 'Sustained'], glyph: '❂', element: 'fire',
  text: 'For 2.4s, waves of mirage knives shimmer out in every direction.',
  effects: [{ type: 'sustained', dur: 2.4, tick: 0.4, do: { proj: { dmg: 9, speed: 640, radius: 5, count: 10, ring: true, critChance: 0.25 } } }] });

card({ id: 'ash_bomb', name: 'Ash Bomb', school: 'Rogue', cat: 'Skill', rarity: 'Common', world: 2,
  cost: 2, channel: 0.6, targeting: 'self', preview: { r: 140 }, tags: ['Fire', 'AoE'], glyph: '♒', element: 'fire',
  text: 'A smothering cloud of hot ash: slows and singes everything inside.',
  effects: [{ type: 'zone', r: 140, duration: 4, tickDmg: 5, tickRate: 0.5, slow: 0.6, status: ['burn', 1] }] });

card({ id: 'gilded_engine', name: 'Gilded Engine', school: 'Colorless', cat: 'Engine', rarity: 'Uncommon', world: 2,
  cost: 1, channel: 0.5, targeting: 'none', tags: ['Flow', 'Draw'], glyph: '⚙', element: 'gold',
  text: 'Gain 4 Flow over 1.5s and draw one card.',
  effects: [{ type: 'flowOverTime', amount: 4, dur: 1.5 }, { type: 'draw', n: 1 }] });

card({ id: 'phoenix_echo', name: 'Phoenix Echo', school: 'Colorless', cat: 'Trigger', rarity: 'Uncommon', world: 2,
  cost: 2, channel: 0.5, targeting: 'none', tags: ['Power', 'Trigger'], glyph: '🜂', element: 'gold',
  text: 'For 30s: whenever a Power expires, gain 3 Flow from its ashes.',
  effects: [{ type: 'enchant', dur: 30, on: ['powerExpired'], do: { flow: 3 } }] });

card({ id: 'transmute', name: 'Transmute', school: 'Colorless', cat: 'Engine', rarity: 'Common', world: 2,
  cost: 1, channel: 0.4, targeting: 'none', tags: ['Draw'], glyph: '☿', element: 'gold',
  text: 'Draw two cards into the queue. Grants no Flow.',
  effects: [{ type: 'draw', n: 2 }] });

card({ id: 'worldheart', name: 'Worldheart', school: 'Colorless', cat: 'Engine', rarity: 'Rare', world: 2,
  cost: 3, channel: 0.7, targeting: 'none', tags: ['Defense', 'Flow'], glyph: '❂', element: 'gold',
  text: 'Draw on the realm itself: 15 Armor and 6 Flow over 4 seconds.',
  effects: [{ type: 'armor', amount: 15 }, { type: 'flowOverTime', amount: 6, dur: 4 }] });

card({ id: 'worldfire', name: 'Worldfire', school: 'Colorless', cat: 'Spell', sub: 'AoE', rarity: 'Legendary', world: 2,
  cost: 6, channel: 2.0, targeting: 'self', preview: { r: 240 }, tags: ['Fire', 'AoE', 'Flow'], glyph: '☩', element: 'fire',
  text: 'Set the realm itself alight: a vast burning field, and 6 Flow as it feeds you.',
  effects: [{ type: 'zone', r: 240, duration: 6, tickDmg: 9, tickRate: 0.5, status: ['burn', 1] }, { type: 'flowOverTime', amount: 6, dur: 6 }] });

export const CARDS = Object.fromEntries(C.map(c => [c.id, c]));
export const CARD_LIST = C;

export const ATTUNEMENT_IDS = ['flame_attunement', 'frost_attunement', 'storm_attunement'];

// ── Starting decks per class ──
export const STARTING_DECKS = {
  mage: ['flame_attunement', 'flame_attunement', 'frost_nova', 'arc_lightning',
    'mana_burst', 'teleport', 'frost_attunement', 'draw', 'battery', 'quickcast'],
  warrior: ['cleaving_stance', 'cleaving_stance', 'charge', 'whirlwind',
    'shield_wall', 'thunder_hammer', 'iron_skin', 'draw', 'battery', 'stabilize'],
  rogue: ['poisoned_blades', 'poisoned_blades', 'trap_card', 'fan_of_knives',
    'shadowstep', 'smoke_bomb', 'deathmark', 'draw', 'battery', 'quickcast'],
};

// ── Relics ── permanent run modifiers ──
export const RELICS = {
  golden_quill: { id: 'golden_quill', name: 'Golden Quill', glyph: '✒', color: '#ffd97a',
    text: 'Whenever the queue empties, draw one card.',
    enchant: { on: ['queueEmpty'], do: { draw: 1 } } },
  ember_seal: { id: 'ember_seal', name: 'Ember Seal', glyph: '❉', color: '#ff8a4a',
    text: 'Applying Burn has a 25% chance to grant 1 Flow.',
    enchant: { on: ['statusApplied'], filter: { status: 'burn' }, chance: 0.25, do: { flow: 1 } } },
  astral_battery: { id: 'astral_battery', name: 'Astral Battery', glyph: '♾', color: '#8fd8ff',
    text: 'Maximum Flow increased by 4.',
    stats: { maxFlow: 4 } },
  assassins_needle: { id: 'assassins_needle', name: "Assassin's Needle", glyph: '⸸', color: '#8ade6a',
    text: 'When a Poisoned enemy dies, your next card channels 50% faster.',
    enchant: { on: ['enemyKilled'], filter: { hasStatus: 'poison' }, do: { nextChannelMult: 0.5 } } },
  cracked_hourglass: { id: 'cracked_hourglass', name: 'Cracked Hourglass', glyph: '⌛', color: '#e8dcc0',
    text: 'Channel times +25%, but AoE radius +35%.',
    stats: { channelMult: 1.25, radiusMult: 1.35 } },
  duelists_glove: { id: 'duelists_glove', name: "Duelist's Glove", glyph: '✊', color: '#d05648',
    text: 'Warrior cards deal 60% more damage while the queue holds at most 1 card.',
    stats: { duelist: true } },
  eternal_sigil: { id: 'eternal_sigil', name: 'Eternal Sigil', glyph: '⟢', color: '#b48cff',
    text: 'Your Powers last 30% longer.',
    stats: { powerDurMult: 1.3 } },
  prismatic_codex: { id: 'prismatic_codex', name: 'Prismatic Codex', glyph: '❂', color: '#8fb8ff',
    text: 'Card drafts may offer cards from every school.',
    stats: { crossClass: true } },
};

// ── Enemies ── corrupted arcana of the cursed realm ──
export const ENEMIES = {
  wisp: { id: 'wisp', name: 'Ink Wisp', role: 'swarm', hp: 14, speed: 118, radius: 13,
    dmg: 8, behavior: 'chase', color: '#3f3560', glow: '#8f6fff', shards: 1 },
  sentinel: { id: 'sentinel', name: 'Glyph Sentinel', role: 'sniper', hp: 24, speed: 72, radius: 16,
    dmg: 10, behavior: 'ranged', range: 320, fireRate: 2.3, projSpeed: 250, color: '#2c3a55', glow: '#8fd8ff', shards: 1 },
  horror: { id: 'horror', name: 'Tome Horror', role: 'exploder', hp: 18, speed: 132, radius: 15,
    dmg: 22, behavior: 'exploder', fuse: 1.0, boomR: 95, color: '#4a2635', glow: '#ff8a4a', shards: 1 },
  knight: { id: 'knight', name: 'Cursed Knight', role: 'tank', hp: 60, speed: 55, radius: 21,
    dmg: 14, behavior: 'lunge', lungeRange: 180, lungeTel: 0.65, lungeSpeed: 460, color: '#23283d', glow: '#c23b4a', shards: 2 },
  custodian: { id: 'custodian', name: 'Gilded Custodian', role: 'elite', hp: 210, speed: 62, radius: 28,
    dmg: 18, behavior: 'lunge', lungeRange: 210, lungeTel: 0.7, lungeSpeed: 520,
    waveEvery: 5, waveR: 170, waveTel: 1.0, waveDmg: 16,
    elite: true, color: '#3a3020', glow: '#ffd97a', shards: 6 },
  guardian: { id: 'guardian', name: 'Awoken Guardian', role: 'elite', hp: 320, speed: 66, radius: 30,
    dmg: 20, behavior: 'lunge', lungeRange: 230, lungeTel: 0.75, lungeSpeed: 540,
    waveEvery: 4.5, waveR: 190, waveTel: 1.1, waveDmg: 18,
    elite: true, color: '#26203a', glow: '#b48cff', shards: 10 },
  librarian: { id: 'librarian', name: 'The Gilded Librarian', role: 'boss', hp: 950, speed: 40, radius: 34,
    dmg: 16, behavior: 'boss', boss: true, color: '#231a38', glow: '#ffd97a', shards: 12 },
  book: { id: 'book', name: 'Cursed Book', role: 'minion', hp: 8, speed: 168, radius: 11,
    dmg: 9, behavior: 'chase', color: '#402d20', glow: '#ff8a4a', shards: 0 },

  // ── World II: The Ember Wastes — harder mechanics ──
  imp: { id: 'imp', name: 'Ember Imp', role: 'swarm', hp: 20, speed: 150, radius: 12,
    dmg: 9, behavior: 'chase', deathBurst: { r: 70, dmg: 8 }, color: '#4a2418', glow: '#ff8a4a', shards: 1 },
  mortar: { id: 'mortar', name: 'Magma Maw', role: 'artillery', hp: 40, speed: 40, radius: 18,
    dmg: 16, behavior: 'mortar', range: 640, fireRate: 3.2, mortarR: 110, mortarTel: 1.4,
    color: '#3a1c12', glow: '#ffb347', shards: 2 },
  stalker: { id: 'stalker', name: 'Ash Stalker', role: 'assassin', hp: 34, speed: 175, radius: 14,
    dmg: 13, behavior: 'stalker', color: '#241a20', glow: '#a98fe0', shards: 2 },
  cinder_knight: { id: 'cinder_knight', name: 'Cinder Knight', role: 'tank', hp: 85, speed: 60, radius: 22,
    dmg: 16, behavior: 'lunge', lungeRange: 190, lungeTel: 0.6, lungeSpeed: 500, lungeChain: 1,
    color: '#33141a', glow: '#ff5d3a', shards: 3 },
  pyre_custodian: { id: 'pyre_custodian', name: 'Pyre Custodian', role: 'elite', hp: 340, speed: 64, radius: 29,
    dmg: 20, behavior: 'lunge', lungeRange: 220, lungeTel: 0.65, lungeSpeed: 540,
    waveEvery: 4.5, waveR: 180, waveTel: 1.0, waveDmg: 20, summonEvery: 8, summonId: 'imp',
    elite: true, color: '#3a2012', glow: '#ffb347', shards: 8 },
  sovereign: { id: 'sovereign', name: 'The Cinder Sovereign', role: 'boss', hp: 1500, speed: 44, radius: 36,
    dmg: 20, behavior: 'boss', boss: true, minion: 'imp', color: '#33140f', glow: '#ff8a4a', shards: 18 },
};

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
};
export const BIOME_IDS = ['archive', 'ashen', 'verdant', 'umbral'];

// ── Worlds ── five realms of increasing cruelty. World 1–2 have full content;
// 3–5 are declared (names, scaling) and reuse World 2 sets until authored.
const W2_TIERS = [
  { id: 'imp', minThreat: 0, w: 10 }, { id: 'mortar', minThreat: 0, w: 4 },
  { id: 'stalker', minThreat: 2.5, w: 4 }, { id: 'cinder_knight', minThreat: 3.4, w: 3 },
  { id: 'pyre_custodian', minThreat: 5.5, w: 1 },
];
const W2_BIOMES = ['cinder', 'obsidian', 'sulfur', 'pyre'];
export const WORLDS = [
  { num: 1, name: 'THE SUNKEN REALM', sub: 'World I', sky: '#05060f',
    biomes: BIOME_IDS, boss: 'librarian', threatMult: 1,
    tiers: [
      { id: 'wisp', minThreat: 0, w: 10 }, { id: 'sentinel', minThreat: 1.4, w: 5 },
      { id: 'horror', minThreat: 1.9, w: 4 }, { id: 'knight', minThreat: 2.8, w: 3 },
      { id: 'custodian', minThreat: 4.5, w: 1 },
    ] },
  { num: 2, name: 'THE EMBER WASTES', sub: 'World II', sky: '#0c0505',
    biomes: W2_BIOMES, boss: 'sovereign', threatMult: 1.9, tiers: W2_TIERS },
  { num: 3, name: 'THE DROWNED COURTS', sub: 'World III', sky: '#04080c',
    biomes: W2_BIOMES, boss: 'sovereign', threatMult: 2.9, tiers: W2_TIERS },
  { num: 4, name: 'THE HOLLOW CHOIR', sub: 'World IV', sky: '#080410',
    biomes: W2_BIOMES, boss: 'sovereign', threatMult: 4.1, tiers: W2_TIERS },
  { num: 5, name: 'THE LAST ARCANUM', sub: 'World V', sky: '#0a0803',
    biomes: W2_BIOMES, boss: 'sovereign', threatMult: 5.5, tiers: W2_TIERS },
];

// ── Rival souls ── simulated player encounters ──
export const RIVAL_ADJECTIVES = ['Ravenous', 'Hollow', 'Gilded', 'Whispering', 'Ashen',
  'Feral', 'Umbral', 'Wandering', 'Silent', 'Forsaken', 'Radiant', 'Grim'];
