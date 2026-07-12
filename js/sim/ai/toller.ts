import { sfx } from '../../audio.js';
import { strikeRing } from './bossKit.js';
import { registerBehavior } from './registry.js';

interface TollerState {
  tollT: number;
}

// the funeral toll: a bell that buried itself upright and kept the office.
// It never moves — it rings, and the ring is the attack: two annuli, close
// and far, resolving inner-first. Stand between the bands, or past them,
// and the toll passes you by.
registerBehavior<TollerState>('toller', {
  init: (e, game) => ({ tollT: e.def.waveEvery! * (0.4 + game.rng.float() * 0.5) }),
  update: (game, e, dt, t, state) => {
    const def = e.def;
    if (t.dist > def.range!) return;
    state.tollT -= dt;
    if (state.tollT > 0) return;
    state.tollT = def.waveEvery!;
    const r = def.waveR!;
    strikeRing(game, e.x, e.y, r * 0.5, 66, { dmg: def.waveDmg!, dur: def.waveTel!, color: def.glow });
    strikeRing(game, e.x, e.y, r, 66, { dmg: def.waveDmg!, dur: def.waveTel! + 0.45, color: def.glow });
    game.fx.push({ kind: 'ring', x: e.x, y: e.y, r: e.r * 2, color: def.glow, t: 0, life: 0.5 });
    sfx('tel');
  },
});
