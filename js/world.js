// ── Arcana Engine · world facade ───────────────────────────────────────────
// The simulation now lives entirely under js/sim/. This file is a thin
// re-export of the public surface consumed by main.js, ui.js, render.js, and
// the tests — kept as a stable import path during the migration (see
// REFACTOR_PLAN.md R2.7). It has no logic of its own.

export { createGame, colorOf } from './sim/game.js';
export { updateGame } from './sim/update.js';
export {
  advanceWorld, prepareRun, rollStartingDeck, startRun,
} from './sim/run/lifecycle.js';
export { applyReward } from './sim/run/rewards.js';
export { resolveEncounterChoice } from './sim/run/matchmaking.js';
export {
  CARD_PRICES, MAX_CARD_LVL, buyCard, combineCards, leaveSanctuary, sellCard, sellPrice,
} from './sim/run/sanctuary.js';
export { metaUnlockedWorld, resetMetaProgress } from './sim/run/meta.js';
export {
  CHUNK, biomeOf, getChunk, worldDef,
} from './sim/map/chunks.js';
export { floater } from './sim/fx.js';
