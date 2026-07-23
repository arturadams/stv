import { CARDS } from '../../data/index.js';
import type { CardDef } from '../../data/types.js';
import type { GameState } from '../types.js';
import { canReplaceCard, MAX_DECK_SIZE } from './lifecycle.js';
import { recordChoice } from './talents.js';

export function replaceRewardCard(game: GameState, choice: CardDef, replaceIndex: number): boolean {
  if (game.pendingReward?.type !== 'card' || game.deckIds.length < MAX_DECK_SIZE) return false;
  if (!canReplaceCard(game.deckIds, choice.id, replaceIndex)) return false;
  const removed = game.deckIds[replaceIndex];
  game.deckIds[replaceIndex] = { id: choice.id, lvl: 1, source: 'acquired' };
  game.engine.setDeck(game.deckIds);
  recordChoice(game, 'Draft', 'Replaced ' + (CARDS[removed.id]?.name || removed.id) + ' with ' + choice.name);
  if (game.rewardQueue.length > 0) {
    game.pendingReward = game.rewardQueue.shift() ?? null;
  } else {
    game.pendingReward = null;
    game.state = 'combat';
  }
  game.uiDirty = true;
  return true;
}
