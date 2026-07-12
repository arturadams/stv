import { sfx } from '../../audio.js';
import { damagePlayer } from '../combat.js';
import { dropHazard } from '../entities/hazards.js';
import { shake } from '../fx.js';
import type { Vec2 } from '../types.js';
import { interceptPoint } from './aim.js';
import { touchAttack } from './index.js';
import { registerBehavior } from './registry.js';

interface ChargerState {
  cd: number;
  dir: Vec2 | null;
  traveled: number;
  hit: boolean;
  trailD: number;
}

// the cinder ram: winds up, then charges through where you WILL be, leaving a
// line of burning slag. Sidestep the telegraph — don't outrun it.
registerBehavior<ChargerState>('charger', {
  init: () => ({ cd: 2, dir: null, traveled: 0, hit: false, trailD: 0 }),
  update: (game, e, dt, t, state) => {
    const p = t.p;
    const def = e.def;
    state.cd -= dt;

    if (e.state === 'telegraph') {
      e.stateT -= dt;
      if (e.stateT <= 0) {
        e.state = 'lunging';
        e.stateT = def.chargeDist! / def.chargeSpeed!;
        state.traveled = 0;
        state.hit = false;
        state.trailD = 0;
        sfx('lunge');
      }
      return;
    }
    if (e.state === 'lunging') {
      e.stateT -= dt;
      const dir = state.dir!;
      const step = def.chargeSpeed! * dt;
      e.x += dir.x * step;
      e.y += dir.y * step;
      state.trailD += step;
      if (state.trailD > 44) {
        state.trailD = 0;
        dropHazard(game, e.x - dir.x * 20, e.y - dir.y * 20, 40, 7, 3, def.glow);
      }
      if (!state.hit && Math.hypot(p.x - e.x, p.y - e.y) < e.r + p.r + 6) {
        state.hit = true;
        damagePlayer(game, def.dmg, e.x, e.y);
      }
      if (e.stateT <= 0) {
        e.state = 'active';
        state.cd = 2.6;
        shake(game, 5);
        sfx('slam');
      }
      return;
    }

    if (!t.rooted) {
      if (t.dist < def.chargeRange! && state.cd <= 0) {
        e.state = 'telegraph';
        e.stateT = def.chargeTel!;
        // charge through the intercept of the player's current stride
        const aim = interceptPoint(p, e.x, e.y, def.chargeSpeed!);
        const d = Math.hypot(aim.x - e.x, aim.y - e.y) || 1;
        state.dir = { x: (aim.x - e.x) / d, y: (aim.y - e.y) / d };
        game.telegraphs.push({
          shape: 'rect', x: e.x + state.dir.x * def.chargeDist! / 2, y: e.y + state.dir.y * def.chargeDist! / 2,
          w: def.chargeDist! + e.r * 2, h: e.r * 2.4, ang: Math.atan2(state.dir.y, state.dir.x),
          t: 0, dur: def.chargeTel!, color: def.glow, decorative: true,
        });
        sfx('tel');
      } else {
        e.x += t.ux * t.spd * dt;
        e.y += t.uy * t.spd * dt;
      }
    }
    touchAttack(game, e, t.dist, dt);
  },
});
