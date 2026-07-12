import { sfx } from '../../audio.js';
import { aimAngle, chainFrom, enemiesIn, hitEnemy, nearestEnemy, spawnPlayerProj } from '../combat.js';
import type { HitSpec } from '../combat.js';
import type { GameState } from '../types.js';

// ═══ sustained casts — the card keeps casting while active ═══
export function updateSustains(game: GameState, dt: number): void {
  for (const s of game.sustains) {
    s.t += dt;
    s.tickT -= dt;
    if (s.tickT <= 0) {
      s.tickT = s.tick;
      const d = s.do;
      if (d.chain) {
        const start = nearestEnemy(game, game.player.x, game.player.y, undefined, d.chain.range + 120);
        if (start) chainFrom(game, start, d.chain, s.ctx, game.player.x, game.player.y);
      } else if (d.proj) {
        const p = game.player;
        const n = d.proj.count || 1;
        const base = aimAngle(game) + (d.proj.ring ? s.t * 1.3 : 0); // rings slowly rotate wave to wave
        for (let i = 0; i < n; i++) {
          const a = d.proj.ring ? base + (i / n) * Math.PI * 2 : base + (game.rng.float() - 0.5) * (d.proj.spread || 0);
          spawnPlayerProj(game, p.x, p.y, a, d.proj, s.ctx);
        }
        sfx('cast', s.def.element);
      } else if (d.pulse) {
        const p = game.player;
        for (const e of enemiesIn(game, p.x, p.y, d.pulse.r)) {
          // PulseSpec shares no fields with HitSpec — hitEnemy only reads
          // critChance/status off `effect`, both correctly absent here.
          hitEnemy(game, e, d.pulse.dmg, s.ctx, d.pulse as HitSpec, { quiet: true });
          if (!e.dead && d.pulse.knockback) {
            const a = Math.atan2(e.y - p.y, e.x - p.x);
            e.kvx = Math.cos(a) * d.pulse.knockback;
            e.kvy = Math.sin(a) * d.pulse.knockback;
            e.kt = 0.15;
          }
        }
        game.fx.push({
          kind: 'arc', x: p.x, y: p.y, ang: s.t * 9, arc: Math.PI * 1.2, range: d.pulse.r, color: s.color, t: 0, life: 0.2,
        });
        sfx('slash');
      }
    }
  }
  game.sustains = game.sustains.filter((s) => s.t < s.dur);
  game.engine.sustainedActive = game.sustains.length > 0;
}
