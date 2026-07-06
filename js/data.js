// ── Arcana Engine · data layer ─────────────────────────────────────────────
// Cards, relics, enemies, encounters. Everything is data; behavior lives in
// the effect resolver (world.js). No card has one-off hardcoded logic.

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

const C = []; // card list, built below
function card(def) { C.push(def); return def; }

// ── Mage ── area control, delayed spells, elements, channel manipulation ──
card({ id: 'magic_missile', name: 'Magic Missile', school: 'Mage', cat: 'Action', rarity: 'Common',
  cost: 1, channel: 0.3, targeting: 'nearest', tags: ['Arcane', 'Projectile'], glyph: '✦', element: 'arcane',
  text: 'Launch a swift bolt of pure arcana at the nearest enemy.',
  effects: [{ type: 'proj', dmg: 8, speed: 720, radius: 6 }] });

card({ id: 'fireball', name: 'Fireball', school: 'Mage', cat: 'Action', rarity: 'Common',
  cost: 2, channel: 0.45, targeting: 'nearest', tags: ['Fire', 'Projectile', 'Spell'], glyph: '☄', element: 'fire',
  text: 'Hurl a blazing orb that explodes on impact and applies Burn.',
  effects: [{ type: 'proj', dmg: 14, speed: 520, radius: 9, explode: { r: 80, dmg: 9 }, status: ['burn', 2] }] });

card({ id: 'frost_nova', name: 'Frost Nova', school: 'Mage', cat: 'Action', rarity: 'Common',
  cost: 3, channel: 0.9, targeting: 'self', preview: { r: 160 }, tags: ['Frost', 'AoE', 'Control'], glyph: '❆', element: 'frost',
  text: 'A ring of hoarfrost erupts around you, freezing everything it touches.',
  effects: [{ type: 'aoe', r: 160, dmg: 10, freeze: 1.7 }] });

card({ id: 'arc_lightning', name: 'Arc Lightning', school: 'Mage', cat: 'Action', rarity: 'Common',
  cost: 2, channel: 0.5, targeting: 'nearest', tags: ['Lightning', 'Chain', 'Spell'], glyph: '↯', element: 'lightning',
  text: 'Lightning leaps from the nearest enemy to up to 4 others.',
  effects: [{ type: 'chain', dmg: 13, jumps: 4, range: 190 }] });

card({ id: 'meteor', name: 'Meteor', school: 'Mage', cat: 'Action', rarity: 'Rare',
  cost: 5, channel: 2.2, targeting: 'nearest', preview: { r: 150 }, tags: ['Fire', 'AoE', 'Spell'], glyph: '✹', element: 'fire',
  text: 'A long channel. Where the circle burns, the sky falls. Heavy damage and Burn.',
  effects: [{ type: 'aoe', r: 150, dmg: 62, status: ['burn', 3], shake: 14 }] });

card({ id: 'blizzard', name: 'Blizzard', school: 'Mage', cat: 'Action', rarity: 'Uncommon',
  cost: 4, channel: 1.4, targeting: 'nearest', preview: { r: 140 }, tags: ['Frost', 'AoE', 'Persistent'], glyph: '❄', element: 'frost',
  text: 'Conjure a frozen storm that gnaws and chills all inside it.',
  effects: [{ type: 'zone', r: 140, duration: 4, tickDmg: 6, tickRate: 0.5, status: ['chill', 1] }] });

card({ id: 'arcane_orb', name: 'Arcane Orb', school: 'Mage', cat: 'Action', rarity: 'Uncommon',
  cost: 3, channel: 0.8, targeting: 'nearest', tags: ['Arcane', 'Orb'], glyph: '◉', element: 'arcane',
  text: 'A slow, inexorable orb drifts through everything in its path.',
  effects: [{ type: 'proj', dmg: 11, speed: 130, radius: 26, pierce: 99, life: 4.5, rehit: 0.55 }] });

card({ id: 'inferno', name: 'Inferno', school: 'Mage', cat: 'Action', rarity: 'Uncommon',
  cost: 3, channel: 1.2, targeting: 'nearest', preview: { r: 120 }, tags: ['Fire', 'Ground', 'Persistent'], glyph: '♨', element: 'fire',
  text: 'Ignite the ground itself. Enemies inside keep Burning.',
  effects: [{ type: 'zone', r: 120, duration: 3.5, tickDmg: 8, tickRate: 0.5, status: ['burn', 1] }] });

card({ id: 'mana_burst', name: 'Mana Burst', school: 'Mage', cat: 'Action', rarity: 'Common',
  cost: 2, channel: 0.6, targeting: 'self', preview: { r: 130 }, tags: ['Arcane', 'AoE', 'Flow'], glyph: '❋', element: 'arcane',
  text: 'A pulse of raw arcana. Gain 1 Flow for each enemy struck.',
  effects: [{ type: 'aoe', r: 130, dmg: 8, flowPerHit: 1 }] });

card({ id: 'teleport', name: 'Teleport', school: 'Mage', cat: 'Action', rarity: 'Common',
  cost: 1, channel: 0.2, targeting: 'self', tags: ['Movement', 'Arcane'], glyph: '✧', element: 'arcane',
  text: 'Fold space; reappear a short distance away from danger.',
  effects: [{ type: 'blink', dist: 250, away: true }] });

card({ id: 'pyromancy', name: 'Pyromancy', school: 'Mage', cat: 'Trigger', rarity: 'Uncommon',
  cost: 2, channel: 0.6, targeting: 'none', tags: ['Fire', 'Trigger'], glyph: '♕', element: 'fire',
  text: 'For 25s: whenever Burn is applied, a small burst of fire erupts there.',
  effects: [{ type: 'enchant', dur: 25, on: ['statusApplied'], filter: { status: 'burn' }, do: { burst: { r: 60, dmg: 6, element: 'fire' } } }] });

card({ id: 'spell_echo', name: 'Spell Echo', school: 'Mage', cat: 'Engine', rarity: 'Uncommon',
  cost: 2, channel: 0.5, targeting: 'none', tags: ['Spell', 'Engine'], glyph: '⧉', element: 'arcane',
  text: 'The next Mage Action resolves twice at 60% power.',
  effects: [{ type: 'mod', match: { school: 'Mage', cat: 'Action' }, buff: { repeat: 1, dmgMult: 0.6 } }] });

card({ id: 'time_warp', name: 'Time Warp', school: 'Mage', cat: 'Engine', rarity: 'Rare',
  cost: 2, channel: 0.3, targeting: 'none', tags: ['Channel', 'Engine'], glyph: '⌛', element: 'arcane',
  text: 'For 6s, all channeling runs at double speed.',
  effects: [{ type: 'haste', mult: 2, dur: 6 }] });

card({ id: 'rune_prison', name: 'Rune Prison', school: 'Mage', cat: 'Action', rarity: 'Uncommon',
  cost: 3, channel: 1.0, targeting: 'nearest', preview: { r: 130 }, tags: ['Control', 'AoE'], glyph: '⌘', element: 'arcane',
  text: 'A binding circle snaps shut, rooting every enemy inside.',
  effects: [{ type: 'aoe', r: 130, dmg: 8, root: 2.5 }] });

// ── Warrior ── melee arcs, armor, retaliation, close-range pressure ──
card({ id: 'cleave', name: 'Cleave', school: 'Warrior', cat: 'Action', rarity: 'Common',
  cost: 2, channel: 0.4, targeting: 'nearest', tags: ['Melee', 'Physical'], glyph: '⚔', element: 'physical',
  text: 'A wide spectral sword arc carves the space before you.',
  effects: [{ type: 'arc', dmg: 17, range: 120, arc: 130, knockback: 140 }] });

card({ id: 'charge', name: 'Charge', school: 'Warrior', cat: 'Action', rarity: 'Common',
  cost: 2, channel: 0.35, targeting: 'nearest', tags: ['Movement', 'Melee'], glyph: '➶', element: 'physical',
  text: 'Crash forward, damaging and scattering everything in your path.',
  effects: [{ type: 'dashAttack', dist: 260, dmg: 15, knockback: 220 }] });

card({ id: 'whirlwind', name: 'Whirlwind', school: 'Warrior', cat: 'Action', rarity: 'Common',
  cost: 3, channel: 0.8, targeting: 'self', preview: { r: 140 }, tags: ['Melee', 'AoE'], glyph: '✺', element: 'physical',
  text: 'Spin into a storm of steel around yourself.',
  effects: [{ type: 'aoe', r: 140, dmg: 21, knockback: 160 }] });

card({ id: 'shield_wall', name: 'Shield Wall', school: 'Warrior', cat: 'Action', rarity: 'Common',
  cost: 2, channel: 0.5, targeting: 'self', tags: ['Defense'], glyph: '⛨', element: 'gold',
  text: 'Raise a rampart of golden wards. Gain 25 Armor.',
  effects: [{ type: 'armor', amount: 25 }] });

card({ id: 'execute', name: 'Execute', school: 'Warrior', cat: 'Action', rarity: 'Uncommon',
  cost: 3, channel: 0.5, targeting: 'nearest', tags: ['Melee', 'Finisher'], glyph: '☠', element: 'physical',
  text: 'A merciless strike. Deals 3.5× damage to enemies below 35% health.',
  effects: [{ type: 'arc', dmg: 13, range: 120, arc: 90, executeBelow: 0.35, executeMult: 3.5 }] });

card({ id: 'throw_axe', name: 'Throw Axe', school: 'Warrior', cat: 'Action', rarity: 'Common',
  cost: 2, channel: 0.5, targeting: 'nearest', tags: ['Projectile', 'Physical'], glyph: '⚚', element: 'physical',
  text: 'Hurl a spinning axe that pierces enemies and returns to your hand.',
  effects: [{ type: 'proj', dmg: 13, speed: 480, radius: 14, pierce: 5, boomerang: true }] });

card({ id: 'battle_cry', name: 'Battle Cry', school: 'Warrior', cat: 'Modifier', rarity: 'Uncommon',
  cost: 2, channel: 0.5, targeting: 'none', tags: ['Buff'], glyph: '♯', element: 'gold',
  text: 'Your next 3 Warrior cards deal 50% more damage.',
  effects: [{ type: 'mod', match: { school: 'Warrior' }, count: 3, buff: { dmgMult: 1.5 } }] });

card({ id: 'rage', name: 'Rage', school: 'Warrior', cat: 'Trigger', rarity: 'Uncommon',
  cost: 2, channel: 0.6, targeting: 'none', tags: ['Flow', 'Trigger'], glyph: '♅', element: 'fire',
  text: 'For 25s: gain 1 Flow whenever you take damage or perfect dodge.',
  effects: [{ type: 'enchant', dur: 25, on: ['playerHit', 'perfectDodge'], do: { flow: 1 } }] });

card({ id: 'earthquake', name: 'Earthquake', school: 'Warrior', cat: 'Action', rarity: 'Rare',
  cost: 4, channel: 1.8, targeting: 'self', preview: { r: 190 }, tags: ['AoE', 'Stun'], glyph: '♁', element: 'physical',
  text: 'Long channel. The floor splits in a shockwave that stuns all around you.',
  effects: [{ type: 'aoe', r: 190, dmg: 36, stun: 1.5, shake: 16 }] });

card({ id: 'riposte', name: 'Riposte', school: 'Warrior', cat: 'Trigger', rarity: 'Uncommon',
  cost: 2, channel: 0.5, targeting: 'none', tags: ['Counter', 'Trigger'], glyph: '☍', element: 'physical',
  text: 'For 25s: after a perfect dodge, a counter slash strikes nearby enemies.',
  effects: [{ type: 'enchant', dur: 25, on: ['perfectDodge'], do: { counterArc: { dmg: 26, range: 140 } } }] });

card({ id: 'flaming_sword', name: 'Flaming Sword', school: 'Warrior', cat: 'Modifier', rarity: 'Uncommon',
  cost: 2, channel: 0.5, targeting: 'none', tags: ['Fire', 'Melee'], glyph: '⸸', element: 'fire',
  text: 'Your next 2 Melee cards also apply Burn.',
  effects: [{ type: 'mod', match: { tags: ['Melee'] }, count: 2, buff: { addStatus: ['burn', 2] } }] });

card({ id: 'thunder_hammer', name: 'Thunder Hammer', school: 'Warrior', cat: 'Action', rarity: 'Uncommon',
  cost: 3, channel: 0.9, targeting: 'nearest', tags: ['Lightning', 'Melee', 'AoE'], glyph: '⚒', element: 'lightning',
  text: 'A heavy strike that detonates into a stunning lightning shockwave.',
  effects: [{ type: 'arc', dmg: 22, range: 110, arc: 100 }, { type: 'aoe', r: 100, dmg: 12, stun: 0.6, atFacing: 90 }] });

card({ id: 'iron_skin', name: 'Iron Skin', school: 'Warrior', cat: 'Action', rarity: 'Common',
  cost: 1, channel: 0.3, targeting: 'self', tags: ['Defense'], glyph: '❖', element: 'gold',
  text: 'Your skin turns to living iron. Gain 12 Armor.',
  effects: [{ type: 'armor', amount: 12 }] });

card({ id: 'titanfall', name: 'Titanfall', school: 'Warrior', cat: 'Action', rarity: 'Legendary',
  cost: 6, channel: 2.0, targeting: 'self', preview: { r: 230 }, tags: ['Physical', 'AoE'], glyph: '♆', element: 'gold',
  text: 'Channel a colossal impact zone around you — then bring the sky down on it.',
  effects: [{ type: 'aoe', r: 230, dmg: 85, stun: 1.2, shake: 22 }] });

// ── Rogue ── speed, poison, crits, mobility, shadow ──
card({ id: 'throw_knife', name: 'Throw Knife', school: 'Rogue', cat: 'Action', rarity: 'Common',
  cost: 1, channel: 0.25, targeting: 'nearest', tags: ['Projectile', 'Physical'], glyph: '🜏', element: 'physical',
  text: 'A fast knife finds the nearest enemy. Can critically strike.',
  effects: [{ type: 'proj', dmg: 9, speed: 820, radius: 5, critChance: 0.15 }] });

card({ id: 'poison_dart', name: 'Poison Dart', school: 'Rogue', cat: 'Action', rarity: 'Common',
  cost: 1, channel: 0.35, targeting: 'nearest', tags: ['Poison', 'Projectile'], glyph: '☽', element: 'poison',
  text: 'A folded venomous needle. Applies 4 Poison.',
  effects: [{ type: 'proj', dmg: 5, speed: 640, radius: 5, status: ['poison', 4] }] });

card({ id: 'fan_of_knives', name: 'Fan of Knives', school: 'Rogue', cat: 'Action', rarity: 'Uncommon',
  cost: 3, channel: 0.6, targeting: 'self', tags: ['Projectile', 'AoE'], glyph: '✥', element: 'physical',
  text: 'Ten spectral knives burst outward in every direction.',
  effects: [{ type: 'proj', dmg: 8, speed: 600, radius: 5, count: 10, ring: true, critChance: 0.15 }] });

card({ id: 'blink', name: 'Blink', school: 'Rogue', cat: 'Action', rarity: 'Common',
  cost: 1, channel: 0.25, targeting: 'self', tags: ['Movement', 'Shadow'], glyph: '☾', element: 'shadow',
  text: 'Step through shadow. Briefly untargetable.',
  effects: [{ type: 'blink', dist: 210, away: true, untargetable: 0.6 }] });

card({ id: 'smoke_bomb', name: 'Smoke Bomb', school: 'Rogue', cat: 'Action', rarity: 'Uncommon',
  cost: 2, channel: 0.5, targeting: 'self', preview: { r: 150 }, tags: ['Utility', 'Shadow', 'AoE'], glyph: '♒', element: 'shadow',
  text: 'A choking cloud slows and confuses enemies inside it.',
  effects: [{ type: 'zone', r: 150, duration: 3.5, tickDmg: 0, slow: 0.45, follow: true }] });

card({ id: 'backstab', name: 'Backstab', school: 'Rogue', cat: 'Action', rarity: 'Uncommon',
  cost: 2, channel: 0.4, targeting: 'nearest', tags: ['Crit', 'Melee'], glyph: '⸙', element: 'shadow',
  text: 'A treacherous strike with a 50% critical chance.',
  effects: [{ type: 'arc', dmg: 18, range: 110, arc: 70, critChance: 0.5 }] });

card({ id: 'venom_cloud', name: 'Venom Cloud', school: 'Rogue', cat: 'Action', rarity: 'Uncommon',
  cost: 3, channel: 1.1, targeting: 'nearest', preview: { r: 130 }, tags: ['Poison', 'AoE', 'Persistent'], glyph: '♃', element: 'poison',
  text: 'A lingering cloud that steadily poisons everything within.',
  effects: [{ type: 'zone', r: 130, duration: 4, tickDmg: 4, tickRate: 0.5, status: ['poison', 1] }] });

card({ id: 'ambush', name: 'Ambush', school: 'Rogue', cat: 'Modifier', rarity: 'Common',
  cost: 1, channel: 0.3, targeting: 'none', tags: ['Crit'], glyph: '⚸', element: 'shadow',
  text: 'The next Rogue card gains +75% critical chance and 20% damage.',
  effects: [{ type: 'mod', match: { school: 'Rogue' }, buff: { critChance: 0.75, dmgMult: 1.2 } }] });

card({ id: 'toxic_reaction', name: 'Toxic Reaction', school: 'Rogue', cat: 'Trigger', rarity: 'Uncommon',
  cost: 2, channel: 0.6, targeting: 'none', tags: ['Poison', 'Trigger'], glyph: '☣', element: 'poison',
  text: 'For 30s: when a Poisoned enemy dies, its Poison spreads to nearby enemies.',
  effects: [{ type: 'enchant', dur: 30, on: ['enemyKilled'], filter: { hasStatus: 'poison' }, do: { spreadStatus: { status: 'poison', stacks: 3, r: 140 } } }] });

card({ id: 'serrated_edge', name: 'Serrated Edge', school: 'Rogue', cat: 'Modifier', rarity: 'Common',
  cost: 2, channel: 0.5, targeting: 'none', tags: ['Bleed'], glyph: '⌁', element: 'physical',
  text: 'Your next 3 Projectile or Melee cards also apply Bleed.',
  effects: [{ type: 'mod', match: { tags: ['Projectile', 'Melee'] }, count: 3, buff: { addStatus: ['bleed', 2] } }] });

card({ id: 'evasion', name: 'Evasion', school: 'Rogue', cat: 'Trigger', rarity: 'Uncommon',
  cost: 1, channel: 0.4, targeting: 'none', tags: ['Defense', 'Trigger'], glyph: '♞', element: 'shadow',
  text: 'For 25s: perfect dodges draw one card (but grant no Flow).',
  effects: [{ type: 'enchant', dur: 25, on: ['perfectDodge'], do: { draw: 1, noFlow: true } }] });

card({ id: 'deathmark', name: 'Deathmark', school: 'Rogue', cat: 'Modifier', rarity: 'Uncommon',
  cost: 2, channel: 0.4, targeting: 'nearest', tags: ['Execute'], glyph: '♰', element: 'shadow',
  text: 'Mark the nearest enemy for 8s. Marked enemies take 30% more damage.',
  effects: [{ type: 'mark', dur: 8, amp: 1.3 }] });

card({ id: 'knife_storm', name: 'Knife Storm', school: 'Rogue', cat: 'Action', rarity: 'Rare',
  cost: 5, channel: 1.6, targeting: 'self', preview: { r: 200 }, tags: ['Projectile', 'AoE'], glyph: '❂', element: 'shadow',
  text: 'Channel a wide circle, then release a hurricane of spectral knives.',
  effects: [{ type: 'proj', dmg: 10, speed: 640, radius: 5, count: 16, ring: true, critChance: 0.2 }, { type: 'aoe', r: 200, dmg: 12 }] });

card({ id: 'shadow_clone', name: 'Shadow Clone', school: 'Rogue', cat: 'Action', rarity: 'Rare',
  cost: 3, channel: 0.9, targeting: 'self', tags: ['Summon', 'Shadow'], glyph: '⚉', element: 'shadow',
  text: 'A clone of living shadow fights beside you for 8s, throwing knives.',
  effects: [{ type: 'summon', kind: 'clone', dur: 8, fireRate: 0.7, dmg: 7 }] });

// ── Colorless ── deck, queue, and Flow manipulation; the glue ──
card({ id: 'draw', name: 'Draw', school: 'Colorless', cat: 'Engine', rarity: 'Common',
  cost: 0, channel: 0.25, targeting: 'none', tags: ['Draw'], glyph: '⎘', element: 'gold',
  text: 'Draw one card into the queue. Grants no Flow.',
  effects: [{ type: 'draw', n: 1 }] });

card({ id: 'duplicate', name: 'Duplicate', school: 'Colorless', cat: 'Engine', rarity: 'Uncommon',
  cost: 2, channel: 0.4, targeting: 'none', tags: ['Duplicate'], glyph: '⧠', element: 'gold',
  text: 'Copy the next card in the queue.',
  effects: [{ type: 'queueOp', op: 'duplicateNext' }] });

card({ id: 'flush_queue', name: 'Flush Queue', school: 'Colorless', cat: 'Engine', rarity: 'Rare',
  cost: 3, channel: 0.7, targeting: 'none', tags: ['Queue'], glyph: '⇶', element: 'gold',
  text: 'Golden energy floods the queue: resolve every card, front to back, while Flow lasts.',
  effects: [{ type: 'queueOp', op: 'flush' }] });

card({ id: 'reverse_queue', name: 'Reverse Queue', school: 'Colorless', cat: 'Engine', rarity: 'Common',
  cost: 1, channel: 0.3, targeting: 'none', tags: ['Queue'], glyph: '⇌', element: 'gold',
  text: 'Reverse the order of the queue.',
  effects: [{ type: 'queueOp', op: 'reverse' }] });

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
  text: 'The next Action costs double Flow but deals 120% more damage in a wider area.',
  effects: [{ type: 'mod', match: { cat: 'Action' }, buff: { costMult: 2, dmgMult: 2.2, radiusMult: 1.3 } }] });

card({ id: 'quickcast', name: 'Quickcast', school: 'Colorless', cat: 'Modifier', rarity: 'Common',
  cost: 1, channel: 0.3, targeting: 'none', tags: ['Channel'], glyph: '➾', element: 'gold',
  text: 'The next card channels instantly at 70% power.',
  effects: [{ type: 'mod', match: {}, buff: { channelMult: 0, dmgMult: 0.7 } }] });

card({ id: 'ritual_circle', name: 'Ritual Circle', school: 'Colorless', cat: 'Modifier', rarity: 'Uncommon',
  cost: 2, channel: 0.4, targeting: 'none', tags: ['AoE'], glyph: '⊕', element: 'gold',
  text: 'The next AoE card: +50% radius, +20% damage, but 40% longer channel.',
  effects: [{ type: 'mod', match: { tags: ['AoE'] }, buff: { radiusMult: 1.5, dmgMult: 1.2, channelMult: 1.4 } }] });

card({ id: 'momentum', name: 'Momentum', school: 'Colorless', cat: 'Trigger', rarity: 'Uncommon',
  cost: 2, channel: 0.5, targeting: 'none', tags: ['Flow', 'Trigger'], glyph: '∞', element: 'gold',
  text: 'For 30s: whenever the queue empties, gain 2 Flow.',
  effects: [{ type: 'enchant', dur: 30, on: ['queueEmpty'], do: { flow: 2 } }] });

card({ id: 'stabilize', name: 'Stabilize', school: 'Colorless', cat: 'Engine', rarity: 'Common',
  cost: 1, channel: 0.4, targeting: 'none', tags: ['Defense'], glyph: '⚖', element: 'gold',
  text: 'Gain 6 Armor — or 20 if the queue holds 4 or more cards.',
  effects: [{ type: 'stabilize', low: 6, high: 20, threshold: 4 }] });

card({ id: 'grand_flush', name: 'Grand Flush', school: 'Colorless', cat: 'Engine', rarity: 'Legendary',
  cost: 6, channel: 1.2, targeting: 'none', tags: ['Queue', 'Legendary'], glyph: '☩', element: 'gold',
  text: 'Channel briefly, then resolve the entire queue at half Flow cost.',
  effects: [{ type: 'queueOp', op: 'flush', costMult: 0.5 }] });

export const CARDS = Object.fromEntries(C.map(c => [c.id, c]));
export const CARD_LIST = C;

export const STARTING_DECK = [
  'magic_missile', 'magic_missile', 'fireball', 'throw_knife', 'throw_knife',
  'poison_dart', 'cleave', 'shield_wall', 'battery', 'draw',
];

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
};

// ── Enemies ── corrupted arcana of the Astral Library ──
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
  librarian: { id: 'librarian', name: 'The Gilded Librarian', role: 'boss', hp: 950, speed: 40, radius: 34,
    dmg: 16, behavior: 'boss', boss: true, color: '#231a38', glow: '#ffd97a', shards: 0 },
  book: { id: 'book', name: 'Cursed Book', role: 'minion', hp: 8, speed: 168, radius: 11,
    dmg: 9, behavior: 'chase', color: '#402d20', glow: '#ff8a4a', shards: 0 },
};

// ── Encounters ── waves reference ENEMIES keys with counts ──
export const ENCOUNTERS = [
  { name: 'The Atrium', sub: 'Encounter I',
    waves: [
      [['wisp', 5]],
      [['wisp', 5], ['sentinel', 2]],
      [['wisp', 6], ['sentinel', 2], ['horror', 2]],
    ] },
  { name: 'The Restricted Wing', sub: 'Encounter II',
    waves: [
      [['wisp', 6], ['horror', 2]],
      [['knight', 2], ['sentinel', 3], ['wisp', 4]],
      [['custodian', 1], ['wisp', 6], ['horror', 2]],
    ] },
  { name: 'The Gilded Archive', sub: 'Final Encounter', boss: true,
    waves: [ [['librarian', 1]] ] },
];
