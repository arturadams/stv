import { ATTUNEMENT_IDS, ELEMENT_COLORS } from '../../data/index.js';
import type { CardInstance, EnchantDo, EnemyState } from '../../data/types.js';
import { EVT } from '../../core/events.js';
import { sfx } from '../../audio.js';
import { applyStatus, damageEnemy, enemiesIn, nearestEnemy } from '../combat.js';
import { floater, spark } from '../fx.js';
import type { GameState } from '../types.js';

// The card engine calls this generically for every enchant/relic trigger; the
// payload shape depends on which event fired it (see core/events.ts's
// EventMap). Only the fields actually read here are typed.
export interface EnchantPayload {
  id?: string;
  x?: number;
  y?: number;
  enemy?: EnemyState;
}
export interface EnchantRef {
  color: string;
  relic?: boolean;
}

type EnchantActionHandler<K extends keyof EnchantDo> = (
  game: GameState,
  value: NonNullable<EnchantDo[K]>,
  payload: EnchantPayload,
) => void;

const handlers = new Map<keyof EnchantDo, EnchantActionHandler<keyof EnchantDo>>();

export function registerEnchantAction<K extends keyof EnchantDo>(key: K, fn: EnchantActionHandler<K>): void {
  handlers.set(key, fn as EnchantActionHandler<keyof EnchantDo>);
}

registerEnchantAction('flow', (game, value) => {
  game.engine.gainFlow(value, 'enchant');
});

registerEnchantAction('flowIfNear', (game, value) => {
  const p = game.player;
  if (nearestEnemy(game, p.x, p.y, undefined, 260)) game.engine.gainFlow(value, 'momentum');
});

registerEnchantAction('draw', (game, value) => {
  for (let i = 0; i < value; i++) game.engine.drawCard('enchant');
});

registerEnchantAction('nextChannelMult', (game, value) => {
  game.engine.nextChannelMult = value;
});

registerEnchantAction('cycleAttunement', (game, _value, payload) => {
  const p = game.player;
  const opts = ATTUNEMENT_IDS.filter((id) => id !== payload.id);
  const inst = game.engine.makeCard(game.rng.pick(opts)) as CardInstance;
  inst.cost = 0;
  game.engine.queue.unshift(inst);
  game.engine.uiDirty = true;
  game.bus.emit(EVT.cardQueued, { inst });
  floater(game, p.x, p.y - 38, 'THE CYCLE TURNS', '#b48cff', 12);
});

registerEnchantAction('burst', (game, value, payload) => {
  const p = game.player;
  const x = payload.x ?? p.x;
  const y = payload.y ?? p.y;
  for (const e of enemiesIn(game, x, y, value.r)) damageEnemy(game, e, value.dmg, { color: ELEMENT_COLORS[value.element], quiet: true });
  game.fx.push({ kind: 'blast', x, y, r: value.r, color: ELEMENT_COLORS[value.element], t: 0, life: 0.35 });
});

registerEnchantAction('counterArc', (game, value) => {
  const p = game.player;
  for (const e of enemiesIn(game, p.x, p.y, value.range)) damageEnemy(game, e, value.dmg, { color: '#e8dcc0' });
  game.fx.push({ kind: 'arc', x: p.x, y: p.y, ang: p.facing, arc: Math.PI * 2, range: value.range, color: '#e8dcc0', t: 0, life: 0.3 });
  sfx('slash');
});

registerEnchantAction('spreadStatus', (game, value, payload) => {
  const enemy = payload.enemy;
  if (!enemy) return;
  for (const e of enemiesIn(game, enemy.x, enemy.y, value.r)) {
    if (e !== enemy && !e.dead) applyStatus(game, e, value.status, value.stacks);
  }
  game.fx.push({ kind: 'blast', x: enemy.x, y: enemy.y, r: value.r, color: ELEMENT_COLORS.poison, t: 0, life: 0.4 });
});

// Same fixed order as the original if-chain — every real card's `do:` spec
// sets exactly one of these keys, so order is cosmetic in practice, but this
// keeps the dispatcher visibly equivalent to what it replaces.
const ENCHANT_ACTION_KEYS: (keyof EnchantDo)[] = [
  'flow', 'flowIfNear', 'draw', 'nextChannelMult', 'cycleAttunement', 'burst', 'counterArc', 'spreadStatus',
];

export function runEnchantAction(game: GameState, doSpec: EnchantDo, payload: EnchantPayload, ench?: EnchantRef): void {
  for (const key of ENCHANT_ACTION_KEYS) {
    const value = doSpec[key];
    if (!value) continue;
    const handler = handlers.get(key);
    if (handler) handler(game, value, payload);
  }
  const p = game.player;
  if (ench && !ench.relic) spark(game, p.x, p.y, ench.color, 4, 80);
}
