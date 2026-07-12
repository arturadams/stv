import { sfx } from '../../audio.js';
import { strikeCircle } from './bossKit.js';
import { makeTrail, sampleTrail, trailAt } from './echo.js';
import type { EchoTrail } from './echo.js';
import { touchAttack } from './index.js';
import { registerBehavior } from './registry.js';

interface EchoerState {
  trail: EchoTrail;
  echoT: number;
}

// the reverberant shade: what's left of a voice when the singer is gone. It
// keeps a mourner's distance and sings back your last few steps — the strike
// lands where you WERE. Standing still hands it the note; so does doubling
// back. Keep writing new ground.
registerBehavior<EchoerState>('echoer', {
  init: (e) => ({ trail: makeTrail(), echoT: e.def.echoEvery! * 0.6 }),
  update: (game, e, dt, t, state) => {
    const p = t.p;
    sampleTrail(state.trail, p, dt);

    // it hangs at mid-range, circling — the echo does the approaching
    if (!t.rooted) {
      if (t.dist < 200) {
        e.x -= t.ux * t.spd * dt;
        e.y -= t.uy * t.spd * dt;
      } else if (t.dist > 340) {
        e.x += t.ux * t.spd * dt;
        e.y += t.uy * t.spd * dt;
      } else {
        e.x += -t.uy * t.spd * 0.6 * dt;
        e.y += t.ux * t.spd * 0.6 * dt;
      }
    }

    state.echoT -= dt;
    if (state.echoT <= 0 && t.dist < 520) {
      const at = trailAt(state.trail, e.def.echoDelay!);
      if (at) {
        state.echoT = e.def.echoEvery!;
        strikeCircle(game, at.x, at.y, e.def.echoR!, { dmg: e.def.echoDmg!, dur: 0.75, color: e.def.glow });
        game.fx.push({ kind: 'ring', x: e.x, y: e.y, r: e.r * 1.8, color: e.def.glow, t: 0, life: 0.4 });
        sfx('tel');
      }
    }
    touchAttack(game, e, t.dist, dt);
  },
});
