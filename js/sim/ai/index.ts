import { STATUS_DEFS, damageEnemy, damagePlayer } from '../combat.js';
import { chunksNear, clampToRegion } from '../map/chunks.js';
import { EVT } from '../../core/events.js';
import type { EnemyState, EnemyStatusState, StatusName } from '../../data/types.js';
import type { GameState } from '../types.js';
import { updateEnemyBehavior } from './registry.js';
import type { BehaviorTickInfo } from './registry.js';

// registering every enemy behavior is a side effect of importing these
// modules — this file is the one place that pulls them all in.
import './chase.js';
import './ranged.js';
import './exploder.js';
import './stalker.js';
import './mortar.js';
import './lunge.js';
import './charger.js';
import './geyser.js';
import './stoker.js';
import './warden.js';
import './siren.js';
import './urchin.js';
import './undertow.js';
import './mender.js';
import './toller.js';
import './echoer.js';
import './chorus.js';
import './boss.js';
import './leviathan.js';
import './king.js';
import './sovereign.js';
import './colossus.js';
import './phoenix.js';
import './rival.js';
import './queen.js';
import './regent.js';
import './reliquary.js';
import './carillon.js';
import './antiphon.js';
import './silence.js';

export function touchAttack(game: GameState, e: EnemyState, dist: number, dt: number): void {
  const p = game.player;
  e.touchCd -= dt;
  if (dist < e.r + p.r + 2 && e.touchCd <= 0) {
    e.touchCd = 0.8;
    damagePlayer(game, e.def.dmg, e.x, e.y);
  }
}

export function updateEnemy(game: GameState, e: EnemyState, dt: number): void {
  const p = game.player;
  e.wobble += dt * 4;
  if (e.hitFlash > 0) e.hitFlash -= dt;
  if (e.kt > 0) {
    e.x += e.kvx * dt;
    e.y += e.kvy * dt;
    e.kt -= dt;
  }
  if (e.mark) {
    e.mark.t -= dt;
    if (e.mark.t <= 0) e.mark = null;
  }

  if (e.state === 'spawn') {
    e.stateT -= dt;
    if (e.stateT <= 0) e.state = 'active';
    return;
  }

  // status ticks
  let slowFactor = 1;
  const statusEntries = Object.entries(e.statuses) as Array<[StatusName, EnemyStatusState]>;
  for (const [name, st] of statusEntries) {
    const sd = STATUS_DEFS[name];
    st.t -= dt;
    if (sd.dps > 0) {
      st.acc = (st.acc || 0) + sd.dps * st.stacks * dt;
      if (st.acc >= 1) {
        const whole = Math.floor(st.acc);
        st.acc -= whole;
        damageEnemy(game, e, whole, { color: sd.color, quiet: true, dot: true });
        if (e.dead) return;
      }
    }
    if (name === 'chill') slowFactor *= 0.5;
    if (st.t <= 0) {
      delete e.statuses[name];
      game.bus.emit(EVT.statusExpired, { enemy: e, status: name });
    }
  }
  if (e.freeze > 0) {
    e.freeze -= dt;
    return;
  }
  if (e.stun > 0) {
    e.stun -= dt;
    return;
  }
  const rooted = e.root > 0;
  if (rooted) e.root -= dt;
  if (e.frenzy > 0) {
    e.frenzy -= dt;
    slowFactor *= 1.45; // stoked by a Bellows Cantor
  }

  for (const ch of chunksNear(game, e.x, e.y, 1)) {
    for (const pool of ch.pools) {
      if (Math.hypot(e.x - pool.x, e.y - pool.y) < pool.r) slowFactor *= 0.7;
    }
  }
  for (const z of game.zones) {
    if (z.slow && Math.hypot(e.x - z.x, e.y - z.y) < z.r) slowFactor *= z.slow;
  }
  if (e.relicSlowMult) slowFactor *= e.relicSlowMult;

  const spd = e.def.speed * slowFactor;
  const dx = p.x - e.x;
  const dy = p.y - e.y;
  const dist = Math.hypot(dx, dy) || 1;
  const ux = dx / dist;
  const uy = dy / dist;

  const tick: BehaviorTickInfo = { dist, ux, uy, spd, rooted, p };
  updateEnemyBehavior(game, e, dt, tick);
  if (e.dead) return;

  clampToRegion(game, e);
  // sanctuary wards: enemies cannot enter the rest circle
  for (const ch of chunksNear(game, e.x, e.y, 1)) {
    if (!ch.sanctuary) continue;
    const s = ch.sanctuary;
    const d = Math.hypot(e.x - s.x, e.y - s.y);
    if (d < s.r + e.r) {
      const a = Math.atan2(e.y - s.y, e.x - s.x);
      e.x = s.x + Math.cos(a) * (s.r + e.r);
      e.y = s.y + Math.sin(a) * (s.r + e.r);
    }
  }
}
