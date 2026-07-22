// Relic design doc §7.1: a coarse family tag per summon-granting card, used
// by relics that react to summon type (e.g. "demons", "wolves") without
// keying off individual card ids. Kept as a lookup table rather than a field
// on every card def since only a handful of cards grant summons.
export type SummonFamily = 'servant' | 'shade' | 'clone' | 'wolf' | 'demon' | 'familiar';

export const SUMMON_FAMILY_BY_CARD_ID: Record<string, SummonFamily> = {
  raise_dead: 'servant',
  army_of_the_dead: 'shade',
  shadow_clone: 'clone',
  pack_hunt: 'wolf',
  lesser_familiar: 'familiar',
  infernal_gate: 'demon',
};

export function summonFamilyOf(cardId: string): SummonFamily {
  return SUMMON_FAMILY_BY_CARD_ID[cardId] || 'clone';
}
