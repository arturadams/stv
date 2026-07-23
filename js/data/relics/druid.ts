import type { RelicDef } from '../types.js';

// ═══ Druid relics ═══ design doc §8 — keep 11 + revised Storm Shepherd
// (§8.1, implemented directly in js/sim/entities/sustains.ts's pulse
// handling since it needs to react to a specific card's per-tick pulse and
// the player's live zone list, neither of which fits the enchant system
// cleanly — the same reasoning as The Black Star/Pilgrim's Spur living in
// resolveCard instead of as a declarative enchant).
export const DRUID_RELICS = {
  // ── Predator ──
  alpha_instinct: {
    id: 'alpha_instinct', name: 'Alpha Instinct', glyph: '◁', color: '#7fd6a8',
    category: 'class', classId: 'druid', branch: 'Predator',
    text: 'A boss Health threshold crossed while no other enemies are nearby extends your active Aspect by up to 4 seconds.',
    bespoke: true,
  },
  hunters_moon: {
    id: 'hunters_moon', name: "Hunter's Moon", glyph: '☾', color: '#8fb8ff',
    category: 'class', classId: 'druid', branch: 'Predator',
    text: 'Defeating a boss restores 1 Spirit.',
    enchant: { on: ['enemyKilled'], filter: { boss: true }, do: { flow: 1 } },
  },
  pack_alpha: {
    id: 'pack_alpha', name: 'Pack Alpha', glyph: '♞', color: '#7fd6a8',
    category: 'class', classId: 'druid', branch: 'Predator',
    text: "Pack Hunt's wolves deal 20% increased damage.",
  },

  // ── Guardian ──
  ancient_bark: {
    id: 'ancient_bark', name: 'Ancient Bark', glyph: '♧', color: '#8b6b4a',
    category: 'class', classId: 'druid', branch: 'Guardian',
    text: 'Reduce all damage taken by 10%, subject to your combined damage-reduction cap.',
    stats: { damageReductionFlat: 0.1 },
  },
  overflowing_sap: {
    id: 'overflowing_sap', name: 'Overflowing Sap', glyph: '♣', color: '#7fd6a8',
    category: 'class', classId: 'druid', branch: 'Guardian',
    text: 'Gain 20 Armor whenever you rest at a Sanctuary.',
    stats: { sanctuaryArmor: 20 },
  },
  bears_wrath: {
    id: 'bears_wrath', name: "Bear's Wrath", glyph: '◆', color: '#8b6b4a',
    category: 'class', classId: 'druid', branch: 'Guardian',
    text: 'While Bear Aspect is active, taking damage knocks back nearby enemies (bosses resist it). Internal cooldown 3 seconds.',
    bespoke: true,
  },

  // ── Grove ──
  living_forest: {
    id: 'living_forest', name: 'Living Forest', glyph: '⌘', color: '#7fd6a8',
    category: 'class', classId: 'druid', branch: 'Grove',
    text: 'Killing a Rooted enemy (or a boss crossing a Health threshold) deals 14 damage to nearby enemies. Internal cooldown 1.5 seconds.',
    bespoke: true,
  },
  natures_cycle: {
    id: 'natures_cycle', name: "Nature's Cycle", glyph: '❦', color: '#8ade6a',
    category: 'class', classId: 'druid', branch: 'Grove',
    text: 'Standing in your own zone extends it, up to 3 additional seconds per zone.',
    bespoke: true,
  },
  storm_shepherd: {
    id: 'storm_shepherd', name: 'Storm Shepherd', glyph: '◌', color: '#ffe066',
    category: 'class', classId: 'druid', branch: 'Grove',
    text: 'Hurricane pulses deal 12 additional Lightning damage to enemies standing in one of your Grove zones. Every 3rd empowered pulse restores 1 Spirit.',
  },

  // ── Flexible ──
  four_seasons: {
    id: 'four_seasons', name: 'Four Seasons', glyph: '❧', color: '#d9b45b',
    category: 'class', classId: 'druid', branch: 'Flexible',
    text: 'The first Aspect card you cast each encounter grants 8 Armor.',
    bespoke: true,
  },
  emerald_heart: {
    id: 'emerald_heart', name: 'Emerald Heart', glyph: '♥', color: '#7fd6a8',
    category: 'class', classId: 'druid', branch: 'Flexible',
    text: 'A Power expiring grants 10 Armor.',
    enchant: { on: ['powerExpired'], do: { armorFlat: 10 } },
  },
  wild_communion: {
    id: 'wild_communion', name: 'Wild Communion', glyph: '☘', color: '#8ade6a',
    category: 'class', classId: 'druid', branch: 'Flexible',
    text: "Pack Hunt's wolves and World Tree's zone last 20% longer.",
  },
} satisfies Record<string, RelicDef>;
