import { ENEMIES } from '../../data/index.js';
import type { EnemyDef, EnemyState } from '../../data/types.js';
import type { GameState, Vec2 } from '../types.js';

const enemyDefs: Record<string, EnemyDef> = ENEMIES;

export interface SpawnOpts {
  hpMult?: number;
  campRef?: EnemyState['campRef'];
  featured?: EnemyState['featured'];
  cls?: EnemyState['cls'];
}

export function spawnEnemy(
  game: GameState,
  idOrDef: string | EnemyDef,
  x: number,
  y: number,
  opts: SpawnOpts = {},
): EnemyState {
  const def = typeof idOrDef === 'string' ? enemyDefs[idOrDef] : idOrDef;
  const hp = Math.round(def.hp * (opts.hpMult || 1));
  const e: EnemyState = {
    uid: game.enemyIds.next(), def, x, y, hp, maxHp: hp, r: def.radius,
    statuses: {}, state: 'spawn', stateT: 0.7, hitFlash: 0, freeze: 0, stun: 0, root: 0,
    kvx: 0, kvy: 0, kt: 0, touchCd: 0, fireT: 1 + game.rng.float(), mark: null,
    wobble: game.rng.range(0, Math.PI * 2), lungeCd: 1.5, waveCd: def.waveEvery || 0,
    bossPhase: 1, bossAttackT: 2.2, bossAttackIdx: 0, dead: false,
    campRef: opts.campRef || null,
    // rival-only fields
    featured: opts.featured || null, cls: opts.cls || null,
    attackT: 1.2, castT: 5 + game.rng.float() * 3, casting: null, strafeT: 0, strafeDir: 1,
  };
  game.enemies.push(e);
  game.fx.push({ kind: 'spawn', x, y, r: def.radius * 2, color: def.glow, t: 0, life: 0.7 });
  return e;
}

export function spawnPointNear(game: GameState, minR = 620, maxR = 800): Vec2 {
  const p = game.player;
  const a = game.rng.range(0, Math.PI * 2);
  const d = game.rng.range(minR, maxR);
  return { x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d };
}
