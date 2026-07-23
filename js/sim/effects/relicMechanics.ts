import { ELEMENT_COLORS } from '../../data/index.js';
import type { EnemyState } from '../../data/types.js';
import { EVT } from '../../core/events.js';
import { applyStatus, damageEnemy, enemiesIn, nearestEnemy } from '../combat.js';
import { gainRelicFlow } from './enchantActions.js';
import { performEcho } from './index.js';
import type { GameState } from '../types.js';

// Shared "reset once the encounter ends" gate for relics that track
// per-encounter state (Astral Observatory, Prism Crown, Archmage's Focus,
// Veteran's Instinct). Deliberately NOT combat.ts's isActiveCombat — that
// definition (no damage exchanged in 5s AND no enemy within 230 units) is
// tuned for resource-regen gating and is twitchy enough that a kiting build,
// or just a gap between waves in the same fight, can flip it mid-encounter,
// wiping progress that should have survived the lull. A longer, damage-only
// window is a coarser but more reliable "the fight is actually over" signal
// for state that should persist through brief pauses in one encounter.
const ENCOUNTER_RESET_SECONDS = 12;
function resetOutsideCombat(game: GameState, key: string): void {
  if (game.runTime - game.lastCombatT > ENCOUNTER_RESET_SECONDS) delete game.relicState[key];
}

// Home for the small number of relics that need more than a declarative
// `enchant` trigger — internal cooldowns, rolling windows, hysteresis,
// per-frame zone checks. Everything reads/writes `game.relicState`, a plain
// bag keyed by relic id so each relic owns its own slice without a new field
// on GameState per relic. Most relics never touch this file (see design doc
// §3.3's "pure enchant" vs "bespoke relic-state" shapes).
//
// Registered here rather than as a function directly on RelicDef so relic
// data (js/data/relics/*.ts) stays plain data — the same split cards use
// between EffectSpec (data) and registerEffect (behavior).
export const RELIC_ON_ACQUIRE: Record<string, (game: GameState) => void> = {};

interface HuntersBellState {
  targetUid: number | null;
  count: number;
  lastHitTime: number;
  counter: { value: number; max: number; label: string };
}

RELIC_ON_ACQUIRE.hunters_bell = (game) => {
  // EVT.enemyHit only ever fires from hitEnemy (basic attacks and card
  // effects), never from the damageEnemy-only DoT/zone-tick paths, and
  // never for relic-sourced damage — so "direct basic-attack or card
  // damage, relic damage doesn't count" is already guaranteed by which
  // event this is, with no extra filtering needed here.
  game.bus.on(EVT.enemyHit, ({ enemy }) => {
    if (!enemy.def.boss && !enemy.def.elite) return;
    let state = game.relicState.huntersBell as HuntersBellState | undefined;
    if (!state || state.targetUid !== enemy.uid) {
      state = { targetUid: enemy.uid, count: 0, lastHitTime: -Infinity, counter: { value: 0, max: 6, label: 'BELL' } };
      game.relicState.huntersBell = state;
    }
    if (game.runTime - state.lastHitTime < 0.4) return; // debounce rapid multi-hits as one qualifying hit
    state.lastHitTime = game.runTime;
    state.count += 1;
    state.counter.value = state.count;
    if (state.count < 6) return;
    state.count = 0;
    state.counter.value = 0;
    for (const e of enemiesIn(game, enemy.x, enemy.y, 90)) {
      damageEnemy(game, e, 18, { color: '#d9b45b', quiet: true });
    }
    gainRelicFlow(game, 1, 'hunters_bell');
  });
};

RELIC_ON_ACQUIRE.pilgrims_spur = (game) => {
  game.bus.on(EVT.perfectDodge, () => {
    game.relicState.pilgrimsSpur = { expiresAt: game.runTime + 6 };
  });
};

interface MirrorState {
  count: number;
  counter: { value: number; max: number; label: string };
}

// The Mirror of Echoes (design doc §10.5): every 4th Technique-or-Signature
// repeats at 50% power. Needs bespoke state rather than a pure enchant
// because "Technique OR Signature" is an OR across two categories that
// EnchantFilter's single `cat` field can't express in one enchant.
RELIC_ON_ACQUIRE.the_mirror_of_echoes = (game) => {
  game.bus.on(EVT.cardResolved, ({ inst, buffs }) => {
    const def = inst.def;
    if (def.cat !== 'Technique' && def.cat !== 'Signature') return;
    if (def.rarity === 'Legendary') return;
    if (def.effects.some((e) => e.type === 'dashOverride')) return; // Dash-replacement Techniques excluded
    let state = game.relicState.mirrorOfEchoes as MirrorState | undefined;
    if (!state) {
      state = { count: 0, counter: { value: 0, max: 4, label: 'MIRROR' } };
      game.relicState.mirrorOfEchoes = state;
    }
    state.count += 1;
    state.counter.value = state.count;
    if (state.count < 4) return;
    state.count = 0;
    state.counter.value = 0;
    performEcho(game, inst, buffs, 0.5);
  });
};

// Crystal Memory (design doc §4.2): 1 Mana per Chill application, internal
// cooldown 1.5s — reuses game.core.cooldowns, the same bag card mechanics
// already use for their own per-effect cooldowns.
RELIC_ON_ACQUIRE.crystal_memory = (game) => {
  game.bus.on(EVT.statusApplied, ({ status }) => {
    if (status !== 'chill') return;
    if ((game.core.cooldowns.crystal_memory || 0) > 0) return;
    game.core.cooldowns.crystal_memory = 1.5;
    gainRelicFlow(game, 1, 'crystal_memory');
  });
};

// Endless Winter (design doc §4.2): Chilling a boss also slows it, scaling
// with stacked "frostbite" applications, capped at 10% — implemented as an
// independent slow (EnemyState.relicSlowMult) rather than raising the
// existing boss Chill-stack cap of 1, so it doesn't touch the shared
// Chill-application balance rule the base game already enforces.
RELIC_ON_ACQUIRE.endless_winter = (game) => {
  game.bus.on(EVT.statusApplied, ({ status, enemy }) => {
    if (status !== 'chill' || !enemy.def.boss) return;
    const stacks = Math.min(5, ((game.relicState.frostbite as Record<number, number> | undefined)?.[enemy.uid] || 0) + 1);
    const frostbite = (game.relicState.frostbite as Record<number, number> | undefined) || {};
    frostbite[enemy.uid] = stacks;
    game.relicState.frostbite = frostbite;
    enemy.relicSlowMult = 1 - stacks * 0.02; // 5 stacks -> 10% max
  });
};

interface UniqueTrackerState {
  ids: Set<string>;
}

// Astral Observatory (design doc §4.2): count unique Signature card ids cast
// this encounter (duplicates count once); resets when the encounter ends.
RELIC_ON_ACQUIRE.astral_observatory = (game) => {
  game.bus.on(EVT.cardResolved, ({ inst }) => {
    if (inst.def.cat !== 'Signature') return;
    const state = (game.relicState.astralObservatory as UniqueTrackerState | undefined) || { ids: new Set() };
    state.ids.add(inst.def.id);
    game.relicState.astralObservatory = state;
    if (state.ids.size === 3) gainRelicFlow(game, 2, 'astral_observatory');
  });
};

// Prism Crown (design doc §4.2): a stacking damage bonus for touching Fire,
// Frost, and Arcane cards in the same encounter, capped at +15% — the bonus
// itself is read directly out of relicState by resolveCard (js/sim/effects/
// index.ts), since that avoids a circular import back into this file.
RELIC_ON_ACQUIRE.prism_crown = (game) => {
  game.bus.on(EVT.cardResolved, ({ inst }) => {
    const element = inst.def.element;
    if (element !== 'fire' && element !== 'frost' && element !== 'arcane') return;
    const state = (game.relicState.prismCrown as UniqueTrackerState | undefined) || { ids: new Set() };
    state.ids.add(element);
    game.relicState.prismCrown = state;
    game.relicState.prismCrownBonus = Math.min(0.15, state.ids.size * 0.05);
  });
};

interface CounterState {
  count: number;
  counter: { value: number; max: number; label: string };
}

// Butcher's Rhythm (design doc §5.2): count basic-attack HITS (a documented
// simplification of "swings" — a wide arc can hit several enemies per real
// swing, so this over-counts multi-target swings slightly), 6th becomes an
// empowered cleave, and that cleave hit doesn't itself add to the count.
RELIC_ON_ACQUIRE.butchers_rhythm = (game) => {
  let resolvingCleave = false;
  game.bus.on(EVT.enemyHit, ({ enemy, basic }) => {
    if (!basic || resolvingCleave) return;
    const state = (game.relicState.butchersRhythm as CounterState | undefined) || { count: 0, counter: { value: 0, max: 6, label: 'RHYTHM' } };
    state.count += 1;
    state.counter.value = state.count;
    game.relicState.butchersRhythm = state;
    if (state.count < 6) return;
    state.count = 0;
    state.counter.value = 0;
    resolvingCleave = true;
    for (const e of enemiesIn(game, enemy.x, enemy.y, 150)) damageEnemy(game, e, 20, { color: '#ffd97a' });
    resolvingCleave = false;
  });
};

// Endless Fury (design doc §5.2): auto-spends Rage to extend the specific
// Power that's expiring (engine.js's extendPower(id, sec), not
// extendPowers, which would also extend unrelated concurrently-active
// Powers) — a short per-id cooldown approximates "once per cast" without
// needing to detect a recast-while-pending explicitly (a toggle flag that's
// only cleared by the *next* natural expiry can otherwise get stuck: a
// recast that refreshes the same Power's timeLeft before its extension
// would have run out inherits the still-set flag and silently loses its own
// extension chance).
RELIC_ON_ACQUIRE.endless_fury = (game) => {
  game.bus.on(EVT.powerExpired, ({ id }) => {
    const key = 'endlessFury_' + id;
    if ((game.core.cooldowns[key] || 0) > 0) return;
    if (game.engine.flow < 3) return;
    game.engine.flow -= 3;
    game.core.cooldowns[key] = 0.5;
    game.engine.extendPower(id, 3);
  });
};

// Earthsplitter (design doc §5.2): Impact cards leave a damaging fissure,
// max 3 active — reuses game.zones directly (the same entity Zone-effect
// cards create) rather than a new hazard type.
RELIC_ON_ACQUIRE.earthsplitter = (game) => {
  game.bus.on(EVT.cardResolved, ({ inst }) => {
    if (!(inst.def.keywords || []).includes('Impact')) return;
    const active = (game.relicState.earthsplitterZones as object[] | undefined) || [];
    if (active.length >= 3) {
      const oldest = active.shift();
      if (oldest) game.zones = game.zones.filter((z) => z !== oldest);
    }
    const p = game.player;
    const zone = {
      x: p.x, y: p.y, r: 90, t: 0, duration: 8, tickDmg: 8, tickRate: 1, tickT: 0,
      status: null, slow: 0, follow: false, color: '#d05648', element: 'physical' as const,
      ctx: { def: inst.def, buffs: { dmgMult: 1, costMult: 1, channelMult: 1, radiusMult: 1, critChance: 0, repeat: 0, addStatus: [] }, dmgMult: 1, radMult: 1, preview: null, lvl: 1 },
    };
    game.zones.push(zone);
    active.push(zone);
    game.relicState.earthsplitterZones = active;
  });
};

// Avalanche (design doc §5.2): damages enemies you dash through, per-enemy
// cooldown 0.5s — reuses player.dashT (already true while any dash, plain or
// override, is in flight) instead of a new dash-path event.
RELIC_ON_ACQUIRE.avalanche = (game) => {
  // handled per-frame in updateRelicMechanics since it needs to sample the
  // player's position throughout the dash, not just at the moment it starts
  game.relicState.avalancheActive = true;
};

// Veteran's Instinct (design doc §5.2): the first Heavy hit (10+ damage)
// each encounter is reduced 30% — implemented directly in
// js/sim/combat.ts's damagePlayer (the only place incoming damage can be
// intercepted before it lands), not here, since this file already imports
// from combat.ts and importing back would be a circular dependency.

// Titan's Blood (design doc §5.2): crossing into maximum Rage grants Armor,
// cooldown 10s, and does not retrigger while sitting at max.
RELIC_ON_ACQUIRE.titans_blood = (game) => {
  game.bus.on(EVT.flowGained, ({ amount }) => {
    if (game.engine.flow < game.engine.maxFlow) return;
    if (game.engine.flow - amount >= game.engine.maxFlow) return; // was already at max — no re-trigger
    if ((game.core.cooldowns.titans_blood || 0) > 0) return;
    game.core.cooldowns.titans_blood = 10;
    game.player.armor += 15;
  });
};

// Killer's Ledger (design doc §6.3): killing a Marked enemy transfers the
// Mark (at 50% remaining duration) to the nearest other enemy, internal
// cooldown 2s. Reads enemy.mark before killEnemy clears it — killEnemy sets
// dead=true but doesn't touch .mark, so it's still intact at EVT.enemyKilled.
RELIC_ON_ACQUIRE.killers_ledger = (game) => {
  game.bus.on(EVT.enemyKilled, ({ enemy }) => {
    if (!enemy.mark || (game.core.cooldowns.killers_ledger || 0) > 0) return;
    const target = nearestEnemy(game, enemy.x, enemy.y, enemy.uid);
    if (!target) return;
    game.core.cooldowns.killers_ledger = 2;
    target.mark = { t: enemy.mark.t * 0.5, amp: enemy.mark.amp, crit: enemy.mark.crit };
  });
};

interface DecayingStacks {
  stacks: number;
  lastGain: number;
}

// Cold Calculation (design doc §6.3, simplified to the damage-only half of
// the doc's damage/duration split): critical hits build stacks (max 5,
// decaying after 6s without one) that boost Technique damage — the stack
// count is read directly by resolveCard (js/sim/effects/index.ts).
RELIC_ON_ACQUIRE.cold_calculation = (game) => {
  game.bus.on(EVT.criticalHit, () => {
    const state = (game.relicState.coldCalculation as DecayingStacks | undefined) || { stacks: 0, lastGain: 0 };
    state.stacks = Math.min(5, state.stacks + 1);
    state.lastGain = game.runTime;
    game.relicState.coldCalculation = state;
  });
};

// Rotten Bloom (design doc §6.3): killing a Poisoned enemy (or a Poisoned
// boss crossing a Health threshold) spreads 50% of its stacks (max 4) to
// nearby enemies. A lethal hit on a boss fires bossHealthThreshold (band 0,
// checked in damageEnemy before the hp<=0 check) and enemyKilled in the same
// synchronous frame — the runTime-keyed dedup below collapses those into one
// spread instead of two.
function spreadPoison(game: GameState, enemy: EnemyState): void {
  const poison = enemy.statuses.poison;
  if (!poison) return;
  const last = game.relicState.rottenBloomLast as { uid: number; time: number } | undefined;
  if (last && last.uid === enemy.uid && last.time === game.runTime) return;
  game.relicState.rottenBloomLast = { uid: enemy.uid, time: game.runTime };
  const spread = Math.min(4, Math.round(poison.stacks * 0.5));
  if (spread <= 0) return;
  for (const e of enemiesIn(game, enemy.x, enemy.y, 130)) {
    if (e.uid === enemy.uid || e.dead) continue;
    applyStatus(game, e, 'poison', spread);
  }
}
RELIC_ON_ACQUIRE.rotten_bloom = (game) => {
  game.bus.on(EVT.enemyKilled, ({ enemy }) => spreadPoison(game, enemy));
  game.bus.on(EVT.bossHealthThreshold, ({ enemy }) => spreadPoison(game, enemy));
};

// Venom Glands (design doc §6.3): hitting a Poisoned enemy deals bonus
// damage equal to double its Poison stacks, once per target every 4s —
// calls damageEnemy directly (not hitEnemy), so this can't recursively
// retrigger itself or other on-hit relics.
RELIC_ON_ACQUIRE.venom_glands = (game) => {
  game.bus.on(EVT.enemyHit, ({ enemy }) => {
    const poison = enemy.statuses.poison;
    if (!poison) return;
    const cooldowns = (game.relicState.venomGlandsCooldowns as Record<number, number> | undefined) || {};
    if ((cooldowns[enemy.uid] || 0) > 0) return;
    cooldowns[enemy.uid] = 4;
    game.relicState.venomGlandsCooldowns = cooldowns;
    damageEnemy(game, enemy, poison.stacks * 2, { color: ELEMENT_COLORS.poison, quiet: true });
  });
};

// Mirror Dance (design doc §6.2/6.3): while a Shadow Clone summon is active,
// your Techniques also repeat from performEcho at 40% power — reuses the
// same Echo primitive as Echo Stone/Mirror of Echoes rather than a bespoke
// "clone casts a copy" system. Naturally excludes Clone/Power/summon cards
// since only cat === 'Technique' triggers it.
RELIC_ON_ACQUIRE.mirror_dance = (game) => {
  game.bus.on(EVT.cardResolved, ({ inst, buffs }) => {
    if (inst.def.cat !== 'Technique') return;
    if (!game.summons.some((s) => s.summonFamily === 'clone')) return;
    performEcho(game, inst, buffs, 0.4);
  });
};

// Glass Needle (design doc §6.3): a critical hit against an enemy below 30%
// Health deals a bonus burst, internal cooldown 2s.
RELIC_ON_ACQUIRE.glass_needle = (game) => {
  game.bus.on(EVT.criticalHit, ({ enemy }) => {
    if (enemy.hp / enemy.maxHp >= 0.3) return;
    if ((game.core.cooldowns.glass_needle || 0) > 0) return;
    game.core.cooldowns.glass_needle = 2;
    damageEnemy(game, enemy, 8, { color: '#e8dcc0', quiet: true });
  });
};

// Black Veil (design doc §6.1, revised): Shadowstep's untargetable window is
// extended in js/sim/player.ts's performOverrideDash (the "decoy" — nothing
// can hit the player during it, achieving the same practical outcome as
// "enemies prioritize a decoy" without new AI-targeting code). This half
// covers "hitting a Deathmarked enemy with Shadowstep's empowered knife
// restores 1 Focus" — approximated as the next critical hit shortly after a
// Shadowstep dash (the empowered knife is always a guaranteed crit, and is
// the very next basic attack after the dash), since p.empower is already
// cleared by the time hitEnemy/EVT.criticalHit fires and can't be checked
// directly.
RELIC_ON_ACQUIRE.black_veil = (game) => {
  game.bus.on(EVT.dash, () => {
    if (game.dashOverride?.def.id === 'shadowstep') game.relicState.blackVeilWindow = game.runTime + 1;
  });
  game.bus.on(EVT.criticalHit, ({ enemy }) => {
    const window = (game.relicState.blackVeilWindow as number | undefined) || 0;
    if (game.runTime > window || !enemy.mark) return;
    if ((game.core.cooldowns.black_veil || 0) > 0) return;
    game.core.cooldowns.black_veil = 2;
    gainRelicFlow(game, 1, 'black_veil');
  });
};

// Phantom Thread (design doc §6.3): a recent critical hit discounts the
// next card — the window is set here; resolveCard (js/sim/effects/index.ts)
// consumes it, since cost is only visible there, not on the bus.
RELIC_ON_ACQUIRE.phantom_thread = (game) => {
  game.bus.on(EVT.criticalHit, () => {
    game.relicState.phantomThread = { expiresAt: game.runTime + 5 };
  });
};

// Loaded Dice (design doc §6.3): every 7th direct Rogue hit is a guaranteed
// critical — the flag is consumed by resolveCard (js/sim/effects/index.ts),
// which is the only place critChance can still be influenced before the hit
// resolves.
RELIC_ON_ACQUIRE.loaded_dice = (game) => {
  game.bus.on(EVT.enemyHit, () => {
    const state = (game.relicState.loadedDice as CounterState | undefined) || { count: 0, counter: { value: 0, max: 7, label: 'LOADED' } };
    state.count += 1;
    state.counter.value = state.count;
    game.relicState.loadedDice = state;
    if (state.count < 7) return;
    state.count = 0;
    state.counter.value = 0;
    game.relicState.loadedDiceReady = true;
  });
};

// Marrow Storm (design doc §7.3, simplified): Bonecraft cards mark their
// nearest target as Brittle (+15% damage taken, does not stack past that)
// for 4 seconds.
RELIC_ON_ACQUIRE.marrow_storm = (game) => {
  game.bus.on(EVT.cardResolved, ({ inst }) => {
    if (!(inst.def.keywords || []).includes('Bonecraft')) return;
    const target = nearestEnemy(game, game.player.x, game.player.y);
    if (!target) return;
    target.mark = { t: 4, amp: Math.max(1.15, target.mark?.amp || 0), crit: target.mark?.crit || 0 };
  });
};

interface EarthsplitterZone { x: number; y: number }

// Death Bloom (design doc §7.3): a deliberate summon sacrifice leaves a
// damaging zone, max 3 active — same capped-zone shape as Earthsplitter,
// but keyed off EVT.summonSacrificed (not any summon ending) since the doc
// requires "only from deliberate sacrifices."
RELIC_ON_ACQUIRE.death_bloom = (game) => {
  game.bus.on(EVT.summonSacrificed, ({ summon }) => {
    const active = (game.relicState.deathBloomZones as EarthsplitterZone[] | undefined) || [];
    if (active.length >= 3) {
      const oldest = active.shift();
      if (oldest) game.zones = game.zones.filter((z) => z !== oldest);
    }
    const zone = {
      x: summon.x, y: summon.y, r: 90, t: 0, duration: 6, tickDmg: 6, tickRate: 1, tickT: 0,
      status: null, slow: 0, follow: false, color: '#8ade6a', element: 'poison' as const,
      ctx: { def: summon.ctx.def, buffs: { dmgMult: 1, costMult: 1, channelMult: 1, radiusMult: 1, critChance: 0, repeat: 0, addStatus: [] }, dmgMult: 1, radMult: 1, preview: null, lvl: 1 },
    };
    game.zones.push(zone);
    active.push(zone);
    game.relicState.deathBloomZones = active;
  });
};

// Soul Furnace (design doc §7.3): sacrificing a summon builds a stack (read
// by resolveCard, js/sim/effects/index.ts); resets each encounter, not on
// natural expiration (only listens on summonSacrificed, not summonExpired).
RELIC_ON_ACQUIRE.soul_furnace = (game) => {
  game.bus.on(EVT.summonSacrificed, () => {
    const stacks = Math.min(5, ((game.relicState.soulFurnace as number) || 0) + 1);
    game.relicState.soulFurnace = stacks;
  });
};

// Grave Crown (design doc §7.3, simplified — Summon has no "Elite" concept
// to promote a servant into): the first standard servant each encounter
// deals 50% increased damage. Army of the Dead's shades don't consume this
// (summonFamily 'shade', not 'servant').
RELIC_ON_ACQUIRE.grave_crown = (game) => {
  game.bus.on(EVT.summonCreated, ({ summon }) => {
    if (summon.summonFamily !== 'servant' || game.relicState.graveCrownUsed) return;
    game.relicState.graveCrownUsed = true;
    summon.dmg *= 1.5;
  });
};

// Alpha Instinct (design doc §8.3, simplified): a boss crossing a Health
// threshold while no other enemies are nearby ("isolated") extends the
// active Aspect by up to 4s, capped at the Aspect's own 8s base duration —
// same capping idea as Guardian Roar's Wolf Aspect extension.
RELIC_ON_ACQUIRE.alpha_instinct = (game) => {
  game.bus.on(EVT.bossHealthThreshold, ({ enemy }) => {
    const isolated = enemiesIn(game, enemy.x, enemy.y, 300).every((e) => e.uid === enemy.uid);
    if (!isolated) return;
    if (game.core.active.wolfAspect) game.core.active.wolfAspect = Math.min(8, game.core.active.wolfAspect + 4);
    else if (game.core.active.bearAspect) game.core.active.bearAspect = Math.min(8, game.core.active.bearAspect + 4);
  });
};

// Bear's Wrath (design doc §8.3): taking damage while Bear Aspect is active
// knocks back nearby non-boss enemies, internal cooldown 3s.
RELIC_ON_ACQUIRE.bears_wrath = (game) => {
  game.bus.on(EVT.playerHit, () => {
    if (!(game.core.active.bearAspect > 0)) return;
    if ((game.core.cooldowns.bears_wrath || 0) > 0) return;
    game.core.cooldowns.bears_wrath = 3;
    const p = game.player;
    for (const e of enemiesIn(game, p.x, p.y, 160)) {
      if (e.def.boss) continue; // bosses resist displacement
      const a = Math.atan2(e.y - p.y, e.x - p.x);
      e.kvx = Math.cos(a) * 180;
      e.kvy = Math.sin(a) * 180;
      e.kt = 0.2;
    }
  });
};

// Living Forest (design doc §8.3): killing a Rooted enemy deals bonus damage
// to nearby enemies (internal cooldown 1.5s); a Poisoned-boss-style
// alternative fires on bossHealthThreshold unconditionally, since bosses
// only take a token amount of Root.
RELIC_ON_ACQUIRE.living_forest = (game) => {
  const burst = (x: number, y: number) => {
    if ((game.core.cooldowns.living_forest || 0) > 0) return;
    game.core.cooldowns.living_forest = 1.5;
    for (const e of enemiesIn(game, x, y, 120)) damageEnemy(game, e, 14, { color: '#7fd6a8', quiet: true });
  };
  game.bus.on(EVT.enemyKilled, ({ enemy, x, y }) => {
    if (enemy.root > 0) burst(x, y);
  });
  game.bus.on(EVT.bossHealthThreshold, ({ enemy }) => burst(enemy.x, enemy.y));
};

interface ZoneExtendState {
  extended: number;
}

// Nature's Cycle (design doc §8.3): standing in your own zone extends it,
// max +3s total per zone instance — tracked in a Map keyed by the zone
// object itself so each zone instance has its own budget.
RELIC_ON_ACQUIRE.natures_cycle = (game) => {
  game.relicState.naturesCycleActive = true;
};

// Pact of Ruin (design doc §9.4): a Demon summon expiring damages the
// nearest still-Doomed enemy — finds the closest entry in game.core.dooms by
// distance from the summon's last position rather than requiring the demon
// to have ever targeted that enemy.
RELIC_ON_ACQUIRE.pact_of_ruin = (game) => {
  game.bus.on(EVT.summonExpired, ({ summon }) => {
    if (summon.summonFamily !== 'demon') return;
    let nearest: EnemyState | null = null;
    let nearestDist = Infinity;
    for (const doom of game.core.dooms) {
      if (doom.enemy.dead) continue;
      const dist = Math.hypot(doom.enemy.x - summon.x, doom.enemy.y - summon.y);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = doom.enemy;
      }
    }
    if (nearest) damageEnemy(game, nearest, 20, { color: '#8b1e1e', quiet: true });
  });
};

// Four Seasons (design doc §8.3, simplified): the first Aspect card cast
// each encounter grants 8 Armor.
RELIC_ON_ACQUIRE.four_seasons = (game) => {
  game.bus.on(EVT.cardResolved, ({ inst }) => {
    if (inst.def.id !== 'wolf_aspect' && inst.def.id !== 'bear_aspect') return;
    if (game.relicState.fourSeasonsUsed) return;
    game.relicState.fourSeasonsUsed = true;
    game.player.armor += 8;
  });
};

// shared per-enemy-uid cooldown decay, used by both Avalanche and Venom
// Glands so their identical "count down, drop at zero" loop lives in one place
function decayCooldowns(cooldowns: Record<number, number>, dt: number): void {
  for (const [uid, t] of Object.entries(cooldowns)) {
    const next = t - dt;
    if (next <= 0) delete cooldowns[Number(uid)];
    else cooldowns[Number(uid)] = next;
  }
}

// Moonlit-Grove-style "reset after N seconds idle" and Hunter's Bell's own
// idle reset both live here, ticked once per frame
export function updateRelicMechanics(game: GameState, dt: number): void {
  const bell = game.relicState.huntersBell as HuntersBellState | undefined;
  if (bell && game.runTime - bell.lastHitTime > 3) {
    bell.count = 0;
    bell.counter.value = 0;
  }
  resetOutsideCombat(game, 'astralObservatory');
  resetOutsideCombat(game, 'prismCrown');
  resetOutsideCombat(game, 'archmagesFocusUsed');
  resetOutsideCombat(game, 'veteransInstinctUsed');
  resetOutsideCombat(game, 'soulFurnace');
  resetOutsideCombat(game, 'graveCrownUsed');
  resetOutsideCombat(game, 'fourSeasonsUsed');
  if (!game.relicState.prismCrown) delete game.relicState.prismCrownBonus;

  if (game.relicState.avalancheActive) {
    // decay every frame, not just while a dash is in flight — a 0.5s
    // cooldown can't fully drain during a ~0.1-0.22s dash, so gating the
    // decay itself behind dashT>0 left it frozen between dashes too
    const cooldowns = (game.relicState.avalancheCooldowns as Record<number, number> | undefined) || {};
    decayCooldowns(cooldowns, dt);
    if (game.player.dashT > 0) {
      for (const e of enemiesIn(game, game.player.x, game.player.y, game.player.r + 20)) {
        if (cooldowns[e.uid]) continue;
        cooldowns[e.uid] = 0.5;
        damageEnemy(game, e, 10, { color: '#e8dcc0', quiet: true });
      }
    }
    game.relicState.avalancheCooldowns = cooldowns;
  }

  if (game.relicState.venomGlandsCooldowns) {
    decayCooldowns(game.relicState.venomGlandsCooldowns as Record<number, number>, dt);
  }

  const coldCalc = game.relicState.coldCalculation as DecayingStacks | undefined;
  if (coldCalc && game.runTime - coldCalc.lastGain > 6) coldCalc.stacks = 0;

  if (game.relicState.naturesCycleActive) {
    // WeakMap, not Map — so zone objects removed from game.zones (expired
    // naturally) can still be garbage-collected instead of lingering here
    // for the rest of the run
    const extended = (game.relicState.naturesCycleExtended as WeakMap<object, number> | undefined) || new WeakMap();
    const p = game.player;
    for (const z of game.zones) {
      if (Math.hypot(p.x - z.x, p.y - z.y) >= z.r) continue;
      const soFar = extended.get(z) || 0;
      if (soFar >= 3) continue;
      const grant = Math.min(dt, 3 - soFar);
      z.duration += grant;
      extended.set(z, soFar + grant);
    }
    game.relicState.naturesCycleExtended = extended;
  }
}
