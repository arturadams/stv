import { CARDS } from './index.js';
import type { CardDef } from './types.js';

// Relic design doc §11: a relic named here is only offered once its
// prerequisite mechanic is actually in the deck. Card-specific requirements
// are the documented exception to "prefer keywords" (§3.2) — reserved for
// relics that modify one unique mechanic (Teleport, Shadowstep, Shadow
// Clone, Smoke Bomb, Doom, Pack Hunt, Hurricane).
export interface RelicRequirement {
  anyCards?: readonly string[];
  anyKeywords?: readonly string[];
  minimumBranchCards?: { branch: string; count: number };
}

export const RELIC_REQUIREMENTS: Record<string, RelicRequirement> = {
  arcane_compass: { anyCards: ['teleport'] },
  black_veil: { anyCards: ['shadowstep'] },
  endless_smoke: { anyCards: ['smoke_bomb'] },
  mirror_dance: { anyCards: ['shadow_clone'] },
  pack_alpha: { anyCards: ['pack_hunt'] },
  storm_shepherd: { anyCards: ['hurricane'], minimumBranchCards: { branch: 'Grove', count: 1 } },
  dark_prophecy: { anyCards: ['doom'] },
  gatekeeper: { anyKeywords: ['Demon', 'Summon'] },
};

function cardKeywords(card: CardDef): readonly string[] {
  return card.keywords || card.tags || [];
}

function cardInBranch(card: CardDef, branch: string): boolean {
  return card.branch === branch || card.secondaryBranch === branch || cardKeywords(card).includes(branch);
}

export function relicRequirementMet(
  deckIds: readonly { id: string }[],
  relicId: string,
): boolean {
  const req = RELIC_REQUIREMENTS[relicId];
  if (!req) return true;
  const deckCards = deckIds
    .map((entry) => CARDS[entry.id])
    .filter((card): card is CardDef => !!card);

  if (req.anyCards) {
    const ids = new Set(deckIds.map((entry) => entry.id));
    if (!req.anyCards.some((id) => ids.has(id))) return false;
  }
  if (req.anyKeywords) {
    const has = deckCards.some((card) => req.anyKeywords!.some((k) => cardKeywords(card).includes(k)));
    if (!has) return false;
  }
  if (req.minimumBranchCards) {
    const { branch, count } = req.minimumBranchCards;
    const n = deckCards.filter((card) => cardInBranch(card, branch)).length;
    if (n < count) return false;
  }
  return true;
}
