import type { RelicDef } from '../types.js';

// ═══ Mage relics ═══ design doc §4 — keep all 12. Several rely on
// resolveCard ownership checks (js/sim/effects/index.ts) or bus listeners
// (js/sim/effects/relicMechanics.ts) rather than declarative enchant/stats,
// simplified from the doc's exact per-category tables where the underlying
// mechanic (rune systems, boss telegraph pacing) would need disproportionate
// new infrastructure for a single relic.
export const MAGE_RELICS = {
  // ── Fire ──
  phoenix_ember: {
    id: 'phoenix_ember', name: 'Phoenix Ember', glyph: '☄', color: '#ff8a4a',
    category: 'class', classId: 'mage', branch: 'Fire',
    text: 'Whenever a Burn reaches 5 stacks, it detonates for 20 damage in a 70-radius burst. Once per target.',
    enchant: { on: ['statusApplied'], filter: { status: 'burn' }, do: { explodeAtStacks: { status: 'burn', threshold: 5, dmg: 20, r: 70, element: 'fire' } } },
  },
  cinder_script: {
    id: 'cinder_script', name: 'Cinder Script', glyph: '✎', color: '#ff5d3a',
    category: 'class', classId: 'mage', branch: 'Fire',
    text: 'Fire Signatures deal 15% increased damage.',
  },
  ashen_recursion: {
    id: 'ashen_recursion', name: 'Ashen Recursion', glyph: '♻', color: '#d9b45b',
    category: 'class', classId: 'mage', branch: 'Fire',
    text: 'A Burning enemy that dies restores 1 Mana. A Burning boss crossing a Health threshold does too.',
    enchant: [
      { on: ['enemyKilled'], filter: { hasStatus: 'burn' }, do: { flow: 1 } },
      { on: ['bossHealthThreshold'], filter: { hasStatus: 'burn' }, do: { flow: 1 } },
    ],
  },

  // ── Frost ──
  shatterstone: {
    id: 'shatterstone', name: 'Shatterstone', glyph: '❄', color: '#8fd8ff',
    category: 'class', classId: 'mage', branch: 'Frost',
    text: 'Killing a Chilled enemy shatters it for 16 damage to nearby enemies.',
    enchant: { on: ['enemyKilled'], filter: { hasStatus: 'chill' }, do: { burst: { r: 90, dmg: 16, element: 'frost' } } },
  },
  crystal_memory: {
    id: 'crystal_memory', name: 'Crystal Memory', glyph: '◆', color: '#8fb8ff',
    category: 'class', classId: 'mage', branch: 'Frost',
    text: 'Applying Chill restores 1 Mana. Internal cooldown 1.5 seconds.',
    bespoke: true,
  },
  endless_winter: {
    id: 'endless_winter', name: 'Endless Winter', glyph: '❆', color: '#8fd8ff',
    category: 'class', classId: 'mage', branch: 'Frost',
    text: 'Chilling a boss stacks Frostbite (max 5), slowing it up to 10%.',
    bespoke: true,
  },

  // ── Arcane ──
  leyline_core: {
    id: 'leyline_core', name: 'Leyline Core', glyph: '⚜', color: '#b48cff',
    category: 'class', classId: 'mage', branch: 'Arcane',
    text: 'Maximum Flow +3.',
    stats: { maxFlow: 3 },
  },
  echo_crystal: {
    id: 'echo_crystal', name: 'Echo Crystal', glyph: '◈', color: '#b48cff',
    category: 'class', classId: 'mage', branch: 'Arcane',
    text: 'Every 5th Signature repeats at 40% power. Legendary Signatures are excluded.',
    enchant: { on: ['cardResolved'], filter: { cat: 'Signature', notRarity: 'Legendary' }, do: { stackAndEcho: { max: 5, label: 'ECHO', powerMult: 0.4 } } },
  },
  astral_observatory: {
    id: 'astral_observatory', name: 'Astral Observatory', glyph: '✦', color: '#8fb8ff',
    category: 'class', classId: 'mage', branch: 'Arcane',
    text: 'The 3rd unique Signature cast in an encounter grants 2 Flow. Resets each encounter.',
    bespoke: true,
  },

  // ── Flexible ──
  arcane_compass: {
    id: 'arcane_compass', name: "Arcane Compass", glyph: '⊛', color: '#8fd8ff',
    category: 'class', classId: 'mage', branch: 'Flexible',
    text: "Teleport's range is increased by 25%.",
  },
  prism_crown: {
    id: 'prism_crown', name: 'Prism Crown', glyph: '❂', color: '#8fb8ff',
    category: 'class', classId: 'mage', branch: 'Flexible',
    text: 'Touching Fire, Frost, and Arcane cards in the same encounter each grant +5% card damage, max +15%.',
    bespoke: true,
  },
  archmage_focus: {
    id: 'archmage_focus', name: "Archmage's Focus", glyph: '✧', color: '#e8dcc0',
    category: 'class', classId: 'mage', branch: 'Flexible',
    text: 'The first card you cast each encounter costs no Mana.',
  },
} satisfies Record<string, RelicDef>;
