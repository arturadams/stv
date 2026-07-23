import { CARD_LIST, CLASSES, RIVAL_ADJECTIVES } from '../../data/index.js';
import type { CardDef, ClassId, EnemyDef, EnemyState } from '../../data/types.js';
import { sfx } from '../../audio.js';
import { threatOf } from '../combat.js';
import { spawnEnemy, spawnPointNear } from '../entities/spawn.js';
import { worldDef } from '../map/chunks.js';
import { dismissAmbient } from '../map/features.js';
import type { GameState } from '../types.js';
import { makeCardReward, offerReward } from './rewards.js';

interface RivalSoulSeed {
  cls: ClassId;
  name: string;
  featured: CardDef[];
  color: string;
}

function makeRivalSoul(game: Pick<GameState, 'rng' | 'world'>): RivalSoulSeed {
  const classIds = Object.keys(CLASSES) as ClassId[];
  const cls = game.rng.pick(classIds);
  const cdef = CLASSES[cls];
  const name = `${game.rng.pick(RIVAL_ADJECTIVES)} ${cdef.name}`;
  // featured cards: the build identity — 1 Power, 1 Signature, 1 other, 1 Colorless
  const school = cdef.school;
  const pick = (fn: (c: CardDef) => boolean) => {
    const pool = CARD_LIST.filter((c) => !c.disabled && (c.world || 1) <= (game.world || 1) && fn(c));
    return pool.length ? game.rng.pick(pool) : undefined;
  };
  const featured: CardDef[] = [];
  const used = new Set<string>();
  const add = (c: CardDef | undefined) => {
    if (c && !used.has(c.id)) {
      used.add(c.id);
      featured.push(c);
    }
  };
  add(pick((c) => c.school === school && c.cat === 'Power'));
  add(pick((c) => c.school === school && c.cat === 'Signature'));
  add(pick((c) => c.school === school && !used.has(c.id)));
  add(pick((c) => c.school === 'Colorless' && !used.has(c.id)));
  return { cls, name, featured, color: cdef.color };
}

export function updateMatchmaking(game: GameState, dt: number): void {
  const mm = game.mm;
  if (game.zoneRegion || game.state !== 'combat') return;
  if (mm.state === 'idle') {
    mm.nextT -= dt;
    if (mm.nextT <= 0) {
      mm.state = 'searching';
      mm.searchT = mm.timeout;
      game.banner = { title: 'A PRESENCE STIRS', sub: 'The realm seeks a rival soul…', t: 2.2 };
      sfx('enchant');
    }
  } else if (mm.state === 'searching') {
    mm.searchT -= dt;
    // hidden search — the world keeps flowing, no waiting screen
    if (game.rng.chance(0.13 * dt * 10)) {
      foundRival(game);
      return;
    }
    if (mm.searchT <= 0) matchmakingFallback(game);
  }
}

export function foundRival(game: GameState): void {
  const mm = game.mm;
  mm.state = 'choice';
  const soul = makeRivalSoul(game);
  const p = game.player;
  const a = game.rng.range(0, Math.PI * 2);
  game.rival = { ...soul, x: p.x + Math.cos(a) * 380, y: p.y + Math.sin(a) * 380, wob: 0 };
  game.encounterPause = true; // the world holds its breath
  game.banner = { title: 'PLAYER ENCOUNTERED', sub: soul.name, t: 3 };
  game.uiDirty = true;
  sfx('bossintro');
}

export function matchmakingFallback(game: GameState): void {
  const mm = game.mm;
  mm.state = 'idle';
  mm.nextT = game.rng.range(70, 110);
  game.banner = { title: 'NO RIVAL SOUL ANSWERED THE CALL', sub: 'A guardian has awakened instead', t: 3 };
  const threat = threatOf(game);
  const pt = spawnPointNear(game, 480, 600);
  spawnEnemy(game, worldDef(game).guardian, pt.x, pt.y, { hpMult: 1 + threat * 0.15 });
  for (let i = 0; i < 3; i++) {
    const q = spawnPointNear(game, 420, 560);
    spawnEnemy(game, worldDef(game).tiers[0].id, q.x, q.y, { hpMult: 1 + threat * 0.1 });
  }
  sfx('bossintro');
}

export function resolveEncounterChoice(game: GameState, mine: 'fight' | 'party'): void {
  const mm = game.mm;
  if (mm.state !== 'choice' || !game.rival) return;
  const rivalWants = game.rng.chance(0.55) ? 'party' : 'fight';
  if (mine !== 'fight' && rivalWants === 'fight') {
    // rival denied the pact — hold the world a beat so the denial banner is
    // actually seen, instead of the duel banner overwriting it same-frame
    mm.state = 'denied';
    mm.searchT = 1.6;
    game.banner = { title: 'THE RIVAL DRAWS STEEL', sub: `${game.rival.name} refuses your pact`, t: 1.6 };
    game.uiDirty = true;
    return;
  }
  game.encounterPause = false;
  if (mine === 'fight' || rivalWants === 'fight') startDuel(game);
  else startParty(game);
  game.uiDirty = true;
}

export function updateDeniedEncounter(game: GameState, dt: number): void {
  const mm = game.mm;
  mm.searchT -= dt;
  if (mm.searchT <= 0) {
    game.encounterPause = false;
    startDuel(game);
  }
}

function startDuel(game: GameState): void {
  const mm = game.mm;
  const r = game.rival!;
  const p = game.player;
  mm.state = 'duel';
  const cx = (p.x + r.x) / 2;
  const cy = (p.y + r.y) / 2;
  game.zoneRegion = { x: cx, y: cy, r: 500, kind: 'duel' };
  // the duel circle empties of lesser threats
  dismissAmbient(game);
  game.enemies = game.enemies.filter((e) => !e.dead);
  const threat = threatOf(game);
  const rivalDef: EnemyDef = {
    id: 'rival', name: r.name, role: 'rival', hp: Math.round(180 + threat * 45), speed: 225,
    radius: 15, dmg: 10, behavior: 'rival', rival: true,
    color: '#161b30', glow: r.color, shards: 8,
  };
  spawnEnemy(game, rivalDef, r.x, r.y, { featured: r.featured, cls: r.cls });
  game.rival = null;
  game.banner = { title: 'DUEL', sub: 'Only one soul leaves the circle', t: 2.4 };
  sfx('bossphase');
}

export function duelVictory(game: GameState, e: EnemyState): void {
  game.duelsWon++;
  game.zoneRegion = null;
  game.spawnT = Math.max(game.spawnT, 8); // a breath before the world returns
  game.mm = { state: 'idle', nextT: game.rng.range(75, 120), searchT: 0, timeout: 9 };
  game.player.hp = Math.min(game.player.maxHp, game.player.hp + 25);
  game.gold += Math.round(30 * game.goldMult);
  game.engine.gainFlow(5, 'duel');
  game.banner = { title: 'THE RIVAL SOUL YIELDS', sub: 'Its cards scatter — take any', t: 2.6 };
  // the spoils of a duel: any of the LOSER's cards, even off-class
  const spoils = e.featured && e.featured.length
    ? { type: 'card' as const, options: e.featured.slice() }
    : makeCardReward(game);
  offerReward(game, spoils, `Claim any card from ${e.def.name}`);
  sfx('victory');
}

function startParty(game: GameState): void {
  const mm = game.mm;
  const r = game.rival!;
  mm.state = 'party';
  game.ally = {
    ...r, t: 0, dur: 90, attackT: 0.6, castT: 4,
    hp: 1, // cosmetic — allies are untargetable spirits
  };
  game.rival = null;
  game.banner = { title: 'PARTY FORMED', sub: `${game.ally.name} walks beside you — the realm answers in kind`, t: 3 };
  sfx('victory');
}
