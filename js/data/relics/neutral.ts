import type { RelicDef } from '../types.js';

// ═══ Neutral relics ═══ design doc §10/§18 — 8 per category (Combat,
// Economy, Engine, Legendary). The doc only names 15 of the claimed 32 with
// full specs for 5 (Hunter's Bell, Pilgrim's Spur, Echo Stone, The Black
// Star, The Mirror of Echoes, implemented per §10.1-10.5); the rest are
// invented here to round each category out to 8, following the same
// mechanism shapes (pure enchant / stat-hook / bespoke relicState).
export const NEUTRAL_RELICS = {
  // ── Combat ──
  hunters_bell: {
    id: 'hunters_bell', name: "Hunter's Bell", glyph: '☗', color: '#d9b45b',
    category: 'combat',
    text: 'After 6 qualifying hits against the same elite or boss, ring the bell for 18 damage in a 90-radius burst and restore 1 resource.',
    bespoke: true,
  },
  pilgrims_spur: {
    id: 'pilgrims_spur', name: "Pilgrim's Spur", glyph: '✦', color: '#8ade6a',
    category: 'combat',
    text: 'A Perfect Dodge empowers your next card: +20% damage or healing, or +15% duration.',
    bespoke: true,
  },
  lasting_scar: {
    id: 'lasting_scar', name: 'Lasting Scar', glyph: '⚔', color: '#ff5d6a',
    category: 'combat',
    text: 'Enemies you Bleed take 20% more damage for the Bleed’s duration.',
    enchant: { on: ['statusApplied'], filter: { status: 'bleed' }, do: { ampOnStatus: { amp: 1.2 } } },
  },
  afterimage_spurs: {
    id: 'afterimage_spurs', name: 'Afterimage Spurs', glyph: '✳', color: '#8fd8ff',
    category: 'combat',
    text: 'Perfect Dodges leave a scorching afterimage, dealing 10 damage to nearby enemies.',
    enchant: { on: ['perfectDodge'], do: { burst: { r: 70, dmg: 10, element: 'physical' } } },
  },
  reprisal_charm: {
    id: 'reprisal_charm', name: 'Reprisal Charm', glyph: '†', color: '#e8dcc0',
    category: 'combat',
    text: 'Taking a Heavy hit (10+ damage) grants 1 Flow.',
    enchant: { on: ['playerHit'], filter: { minAmount: 10 }, do: { flow: 1 } },
  },
  momentum_brand: {
    id: 'momentum_brand', name: 'Momentum Brand', glyph: '❉', color: '#ffd97a',
    category: 'combat',
    text: 'Every 5th combo tier unleashes a bonus shockwave for 14 damage around you.',
    enchant: { on: ['comboChanged'], do: { stackAndTrigger: { max: 5, label: 'MOMENTUM', onFull: { burst: { r: 130, dmg: 14, element: 'physical' } } } } },
  },
  skirmishers_ward: {
    id: 'skirmishers_ward', name: "Skirmisher's Ward", glyph: '⛨', color: '#b48cff',
    category: 'combat',
    text: 'Every 4th enemy killed grants 8 Armor.',
    enchant: { on: ['enemyKilled'], do: { stackAndTrigger: { max: 4, label: 'WARD', onFull: { armor: 8 } } } },
  },
  guardians_bulwark: {
    id: 'guardians_bulwark', name: "Guardian's Bulwark", glyph: '⬡', color: '#7fd6a8',
    category: 'combat',
    text: 'Gain 12 Maximum Health.',
    stats: { maxHealth: 12 },
  },

  // ── Economy ──
  cartographers_seal: {
    id: 'cartographers_seal', name: "Cartographer's Seal", glyph: '✦', color: '#ffd97a',
    category: 'economy',
    text: 'Gold from all sources +30%.',
    stats: { goldMult: 1.3 },
  },
  merchants_mark: {
    id: 'merchants_mark', name: "Merchant's Mark", glyph: '✧', color: '#d9b45b',
    category: 'economy',
    text: 'Sanctuary prices are 25% cheaper.',
    stats: { buyPriceMult: 0.75 },
  },
  salvagers_hook: {
    id: 'salvagers_hook', name: "Salvager's Hook", glyph: '⚓', color: '#8fb8ff',
    category: 'economy',
    text: 'Selling cards returns 40% more gold.',
    stats: { sellPriceMult: 1.4 },
  },
  pilgrims_map: {
    id: 'pilgrims_map', name: "Pilgrim's Map", glyph: '☷', color: '#e8dcc0',
    category: 'economy',
    text: 'Gain 20 gold whenever you rest at a Sanctuary.',
    stats: { sanctuaryGold: 20 },
  },
  prospectors_charm: {
    id: 'prospectors_charm', name: "Prospector's Charm", glyph: '♦', color: '#ffd97a',
    category: 'economy',
    text: 'Gold from all sources +15%.',
    stats: { goldMult: 1.15 },
  },
  wanderers_purse: {
    id: 'wanderers_purse', name: "Wanderer's Purse", glyph: '✣', color: '#8ade6a',
    category: 'economy',
    text: 'Sanctuaries stock one additional card.',
    stats: { extraStock: true },
  },
  frugal_ledger: {
    id: 'frugal_ledger', name: 'Frugal Ledger', glyph: '☷', color: '#d05648',
    category: 'economy',
    text: 'Sanctuary prices are 15% cheaper.',
    stats: { buyPriceMult: 0.85 },
  },
  appraisers_eye: {
    id: 'appraisers_eye', name: "Appraiser's Eye", glyph: '◉', color: '#8fd8ff',
    category: 'economy',
    text: 'Selling cards returns 20% more gold.',
    stats: { sellPriceMult: 1.2 },
  },

  // ── Engine ──
  quickening_seal: {
    id: 'quickening_seal', name: 'Quickening Seal', glyph: '⧗', color: '#8fd8ff',
    category: 'engine',
    text: 'Channel times -15%.',
    stats: { channelMult: 0.85 },
  },
  ritual_bell: {
    id: 'ritual_bell', name: 'Ritual Bell', glyph: '☗', color: '#b48cff',
    category: 'engine',
    text: 'Every 8th card resolved grants 2 Flow.',
    enchant: { on: ['cardResolved'], do: { stackAndTrigger: { max: 8, label: 'RITUAL', onFull: { flow: 2 } } } },
  },
  overflow_vessel: {
    id: 'overflow_vessel', name: 'Overflow Vessel', glyph: '⚜', color: '#8fb8ff',
    category: 'engine',
    text: 'Maximum Flow +3.',
    stats: { maxFlow: 3 },
  },
  echo_stone: {
    id: 'echo_stone', name: 'Echo Stone', glyph: '◈', color: '#b48cff',
    category: 'engine',
    text: 'Every 6th Signature repeats at 35% power. Legendary Signatures are excluded.',
    enchant: { on: ['cardResolved'], filter: { cat: 'Signature', notRarity: 'Legendary' }, do: { stackAndEcho: { max: 6, label: 'ECHO', powerMult: 0.35 } } },
  },
  overclocked_matrix: {
    id: 'overclocked_matrix', name: 'Overclocked Matrix', glyph: '⚙', color: '#ff8a4a',
    category: 'engine',
    text: 'Your Powers last 20% longer.',
    stats: { powerDurMult: 1.2 },
  },
  resonant_coil: {
    id: 'resonant_coil', name: 'Resonant Coil', glyph: '≋', color: '#8fd8ff',
    category: 'engine',
    text: 'Whenever a Power expires, gain 1 Flow.',
    enchant: { on: ['powerExpired'], do: { flow: 1 } },
  },
  tempered_core: {
    id: 'tempered_core', name: 'Tempered Core', glyph: '⬢', color: '#e8dcc0',
    category: 'engine',
    text: 'Maximum Flow +5.',
    stats: { maxFlow: 5 },
  },
  draftsmans_gauge: {
    id: 'draftsmans_gauge', name: "Draftsman's Gauge", glyph: '☷', color: '#ffd97a',
    category: 'engine',
    text: 'Whenever the queue empties, gain 1 Flow.',
    enchant: { on: ['queueEmpty'], do: { flow: 1 } },
  },

  // ── Legendary ── (max 1 per run)
  the_black_star: {
    id: 'the_black_star', name: 'The Black Star', glyph: '✦', color: '#2a1f3d',
    category: 'legendary',
    text: 'Signatures cost 2 additional resource, but their primary effect becomes dramatically stronger.',
  },
  the_broken_hourglass: {
    id: 'the_broken_hourglass', name: 'The Broken Hourglass', glyph: '⏳', color: '#e8dcc0',
    category: 'legendary',
    text: 'Channel times +50%, but you may hold 2 additional cards in queue.',
    stats: { channelMult: 1.5, queueCapBonus: 2 },
  },
  the_worldseed: {
    id: 'the_worldseed', name: 'The Worldseed', glyph: '⚘', color: '#7fd6a8',
    category: 'legendary',
    text: 'Card drafts may offer cards from every school.',
    stats: { crossClass: true },
  },
  the_mirror_of_echoes: {
    id: 'the_mirror_of_echoes', name: 'The Mirror of Echoes', glyph: '◇', color: '#8fb8ff',
    category: 'legendary',
    text: 'Every 4th Technique or Signature repeats at 50% effect. Legendaries are excluded. Passive resource regeneration is reduced by 25%.',
    bespoke: true,
  },
  the_ashen_gate: {
    id: 'the_ashen_gate', name: 'The Ashen Gate', glyph: '⛪', color: '#ff8a4a',
    category: 'legendary',
    text: 'Whenever you decline a reward, gain 3 Flow.',
  },
  the_undying_ember: {
    id: 'the_undying_ember', name: 'The Undying Ember', glyph: '♨', color: '#ff8a4a',
    category: 'legendary',
    text: 'The first time you would fall in each world, survive with 1 Health instead.',
  },
  the_thousandth_soul: {
    id: 'the_thousandth_soul', name: 'The Thousandth Soul', glyph: '✧', color: '#b48cff',
    category: 'legendary',
    text: 'Killing an enemy has a 5% chance to fully refresh your Flow.',
    enchant: { on: ['enemyKilled'], chance: 0.05, do: { flow: 999 }, uncapped: true },
  },
  the_last_bastion: {
    id: 'the_last_bastion', name: 'The Last Bastion', glyph: '⬡', color: '#8fd8ff',
    category: 'legendary',
    text: 'Raises your combined damage-reduction cap from 60% to 75%.',
    stats: { damageReductionMax: 0.15 },
  },
} satisfies Record<string, RelicDef>;
