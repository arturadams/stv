import type { EffectCtx, EffectSpec } from '../../data/types.js';
import type { GameState } from '../types.js';

type Handler<K extends EffectSpec['type'] = EffectSpec['type']> = (
  game: GameState,
  eff: Extract<EffectSpec, { type: K }>,
  ctx: EffectCtx,
) => void;

const handlers = new Map<EffectSpec['type'], Handler>();

export function registerEffect<K extends EffectSpec['type']>(type: K, fn: Handler<K>): void {
  handlers.set(type, fn as unknown as Handler);
}

export function resolveEffect(game: GameState, eff: EffectSpec, ctx: EffectCtx): void {
  const handler = handlers.get(eff.type);
  if (!handler) throw new Error(`Unknown effect type: ${eff.type}`);
  handler(game, eff, ctx);
}
