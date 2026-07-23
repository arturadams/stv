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
  // ═══ Mage ═══
  { id: 'mage_fire_cinder', name: 'Cinder Doctrine', classId: 'mage', branch: 'Fire', text: 'Fire effects apply 1 additional Burn stack.', keywords: ['Fire', 'Burn'], effect: { statusBonus: ['burn', 1] } },
  { id: 'mage_fire_kindling', name: 'Kindling Focus', classId: 'mage', branch: 'Fire', text: 'Fire cards deal 12% increased damage.', keywords: ['Fire'], effect: { cardDamageMult: 1.12 } },
  { id: 'mage_fire_wildfire', name: 'Wildfire Bloom', classId: 'mage', branch: 'Fire', text: 'Burn effects apply 1 additional Burn stack.', keywords: ['Fire', 'Burn'], effect: { statusBonus: ['burn', 1] } },
  { id: 'mage_frost_conduction', name: 'Frozen Conduction', classId: 'mage', branch: 'Frost', text: 'Frost cards deal 15% increased damage.', keywords: ['Frost'], effect: { cardDamageMult: 1.15 } },
  { id: 'mage_frost_permafrost', name: 'Permafrost Doctrine', classId: 'mage', branch: 'Frost', text: 'Frost cards deal 10% increased damage.', keywords: ['Frost'], effect: { cardDamageMult: 1.1 } },
  { id: 'mage_frost_hoarfrost', name: 'Hoarfrost Mastery', classId: 'mage', branch: 'Frost', text: 'Frost cards deal 12% increased damage.', keywords: ['Frost'], effect: { cardDamageMult: 1.12 } },
  { id: 'mage_arcane_resonance', name: 'Arcane Resonance', classId: 'mage', branch: 'Arcane', text: 'Arcane cards deal 15% increased damage.', keywords: ['Arcane'], effect: { cardDamageMult: 1.15 } },
  { id: 'mage_arcane_convergence', name: 'Arcane Convergence', classId: 'mage', branch: 'Arcane', text: 'Arcane cards deal 10% increased damage.', keywords: ['Arcane'], effect: { cardDamageMult: 1.1 } },
  { id: 'mage_arcane_focus', name: 'Focused Casting', classId: 'mage', branch: 'Arcane', text: 'Arcane cards deal 12% increased damage.', keywords: ['Arcane'], effect: { cardDamageMult: 1.12 } },
  { id: 'mage_vitality', name: 'Vitality', classId: 'mage', branch: 'General', text: 'Gain 10 Maximum Health.', keywords: ['General'], effect: { maxHealth: 10 } },
  { id: 'mage_vitality_2', name: 'Hardened Constitution', classId: 'mage', branch: 'General', text: 'Gain 14 Maximum Health.', keywords: ['General'], effect: { maxHealth: 14 } },
  { id: 'mage_vitality_3', name: 'Undying Resolve', classId: 'mage', branch: 'General', text: 'Gain 18 Maximum Health.', keywords: ['General'], effect: { maxHealth: 18 } },

  // ═══ Warrior ═══
  { id: 'warrior_berserker_fury', name: 'Relentless Fury', classId: 'warrior', branch: 'Berserker', text: 'Berserker cards deal 15% increased damage.', keywords: ['Berserker'], effect: { cardDamageMult: 1.15 } },
  { id: 'warrior_berserker_bloodlust', name: 'Bloodlust', classId: 'warrior', branch: 'Berserker', text: 'Berserker cards deal 10% increased damage.', keywords: ['Berserker'], effect: { cardDamageMult: 1.1 } },
  { id: 'warrior_berserker_savagery', name: 'Savagery', classId: 'warrior', branch: 'Berserker', text: 'Berserker cards deal 12% increased damage.', keywords: ['Berserker'], effect: { cardDamageMult: 1.12 } },
  { id: 'warrior_duelist_measure', name: 'Measured Violence', classId: 'warrior', branch: 'Duelist', text: 'Duelist cards deal 15% increased damage.', keywords: ['Duelist'], effect: { cardDamageMult: 1.15 } },
  { id: 'warrior_duelist_precision', name: 'Precision Strikes', classId: 'warrior', branch: 'Duelist', text: 'Duelist cards deal 10% increased damage.', keywords: ['Duelist'], effect: { cardDamageMult: 1.1 } },
  { id: 'warrior_duelist_tempo', name: 'Dueling Tempo', classId: 'warrior', branch: 'Duelist', text: 'Duelist cards deal 12% increased damage.', keywords: ['Duelist'], effect: { cardDamageMult: 1.12 } },
  { id: 'warrior_breaker_force', name: 'Seismic Follow-through', classId: 'warrior', branch: 'Breaker', text: 'Breaker and Impact cards deal 15% increased damage.', keywords: ['Breaker', 'Impact'], effect: { cardDamageMult: 1.15 } },
  { id: 'warrior_breaker_momentum', name: 'Crushing Momentum', classId: 'warrior', branch: 'Breaker', text: 'Breaker and Impact cards deal 10% increased damage.', keywords: ['Breaker', 'Impact'], effect: { cardDamageMult: 1.1 } },
  { id: 'warrior_breaker_shatter', name: 'Shatterpoint', classId: 'warrior', branch: 'Breaker', text: 'Breaker and Impact cards deal 12% increased damage.', keywords: ['Breaker', 'Impact'], effect: { cardDamageMult: 1.12 } },
  { id: 'warrior_vitality', name: 'Vitality', classId: 'warrior', branch: 'General', text: 'Gain 10 Maximum Health.', keywords: ['General'], effect: { maxHealth: 10 } },
  { id: 'warrior_vitality_2', name: 'Hardened Constitution', classId: 'warrior', branch: 'General', text: 'Gain 14 Maximum Health.', keywords: ['General'], effect: { maxHealth: 14 } },
  { id: 'warrior_vitality_3', name: 'Undying Resolve', classId: 'warrior', branch: 'General', text: 'Gain 18 Maximum Health.', keywords: ['General'], effect: { maxHealth: 18 } },

  // ═══ Rogue ═══
  { id: 'rogue_assassin_opening', name: 'Prepared Opening', classId: 'rogue', branch: 'Assassin', text: 'Assassin cards deal 15% increased damage.', keywords: ['Assassin'], effect: { cardDamageMult: 1.15 } },
  { id: 'rogue_assassin_precision', name: 'Killing Precision', classId: 'rogue', branch: 'Assassin', text: 'Assassin cards deal 10% increased damage.', keywords: ['Assassin'], effect: { cardDamageMult: 1.1 } },
  { id: 'rogue_assassin_shadowcraft', name: 'Shadowcraft', classId: 'rogue', branch: 'Assassin', text: 'Assassin cards deal 12% increased damage.', keywords: ['Assassin'], effect: { cardDamageMult: 1.12 } },
  { id: 'rogue_venom_alchemy', name: 'Virulent Alchemy', classId: 'rogue', branch: 'Venom', text: 'Poison effects apply 1 additional Poison stack.', keywords: ['Venom', 'Poison'], effect: { statusBonus: ['poison', 1] } },
  { id: 'rogue_venom_potency', name: 'Concentrated Toxin', classId: 'rogue', branch: 'Venom', text: 'Venom cards deal 12% increased damage.', keywords: ['Venom'], effect: { cardDamageMult: 1.12 } },
  { id: 'rogue_venom_corruption', name: 'Corrosive Blend', classId: 'rogue', branch: 'Venom', text: 'Poison effects apply 1 additional Poison stack.', keywords: ['Venom', 'Poison'], effect: { statusBonus: ['poison', 1] } },
  { id: 'rogue_trickster_scheme', name: 'Layered Scheme', classId: 'rogue', branch: 'Trickster', text: 'Trickster cards deal 15% increased damage.', keywords: ['Trickster'], effect: { cardDamageMult: 1.15 } },
  { id: 'rogue_trickster_misdirection', name: 'Misdirection', classId: 'rogue', branch: 'Trickster', text: 'Trickster cards deal 10% increased damage.', keywords: ['Trickster'], effect: { cardDamageMult: 1.1 } },
  { id: 'rogue_trickster_flourish', name: 'Flourish', classId: 'rogue', branch: 'Trickster', text: 'Trickster cards deal 12% increased damage.', keywords: ['Trickster'], effect: { cardDamageMult: 1.12 } },
  { id: 'rogue_vitality', name: 'Vitality', classId: 'rogue', branch: 'General', text: 'Gain 10 Maximum Health.', keywords: ['General'], effect: { maxHealth: 10 } },
  { id: 'rogue_vitality_2', name: 'Hardened Constitution', classId: 'rogue', branch: 'General', text: 'Gain 14 Maximum Health.', keywords: ['General'], effect: { maxHealth: 14 } },
  { id: 'rogue_vitality_3', name: 'Undying Resolve', classId: 'rogue', branch: 'General', text: 'Gain 18 Maximum Health.', keywords: ['General'], effect: { maxHealth: 18 } },

  // ═══ Necromancer ═══
  { id: 'necromancer_legion_drill', name: 'Deathless Drill', classId: 'necromancer', branch: 'Legion', text: 'Legion and Minion cards deal 15% increased damage.', keywords: ['Legion', 'Minion'], effect: { cardDamageMult: 1.15 } },
  { id: 'necromancer_legion_command', name: 'Iron Discipline', classId: 'necromancer', branch: 'Legion', text: 'Legion and Minion cards deal 10% increased damage.', keywords: ['Legion', 'Minion'], effect: { cardDamageMult: 1.1 } },
  { id: 'necromancer_legion_swarm', name: 'Swarm Tactics', classId: 'necromancer', branch: 'Legion', text: 'Legion and Minion cards deal 12% increased damage.', keywords: ['Legion', 'Minion'], effect: { cardDamageMult: 1.12 } },
  { id: 'necromancer_bonecraft_edge', name: 'Ossuary Edge', classId: 'necromancer', branch: 'Bonecraft', text: 'Bonecraft cards deal 15% increased damage.', keywords: ['Bonecraft'], effect: { cardDamageMult: 1.15 } },
  { id: 'necromancer_bonecraft_shards', name: 'Splintering Shards', classId: 'necromancer', branch: 'Bonecraft', text: 'Bonecraft cards deal 10% increased damage.', keywords: ['Bonecraft'], effect: { cardDamageMult: 1.1 } },
  { id: 'necromancer_bonecraft_marrow', name: 'Marrow Craft', classId: 'necromancer', branch: 'Bonecraft', text: 'Bonecraft cards deal 12% increased damage.', keywords: ['Bonecraft'], effect: { cardDamageMult: 1.12 } },
  { id: 'necromancer_sacrifice_return', name: 'Profitable Death', classId: 'necromancer', branch: 'Sacrifice', text: 'Sacrifice cards deal 15% increased damage.', keywords: ['Sacrifice'], effect: { cardDamageMult: 1.15 } },
  { id: 'necromancer_sacrifice_toll', name: 'Blood Toll', classId: 'necromancer', branch: 'Sacrifice', text: 'Sacrifice cards deal 10% increased damage.', keywords: ['Sacrifice'], effect: { cardDamageMult: 1.1 } },
  { id: 'necromancer_sacrifice_bargain', name: 'Grim Bargain', classId: 'necromancer', branch: 'Sacrifice', text: 'Sacrifice cards deal 12% increased damage.', keywords: ['Sacrifice'], effect: { cardDamageMult: 1.12 } },
  { id: 'necromancer_vitality', name: 'Vitality', classId: 'necromancer', branch: 'General', text: 'Gain 10 Maximum Health.', keywords: ['General'], effect: { maxHealth: 10 } },
  { id: 'necromancer_vitality_2', name: 'Hardened Constitution', classId: 'necromancer', branch: 'General', text: 'Gain 14 Maximum Health.', keywords: ['General'], effect: { maxHealth: 14 } },
  { id: 'necromancer_vitality_3', name: 'Undying Resolve', classId: 'necromancer', branch: 'General', text: 'Gain 18 Maximum Health.', keywords: ['General'], effect: { maxHealth: 18 } },

  // ═══ Druid ═══
  { id: 'druid_predator_instinct', name: 'Pack Instinct', classId: 'druid', branch: 'Predator', text: 'Predator and Wolf cards deal 15% increased damage.', keywords: ['Predator', 'Wolf'], effect: { cardDamageMult: 1.15 } },
  { id: 'druid_predator_ferocity', name: 'Feral Ferocity', classId: 'druid', branch: 'Predator', text: 'Predator and Wolf cards deal 10% increased damage.', keywords: ['Predator', 'Wolf'], effect: { cardDamageMult: 1.1 } },
  { id: 'druid_predator_hunt', name: 'Relentless Hunt', classId: 'druid', branch: 'Predator', text: 'Predator and Wolf cards deal 12% increased damage.', keywords: ['Predator', 'Wolf'], effect: { cardDamageMult: 1.12 } },
  { id: 'druid_guardian_patience', name: 'Ancient Patience', classId: 'druid', branch: 'Guardian', text: 'Guardian cards deal 15% increased damage.', keywords: ['Guardian'], effect: { cardDamageMult: 1.15 } },
  { id: 'druid_guardian_bark', name: 'Living Bulwark', classId: 'druid', branch: 'Guardian', text: 'Guardian cards deal 10% increased damage.', keywords: ['Guardian'], effect: { cardDamageMult: 1.1 } },
  { id: 'druid_guardian_resolve', name: 'Stonebark Resolve', classId: 'druid', branch: 'Guardian', text: 'Guardian cards deal 12% increased damage.', keywords: ['Guardian'], effect: { cardDamageMult: 1.12 } },
  { id: 'druid_grove_memory', name: 'Memory of Roots', classId: 'druid', branch: 'Grove', text: 'Grove cards deal 15% increased damage.', keywords: ['Grove'], effect: { cardDamageMult: 1.15 } },
  { id: 'druid_grove_bloom', name: 'Verdant Bloom', classId: 'druid', branch: 'Grove', text: 'Grove cards deal 10% increased damage.', keywords: ['Grove'], effect: { cardDamageMult: 1.1 } },
  { id: 'druid_grove_tangle', name: 'Deepwood Tangle', classId: 'druid', branch: 'Grove', text: 'Grove cards deal 12% increased damage.', keywords: ['Grove'], effect: { cardDamageMult: 1.12 } },
  { id: 'druid_vitality', name: 'Vitality', classId: 'druid', branch: 'General', text: 'Gain 10 Maximum Health.', keywords: ['General'], effect: { maxHealth: 10 } },
  { id: 'druid_vitality_2', name: 'Hardened Constitution', classId: 'druid', branch: 'General', text: 'Gain 14 Maximum Health.', keywords: ['General'], effect: { maxHealth: 14 } },
  { id: 'druid_vitality_3', name: 'Undying Resolve', classId: 'druid', branch: 'General', text: 'Gain 18 Maximum Health.', keywords: ['General'], effect: { maxHealth: 18 } },

  // ═══ Warlock ═══
  { id: 'warlock_hellfire_brand', name: 'Brand of Ruin', classId: 'warlock', branch: 'Hellfire', text: 'Hellfire effects apply 1 additional Burn stack.', keywords: ['Hellfire', 'Burn'], effect: { statusBonus: ['burn', 1] } },
  { id: 'warlock_hellfire_wick', name: 'Slow Burn', classId: 'warlock', branch: 'Hellfire', text: 'Hellfire cards deal 12% increased damage.', keywords: ['Hellfire'], effect: { cardDamageMult: 1.12 } },
  { id: 'warlock_hellfire_ember', name: 'Ember Contract', classId: 'warlock', branch: 'Hellfire', text: 'Burn effects apply 1 additional Burn stack.', keywords: ['Hellfire', 'Burn'], effect: { statusBonus: ['burn', 1] } },
  { id: 'warlock_affliction_sentence', name: 'Lingering Sentence', classId: 'warlock', branch: 'Affliction', text: 'Affliction and Curse cards deal 15% increased damage.', keywords: ['Affliction', 'Curse'], effect: { cardDamageMult: 1.15 } },
  { id: 'warlock_affliction_decay', name: 'Creeping Decay', classId: 'warlock', branch: 'Affliction', text: 'Affliction and Curse cards deal 10% increased damage.', keywords: ['Affliction', 'Curse'], effect: { cardDamageMult: 1.1 } },
  { id: 'warlock_affliction_torment', name: 'Torment Weave', classId: 'warlock', branch: 'Affliction', text: 'Affliction and Curse cards deal 12% increased damage.', keywords: ['Affliction', 'Curse'], effect: { cardDamageMult: 1.12 } },
  { id: 'warlock_demon_contract', name: 'Favorable Contract', classId: 'warlock', branch: 'Demon Pact', text: 'Demon and Pact cards deal 15% increased damage.', keywords: ['Demon', 'Pact'], effect: { cardDamageMult: 1.15 } },
  { id: 'warlock_demon_binding', name: 'Binding Clause', classId: 'warlock', branch: 'Demon Pact', text: 'Demon and Pact cards deal 10% increased damage.', keywords: ['Demon', 'Pact'], effect: { cardDamageMult: 1.1 } },
  { id: 'warlock_demon_covenant', name: 'Blood Covenant', classId: 'warlock', branch: 'Demon Pact', text: 'Demon and Pact cards deal 12% increased damage.', keywords: ['Demon', 'Pact'], effect: { cardDamageMult: 1.12 } },
  { id: 'warlock_vitality', name: 'Vitality', classId: 'warlock', branch: 'General', text: 'Gain 10 Maximum Health.', keywords: ['General'], effect: { maxHealth: 10 } },
  { id: 'warlock_vitality_2', name: 'Hardened Constitution', classId: 'warlock', branch: 'General', text: 'Gain 14 Maximum Health.', keywords: ['General'], effect: { maxHealth: 14 } },
  { id: 'warlock_vitality_3', name: 'Undying Resolve', classId: 'warlock', branch: 'General', text: 'Gain 18 Maximum Health.', keywords: ['General'], effect: { maxHealth: 18 } },
];

export const TALENT_LIST = talents;
export const TALENTS: Record<string, TalentDefinition> =
  Object.fromEntries(talents.map((talent) => [talent.id, talent]));
