import type { RelicDef } from '../types.js';

// ═══ Warrior relics ═══ design doc §5 — keep all 12.
export const WARRIOR_RELICS = {
  // ── Berserker ──
  butchers_rhythm: {
    id: 'butchers_rhythm', name: "Butcher's Rhythm", glyph: '⚔', color: '#d05648',
    category: 'class', classId: 'warrior', branch: 'Berserker',
    text: 'Every 6th basic-attack hit becomes an empowered cleave for 20 damage in a wide radius.',
    bespoke: true,
  },
  crimson_arena: {
    id: 'crimson_arena', name: 'Crimson Arena', glyph: '♜', color: '#ff5d3a',
    category: 'class', classId: 'warrior', branch: 'Berserker',
    text: 'Cards deal 20% increased damage while 3+ enemies are nearby (a boss counts as 3).',
  },
  endless_fury: {
    id: 'endless_fury', name: 'Endless Fury', glyph: '♅', color: '#ff8a4a',
    category: 'class', classId: 'warrior', branch: 'Berserker',
    text: 'Spend 3 Rage to extend your active Berserker Power once per cast when it would expire.',
    bespoke: true,
  },

  // ── Duelist ──
  perfect_edge: {
    id: 'perfect_edge', name: 'Perfect Edge', glyph: '✊', color: '#e8dcc0',
    category: 'class', classId: 'warrior', branch: 'Duelist',
    text: 'Duelist Techniques deal 12% increased damage.',
  },
  challengers_crest: {
    id: 'challengers_crest', name: "Challenger's Crest", glyph: '♛', color: '#d9b45b',
    category: 'class', classId: 'warrior', branch: 'Duelist',
    text: 'Killing a Marked boss or elite restores 3 Rage.',
    enchant: [
      { on: ['enemyKilled'], filter: { elite: true }, do: { flow: 3 } },
      { on: ['enemyKilled'], filter: { boss: true }, do: { flow: 3 } },
    ],
  },
  executioners_oath: {
    id: 'executioners_oath', name: "Executioner's Oath", glyph: '☠', color: '#8b1e1e',
    category: 'class', classId: 'warrior', branch: 'Duelist',
    text: 'Finisher thresholds increase by 5 percentage points. Killing an elite restores 3 Rage.',
    enchant: { on: ['enemyKilled'], filter: { elite: true }, do: { flow: 3 } },
  },

  // ── Breaker ──
  earthsplitter: {
    id: 'earthsplitter', name: 'Earthsplitter', glyph: '⛰', color: '#8b6b4a',
    category: 'class', classId: 'warrior', branch: 'Breaker',
    text: 'Impact cards leave a fissure dealing 8 damage per second, max 3 active.',
    bespoke: true,
  },
  mountain_heart: {
    id: 'mountain_heart', name: 'Mountain Heart', glyph: '⛰', color: '#8b6b4a',
    category: 'class', classId: 'warrior', branch: 'Breaker',
    text: 'Resolving an Impact card restores 1 Rage.',
    enchant: { on: ['cardResolved'], filter: { keyword: 'Impact' }, do: { flow: 1 } },
  },
  avalanche: {
    id: 'avalanche', name: 'Avalanche', glyph: '⛄', color: '#e8dcc0',
    category: 'class', classId: 'warrior', branch: 'Breaker',
    text: 'Dashing through enemies deals 10 damage to each, per-enemy cooldown 0.5 seconds.',
    bespoke: true,
  },

  // ── Flexible ──
  veterans_instinct: {
    id: 'veterans_instinct', name: "Veteran's Instinct", glyph: '⛨', color: '#8fb8ff',
    category: 'class', classId: 'warrior', branch: 'Flexible',
    text: 'The first Heavy hit (10+ damage) each encounter deals 30% less damage.',
  },
  battle_standard: {
    id: 'battle_standard', name: 'Battle Standard', glyph: '⚑', color: '#d9b45b',
    category: 'class', classId: 'warrior', branch: 'Flexible',
    text: 'Defeating a boss, or a boss reaching a new phase, restores 15 Health and 2 Rage.',
    enchant: [
      { on: ['enemyKilled'], filter: { boss: true }, do: { flow: 2, healFlat: 15 } },
      { on: ['bossHealthThreshold'], do: { flow: 2, healFlat: 15 } },
    ],
  },
  titans_blood: {
    id: 'titans_blood', name: "Titan's Blood", glyph: '⛨', color: '#d05648',
    category: 'class', classId: 'warrior', branch: 'Flexible',
    text: 'Crossing into maximum Rage grants 15 Armor. Internal cooldown 10 seconds.',
    bespoke: true,
  },
} satisfies Record<string, RelicDef>;
