import type { RelicDef } from '../types.js';

// ═══ Warlock relics ═══ design doc §9 — keep all 12. hell_engine,
// infernal_blood, demonic_choir, blood_moon, soul_leech, and endless_curse
// are resolveCard dmgMult/effect-chain hooks (js/sim/effects/index.ts), the
// same shape as Pack Alpha/Wild Communion in druid.ts — left bare here since
// their behavior lives entirely in that file. dark_prophecy is an inline
// hook in js/sim/effects/coreMechanic.ts's Doom-detonation block (needs
// gainRelicFlow on a kill, which that file doesn't otherwise import).
export const WARLOCK_RELICS = {
  // ── Hellfire ──
  burning_pact: {
    id: 'burning_pact', name: 'Burning Pact', glyph: '♨', color: '#ff8a4a',
    category: 'class', classId: 'warlock', branch: 'Hellfire',
    text: 'Applying Burn also scorches nearby enemies.',
    enchant: { on: ['statusApplied'], filter: { status: 'burn' }, do: { burst: { r: 70, dmg: 4, element: 'fire' } } },
  },
  hell_engine: {
    id: 'hell_engine', name: 'Hell Engine', glyph: '♦', color: '#ff8a4a',
    category: 'class', classId: 'warlock', branch: 'Hellfire',
    text: 'Hellfire and Rain of Fire deal 20% increased damage.',
  },
  infernal_ashes: {
    id: 'infernal_ashes', name: 'Infernal Ashes', glyph: '✺', color: '#ff8a4a',
    category: 'class', classId: 'warlock', branch: 'Hellfire',
    text: 'Killing a Burning enemy triggers an explosion.',
    enchant: { on: ['enemyKilled'], filter: { hasStatus: 'burn' }, do: { burst: { r: 100, dmg: 14, element: 'fire' } } },
  },

  // ── Affliction ──
  endless_curse: {
    id: 'endless_curse', name: 'Endless Curse', glyph: '☠', color: '#8b1e1e',
    category: 'class', classId: 'warlock', branch: 'Affliction',
    text: "Doom's fuse burns 30% slower, delaying its detonation.",
  },
  soul_leech: {
    id: 'soul_leech', name: 'Soul Leech', glyph: '♥', color: '#8b1e1e',
    category: 'class', classId: 'warlock', branch: 'Affliction',
    text: 'Life Drain heals for an additional 15% of damage dealt.',
  },
  dark_prophecy: {
    id: 'dark_prophecy', name: 'Dark Prophecy', glyph: '☾', color: '#8b1e1e',
    category: 'class', classId: 'warlock', branch: 'Affliction',
    text: "Doom deals 40% increased detonation damage. A killing detonation restores 2 Spirit.",
  },

  // ── Demon Pact ──
  infernal_blood: {
    id: 'infernal_blood', name: 'Infernal Blood', glyph: '♣', color: '#8b1e1e',
    category: 'class', classId: 'warlock', branch: 'Demon Pact',
    text: 'Health costs from your cards are reduced by 2.',
  },
  demonic_choir: {
    id: 'demonic_choir', name: 'Demonic Choir', glyph: '♫', color: '#a06bff',
    category: 'class', classId: 'warlock', branch: 'Demon Pact',
    text: 'Familiar and Demon summons deal 15% increased damage.',
  },
  gatekeeper: {
    id: 'gatekeeper', name: 'Gatekeeper', glyph: '⛧', color: '#a06bff',
    category: 'class', classId: 'warlock', branch: 'Demon Pact',
    text: 'Summoning a Demon or Familiar restores 1 Spirit.',
    enchant: [
      { on: ['summonCreated'], filter: { summonFamily: 'demon' }, do: { flow: 1 } },
      { on: ['summonCreated'], filter: { summonFamily: 'familiar' }, do: { flow: 1 } },
    ],
  },

  // ── Flexible ──
  forbidden_tome: {
    id: 'forbidden_tome', name: 'Forbidden Tome', glyph: '❦', color: '#a06bff',
    category: 'class', classId: 'warlock', branch: 'Flexible',
    text: '25% chance to draw an additional card when resolving a Signature.',
    enchant: { on: ['cardResolved'], filter: { cat: 'Signature' }, chance: 0.25, do: { draw: 1 } },
  },
  blood_moon: {
    id: 'blood_moon', name: 'Blood Moon', glyph: '☾', color: '#8b1e1e',
    category: 'class', classId: 'warlock', branch: 'Flexible',
    text: 'Below 40% Health, cards deal 25% increased damage. You must recover above 60% Health to reset.',
  },
  pact_of_ruin: {
    id: 'pact_of_ruin', name: 'Pact of Ruin', glyph: '☠', color: '#8b1e1e',
    category: 'class', classId: 'warlock', branch: 'Flexible',
    text: 'A Demon summon expiring damages the nearest Doomed enemy.',
    bespoke: true,
  },
} satisfies Record<string, RelicDef>;
