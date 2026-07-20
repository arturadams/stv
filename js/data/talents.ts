import type { ClassId, TalentDefinition } from './types.js';

export const CLASS_BRANCHES: Record<ClassId, readonly [string, string, string]> = {
  mage: ['Fire', 'Frost', 'Arcane'],
  warrior: ['Berserker', 'Duelist', 'Breaker'],
  rogue: ['Assassin', 'Venom', 'Trickster'],
  necromancer: ['Legion', 'Bonecraft', 'Sacrifice'],
  druid: ['Predator', 'Guardian', 'Grove'],
  warlock: ['Hellfire', 'Affliction', 'Demon Pact'],
};

const talents: TalentDefinition[] = [
  { id: 'mage_fire_cinder', name: 'Cinder Doctrine', classId: 'mage', branch: 'Fire', text: 'Fire effects apply 1 additional Burn stack.', keywords: ['Fire', 'Burn'], effect: { statusBonus: ['burn', 1] } },
  { id: 'mage_frost_conduction', name: 'Frozen Conduction', classId: 'mage', branch: 'Frost', text: 'Frost cards deal 15% increased damage.', keywords: ['Frost'], effect: { cardDamageMult: 1.15 } },
  { id: 'mage_arcane_resonance', name: 'Arcane Resonance', classId: 'mage', branch: 'Arcane', text: 'Arcane cards deal 15% increased damage.', keywords: ['Arcane'], effect: { cardDamageMult: 1.15 } },
  { id: 'mage_vitality', name: 'Vitality', classId: 'mage', branch: 'General', text: 'Gain 10 Maximum Health.', keywords: ['General'], effect: { maxHealth: 10 } },

  { id: 'warrior_berserker_fury', name: 'Relentless Fury', classId: 'warrior', branch: 'Berserker', text: 'Berserker cards deal 15% increased damage.', keywords: ['Berserker'], effect: { cardDamageMult: 1.15 } },
  { id: 'warrior_duelist_measure', name: 'Measured Violence', classId: 'warrior', branch: 'Duelist', text: 'Duelist cards deal 15% increased damage.', keywords: ['Duelist'], effect: { cardDamageMult: 1.15 } },
  { id: 'warrior_breaker_force', name: 'Seismic Follow-through', classId: 'warrior', branch: 'Breaker', text: 'Breaker and Impact cards deal 15% increased damage.', keywords: ['Breaker', 'Impact'], effect: { cardDamageMult: 1.15 } },
  { id: 'warrior_vitality', name: 'Vitality', classId: 'warrior', branch: 'General', text: 'Gain 10 Maximum Health.', keywords: ['General'], effect: { maxHealth: 10 } },

  { id: 'rogue_assassin_opening', name: 'Prepared Opening', classId: 'rogue', branch: 'Assassin', text: 'Assassin cards deal 15% increased damage.', keywords: ['Assassin'], effect: { cardDamageMult: 1.15 } },
  { id: 'rogue_venom_alchemy', name: 'Virulent Alchemy', classId: 'rogue', branch: 'Venom', text: 'Poison effects apply 1 additional Poison stack.', keywords: ['Venom', 'Poison'], effect: { statusBonus: ['poison', 1] } },
  { id: 'rogue_trickster_scheme', name: 'Layered Scheme', classId: 'rogue', branch: 'Trickster', text: 'Trickster cards deal 15% increased damage.', keywords: ['Trickster'], effect: { cardDamageMult: 1.15 } },
  { id: 'rogue_vitality', name: 'Vitality', classId: 'rogue', branch: 'General', text: 'Gain 10 Maximum Health.', keywords: ['General'], effect: { maxHealth: 10 } },

  { id: 'necromancer_legion_drill', name: 'Deathless Drill', classId: 'necromancer', branch: 'Legion', text: 'Legion and Minion cards deal 15% increased damage.', keywords: ['Legion', 'Minion'], effect: { cardDamageMult: 1.15 } },
  { id: 'necromancer_bonecraft_edge', name: 'Ossuary Edge', classId: 'necromancer', branch: 'Bonecraft', text: 'Bonecraft cards deal 15% increased damage.', keywords: ['Bonecraft'], effect: { cardDamageMult: 1.15 } },
  { id: 'necromancer_sacrifice_return', name: 'Profitable Death', classId: 'necromancer', branch: 'Sacrifice', text: 'Sacrifice cards deal 15% increased damage.', keywords: ['Sacrifice'], effect: { cardDamageMult: 1.15 } },
  { id: 'necromancer_vitality', name: 'Vitality', classId: 'necromancer', branch: 'General', text: 'Gain 10 Maximum Health.', keywords: ['General'], effect: { maxHealth: 10 } },

  { id: 'druid_predator_instinct', name: 'Pack Instinct', classId: 'druid', branch: 'Predator', text: 'Predator and Wolf cards deal 15% increased damage.', keywords: ['Predator', 'Wolf'], effect: { cardDamageMult: 1.15 } },
  { id: 'druid_guardian_patience', name: 'Ancient Patience', classId: 'druid', branch: 'Guardian', text: 'Guardian cards deal 15% increased damage.', keywords: ['Guardian'], effect: { cardDamageMult: 1.15 } },
  { id: 'druid_grove_memory', name: 'Memory of Roots', classId: 'druid', branch: 'Grove', text: 'Grove cards deal 15% increased damage.', keywords: ['Grove'], effect: { cardDamageMult: 1.15 } },
  { id: 'druid_vitality', name: 'Vitality', classId: 'druid', branch: 'General', text: 'Gain 10 Maximum Health.', keywords: ['General'], effect: { maxHealth: 10 } },

  { id: 'warlock_hellfire_brand', name: 'Brand of Ruin', classId: 'warlock', branch: 'Hellfire', text: 'Hellfire effects apply 1 additional Burn stack.', keywords: ['Hellfire', 'Burn'], effect: { statusBonus: ['burn', 1] } },
  { id: 'warlock_affliction_sentence', name: 'Lingering Sentence', classId: 'warlock', branch: 'Affliction', text: 'Affliction and Curse cards deal 15% increased damage.', keywords: ['Affliction', 'Curse'], effect: { cardDamageMult: 1.15 } },
  { id: 'warlock_demon_contract', name: 'Favorable Contract', classId: 'warlock', branch: 'Demon Pact', text: 'Demon and Pact cards deal 15% increased damage.', keywords: ['Demon', 'Pact'], effect: { cardDamageMult: 1.15 } },
  { id: 'warlock_vitality', name: 'Vitality', classId: 'warlock', branch: 'General', text: 'Gain 10 Maximum Health.', keywords: ['General'], effect: { maxHealth: 10 } },
];

export const TALENT_LIST = talents;
export const TALENTS: Record<string, TalentDefinition> =
  Object.fromEntries(talents.map((talent) => [talent.id, talent]));
