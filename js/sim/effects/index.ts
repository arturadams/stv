import type { Buffs, CardInstance, EffectCtx, EffectPreview, CardDef, EffectSpec } from '../../data/types.js';
import { enemiesIn, hitEnemy, nearestEnemy } from '../combat.js';
import { colorOf } from '../game.js';
import type { GameState } from '../types.js';
import { resolveEffect } from './registry.js';
import { coreCardDamageMultiplier } from './coreMechanic.js';
import { talentDamageMultiplier, talentStatusBonuses } from '../run/talents.js';
import { registerEnchantAction } from './enchantActions.js';

// registering every effect handler and enchant action is a side effect of
// importing these modules — this file is the one place that pulls them all
// in, so nothing else needs to know the full list.
import './power.js';
import './sustained.js';
import './trap.js';
import './aoe.js';
import './proj.js';
import './zone.js';
import './arc.js';
import './chain.js';
import './movement.js';
import './defense.js';
import './heal.js';
import './engineOps.js';
import './mark.js';
import './enchantActions.js';
import './coreMechanic.js';
import './coreSummon.js';

// ═══ channel preview ═══
export function computePreview(game: GameState, def: CardDef, buffs: Buffs): EffectPreview | null {
  const p = game.player;
  const radMult = (buffs.radiusMult || 1) * game.relicRadiusMult;
  const color = colorOf(def);
  if (def.preview) {
    const r = def.preview.r * radMult;
    if (def.targeting === 'self') return { x: p.x, y: p.y, r, follow: true, color };
    const t = nearestEnemy(game, p.x, p.y);
    return t
      ? { x: t.x, y: t.y, r, follow: false, color }
      : { x: p.x + Math.cos(p.facing) * 180, y: p.y + Math.sin(p.facing) * 180, r, follow: false, color };
  }
  if (def.targeting === 'nearest') {
    const t = nearestEnemy(game, p.x, p.y);
    if (t) return { enemy: t, r: 24, reticle: true, color, x: t.x, y: t.y };
  }
  return null;
}

// Pilgrim's Spur / The Black Star both empower a card's effects based on its
// primary behavior, collapsed from the design doc's per-category tables into
// field-presence checks: anything with a `dmg` gets a damage bump (via ctx,
// so mark/crit math still applies on top of it), anything with a healing
// `amount` gets healed-more, a `summon` effect gets its own dmg/dur bump,
// and anything else with a `dur`/`duration` field (Power, dashOverride,
// zone) gets extended — covers damage/heal/power/zone/summon/dashOverride
// without special-casing every effect type by name.
function withEffectBonus(
  eff: EffectSpec,
  ctx: EffectCtx,
  dmgMult: number,
  healMult: number,
  durMult: number,
  summonDmgMult: number,
): [EffectSpec, EffectCtx] {
  const rec = eff as unknown as Record<string, unknown>;
  if (eff.type === 'summon') {
    return [{ ...eff, dmg: eff.dmg * summonDmgMult, dur: eff.dur * durMult } as EffectSpec, ctx];
  }
  // consumeStatus (e.g. Rupture Toxin) deals damage via damagePerStack, not
  // a `dmg` field, but still flows through hitEnemy's ctx.dmgMult like any
  // other damage effect
  if (typeof rec.dmg === 'number' || typeof rec.damagePerStack === 'number') {
    return [eff, { ...ctx, dmgMult: ctx.dmgMult * dmgMult }];
  }
  if (eff.type === 'heal' || eff.type === 'healOverTime') {
    return [{ ...eff, amount: eff.amount * healMult } as EffectSpec, ctx];
  }
  // coreMechanic's `dur` is often a delay/fuse (e.g. Doom), not a beneficial
  // duration — stretching it would make the payoff arrive later for no
  // benefit, so it's excluded from the generic duration bump
  if (eff.type !== 'coreMechanic') {
    if (typeof rec.dur === 'number') return [{ ...eff, dur: (rec.dur as number) * durMult } as EffectSpec, ctx];
    if (typeof rec.duration === 'number') return [{ ...eff, duration: (rec.duration as number) * durMult } as EffectSpec, ctx];
  }
  return [eff, ctx];
}

function withPilgrimsSpur(eff: EffectSpec, ctx: EffectCtx): [EffectSpec, EffectCtx] {
  return withEffectBonus(eff, ctx, 1.2, 1.2, 1.15, 1.2);
}

// The Black Star (design doc §10.4): Signatures cost 2 additional resource
// (charged post-resolve in resolveCard below, since cost is normally
// deducted at channel-start in engine.js before this function ever runs),
// but their primary effect is dramatically stronger. Simplified from the
// doc's per-category percentages to one consistent set via withEffectBonus.
function withBlackStar(eff: EffectSpec, ctx: EffectCtx): [EffectSpec, EffectCtx] {
  return withEffectBonus(eff, ctx, 1.8, 1.8, 1.2, 1.6);
}

// ═══ effect resolver ═══ every card flows through here; no one-off logic ═══
export function resolveCard(
  game: GameState,
  inst: CardInstance,
  buffs: Buffs,
  preview: EffectPreview | null,
  opts: { isEcho?: boolean } = {},
): void {
  const def = inst.def;
  const p = game.player;
  const lvl = Math.max(1, Math.min(3, inst.lvl || 1));
  const upgradeRank = lvl - 1;
  const damageScale = upgradeRank === 1 ? 1.2 : upgradeRank === 2 ? 1.4 : 1;
  let dmgMult = (buffs.dmgMult || 1) * damageScale * coreCardDamageMultiplier(game) * talentDamageMultiplier(game, def);
  if (game.hasDuelist && def.school === 'Warrior' && game.engine.queue.length <= 1) dmgMult *= 1.6;
  // Cinder Script (design doc §4.2, simplified): Fire Signatures deal 15% more damage
  if (def.element === 'fire' && def.cat === 'Signature' && game.relics.some((r) => r.id === 'cinder_script')) {
    dmgMult *= 1.15;
  }
  // Master Trapper (design doc §6.3, simplified): Springblade Trap deals 40% more damage
  if (def.id === 'springblade_trap' && game.relics.some((r) => r.id === 'master_trapper')) {
    dmgMult *= 1.4;
  }
  // Perfect Edge (design doc §5.2, simplified to a flat bonus rather than
  // stacks): Duelist Techniques deal 12% more damage
  if (def.cat === 'Technique' && (def.branch === 'Duelist' || def.secondaryBranch === 'Duelist') && game.relics.some((r) => r.id === 'perfect_edge')) {
    dmgMult *= 1.12;
  }
  // Crimson Arena (design doc §5.2): +20% damage while "surrounded" — 3+
  // nearby normal enemies, or a nearby boss (which counts as 3)
  if (game.relics.some((r) => r.id === 'crimson_arena')) {
    const nearby = enemiesIn(game, p.x, p.y, 260);
    const weight = nearby.reduce((sum, e) => sum + (e.def.boss ? 3 : 1), 0);
    if (weight >= 3) dmgMult *= 1.2;
  }
  // Cold Calculation (design doc §6.3, simplified): crit-built stacks (up to
  // 5, tracked by relicMechanics.ts) boost Technique damage 4% per stack
  if (def.cat === 'Technique') {
    const coldCalc = game.relicState.coldCalculation as { stacks: number } | undefined;
    if (coldCalc?.stacks) dmgMult *= 1 + coldCalc.stacks * 0.04;
  }
  // Prism Crown (design doc §4.2): a stacking bonus (up to +15%) for having
  // touched Fire/Frost/Arcane cards this encounter — tracked and written by
  // relicMechanics.ts's RELIC_ON_ACQUIRE.prism_crown, read here directly out
  // of relicState rather than via an import (avoids a circular dependency)
  dmgMult *= 1 + ((game.relicState.prismCrownBonus as number) || 0);
  // Grave Commander (design doc §7.3, simplified): each active servant
  // grants +6% card damage, max 24% at 4 servants
  if (game.relics.some((r) => r.id === 'grave_commander')) {
    const servants = game.summons.filter((s) => s.summonFamily === 'servant').length;
    dmgMult *= 1 + Math.min(4, servants) * 0.06;
  }
  // Pale Lantern (design doc §7.3, simplified): +15% card damage while you
  // have no active servants
  if (!game.summons.some((s) => s.summonFamily === 'servant') && game.relics.some((r) => r.id === 'pale_lantern')) {
    dmgMult *= 1.15;
  }
  // Soul Furnace (design doc §7.3): each sacrifice-built stack (max 5) grants +5% card damage
  const soulFurnace = game.relicState.soulFurnace as number | undefined;
  if (soulFurnace) dmgMult *= 1 + soulFurnace * 0.05;
  // Hell Engine (design doc §9.1, simplified): Hellfire and Rain of Fire deal 20% more damage
  if ((def.id === 'hellfire' || def.id === 'rain_of_fire') && game.relics.some((r) => r.id === 'hell_engine')) {
    dmgMult *= 1.2;
  }
  // Blood Moon (design doc §9.4): below 40% Health, cards deal 25% more
  // damage; a hysteresis latch in relicState (only written/read here) keeps
  // it on until Health recovers above 60%, avoiding flicker at the boundary
  if (game.relics.some((r) => r.id === 'blood_moon')) {
    const hpPct = p.hp / p.maxHp;
    if (hpPct <= 0.4) game.relicState.bloodMoonActive = true;
    else if (hpPct >= 0.6) game.relicState.bloodMoonActive = false;
    if (game.relicState.bloodMoonActive) dmgMult *= 1.25;
  }
  const radMult = (buffs.radiusMult || 1) * game.relicRadiusMult * (upgradeRank === 2 ? 1.1 : 1);
  let critBonus = buffs.critChance || 0;
  if (game.playerClass === 'rogue') critBonus += game.engine.flow * 0.024;
  // Loaded Dice (design doc §6.3): every 7th direct hit empowers the
  // player's own next card — guarded against Echo replays (Mirror Dance,
  // Echo Stone, etc.) stealing the guaranteed crit the same way Pilgrim's
  // Spur and The Black Star already guard their own effects below
  if (!opts.isEcho && game.relicState.loadedDiceReady) {
    critBonus = 1;
    delete game.relicState.loadedDiceReady;
  }
  const addStatus = [...(buffs.addStatus || []), ...talentStatusBonuses(game, def)];
  const flameSigil = (game.core.active.flameSigil || 0) > 0 && def.cat === 'Signature';
  if (flameSigil) addStatus.push(['burn', 1]);
  const ctx: EffectCtx = {
    def, buffs: { ...buffs, addStatus, critChance: critBonus },
    dmgMult, radMult, preview, lvl, upgradeRank,
  };
  // Pilgrim's Spur (design doc §10.2): a Perfect Dodge empowers the very
  // next card to resolve, once, based on its primary behavior — consumed
  // here regardless of whether it's still within its 6s window, since
  // that's what "the next card" means
  const spur = game.relicState.pilgrimsSpur as { expiresAt: number } | undefined;
  const spurActive = !opts.isEcho && !!spur && game.runTime < spur.expiresAt;
  if (spur) delete game.relicState.pilgrimsSpur;
  // The Black Star (design doc §10.4): always-on while owned, Signatures only
  const blackStarActive = !opts.isEcho && def.cat === 'Signature' && game.relics.some((r) => r.id === 'the_black_star');
  const arcaneCompassActive = def.id === 'teleport' && game.relics.some((r) => r.id === 'arcane_compass');
  const endlessSmokeActive = def.id === 'smoke_bomb' && game.relics.some((r) => r.id === 'endless_smoke');
  // Executioner's Oath (design doc §5.1): Finisher thresholds +5pp
  const executionersOathActive = (def.keywords || []).includes('Finisher') && game.relics.some((r) => r.id === 'executioners_oath');
  // Ossuary Core (design doc §7.3, simplified): Bonecraft projectiles pierce one additional enemy
  const ossuaryCoreActive = (def.keywords || []).includes('Bonecraft') && game.relics.some((r) => r.id === 'ossuary_core');
  // Pack Alpha (design doc §8.3, simplified): Pack Hunt's wolves deal 20% more damage
  const packAlphaActive = def.id === 'pack_hunt' && game.relics.some((r) => r.id === 'pack_alpha');
  // Wild Communion (design doc §8.3, simplified): Pack Hunt's wolves and
  // World Tree's zone last 20% longer (does not extend Aspect duration)
  const wildCommunionActive = (def.id === 'pack_hunt' || def.id === 'world_tree') && game.relics.some((r) => r.id === 'wild_communion');
  // Endless Curse (design doc §9.2): Doom's fuse burns 30% slower — gated to
  // Doom's own coreMechanic id, not the generic `mark` effect type, since
  // mark is shared with Rogue's Deathmark and would otherwise cross-buff it
  const endlessCurseActive = def.id === 'doom' && game.relics.some((r) => r.id === 'endless_curse');
  // Soul Leech (design doc §9.2): Life Drain heals for an additional 15% of damage dealt
  const soulLeechActive = def.id === 'life_drain' && game.relics.some((r) => r.id === 'soul_leech');
  // Infernal Blood (design doc §9.3): Health costs from your cards are reduced by 2
  const infernalBloodActive = game.relics.some((r) => r.id === 'infernal_blood');
  // Demonic Choir (design doc §9.3): Familiar and Demon summons deal 15% more
  // damage — gated to Warlock's own summon cards, not the generic `summon`
  // effect type, which is shared with Rogue/Necromancer/Druid summon cards
  // reachable via cross-class relics (game.hasCrossClass)
  const demonicChoirActive = (def.id === 'lesser_familiar' || def.id === 'infernal_gate') && game.relics.some((r) => r.id === 'demonic_choir');
  for (const eff of def.effects) {
    // an Echo replay pays no Health cost, same as it pays no resource cost
    // by never touching the engine's queue/flow (design doc §13)
    if (opts.isEcho && eff.type === 'healthCost') continue;
    const [e1, c1] = spurActive ? withPilgrimsSpur(eff, ctx) : [eff, ctx];
    const [e2, c2] = blackStarActive ? withBlackStar(e1, c1) : [e1, c1];
    // Arcane Compass (design doc §4): Teleport's blink range +25%
    const e3 = arcaneCompassActive && e2.type === 'dashOverride'
      ? { ...e2, move: { ...e2.move, dist: e2.move.dist * 1.25 } }
      : e2;
    const e4 = executionersOathActive && e3.type === 'arc' && e3.executeBelow != null
      ? { ...e3, executeBelow: e3.executeBelow + 0.05 }
      : e3;
    // Endless Smoke (design doc §6.3): Smoke Bomb's zone lasts 5s longer
    const e5 = endlessSmokeActive && e4.type === 'zone'
      ? { ...e4, duration: e4.duration + 5 }
      : e4;
    const e6 = ossuaryCoreActive && e5.type === 'proj'
      ? { ...e5, pierce: (e5.pierce || 0) + 1 }
      : e5;
    const e7 = packAlphaActive && e6.type === 'summon'
      ? { ...e6, dmg: e6.dmg * 1.2 }
      : e6;
    const e8 = wildCommunionActive
      ? e7.type === 'summon' ? { ...e7, dur: e7.dur * 1.2 } : e7.type === 'zone' ? { ...e7, duration: e7.duration * 1.2 } : e7
      : e7;
    const e9 = endlessCurseActive && e8.type === 'coreMechanic'
      ? { ...e8, dur: (e8.dur || 6) * 1.3 }
      : e8;
    const e10 = soulLeechActive && e9.type === 'sustained' && e9.do.chain
      ? { ...e9, do: { chain: { ...e9.do.chain, lifesteal: (e9.do.chain.lifesteal || 0) + 0.15 } } }
      : e9;
    const e11 = infernalBloodActive && e10.type === 'healthCost'
      ? { ...e10, amount: Math.max(0, e10.amount - 2) }
      : e10;
    const e12 = demonicChoirActive && e11.type === 'summon'
      ? { ...e11, dmg: e11.dmg * 1.15 }
      : e11;
    resolveEffect(game, e12, c2);
  }
  // Archmage's Focus (design doc §4, simplified): the first card each
  // encounter refunds its printed cost — implemented as a post-resolve
  // refund (same reasoning as The Black Star's surcharge) since cost is
  // normally deducted at channel-start, before this function ever runs
  if (!opts.isEcho && !game.relicState.archmagesFocusUsed && game.relics.some((r) => r.id === 'archmage_focus')) {
    game.relicState.archmagesFocusUsed = true;
    game.engine.gainFlow(inst.cost, 'archmage_focus');
  }
  // Phantom Thread (design doc §6.3, simplified): a recent critical hit
  // refunds up to 1 Focus on the next card — implemented as a post-resolve
  // refund for the same cost-pipeline-timing reason as Archmage's Focus
  const phantomThread = game.relicState.phantomThread as { expiresAt: number } | undefined;
  if (!opts.isEcho && phantomThread && game.runTime < phantomThread.expiresAt) {
    delete game.relicState.phantomThread;
    game.engine.gainFlow(Math.min(1, inst.cost), 'phantom_thread');
  }
  // charged here (post-resolve) rather than at channel-start, since this
  // function has no visibility into the engine's cost pipeline — net effect
  // is the same total cost, just paid in two installments
  if (blackStarActive) game.engine.flow = Math.max(0, game.engine.flow - 2);
  if (flameSigil && (game.core.cooldowns.flameSigil || 0) <= 0) {
    const target = nearestEnemy(game, p.x, p.y);
    if (target) {
      for (const enemy of enemiesIn(game, target.x, target.y, 55)) hitEnemy(game, enemy, 8, ctx, {});
      game.core.cooldowns.flameSigil = 2;
    }
  }
  game.fx.push({ kind: 'cast', x: p.x, y: p.y, color: colorOf(def), t: 0, life: 0.35 });
}

// ═══ Echo (design doc §13) ═══ replays a just-resolved card at reduced
// power, paying no resource/health cost. Calling resolveCard directly
// (instead of going through the engine's queue) already means a plain
// on-cardResolved echo can't recursively re-trigger itself, since
// engine.doResolve is the only place that emits EVT.cardResolved — but an
// echo attached to a different event (e.g. a future relic firing echo off
// EVT.criticalHit, which resolveCard's own hits can re-emit) wouldn't get
// that protection for free, so this also carries an explicit reentrancy
// guard rather than relying on every future echo relic being wired to
// cardResolved.
let echoInProgress = false;
export function performEcho(game: GameState, inst: CardInstance, buffs: Buffs, powerMult: number): void {
  if (echoInProgress) return;
  echoInProgress = true;
  try {
    const echoBuffs: Buffs = { ...buffs, dmgMult: (buffs.dmgMult || 1) * powerMult };
    resolveCard(game, inst, echoBuffs, null, { isEcho: true });
  } finally {
    echoInProgress = false;
  }
}

registerEnchantAction('echo', (game, value, payload) => {
  if (!payload.inst || !payload.buffs) return;
  performEcho(game, payload.inst, payload.buffs, value.powerMult);
});

// Echo Stone (design doc §10.3): every Nth Signature repeats at reduced
// power — registered here (not enchantActions.ts) since it needs
// performEcho, which lives in this file
registerEnchantAction('stackAndEcho', (game, value, payload, ench) => {
  if (!ench || !payload.inst || !payload.buffs) return;
  if (!ench.counter) ench.counter = { value: 0, max: value.max, label: value.label };
  ench.counter.value += 1;
  game.uiDirty = true;
  if (ench.counter.value < ench.counter.max) return;
  ench.counter.value = 0;
  performEcho(game, payload.inst, payload.buffs, value.powerMult);
});
