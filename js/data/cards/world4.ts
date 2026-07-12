import type { CardDef } from '../types.js';

const cards: CardDef[] = [];
function card(def: CardDef): CardDef { cards.push(def); return def; }

// ═══ WORLD IV — THE HOLLOW CHOIR ═══ obtained only once you reach it ═══
// The choir's gift is resonance: thunder that chains, blows that ring twice,
// and a beat of engineered silence when you need the world to stop.

card({ id: 'resonant_attunement', name: 'Resonant Attunement', school: 'Mage', cat: 'Power', rarity: 'Uncommon', world: 4,
  cost: 3, channel: 0.6, dur: 8, targeting: 'none', tags: ['Storm', 'Attunement'], glyph: '♫', element: 'lightning',
  text: 'For 8s your bolts are struck, not cast: each hit rings on into two nearby bodies.',
  effects: [{ type: 'power', dur: 8, power: { basicOverride: { dmg: 10, speed: 560, radius: 8, chainOnHit: { dmg: 6, jumps: 2, range: 160 }, element: 'lightning' } } }] });

card({ id: 'thunderclap', name: 'Thunderclap', school: 'Mage', cat: 'Spell', sub: 'AoE', rarity: 'Rare', world: 4,
  cost: 4, channel: 1.8, targeting: 'self', preview: { r: 180 }, tags: ['Storm', 'AoE'], glyph: '⚡', element: 'lightning',
  text: 'The loudest thing left in the world, delivered once: heavy damage and a stunned beat of silence.',
  effects: [{ type: 'aoe', r: 180, dmg: 42, stun: 0.8, knockback: 120, shake: 14 }] });

card({ id: 'standing_wave', name: 'Standing Wave', school: 'Mage', cat: 'Spell', sub: 'Sustained', rarity: 'Uncommon', world: 4,
  cost: 4, channel: 0.9, targeting: 'self', tags: ['Storm', 'Sustained'], glyph: '∿', element: 'lightning',
  text: 'For 3s you hold one note and the air keeps breaking on it: arcs leap to whoever is nearest.',
  effects: [{ type: 'sustained', dur: 3, tick: 0.5, do: { chain: { dmg: 9, jumps: 3, range: 180 } } }] });

card({ id: 'grace_note', name: 'Grace Note', school: 'Mage', cat: 'Skill', rarity: 'Common', world: 4,
  cost: 2, channel: 0.5, targeting: 'self', preview: { r: 130 }, tags: ['Storm', 'Draw'], glyph: '♪', element: 'lightning',
  text: 'One small note, perfectly placed: a crack of sound and the next card falls into your hand.',
  effects: [{ type: 'aoe', r: 130, dmg: 12, shake: 5 }, { type: 'draw', n: 1 }] });

card({ id: 'bellringer_stance', name: "Bellringer's Stance", school: 'Warrior', cat: 'Power', rarity: 'Uncommon', world: 4,
  cost: 3, channel: 0.5, dur: 7, targeting: 'none', tags: ['Storm', 'Melee', 'Stance'], glyph: '⚶', element: 'lightning',
  text: 'For 7s you swing like a struck bell: wider, harder, and the whole yard hears it.',
  effects: [{ type: 'power', dur: 7, power: { arcMult: 1.25, dmgMult: 1.3, element: 'lightning' } }] });

card({ id: 'ninefold_knell', name: 'Ninefold Knell', school: 'Warrior', cat: 'Spell', sub: 'AoE', rarity: 'Rare', world: 4,
  cost: 4, channel: 1.9, targeting: 'self', preview: { r: 175 }, tags: ['Storm', 'AoE'], glyph: '☩', element: 'lightning',
  text: 'You ring the ground itself: heavy damage, a stunned beat, and everything thrown off the note.',
  effects: [{ type: 'aoe', r: 175, dmg: 40, stun: 0.6, knockback: 220, shake: 15 }] });

card({ id: 'processional', name: 'Processional', school: 'Warrior', cat: 'Skill', rarity: 'Uncommon', world: 4,
  cost: 2, channel: 0.5, dur: 8, targeting: 'self', tags: ['Movement', 'Dash', 'Storm'], glyph: '➾', element: 'lightning',
  text: 'For 8s your Dash is a procession: the crowd is gathered up and carried down the aisle with you.',
  effects: [{ type: 'dashOverride', dur: 8, move: { kind: 'charge', dist: 300, dmg: 20, gather: 140, cd: 0.9 } }] });

card({ id: 'rebuke', name: 'Rebuke', school: 'Warrior', cat: 'Skill', rarity: 'Common', world: 4,
  cost: 2, channel: 0.5, targeting: 'self', tags: ['Defense', 'AoE'], glyph: '♏', element: 'physical',
  text: 'Answer before you are asked: 14 Armor, and everything within reach is shoved off the verse.',
  effects: [{ type: 'armor', amount: 14 }, { type: 'aoe', r: 120, dmg: 10, knockback: 200 }] });

card({ id: 'knife_canon', name: 'Knife Canon', school: 'Rogue', cat: 'Power', rarity: 'Uncommon', world: 4,
  cost: 3, channel: 0.5, dur: 7, targeting: 'none', tags: ['Storm', 'Stance'], glyph: '❖', element: 'lightning',
  text: 'For 7s your knives sing in canon: faster, keener, and every fourth throw answers itself.',
  effects: [{ type: 'power', dur: 7, power: { basicOverride: { dmg: 6, speed: 760, radius: 4, critChance: 0.15, element: 'lightning' }, rateMult: 0.85, extraEvery: 4 } }] });

card({ id: 'silent_snare', name: 'Silent Snare', school: 'Rogue', cat: 'Skill', rarity: 'Uncommon', world: 4,
  cost: 2, channel: 0.5, targeting: 'self', tags: ['Trap', 'Storm'], glyph: '⚸', element: 'shadow',
  text: 'A pocket of borrowed silence under the tiles: the first thing to break it is held for the verdict.',
  effects: [{ type: 'trap', arm: 0.6, r: 92, dmg: 25, root: 1.3, ttl: 25 }] });

card({ id: 'ricochet_aria', name: 'Ricochet Aria', school: 'Rogue', cat: 'Spell', sub: 'Sustained', rarity: 'Rare', world: 4,
  cost: 4, channel: 1.0, targeting: 'self', tags: ['Projectile', 'Sustained'], glyph: '☄', element: 'lightning',
  text: 'For 2.4s every knife leaves on the beat and comes back on the off-beat.',
  effects: [{ type: 'sustained', dur: 2.4, tick: 0.4, do: { proj: { dmg: 11, speed: 540, radius: 5, count: 2, boomerang: true, critChance: 0.2 } } }] });

card({ id: 'curtain_call', name: 'Curtain Call', school: 'Rogue', cat: 'Skill', rarity: 'Common', world: 4,
  cost: 2, channel: 0.4, targeting: 'self', tags: ['Movement', 'Flow'], glyph: '☽', element: 'shadow',
  text: 'Vanish into the applause: blink away untouchable, and take a bow worth 2 Flow.',
  effects: [{ type: 'blink', dist: 230, untargetable: 0.25 }, { type: 'flowOverTime', amount: 2, dur: 1 }] });

card({ id: 'call_and_answer', name: 'Call and Answer', school: 'Colorless', cat: 'Trigger', rarity: 'Uncommon', world: 4,
  cost: 2, channel: 0.5, targeting: 'none', tags: ['Trigger', 'Flow'], glyph: '≑', element: 'gold',
  text: 'For 30s: whenever a card resolves, the choir answers — gain 1 Flow.',
  effects: [{ type: 'enchant', dur: 30, on: ['cardResolved'], do: { flow: 1 } }] });

card({ id: 'the_grand_rest', name: 'The Grand Rest', school: 'Colorless', cat: 'Skill', rarity: 'Uncommon', world: 4,
  cost: 2, channel: 0.5, targeting: 'self', preview: { r: 150 }, tags: ['Control'], glyph: '𝄽', element: 'gold',
  text: 'One bar of silence, observed by everyone: everything near you holds perfectly still.',
  effects: [{ type: 'aoe', r: 150, dmg: 6, freeze: 1.0 }] });

card({ id: 'metronome', name: 'Metronome', school: 'Colorless', cat: 'Engine', rarity: 'Common', world: 4,
  cost: 1, channel: 0.4, targeting: 'none', tags: ['Flow'], glyph: '◭', element: 'gold',
  text: 'It keeps time so you don’t have to: 4 Flow, delivered strictly on the beat.',
  effects: [{ type: 'flowOverTime', amount: 4, dur: 4 }] });

card({ id: 'the_lost_chord', name: 'The Lost Chord', school: 'Colorless', cat: 'Spell', sub: 'AoE', rarity: 'Legendary', world: 4,
  cost: 6, channel: 2.0, targeting: 'self', preview: { r: 220 }, tags: ['Storm', 'AoE', 'Flow'], glyph: '𝄞', element: 'lightning',
  text: 'The note the choir died looking for. Play it once: the world stops arguing, and you draw two.',
  effects: [{ type: 'aoe', r: 220, dmg: 55, stun: 1.0, shake: 16 }, { type: 'draw', n: 2 }, { type: 'flowOverTime', amount: 4, dur: 3 }] });

export const WORLD4_CARDS = cards;
