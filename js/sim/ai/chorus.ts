import { sfx } from '../../audio.js';
import { floater } from '../fx.js';
import { spawnEnemy } from '../entities/spawn.js';
import { touchAttack } from './index.js';
import { registerBehavior } from './registry.js';

interface ChorusState {
  answerT: number;
}

const HORDE_CAP = 26;

// the hollow chorus: it cannot sing anything of its own anymore, so it sings
// the horde — every verse, the nearest voice in the congregation is answered
// by a fainter copy of itself. Silence the chorus first, or fight everything
// twice.
registerBehavior<ChorusState>('chorus', {
  init: (e) => ({ answerT: e.def.summonEvery! * 0.5 }),
  update: (game, e, dt, t, state) => {
    // it drifts at the back of the congregation, like the mender it echoes
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

    state.answerT -= dt;
    if (state.answerT <= 0) {
      state.answerT = e.def.summonEvery!;
      if (game.enemies.length < HORDE_CAP) {
        let best = null;
        let bestD = Infinity;
        for (const o of game.enemies) {
          if (o === e || o.dead || o.def.boss || o.def.elite || o.def.rival) continue;
          if (o.def.behavior === 'chorus') continue;
          const d = Math.hypot(o.x - e.x, o.y - e.y);
          if (d < 300 && d < bestD) { best = o; bestD = d; }
        }
        if (best) {
          const a = game.rng.range(0, Math.PI * 2);
          spawnEnemy(game, best.def, best.x + Math.cos(a) * 46, best.y + Math.sin(a) * 46, { hpMult: 0.6 });
          game.fx.push({ kind: 'ring', x: e.x, y: e.y, r: e.def.radius * 2.2, color: e.def.glow, t: 0, life: 0.6 });
          floater(game, e.x, e.y - e.r - 10, 'ANSWERED', e.def.glow, 12);
          sfx('summon');
        }
      }
    }
    touchAttack(game, e, t.dist, dt);
  },
});
