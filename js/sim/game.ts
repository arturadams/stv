import { ELEMENT_COLORS, SCHOOL_COLORS, STARTING_DECKS } from '../data/index.js';
import type { Buffs, CardDef, CardInstance, EffectPreview, EnchantDo } from '../data/types.js';
import { CardEngine } from '../engine.js';
import { EVT, EventBus } from '../core/events.js';
import { makeUidCounter } from '../core/ids.js';
import { makeRng } from '../core/rng.js';
import { sfx } from '../audio.js';
import { computePreview, resolveCard } from './effects/index.js';
import { runEnchantAction } from './effects/enchantActions.js';
import type { EnchantPayload, EnchantRef } from './effects/enchantActions.js';
import { spark, mote, floater } from './fx.js';
import { bossCleared } from './map/features.js';
import { classChannelMult, gainOpportunity } from './player.js';
import { duelVictory } from './run/matchmaking.js';
import type { GameState } from './types.js';

// ═══ game creation ═══
export function createGame(opts: { seed?: number } = {}): GameState {
  const rng = makeRng(opts.seed);
  const bus = new EventBus();
  const engine = new CardEngine(bus, rng);
  const game: GameState = {
    bus, engine, rng, enemyIds: makeUidCounter(),
    state: 'title', // title | combat | reward | gameover
    time: 0, hitstop: 0, slowmo: 0,
    worldSeed: rng.int(0x7fffffff),
    world: 1,
    playerClass: 'mage',
    player: {
      x: 0, y: 0, vx: 0, vy: 0, r: 14,
      hp: 100, maxHp: 100, armor: 0, speed: 235,
      facing: -Math.PI / 2, moveDir: { x: 0, y: -1 },
      dashT: 0, dashCd: 0, dashDir: { x: 0, y: -1 }, iframes: 0, untargetable: 0,
      dodgeCredited: false, touchCd: 0, trail: [],
      attackT: 0.5, basicCount: 0, empower: null,
    },
    // class resources
    rage: 0, rageDecayT: 0, opportunity: 0,
    dashOverride: null, // a card owning the Dash
    enemies: [], projectiles: [], enemyProjectiles: [], zones: [], hazards: [], telegraphs: [],
    summons: [], pickups: [], particles: [], floaters: [], fx: [],
    sustains: [], traps: [],
    relics: [], relicRadiusMult: 1, hasDuelist: false, hasCrossClass: false,
    camera: { x: 0, y: 0, shake: 0 },
    chunks: new Map(),
    portalOpen: false,
    zoneRegion: null,
    activeBoss: null,
    // matchmaking / rival encounters
    mm: { state: 'idle', nextT: 40, searchT: 0, timeout: 9 },
    rival: null, // neutral rival during the choice moment
    ally: null, // partied rival
    encounterPause: false,
    banner: null, pendingReward: null, rewardQueue: [],
    stolen: null, dangerT: 0, kills: 0, runTime: 0, campsCleared: 0, bossesSlain: 0, duelsWon: 0,
    spawnT: 1.5,
    gold: 30, sanctuary: null,
    deckIds: STARTING_DECKS.mage.map((id) => ({ id, lvl: 0 })),
    stateLabel: '',
    uiDirty: true,
  };

  engine.setDeck(game.deckIds);

  // ── engine ↔ world wiring ──
  engine.resolveCard = (inst: CardInstance, buffs: Buffs, preview: EffectPreview | null) => resolveCard(game, inst, buffs, preview);
  engine.computePreview = (def: CardDef, buffs: Buffs) => computePreview(game, def, buffs);
  engine.runEnchantAction = (doSpec: EnchantDo, payload: EnchantPayload, ench?: EnchantRef) => runEnchantAction(game, doSpec, payload, ench);
  engine.classChannelMult = (def: CardDef) => classChannelMult(game, def);

  bus.on(EVT.cardResolved, ({ inst }) => {
    sfx('resolve', inst.def.element);
    spark(game, game.player.x, game.player.y, colorOf(inst.def), 6, 90);
  });
  bus.on(EVT.cardDrawn, () => sfx('draw'));
  bus.on(EVT.flowGained, ({ amount }) => {
    for (let i = 0; i < Math.min(amount * 2, 8); i++) {
      game.particles.push(mote(game, game.player.x, game.player.y, '#ffd97a'));
    }
  });
  bus.on(EVT.perfectDodge, () => {
    engine.gainFlow(2, 'dodge');
    gainOpportunity(game, 1);
    floater(game, game.player.x, game.player.y - 30, 'PERFECT', '#ffd97a', 18);
    game.slowmo = 0.22;
    sfx('perfect');
  });
  bus.on(EVT.trapTriggered, () => gainOpportunity(game, 1));
  bus.on(EVT.enemyKilled, ({ enemy }) => {
    if (enemy.def.rival) duelVictory(game, enemy);
    else if (enemy.def.boss && game.zoneRegion?.kind === 'boss') bossCleared(game);
  });
  bus.on(EVT.powerGained, () => sfx('enchant'));
  return game;
}

export function colorOf(def: CardDef): string {
  return ELEMENT_COLORS[def.element] || SCHOOL_COLORS[def.school];
}
