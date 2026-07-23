import type { CardDef, ClassId } from '../types.js';
import { CORE_CLASS_CARDS } from './corePacks.js';

export const CARDS: Record<string, CardDef> =
  Object.fromEntries(CORE_CLASS_CARDS.map((card) => [card.id, card]));
export const CARD_LIST = CORE_CLASS_CARDS;
export const CORE_CARD_LIST = CORE_CLASS_CARDS;
export const ATTUNEMENT_IDS: string[] = [];

export const STARTING_DECKS = {
  mage: ['flame_sigil', 'flame_wave', 'frost_nova', 'ice_lance',
    'arc_lightning', 'mana_burst', 'teleport', 'rune_prison'],
  warrior: ['cleaving_stance', 'whirlwind', 'riposte', 'execute',
    'charge', 'thunder_hammer', 'guarded_stance', 'war_cry'],
  rogue: ['shadowstep', 'deathmark', 'poisoned_blades', 'toxic_dart',
    'springblade_trap', 'smoke_bomb', 'backstab', 'fan_of_knives'],
  necromancer: ['raise_dead', 'grave_command', 'bone_spear', 'grave_grasp',
    'grave_miasma', 'dark_sacrifice', 'wraith_walk', 'deathly_pact'],
  druid: ['wolf_aspect', 'pounce', 'bear_aspect', 'renewal',
    'entangling_roots', 'hurricane', 'living_bark', 'moonlit_grove'],
  warlock: ['fel_infusion', 'hellfire', 'doom', 'life_drain',
    'blood_pact', 'lesser_familiar', 'fear', 'shadow_barrage'],
} satisfies Record<ClassId, readonly string[]>;
