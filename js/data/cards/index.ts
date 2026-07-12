import type { CardDef, ClassId } from '../types.js';
import { MAGE_CARDS } from './mage.js';
import { WARRIOR_CARDS } from './warrior.js';
import { ROGUE_CARDS } from './rogue.js';
import { COLORLESS_CARDS } from './colorless.js';
import { WORLD2_CARDS } from './world2.js';
import { WORLD3_CARDS } from './world3.js';
import { WORLD4_CARDS } from './world4.js';

const cards: CardDef[] = [
  ...MAGE_CARDS,
  ...WARRIOR_CARDS,
  ...ROGUE_CARDS,
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

// ── Fixed starting decks per class — Card System v2 (rework_cards.md) §15 ──
// No random rolls: every run of a class begins with exactly this 8-card hand.
export const STARTING_DECKS = {
  mage: ['mana_burst', 'mana_burst', 'frost_nova', 'frost_nova',
    'arc_lightning', 'teleport', 'rune_prison', 'arcane_mirror'],
  warrior: ['iron_skin', 'iron_skin', 'cleaving_stance', 'charge',
    'whirlwind', 'riposte', 'thunder_hammer', 'execute'],
  rogue: ['poisoned_blades', 'poisoned_blades', 'shadowstep', 'trap_card',
    'backstab', 'smoke_bomb', 'deathmark', 'fan_of_knives'],
} satisfies Record<ClassId, readonly string[]>;
