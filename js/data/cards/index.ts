import type { CardDef, ClassId } from '../types.js';
import { MAGE_CARDS } from './mage.js';
import { WARRIOR_CARDS } from './warrior.js';
import { ROGUE_CARDS } from './rogue.js';
import { NECROMANCER_CARDS } from './necromancer.js';
import { DRUID_CARDS } from './druid.js';
import { WARLOCK_CARDS } from './warlock.js';
import { COLORLESS_CARDS } from './colorless.js';
import { WORLD2_CARDS } from './world2.js';
import { WORLD3_CARDS } from './world3.js';
import { WORLD4_CARDS } from './world4.js';

const cards: CardDef[] = [
  ...MAGE_CARDS,
  ...WARRIOR_CARDS,
  ...ROGUE_CARDS,
  ...NECROMANCER_CARDS,
  ...DRUID_CARDS,
  ...WARLOCK_CARDS,
  ...COLORLESS_CARDS,
  ...WORLD2_CARDS,
  ...WORLD3_CARDS,
  ...WORLD4_CARDS,
];

export const CARDS: Record<string, CardDef> =
  Object.fromEntries(cards.map((card) => [card.id, card]));
export const CARD_LIST = cards;
export const ATTUNEMENT_IDS = [
  'flame_attunement',
  'frost_attunement',
  'storm_attunement',
];

// ── Starting decks per class ──
export const STARTING_DECKS = {
  mage: ['flame_attunement', 'flame_attunement', 'frost_nova', 'arc_lightning',
    'mana_burst', 'teleport', 'frost_attunement', 'draw', 'battery', 'quickcast'],
  warrior: ['cleaving_stance', 'cleaving_stance', 'charge', 'whirlwind',
    'shield_wall', 'thunder_hammer', 'iron_skin', 'draw', 'battery', 'stabilize'],
  rogue: ['poisoned_blades', 'poisoned_blades', 'trap_card', 'fan_of_knives',
    'shadowstep', 'smoke_bomb', 'deathmark', 'draw', 'battery', 'quickcast'],
  necromancer: ['bone_legion', 'bone_legion', 'raise_dead', 'plague_ground',
    'bone_spear', 'grave_grasp', 'grave_miasma', 'draw', 'battery', 'quickcast'],
  druid: ['wolf_aspect', 'wolf_aspect', 'entangling_roots', 'hurricane',
    'pounce', 'barkskin', 'bear_aspect', 'draw', 'battery', 'quickcast'],
  warlock: ['fel_infusion', 'fel_infusion', 'shadow_barrage', 'hellfire',
    'demon_skin', 'fear', 'cursed_bolts', 'draw', 'battery', 'quickcast'],
} satisfies Record<ClassId, readonly string[]>;
