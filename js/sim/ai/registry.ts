import type { BehaviorId, EnemyState } from '../../data/types.js';
import type { GameState, PlayerState } from '../types.js';

export interface BehaviorTickInfo {
  dist: number;
  ux: number;
  uy: number;
  spd: number;
  rooted: boolean;
  p: PlayerState;
}

export interface BehaviorDef<S> {
  init?: (e: EnemyState, game: GameState) => S;
  update: (game: GameState, e: EnemyState, dt: number, t: BehaviorTickInfo, state: S) => void;
}

const behaviors = new Map<BehaviorId, BehaviorDef<unknown>>();

export function registerBehavior<S>(id: BehaviorId, def: BehaviorDef<S>): void {
  behaviors.set(id, def as unknown as BehaviorDef<unknown>);
}

function requireBehavior(id: BehaviorId): BehaviorDef<unknown> {
  const def = behaviors.get(id);
  if (!def) throw new Error(`Unknown enemy behavior: ${id}`);
  return def;
}

// Called once, right after an enemy is constructed, so its `ai` scratch
// state exists before the first tick.
export function initEnemyBehavior(e: EnemyState, game: GameState): void {
  const def = requireBehavior(e.def.behavior);
  if (def.init) e.ai = def.init(e, game);
}

export function updateEnemyBehavior(game: GameState, e: EnemyState, dt: number, t: BehaviorTickInfo): void {
  const def = requireBehavior(e.def.behavior);
  def.update(game, e, dt, t, e.ai);
}
