import { CARD_LIST, CARDS, CLASSES, RELICS, TALENT_LIST } from '../../data/index.js';
import { relicRequirementMet } from '../../data/relicRequirements.js';
import type { CardDef, RelicDef } from '../../data/types.js';
import { sfx } from '../../audio.js';
import { gainRelicFlow } from '../effects/enchantActions.js';
import { RELIC_ON_ACQUIRE } from '../effects/relicMechanics.js';
import type { GameState, Reward } from '../types.js';
import { canAcquireCard } from './lifecycle.js';
import { metaUnlockedWorld } from './meta.js';
import { recordChoice } from './talents.js';

const relicDefs: Record<string, RelicDef> = RELICS;

// design doc §16's branchScore formula — how strongly the player's build
// already leans into a branch, used to weight which relics a Golden Chest
// offers. Neutral relics have no `branch`, so they're unaffected (uniform
// weight) until class relics (Phase 4/5) start tagging themselves with one.
function relicBranchScore(
  game: Pick<GameState, 'playerClass' | 'deckIds' | 'chosenTalents'>,
  branch: string,
): number {
  let cardsInBranch = 0;
  let totalLevels = 0;
  for (const entry of game.deckIds) {
    const card = CARDS[entry.id];
    if (!card) continue;
    if (card.branch === branch || card.secondaryBranch === branch || card.keywords?.includes(branch)) {
      cardsInBranch += 1;
      totalLevels += entry.lvl || 1;
    }
  }
  const talentsInBranch = TALENT_LIST.filter(
    (t) => t.classId === game.playerClass && t.branch === branch && game.chosenTalents.includes(t.id),
  ).length;
  return cardsInBranch * 2 + talentsInBranch * 1.5 + totalLevels * 0.5;
}

// Drafts favor your own school for synergy; some Colorless glue; other
// schools only with the Prismatic Codex relic. Each world's card set unlocks
// on arrival there — and stays meta-unlocked for every later run, with a
// reduced chance when you're playing an earlier world.
const RARITY_WEIGHT: Record<CardDef['rarity'], number> = {
  Common: 55, Uncommon: 30, Rare: 12, Legendary: 3,
};

export function draftWeight(
  game: Pick<GameState, 'world' | 'playerClass' | 'hasCrossClass'>,
  c: Pick<CardDef, 'world' | 'rarity' | 'school' | 'disabled'>,
): number {
  if (c.disabled) return 0; // Card System v2 §17: hidden from every live pool
  const cardWorld = c.world || 1;
  const here = game.world || 1;
  if (cardWorld > Math.max(here, metaUnlockedWorld())) return 0; // never reached
  const school = CLASSES[game.playerClass].school;
  let w = RARITY_WEIGHT[c.rarity];
  if (cardWorld > here) w *= 0.3; // meta-unlocked bleed-down: a chance, not the norm
  else if (cardWorld === here && cardWorld > 1) w *= 1.6; // the fresh set is favored
  if (c.school === school) return w;
  if (c.school === 'Colorless') return w * 0.35;
  return game.hasCrossClass ? w * 0.2 : 0;
}

export function makeCardReward(
  game: Pick<GameState, 'world' | 'playerClass' | 'hasCrossClass' | 'rng'>,
): { type: 'card'; options: CardDef[] } {
  const pool = CARD_LIST.filter((c) => draftWeight(game, c) > 0);
  const opts: CardDef[] = [];
  let guard = 200;
  while (opts.length < 3 && guard-- > 0) {
    let total = 0;
    for (const c of pool) total += draftWeight(game, c);
    let roll = game.rng.float() * total;
    let pick = pool[0];
    for (const c of pool) {
      roll -= draftWeight(game, c);
      if (roll <= 0) {
        pick = c;
        break;
      }
    }
    if (!opts.includes(pick)) opts.push(pick);
  }
  return { type: 'card', options: opts };
}

export function makeRelicReward(
  game: Pick<GameState, 'world' | 'playerClass' | 'hasCrossClass' | 'rng' | 'relics' | 'deckIds' | 'chosenTalents' | 'declinedRelics' | 'bossesSlain'>,
): Reward {
  const owned = new Set(game.relics.map((r) => r.id));
  const ownedNeutralLegendary = game.relics.some((r) => r.category === 'legendary');
  const ownedClassCount = game.relics.filter((r) => r.category === 'class').length;
  // prune stale entries opportunistically so the array doesn't grow forever
  game.declinedRelics = game.declinedRelics.filter((d) => d.expiresAtBoss >= game.bossesSlain);
  // >= (not >): expiresAtBoss is set to bossesSlain-at-decline + 2, and that
  // count already reflects the chest just declined, so the boundary chest
  // itself must still be excluded — see design doc §16 "next two chests"
  const declined = new Set(game.declinedRelics.map((d) => d.id));

  const pool = Object.values(RELICS).filter((r) => {
    if (owned.has(r.id) || declined.has(r.id)) return false;
    if (r.category === 'legendary' && ownedNeutralLegendary) return false;
    if (r.category === 'class' && ownedClassCount >= 4) return false;
    if (r.classId && r.classId !== game.playerClass) return false;
    if (!relicRequirementMet(game.deckIds, r.id)) return false;
    return true;
  });
  if (pool.length === 0) return makeCardReward(game);

  // weight by branch alignment (design doc §16) — a no-op uniform weight
  // for branch-less relics, which is every Neutral relic today
  const weight = (r: RelicDef) => (r.branch ? relicBranchScore(game, r.branch) + 1 : 1);
  const opts: RelicDef[] = [];
  let guard = 60;
  while (opts.length < Math.min(3, pool.length) && guard-- > 0) {
    const candidates = pool.filter((r) => !opts.includes(r));
    let total = 0;
    for (const r of candidates) total += weight(r);
    let roll = game.rng.float() * total;
    let pick = candidates[0];
    for (const r of candidates) {
      roll -= weight(r);
      if (roll <= 0) {
        pick = r;
        break;
      }
    }
    opts.push(pick);
  }
  return { type: 'relic', options: opts };
}

export function offerReward(
  game: Pick<GameState, 'rewardQueue' | 'pendingReward' | 'state' | 'uiDirty'>,
  reward: Reward,
  heading: string,
): void {
  game.rewardQueue.push({ ...reward, heading });
  if (!game.pendingReward) {
    game.pendingReward = game.rewardQueue.shift() ?? null;
    game.state = 'reward';
    game.uiDirty = true;
    sfx('reward');
  }
}

export function applyReward(game: GameState, choice: CardDef | RelicDef | null): void {
  // §10.2: deck-size-12 / max-2-copies cap — a pick that can't be taken
  // (deck full, or already at 2 copies) falls through to the decline reward
  // instead of silently exceeding the cap. A full replace-or-decline picker
  // is a separate feature, not built here.
  if (choice && game.pendingReward?.type === 'card' && !canAcquireCard(game.deckIds, choice.id)) {
    choice = null;
  }
  if (choice && game.pendingReward) {
    if (game.pendingReward.type === 'card') {
      recordChoice(game, 'Draft', 'Added ' + choice.name);
      game.deckIds.push({ id: choice.id, lvl: 1, source: 'acquired' });
      game.engine.deck.push(game.engine.makeCard(choice.id));
      game.engine.shuffleArray(game.engine.deck);
    } else {
      applyRelic(game, choice.id);
    }
  } else if (!choice) {
    game.player.hp = Math.min(game.player.maxHp, game.player.hp + 15);
    // The Ashen Gate: declining any reward pays out Flow instead
    if (game.relics.some((r) => r.id === 'the_ashen_gate')) gainRelicFlow(game, 3, 'the_ashen_gate');
  }
  // design doc §16: whatever wasn't taken from a relic offer (including all
  // three if the whole chest was declined) sits out of the next two chests
  if (game.pendingReward?.type === 'relic') {
    for (const opt of game.pendingReward.options) {
      if (opt.id !== choice?.id) game.declinedRelics.push({ id: opt.id, expiresAtBoss: game.bossesSlain + 2 });
    }
  }
  if (game.rewardQueue.length > 0) {
    game.pendingReward = game.rewardQueue.shift() ?? null;
    game.uiDirty = true;
    return;
  }
  game.pendingReward = null;
  game.state = 'combat';
  game.uiDirty = true;
}

// design doc §4.2 (Leyline Core): "Global Overflow cap across relics and
// talents: 5" — a combined ceiling on how much Maximum Flow every maxFlow-
// granting relic together may add, not a per-relic limit
const MAX_RELIC_FLOW_BONUS = 5;

function applyRelic(game: GameState, id: string): void {
  const relic = relicDefs[id];
  game.relics.push(relic);
  if (relic.stats) {
    if (relic.stats.maxFlow) {
      const current = (game.relicState.maxFlowBonusFromRelics as number) || 0;
      const granted = Math.max(0, Math.min(relic.stats.maxFlow, MAX_RELIC_FLOW_BONUS - current));
      game.relicState.maxFlowBonusFromRelics = current + granted;
      game.engine.maxFlow += granted;
    }
    if (relic.stats.channelMult) game.engine.channelMultGlobal *= relic.stats.channelMult;
    if (relic.stats.radiusMult) game.relicRadiusMult *= relic.stats.radiusMult;
    if (relic.stats.powerDurMult) game.engine.powerDurMult *= relic.stats.powerDurMult;
    if (relic.stats.duelist) game.hasDuelist = true;
    if (relic.stats.crossClass) game.hasCrossClass = true;
    if (relic.stats.goldMult) game.goldMult *= relic.stats.goldMult;
    if (relic.stats.sellPriceMult) game.sellPriceMult *= relic.stats.sellPriceMult;
    if (relic.stats.buyPriceMult) game.buyPriceMult *= relic.stats.buyPriceMult;
    if (relic.stats.maxHealth) {
      game.player.maxHp += relic.stats.maxHealth;
      game.player.hp += relic.stats.maxHealth;
    }
    if (relic.stats.damageReductionMax) game.damageReductionCap += relic.stats.damageReductionMax;
    if (relic.stats.queueCapBonus) game.engine.queueCap += relic.stats.queueCapBonus;
    if (relic.stats.summonCapBonus) {
      game.relicState.summonCapBonus = ((game.relicState.summonCapBonus as number) || 0) + relic.stats.summonCapBonus;
    }
  }
  for (const spec of Array.isArray(relic.enchant) ? relic.enchant : relic.enchant ? [relic.enchant] : []) {
    game.engine.addEnchant(spec, { name: relic.name, glyph: relic.glyph, color: relic.color });
  }
  if (relic.bespoke) RELIC_ON_ACQUIRE[relic.id]?.(game);
  game.uiDirty = true;
}
