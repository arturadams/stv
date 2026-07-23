import { sfx } from '../../audio.js';
import { colorOf } from '../../world.js';
import type { ElementId } from '../../data/types.js';
import { damageEnemy, enemiesIn, nearestEnemy, spawnPlayerProj } from '../combat.js';
import type { GameState } from '../types.js';

export function updateAlly(game: GameState, dt: number): void {
  const al = game.ally;
  if (!al) return;
  const p = game.player;
  al.t += dt;
  al.wob += dt * 3;
  if (al.t >= al.dur) {
    game.banner = { title: 'THE SOULS PART WAYS', sub: `${al.name} fades back into the realm`, t: 2.6 };
    game.ally = null;
    game.mm = { state: 'idle', nextT: game.rng.range(80, 120), searchT: 0, timeout: 9 };
    sfx('theft');
    return;
  }
  // follow at the player's shoulder
  const tx = p.x + Math.cos(al.wob * 0.3) * 70;
  const ty = p.y + Math.sin(al.wob * 0.3) * 70;
  al.x += (tx - al.x) * Math.min(1, dt * 2.6);
  al.y += (ty - al.y) * Math.min(1, dt * 2.6);
  // basic attacks at the nearest enemy
  al.attackT -= dt;
  const target = nearestEnemy(game, al.x, al.y, undefined, 460);
  if (al.attackT <= 0 && target) {
    al.attackT = al.cls === 'rogue' ? 0.45
      : al.cls === 'warrior' ? 0.8
      : al.cls === 'druid' ? 0.65
      : al.cls === 'necromancer' ? 0.7
      : al.cls === 'warlock' ? 0.75
      : 0.6;
    const a = Math.atan2(target.y - al.y, target.x - al.x);
    const element: ElementId = al.cls === 'mage' ? 'arcane'
      : al.cls === 'necromancer' || al.cls === 'warlock' ? 'shadow'
      : 'physical';
    const ctx = { def: { element }, buffs: {}, dmgMult: 1 };
    spawnPlayerProj(game, al.x, al.y, a, { dmg: 6, speed: 640, radius: 4, critChance: 0.1, element, life: 1.4 }, ctx);
    sfx('cast', element);
  }
  // featured cast: a friendly AoE on a cluster, telegraphed
  al.castT -= dt;
  if (al.castT <= 0 && target) {
    al.castT = game.rng.range(8, 11);
    const tx2 = target.x;
    const ty2 = target.y;
    const card = al.featured.find((c) => c.cat === 'Signature') || al.featured[0];
    const color = card ? colorOf(card) : al.color;
    al.casting = { def: card, t: 0, dur: 1.4 };
    game.telegraphs.push({
      shape: 'circle', x: tx2, y: ty2, r: 120, t: 0, dur: 1.4, color, friendly: true,
      onDone: (g) => {
        for (const e of enemiesIn(g, tx2, ty2, 120)) damageEnemy(g, e, 18, { color });
        g.fx.push({ kind: 'blast', x: tx2, y: ty2, r: 120, color, t: 0, life: 0.5 });
        sfx('boom');
      },
    });
    sfx('tel');
  }
  if (al.casting) {
    al.casting.t += dt;
    if (al.casting.t >= al.casting.dur) al.casting = null;
  }
}
