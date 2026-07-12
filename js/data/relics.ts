import type { RelicDef } from './types.js';

// ── Relics ── permanent run modifiers ──
export const RELICS = {
  golden_quill: { id: 'golden_quill', name: 'Golden Quill', glyph: '✒', color: '#ffd97a',
    text: 'Whenever the queue empties, draw one card.',
    enchant: { on: ['queueEmpty'], do: { draw: 1 } } },
  ember_seal: { id: 'ember_seal', name: 'Ember Seal', glyph: '❉', color: '#ff8a4a',
    text: 'Applying Burn has a 25% chance to grant 1 Flow.',
    enchant: { on: ['statusApplied'], filter: { status: 'burn' }, chance: 0.25, do: { flow: 1 } } },
  astral_battery: { id: 'astral_battery', name: 'Astral Battery', glyph: '♾', color: '#8fd8ff',
    text: 'Maximum Flow increased by 4.',
    stats: { maxFlow: 4 } },
  assassins_needle: { id: 'assassins_needle', name: "Assassin's Needle", glyph: '⸸', color: '#8ade6a',
    text: 'When a Poisoned enemy dies, your next card channels 50% faster.',
    enchant: { on: ['enemyKilled'], filter: { hasStatus: 'poison' }, do: { nextChannelMult: 0.5 } } },
  cracked_hourglass: { id: 'cracked_hourglass', name: 'Cracked Hourglass', glyph: '⌛', color: '#e8dcc0',
    text: 'Channel times +25%, but AoE radius +35%.',
    stats: { channelMult: 1.25, radiusMult: 1.35 } },
  duelists_glove: { id: 'duelists_glove', name: "Duelist's Glove", glyph: '✊', color: '#d05648',
    text: 'Warrior cards deal 60% more damage while the queue holds at most 1 card.',
    stats: { duelist: true } },
  eternal_sigil: { id: 'eternal_sigil', name: 'Eternal Sigil', glyph: '⟢', color: '#b48cff',
    text: 'Your Powers last 30% longer.',
    stats: { powerDurMult: 1.3 } },
  prismatic_codex: { id: 'prismatic_codex', name: 'Prismatic Codex', glyph: '❂', color: '#8fb8ff',
    text: 'Card drafts may offer cards from every school.',
    stats: { crossClass: true } },
} satisfies Record<string, RelicDef>;
