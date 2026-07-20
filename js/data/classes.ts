import type { ClassDef, ClassId } from './types.js';

// ── Classes ── each has a basic attack that is NOT a card ──
export const CLASSES = {
  mage: {
    id: 'mage', name: 'Mage', school: 'Mage', color: '#8f6fff', glyph: '✦',
    tagline: 'Arcane bolts · Attunements · Ritual spells',
    desc: 'Fires arcane bolts on its own. Attunement Powers transform the bolt into fire, frost or storm; the big spells channel over ritual circles.',
    basic: { kind: 'proj', name: 'Arcane Bolt', dmg: 6, rate: 0.55, speed: 600, radius: 5, range: 470, element: 'arcane' },
    resource: null, // Mage state = active Attunements
  },
  warrior: {
    id: 'warrior', name: 'Warrior', school: 'Warrior', color: '#d05648', glyph: '⚔',
    tagline: 'Melee arcs · Rage · Shockwaves',
    desc: 'Swings a spectral blade at anything close. Landing hits, taking damage and close kills build RAGE, which channels Warrior cards faster and harder.',
    basic: { kind: 'arc', name: 'Blade Swing', dmg: 10, rate: 0.8, range: 125, arc: 100, element: 'physical', knockback: 60 },
    resource: { key: 'rage', name: 'RAGE', max: 100, color: '#ff6a4a' },
  },
  rogue: {
    id: 'rogue', name: 'Rogue', school: 'Rogue', color: '#4fbf7a', glyph: '🜏',
    tagline: 'Fast knives · Traps · Opportunity',
    desc: 'Throws quick knives on its own. Kills, poison kills, traps and perfect dodges grant OPPORTUNITY, which quickens Rogue cards and feeds crits.',
    basic: { kind: 'proj', name: 'Swift Knife', dmg: 5, rate: 0.4, speed: 780, radius: 4, range: 430, element: 'physical', critChance: 0.1 },
    resource: { key: 'opportunity', name: 'OPPORTUNITY', max: 8, color: '#8ade6a', pips: true },
  },
  necromancer: {
    id: 'necromancer', name: 'Necromancer', school: 'Necromancer', color: '#a77ac7', glyph: '☠',
    tagline: 'Bone shards · Undead servants · Souls',
    desc: 'Hurls splinters of grave-bone. Kills harvest SOULS that empower each shard; Necromancer cards consume a Soul to finish their rites faster.',
    basic: { kind: 'proj', name: 'Bone Shard', dmg: 7, rate: 0.62, speed: 560, radius: 5, range: 460, element: 'shadow' },
    resource: { key: 'souls', name: 'SOULS', max: 10, color: '#c69be8', pips: true },
  },
  druid: {
    id: 'druid', name: 'Druid', school: 'Druid', color: '#76b852', glyph: '❧',
    tagline: 'Wild claws · Shapeshifting · Spirit',
    desc: 'Rakes nearby foes with feral claws. Each attack builds SPIRIT; Druid cards spend it to channel with the speed of the changing wild.',
    basic: { kind: 'arc', name: 'Wild Claw', dmg: 9, rate: 0.7, range: 115, arc: 90, element: 'physical', knockback: 45 },
    resource: { key: 'spirit', name: 'SPIRIT', max: 100, color: '#9bd66d' },
  },
  warlock: {
    id: 'warlock', name: 'Warlock', school: 'Warlock', color: '#d05c9b', glyph: '⛧',
    tagline: 'Eldritch bolts · Curses · Corruption',
    desc: 'Casts hungry bolts from the outer dark. Warlock cards build CORRUPTION, strengthening attacks and hastening rituals until backlash exacts its price.',
    basic: { kind: 'proj', name: 'Eldritch Bolt', dmg: 8, rate: 0.72, speed: 520, radius: 7, range: 500, element: 'shadow' },
    resource: { key: 'corruption', name: 'CORRUPTION', max: 100, color: '#ee6fbd' },
  },
} satisfies Record<ClassId, ClassDef>;
