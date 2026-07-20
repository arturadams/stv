import type { ClassDef, ClassId } from './types.js';

// ── Classes ── each has a basic attack that is NOT a card ──
export const CLASSES = {
  mage: {
    id: 'mage', name: 'Mage', school: 'Mage', color: '#8f6fff', glyph: '✦',
    tagline: 'Arcane bolts · Mana · Ritual spells',
    desc: 'Fires arcane bolts on its own. MANA regenerates steadily in combat and fuels the big ritual spells — the bolt is a finisher, not the main event.',
    basic: { kind: 'proj', name: 'Arcane Bolt', dmg: 6, rate: 0.55, speed: 600, radius: 5, range: 470, element: 'arcane' },
    resource: { key: 'mana', name: 'MANA', max: 10, starting: 6, regenInterval: 1.1, perfectDodgeGain: 2, color: '#8f6fff' },
  },
  warrior: {
    id: 'warrior', name: 'Warrior', school: 'Warrior', color: '#d05648', glyph: '⚔',
    tagline: 'Melee arcs · Rage · Shockwaves',
    desc: 'Swings a spectral blade at anything close. Landing hits, taking damage and blocking with Armor build RAGE, which fuels stances and shockwaves.',
    basic: { kind: 'arc', name: 'Blade Swing', dmg: 10, rate: 0.8, range: 125, arc: 100, element: 'physical', knockback: 60 },
    resource: { key: 'rage', name: 'RAGE', max: 10, starting: 3, regenInterval: 2.5, perfectDodgeGain: 1, color: '#ff6a4a' },
  },
  rogue: {
    id: 'rogue', name: 'Rogue', school: 'Rogue', color: '#4fbf7a', glyph: '🜏',
    tagline: 'Fast knives · Traps · Focus',
    desc: 'Throws quick knives on its own. Crits, traps, poisoned kills and perfect dodges build FOCUS, which fuels traps, marks and knife bursts.',
    basic: { kind: 'proj', name: 'Swift Knife', dmg: 5, rate: 0.4, speed: 780, radius: 4, range: 430, element: 'physical', critChance: 0.1 },
    resource: { key: 'focus', name: 'FOCUS', max: 10, starting: 4, regenInterval: 1.7, perfectDodgeGain: 2, color: '#8ade6a', pips: true },
  },
  necromancer: {
    id: 'necromancer', name: 'Necromancer', school: 'Necromancer', color: '#a77ac7', glyph: '☠',
    tagline: 'Bone shards · Undead servants · Souls',
    desc: 'Hurls splinters of grave-bone. SOULS regenerate in combat and surge with every kill, fueling curses, grave control and undead servants.',
    basic: { kind: 'proj', name: 'Bone Shard', dmg: 7, rate: 0.62, speed: 560, radius: 5, range: 460, element: 'shadow' },
    resource: { key: 'souls', name: 'SOULS', max: 10, starting: 4, regenInterval: 1.9, perfectDodgeGain: 1, color: '#c69be8', pips: true },
  },
  druid: {
    id: 'druid', name: 'Druid', school: 'Druid', color: '#76b852', glyph: '❧',
    tagline: 'Wild claws · Shapeshifting · Spirit',
    desc: 'Rakes nearby foes with feral claws. SPIRIT regenerates in combat and grows through close attacks and perfect dodges, fueling forms and storms.',
    basic: { kind: 'arc', name: 'Wild Claw', dmg: 9, rate: 0.7, range: 115, arc: 90, element: 'physical', knockback: 45 },
    resource: { key: 'spirit', name: 'SPIRIT', max: 10, starting: 5, regenInterval: 1.6, perfectDodgeGain: 2, color: '#9bd66d' },
  },
  warlock: {
    id: 'warlock', name: 'Warlock', school: 'Warlock', color: '#d05c9b', glyph: '⛧',
    tagline: 'Eldritch bolts · Curses · Corruption',
    desc: 'Casts hungry bolts from the outer dark. CORRUPTION regenerates in combat and rises through bolt hits and suffered wounds, fueling curses and demons.',
    basic: { kind: 'proj', name: 'Eldritch Bolt', dmg: 8, rate: 0.72, speed: 520, radius: 7, range: 500, element: 'shadow' },
    resource: { key: 'corruption', name: 'CORRUPTION', max: 10, starting: 4, regenInterval: 1.9, perfectDodgeGain: 1, color: '#ee6fbd' },
  },
} satisfies Record<ClassId, ClassDef>;
