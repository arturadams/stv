import { sfx } from '../../audio.js';
import { floater } from '../fx.js';
import { touchAttack } from './index.js';
import { registerBehavior } from './registry.js';

interface MenderState {
  healT: number;
}

// the grief chorister: it will not fight you — it stands behind the court and
// sews its wounds shut with song. Every verse it survives, everything else
// survives a little longer too. Cut the singer, then the song's beneficiaries.
registerBehavior<MenderState>('mender', {
  init: (e) => ({ healT: e.def.healEvery! * 0.5 }),
  update: (game, e, dt, t, state) => {
    // a mourner's distance — behind the court, never in it
    if (!t.rooted) {
      if (t.dist < 320) {
        e.x -= t.ux * t.spd * dt;
        e.y -= t.uy * t.spd * dt;
      } else if (t.dist > 480) {
        e.x += t.ux * t.spd * 0.7 * dt;
        e.y += t.uy * t.spd * 0.7 * dt;
      } else {
        e.x += -t.uy * t.spd * 0.55 * dt;
        e.y += t.ux * t.spd * 0.55 * dt;
      }
    }

    state.healT -= dt;
    if (state.healT <= 0) {
      state.healT = e.def.healEvery!;
      let mended = 0;
      for (const o of game.enemies) {
        if (o === e || o.dead || o.def.boss || o.def.behavior === 'mender') continue;
        if (o.hp >= o.maxHp) continue;
        if (Math.hypot(o.x - e.x, o.y - e.y) > e.def.healR!) continue;
        o.hp = Math.min(o.maxHp, o.hp + e.def.healAmt!);
        game.fx.push({ kind: 'spawn', x: o.x, y: o.y, r: o.r * 1.6, color: e.def.glow, t: 0, life: 0.4 });
        mended++;
      }
      if (mended > 0) {
        game.fx.push({ kind: 'ring', x: e.x, y: e.y, r: e.def.healR!, color: e.def.glow, t: 0, life: 0.6 });
        floater(game, e.x, e.y - e.r - 10, 'MENDED', e.def.glow, 12);
        sfx('enchant');
      }
    }
    touchAttack(game, e, t.dist, dt);
  },
});
