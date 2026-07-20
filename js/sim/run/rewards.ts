import { CARD_LIST, CLASSES, RELICS } from '../../data/index.js';
import type { CardDef, RelicDef } from '../../data/types.js';
import { sfx } from '../../audio.js';
import type { GameState, Reward } from '../types.js';
import { canAcquireCard } from './lifecycle.js';
import { metaUnlockedWorld } from './meta.js';
import { recordChoice } from './talents.js';

const relicDefs: Record<string, RelicDef> = RELICS;

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
  game: Pick<GameState, 'world' | 'playerClass' | 'hasCrossClass' | 'rng' | 'relics'>,
): Reward {
  const owned = new Set(game.relics.map((r) => r.id));
  const pool = Object.values(RELICS).filter((r) => !owned.has(r.id));
  if (pool.length === 0) return makeCardReward(game);
  const opts: RelicDef[] = [];
  let guard = 60;
  while (opts.length < Math.min(3, pool.length) && guard-- > 0) {
    const pick = game.rng.pick(pool);
    if (!opts.includes(pick)) opts.push(pick);
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

function applyRelic(game: GameState, id: string): void {
  const relic = relicDefs[id];
  game.relics.push(relic);
  if (relic.stats) {
    if (relic.stats.maxFlow) game.engine.maxFlow += relic.stats.maxFlow;
    if (relic.stats.channelMult) game.engine.channelMultGlobal *= relic.stats.channelMult;
    if (relic.stats.radiusMult) game.relicRadiusMult *= relic.stats.radiusMult;
    if (relic.stats.powerDurMult) game.engine.powerDurMult *= relic.stats.powerDurMult;
    if (relic.stats.duelist) game.hasDuelist = true;
    if (relic.stats.crossClass) game.hasCrossClass = true;
  }
  if (relic.enchant) game.engine.addEnchant(relic.enchant, { name: relic.name, glyph: relic.glyph, color: relic.color });
  game.uiDirty = true;
}
