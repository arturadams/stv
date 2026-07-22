import { CARDS, CARD_LIST } from '../../data/index.js';
import type { CardDef, Rarity, Sanctuary } from '../../data/types.js';
import { makeRng } from '../../core/rng.js';
import { sfx } from '../../audio.js';
import type { DeckEntry, GameState } from '../types.js';
import { canAcquireCard } from './lifecycle.js';
import { draftWeight } from './rewards.js';

import { recordChoice } from './talents.js';
// ═══ sanctuaries: rest, trade, and combine duplicate cards ═══
export const CARD_PRICES: Record<Rarity, number> = {
  Common: 25, Uncommon: 40, Rare: 70, Legendary: 120,
};
export const MAX_CARD_LVL = 3;

export function sellPrice(entry: DeckEntry): number {
  const def = CARDS[entry.id];
  return Math.floor(CARD_PRICES[def.rarity] / 2) + Math.max(0, (entry.lvl || 1) - 1) * 15;
}

// The merchant's stock is small and seeded: the same sanctuary always offers
// the same few cards (until bought), no matter when you arrive. Stock size
// is decided once, at first visit — a sanctuary visited before Wanderer's
// Purse is acquired stays at its original size for the rest of the run
// (matches "future sanctuaries" rather than retroactively resizing one
// that's already showing purchasable state).
function buildStock(game: Pick<GameState, 'world' | 'playerClass' | 'hasCrossClass' | 'relics'>, s: Sanctuary): void {
  if (s.stock) return;
  const rng = makeRng(s.seed);
  const pool = CARD_LIST.filter((c) => draftWeight(game, c) > 0);
  const stock: CardDef[] = [];
  const stockSize = game.relics.some((r) => r.stats?.extraStock) ? 5 : 4;
  let guard = 80;
  while (stock.length < stockSize && guard-- > 0) {
    let total = 0;
    for (const c of pool) total += draftWeight(game, c);
    let roll = rng.float() * total;
    let pick = pool[0];
    for (const c of pool) {
      roll -= draftWeight(game, c);
      if (roll <= 0) {
        pick = c;
        break;
      }
    }
    if (!stock.includes(pick)) stock.push(pick);
  }
  s.stock = stock;
}

export function openSanctuary(game: GameState, s: Sanctuary): void {
  s.lock = true;
  buildStock(game, s);
  game.sanctuary = s;
  game.state = 'sanctuary';
  game.player.hp = Math.min(game.player.maxHp, game.player.hp + 20);
  for (const r of game.relics) {
    if (r.stats?.sanctuaryGold) game.gold += Math.round(r.stats.sanctuaryGold * game.goldMult);
    if (r.stats?.sanctuaryArmor) game.player.armor += r.stats.sanctuaryArmor;
  }
  game.banner = { title: 'SANCTUARY', sub: 'The wards hold. Rest, trade, refine your deck.', t: 2.4 };
  game.uiDirty = true;
  sfx('shrine');
}

export function buyCard(game: GameState, idx: number): boolean {
  const s = game.sanctuary;
  if (!s || !s.stock || !s.stock[idx]) return false;
  const def = s.stock[idx];
  const price = Math.round(CARD_PRICES[def.rarity] * game.buyPriceMult);
  if (game.gold < price) return false;
  if (!canAcquireCard(game.deckIds, def.id)) return false;
  game.gold -= price;
  s.stock.splice(idx, 1);
  recordChoice(game, 'Sanctuary', 'Added ' + def.name);
  game.deckIds.push({ id: def.id, lvl: 1, source: 'acquired' });
  game.uiDirty = true;
  sfx('reward');
  return true;
}

export function sellCard(game: GameState, id: string, lvl: number): boolean {
  if (game.deckIds.length <= 6) return false; // never sell below a playable deck
  const i = game.deckIds.findIndex((e) => e.id === id && (e.lvl || 1) === lvl);
  if (i < 0) return false;
  game.gold += Math.round(sellPrice(game.deckIds[i]) * game.sellPriceMult);
  game.deckIds.splice(i, 1);
  game.uiDirty = true;
  sfx('shard');
  return true;
}

// two identical cards of the same level fuse into one, a level higher
export function combineCards(game: GameState, id: string, lvl: number): boolean {
  if (lvl >= MAX_CARD_LVL) return false;
  const idxs: number[] = [];
  game.deckIds.forEach((e, i) => {
    if (e.id === id && (e.lvl || 1) === lvl) idxs.push(i);
  });
  if (idxs.length < 2) return false;
  recordChoice(game, 'Sanctuary', 'Upgraded ' + CARDS[id].name + ' to Level ' + (lvl + 1));
  game.deckIds.splice(idxs[1], 1);
  game.deckIds[idxs[0]].lvl = lvl + 1;
  game.uiDirty = true;
  sfx('enchant');
  return true;
}

export function leaveSanctuary(game: GameState): void {
  game.sanctuary = null;
  game.engine.setDeck(game.deckIds); // the rest reshuffles everything fresh
  game.state = 'combat';
  game.banner = { title: 'THE ROAD CALLS', sub: '', t: 1.4 };
  game.uiDirty = true;
  sfx('wave');
}
