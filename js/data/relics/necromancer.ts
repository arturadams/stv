import type { RelicDef } from '../types.js';

// ═══ Necromancer relics ═══ design doc §7 — keep all 12. Several reuse the
// summon-family metadata built in Phase 1 (js/data/summonFamilies.ts) rather
// than keying off individual card ids.
export const NECROMANCER_RELICS = {
  // ── Legion ──
  endless_legion: {
    id: 'endless_legion', name: 'Endless Legion', glyph: '♙', color: '#8b1e1e',
    category: 'class', classId: 'necromancer', branch: 'Legion',
    text: 'Increase your standard servant cap by 1. Does not affect Army of the Dead.',
    stats: { summonCapBonus: 1 },
  },
  grave_commander: {
    id: 'grave_commander', name: 'Grave Commander', glyph: '♛', color: '#8b1e1e',
    category: 'class', classId: 'necromancer', branch: 'Legion',
    text: 'Each active servant grants 6% increased card damage, max 24%.',
  },
  bone_banner: {
    id: 'bone_banner', name: 'Bone Banner', glyph: '♟', color: '#e8dcc0',
    category: 'class', classId: 'necromancer', branch: 'Legion',
    text: 'Raising a standard servant restores 1 Soul.',
    enchant: { on: ['summonCreated'], filter: { summonFamily: 'servant', excludeRelicSummon: true }, do: { flow: 1 } },
  },

  // ── Bonecraft ──
  ossuary_core: {
    id: 'ossuary_core', name: 'Ossuary Core', glyph: '⌾', color: '#e8dcc0',
    category: 'class', classId: 'necromancer', branch: 'Bonecraft',
    text: 'Bonecraft projectiles pierce one additional enemy.',
  },
  marrow_storm: {
    id: 'marrow_storm', name: 'Marrow Storm', glyph: '✺', color: '#e8dcc0',
    category: 'class', classId: 'necromancer', branch: 'Bonecraft',
    text: "Bonecraft cards mark their nearest target as Brittle, taking 15% more damage for 4 seconds.",
    bespoke: true,
  },
  living_bones: {
    id: 'living_bones', name: 'Living Bones', glyph: '☠', color: '#e8dcc0',
    category: 'class', classId: 'necromancer', branch: 'Bonecraft',
    text: 'Resolving a Bonecraft card restores 1 Soul.',
    enchant: { on: ['cardResolved'], filter: { keyword: 'Bonecraft' }, do: { flow: 1 } },
  },

  // ── Sacrifice ──
  death_bloom: {
    id: 'death_bloom', name: 'Death Bloom', glyph: '❋', color: '#8ade6a',
    category: 'class', classId: 'necromancer', branch: 'Sacrifice',
    text: 'A deliberate summon sacrifice leaves a poisonous bloom, max 3 active.',
    bespoke: true,
  },
  soul_furnace: {
    id: 'soul_furnace', name: 'Soul Furnace', glyph: '♨', color: '#ff8a4a',
    category: 'class', classId: 'necromancer', branch: 'Sacrifice',
    text: 'Sacrificing a summon builds a stack (max 5, resets each encounter); each stack grants 5% card damage.',
    bespoke: true,
  },
  black_ritual: {
    id: 'black_ritual', name: 'Black Ritual', glyph: '§', color: '#8b1e1e',
    category: 'class', classId: 'necromancer', branch: 'Sacrifice',
    text: 'Sacrificing a summon restores 10 Health.',
    enchant: { on: ['summonSacrificed'], do: { healFlat: 10 } },
  },

  // ── Flexible ──
  grave_crown: {
    id: 'grave_crown', name: 'Grave Crown', glyph: '♚', color: '#d9b45b',
    category: 'class', classId: 'necromancer', branch: 'Flexible',
    text: "Your first servant each encounter deals 50% increased damage.",
    bespoke: true,
  },
  pale_lantern: {
    id: 'pale_lantern', name: 'Pale Lantern', glyph: '☾', color: '#8fb8ff',
    category: 'class', classId: 'necromancer', branch: 'Flexible',
    text: 'While you have no active servants, cards deal 15% increased damage.',
  },
  last_procession: {
    id: 'last_procession', name: 'Last Procession', glyph: '♧', color: '#8b1e1e',
    category: 'class', classId: 'necromancer', branch: 'Flexible',
    text: 'A servant that expires naturally restores 1 Soul.',
    enchant: { on: ['summonExpired'], filter: { summonFamily: 'servant', excludeForced: true }, do: { flow: 1 } },
  },
} satisfies Record<string, RelicDef>;
