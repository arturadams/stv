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
} satisfies Record<ClassId, ClassDef>;
