import { sfx } from '../../audio.js';
import { damageEnemy, damagePlayer, enemiesIn, killEnemy } from '../combat.js';
import { shake } from '../fx.js';
import { registerBehavior } from './registry.js';

registerBehavior<undefined>('exploder', {
  update: (game, e, dt, t) => {
    const p = t.p;
    if (e.state === 'fuse') {
      e.stateT -= dt;
      if (e.stateT <= 0) {
        const r = e.def.boomR!;
        if (Math.hypot(p.x - e.x, p.y - e.y) < r + p.r) damagePlayer(game, e.def.dmg, e.x, e.y);
        for (const o of enemiesIn(game, e.x, e.y, r)) {
          if (o !== e) damageEnemy(game, o, e.def.dmg * 0.5, { quiet: true });
        }
        game.fx.push({ kind: 'blast', x: e.x, y: e.y, r, color: e.def.glow, t: 0, life: 0.5 });
        shake(game, 8);
        sfx('boom');
        killEnemy(game, e, {});
      }
      return;
    }
    if (!t.rooted) {
      e.x += t.ux * t.spd * dt;
      e.y += t.uy * t.spd * dt;
    }
    if (t.dist < 95) {
      e.state = 'fuse';
      e.stateT = e.def.fuse!;
      game.telegraphs.push({
        shape: 'circle', x: e.x, y: e.y, r: e.def.boomR!, t: 0, dur: e.def.fuse!, color: e.def.glow, decorative: true,
      });
      sfx('fuse');
    }
  },
});
