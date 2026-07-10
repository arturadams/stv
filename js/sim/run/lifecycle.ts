import { CARD_LIST, CLASSES, WORLDS } from '../../data/index.js';
import type { CardDef, ClassId, School } from '../../data/types.js';
import { makeRng } from '../../core/rng.js';
import type { Rng } from '../../core/rng.js';
import { sfx } from '../../audio.js';
import { CHUNK, worldDef } from '../map/chunks.js';
import type { DeckEntry, GameState } from '../types.js';
import { metaUnlockedWorld, recordWorldReached } from './meta.js';

// Every run starts with a rolled hand: 9 randomized Commons and 1 Uncommon,
// class-focused, guaranteed playable (Powers + a Spell + a Skill). Cards from
// meta-unlocked later worlds have a small chance to appear.
export function rollStartingDeck(
  classId: ClassId,
  unlockedWorld = 1,
  world = 1,
  rng: Rng = makeRng(Date.now()),
): DeckEntry[] {
  const school: School = CLASSES[classId].school;
  const maxW = Math.max(world, unlockedWorld);
  const weightOf = (c: CardDef) => {
    if ((c.world || 1) > maxW) return 0;
    let w = c.school === school ? 1 : c.school === 'Colorless' ? 0.45 : 0;
    if ((c.world || 1) > world) w *= 0.4;
    return w;
  };
  const commons = CARD_LIST.filter((c) => c.rarity === 'Common' && weightOf(c) > 0);
  const uncommons = CARD_LIST.filter((c) => c.rarity === 'Uncommon' && weightOf(c) > 0);
  const deck: DeckEntry[] = [];
  const copies = new Map<string, number>();
  const take = (pool: CardDef[]) => {
    const avail = pool.filter((c) => (copies.get(c.id) || 0) < 2);
    if (!avail.length) return null;
    let total = 0;
    for (const c of avail) total += weightOf(c);
    let roll = rng.float() * total;
    let pick = avail[0];
    for (const c of avail) {
      roll -= weightOf(c);
      if (roll <= 0) {
        pick = c;
        break;
      }
    }
    copies.set(pick.id, (copies.get(pick.id) || 0) + 1);
    deck.push({ id: pick.id, lvl: 0 });
    return pick;
  };
  // playability guarantees, then random fill
  take(commons.filter((c) => c.cat === 'Power' && c.school === school));
  take(commons.filter((c) => c.cat === 'Power' && c.school === school));
  take(commons.filter((c) => c.cat === 'Spell' && c.school === school));
  take(commons.filter((c) => c.cat === 'Skill' && c.school === school));
  let guard = 80;
  while (deck.length < 9 && guard-- > 0) take(commons);
  take(uncommons.length ? uncommons : commons);
  return deck;
}

export interface PreparedRun {
  classId: ClassId;
  world: number;
  deck: DeckEntry[];
}

// Rolled before the run so the player can SEE the hand and pick a world.
export function prepareRun(game: Pick<GameState, 'rng'>, classId: ClassId, world = 1): PreparedRun {
  return { classId, world, deck: rollStartingDeck(classId, metaUnlockedWorld(), world, game.rng) };
}

export interface StartRunOpts {
  world?: number;
  deck?: Array<string | DeckEntry>;
  seed?: number;
}

export function startRun(game: GameState, classId: ClassId = 'mage', opts: StartRunOpts = {}): void {
  game.playerClass = classId;
  game.world = Math.min(Math.max(opts.world || 1, 1), WORLDS.length);
  recordWorldReached(game.world);
  const deck = opts.deck || rollStartingDeck(classId, metaUnlockedWorld(), game.world, game.rng);
  game.deckIds = deck.map((e) => typeof e === 'string' ? { id: e, lvl: 0 } : { id: e.id, lvl: e.lvl || 0 });
  game.gold = 30;
  game.sanctuary = null;
  game.relics = [];
  game.relicRadiusMult = 1;
  game.hasDuelist = false;
  game.hasCrossClass = false;
  game.state = 'combat';
  game.kills = 0;
  game.runTime = 0;
  game.campsCleared = 0;
  game.bossesSlain = 0;
  game.duelsWon = 0;
  game.rage = 0;
  game.opportunity = 0;
  game.dashOverride = null;
  game.worldSeed = opts.seed ?? game.rng.int(0x7fffffff);
  game.chunks = new Map();
  game.portalOpen = false;
  game.player.hp = game.player.maxHp;
  game.player.armor = 0;
  game.player.x = CHUNK / 2;
  game.player.y = CHUNK / 2;
  game.player.attackT = 0.5;
  game.player.basicCount = 0;
  game.player.empower = null;
  game.camera.x = game.player.x;
  game.camera.y = game.player.y;
  game.enemies = [];
  game.projectiles = [];
  game.enemyProjectiles = [];
  game.zones = [];
  game.hazards = [];
  game.telegraphs = [];
  game.pickups = [];
  game.sustains = [];
  game.traps = [];
  game.summons = [];
  game.zoneRegion = null;
  game.activeBoss = null;
  game.mm = { state: 'idle', nextT: 40, searchT: 0, timeout: 9 };
  game.rival = null;
  game.ally = null;
  game.encounterPause = false;
  game.stolen = null;
  game.pendingReward = null;
  game.rewardQueue = [];
  const engine = game.engine;
  engine.setDeck(game.deckIds);
  engine.flow = 4;
  engine.maxFlow = 10;
  engine.modStack = [];
  engine.enchants = [];
  engine.flowJobs = [];
  engine.hasteMult = 1;
  engine.hasteTimer = 0;
  engine.combo = 0;
  engine.channelMultGlobal = 1;
  engine.powerDurMult = 1;
  engine.sustainedActive = false;
  engine.drawTimer = 0.5;
  const cls = CLASSES[classId];
  game.banner = { title: worldDef(game).name, sub: `${cls.name} — ${cls.tagline}`, t: 2.6 };
  game.uiDirty = true;
  sfx('wave');
}

export interface AdvanceWorldOpts {
  seed?: number;
}

// ═══ world progression: step through the portal a slain boss leaves behind ═══
export function advanceWorld(game: GameState, opts: AdvanceWorldOpts = {}): void {
  if (game.world >= WORLDS.length) return;
  game.world++;
  recordWorldReached(game.world);
  const w = worldDef(game);
  game.worldSeed = opts.seed ?? game.rng.int(0x7fffffff);
  game.chunks = new Map();
  game.portalOpen = false;
  game.enemies = [];
  game.projectiles = [];
  game.enemyProjectiles = [];
  game.zones = [];
  game.hazards = [];
  game.telegraphs = [];
  game.pickups = [];
  game.sustains = [];
  game.traps = [];
  game.summons = [];
  game.engine.sustainedActive = false;
  game.zoneRegion = null;
  game.activeBoss = null;
  game.mm = { state: 'idle', nextT: game.rng.range(50, 80), searchT: 0, timeout: 9 };
  game.rival = null;
  game.ally = null;
  game.encounterPause = false;
  game.stolen = null;
  game.sanctuary = null;
  game.player.x = CHUNK / 2;
  game.player.y = CHUNK / 2;
  game.camera.x = game.player.x;
  game.camera.y = game.player.y;
  game.player.hp = Math.min(game.player.maxHp, game.player.hp + 40);
  game.banner = { title: w.name, sub: `${w.sub} — the realm grows crueler`, t: 3.2 };
  game.uiDirty = true;
  sfx('victory');
}
