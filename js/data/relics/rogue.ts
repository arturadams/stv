import type { RelicDef } from '../types.js';

// ═══ Rogue relics ═══ design doc §6 — keep 11 + revised Black Veil.
export const ROGUE_RELICS = {
  // ── Assassin ──
  black_veil: {
    id: 'black_veil', name: 'Black Veil', glyph: '☾', color: '#2a1f3d',
    category: 'class', classId: 'rogue', branch: 'Assassin',
    text: "Shadowstep's dash leaves you untargetable for 1.5 seconds instead of 0.7. A critical hit shortly after against a Marked enemy restores 1 Focus.",
    bespoke: true,
  },
  killers_ledger: {
    id: 'killers_ledger', name: "Killer's Ledger", glyph: '✒', color: '#8b1e1e',
    category: 'class', classId: 'rogue', branch: 'Assassin',
    text: 'Killing a Marked enemy transfers the Mark, at 50% remaining duration, to the nearest enemy. Internal cooldown 2 seconds.',
    bespoke: true,
  },
  cold_calculation: {
    id: 'cold_calculation', name: 'Cold Calculation', glyph: '❄', color: '#8fd8ff',
    category: 'class', classId: 'rogue', branch: 'Assassin',
    text: 'Critical hits build a stack (max 5, decaying after 6s without one); each stack adds 4% Technique damage.',
    bespoke: true,
  },

  // ── Venom ──
  rotten_bloom: {
    id: 'rotten_bloom', name: 'Rotten Bloom', glyph: '☣', color: '#8ade6a',
    category: 'class', classId: 'rogue', branch: 'Venom',
    text: "A Poisoned enemy's death (or a Poisoned boss crossing a Health threshold) spreads 50% of its Poison stacks (max 4) to nearby enemies.",
    bespoke: true,
  },
  toxic_overflow: {
    id: 'toxic_overflow', name: 'Toxic Overflow', glyph: '☠', color: '#8ade6a',
    category: 'class', classId: 'rogue', branch: 'Venom',
    text: 'Applying Poison has a 25% chance to apply an additional stack.',
    enchant: { on: ['statusApplied'], filter: { status: 'poison' }, chance: 0.25, do: { addStackToSelf: { status: 'poison', stacks: 1 } } },
  },
  venom_glands: {
    id: 'venom_glands', name: 'Venom Glands', glyph: '⚗', color: '#8ade6a',
    category: 'class', classId: 'rogue', branch: 'Venom',
    text: 'Hitting a Poisoned enemy deals bonus damage equal to double its Poison stacks. Once per target every 4 seconds.',
    bespoke: true,
  },

  // ── Trickster ──
  endless_smoke: {
    id: 'endless_smoke', name: 'Endless Smoke', glyph: '♒', color: '#9a8fae',
    category: 'class', classId: 'rogue', branch: 'Trickster',
    text: "Smoke Bomb's cloud lasts 5 seconds longer.",
  },
  master_trapper: {
    id: 'master_trapper', name: 'Master Trapper', glyph: '⚸', color: '#d05648',
    category: 'class', classId: 'rogue', branch: 'Trickster',
    text: 'Springblade Trap deals 40% increased damage.',
  },
  mirror_dance: {
    id: 'mirror_dance', name: 'Mirror Dance', glyph: '⚉', color: '#8fb8ff',
    category: 'class', classId: 'rogue', branch: 'Trickster',
    text: 'While your Shadow Clone is active, your Techniques also repeat from it at 40% power.',
    bespoke: true,
  },

  // ── Flexible ──
  phantom_thread: {
    id: 'phantom_thread', name: 'Phantom Thread', glyph: '⸙', color: '#e8dcc0',
    category: 'class', classId: 'rogue', branch: 'Flexible',
    text: 'A recent critical hit refunds up to 1 Focus on your next card.',
    bespoke: true,
  },
  glass_needle: {
    id: 'glass_needle', name: 'Glass Needle', glyph: '⚊', color: '#e8dcc0',
    category: 'class', classId: 'rogue', branch: 'Flexible',
    text: 'A critical hit against an enemy below 30% Health deals 8 bonus damage. Internal cooldown 2 seconds.',
    bespoke: true,
  },
  loaded_dice: {
    id: 'loaded_dice', name: 'Loaded Dice', glyph: '⚅', color: '#d9b45b',
    category: 'class', classId: 'rogue', branch: 'Flexible',
    text: 'Every 7th direct hit empowers your next card with a guaranteed critical hit.',
    bespoke: true,
  },
} satisfies Record<string, RelicDef>;
