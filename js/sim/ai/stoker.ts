import { sfx } from '../../audio.js';
import { floater } from '../fx.js';
import { touchAttack } from './index.js';
import { registerBehavior } from './registry.js';

interface StokerState {
  stokeT: number;
}

// the bellows cantor: never fights you itself — it keeps its distance and
// pumps the horde white-hot. Kill it first or fight faster enemies.
registerBehavior<StokerState>('stoker', {
  init: (e) => ({ stokeT: e.def.stokeEvery! * 0.5 }),
  update: (game, e, dt, t, state) => {
    // keep a coward's distance
    if (!t.rooted) {
      if (t.dist < 300) {
        e.x -= t.ux * t.spd * dt;
        e.y -= t.uy * t.spd * dt;
      } else if (t.dist > 460) {
        e.x += t.ux * t.spd * 0.7 * dt;
        e.y += t.uy * t.spd * 0.7 * dt;
      } else {
        e.x += -t.uy * t.spd * 0.55 * dt;
        e.y += t.ux * t.spd * 0.55 * dt;
      }
    }

    state.stokeT -= dt;
    if (state.stokeT <= 0) {
      state.stokeT = e.def.stokeEvery!;
      let stoked = 0;
      for (const o of game.enemies) {
        if (o === e || o.dead || o.def.boss || o.def.behavior === 'stoker') continue;
        if (Math.hypot(o.x - e.x, o.y - e.y) > e.def.stokeR!) continue;
        o.frenzy = Math.max(o.frenzy, 3.5);
        o.hp = Math.min(o.maxHp, o.hp + 4);
        stoked++;
      }
      if (stoked > 0) {
        game.fx.push({ kind: 'ring', x: e.x, y: e.y, r: e.def.stokeR!, color: e.def.glow, t: 0, life: 0.6 });
        floater(game, e.x, e.y - e.r - 10, 'STOKED', e.def.glow, 12);
        sfx('enchant');
      }
    }
    touchAttack(game, e, t.dist, dt);
  },
});
