// ── Arcana Engine · data layer ─────────────────────────────────────────────
// Classes, cards, relics, enemies, biomes. Everything is data; behavior lives
// in the effect resolver (world.js). No card has one-off hardcoded logic.
//
// Card categories (the new rhythm — see roadmap.md):
//   Power     — channels briefly, then stays ACTIVE 4–10s modifying the basic attack
//   Skill     — fast tactical action (0.3–0.7s channel)
//   Spell     — big moment: either an AoE channel (1.5–2.5s) or a Sustained cast
//   Trigger   — reacts to events for ~25–30s
//   Engine    — queue / Flow / duration manipulation
//   Modifier  — buffs the next matching card(s)

export const PALETTE = {
  navy: '#0b0e1d', navyDeep: '#070912', parchment: '#e8dcc0', ivory: '#f2ead6',
  gold: '#d9b45b', goldBright: '#ffe9a8', crimson: '#c23b4a', emerald: '#4fbf7a',
  frost: '#8fd8ff', violet: '#8f6fff', ink: '#1a1430',
};

export const SCHOOL_COLORS = {
  Mage: '#8f6fff', Warrior: '#d05648', Rogue: '#4fbf7a',
  Necromancer: '#a77ac7', Druid: '#76b852', Warlock: '#d05c9b',
  Colorless: '#d9b45b',
};

export const ELEMENT_COLORS = {
  fire: '#ff8a4a', frost: '#8fd8ff', lightning: '#ffe66d', arcane: '#b48cff',
  poison: '#8ade6a', physical: '#e8dcc0', shadow: '#a98fe0', gold: '#ffd97a',
};

export const RARITY_COLORS = {
  Common: '#9aa0b5', Uncommon: '#7fd6a8', Rare: '#8fb8ff', Legendary: '#ffd97a',
};
