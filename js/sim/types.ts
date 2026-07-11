import type { EventBus } from '../core/events.js';
import type { UidCounter } from '../core/ids.js';
import type { Rng } from '../core/rng.js';
import type {
  Buffs,
  CardDef,
  CardInstance,
  CastingState,
  Chunk,
  ClassId,
  EffectCtx,
  ElementId,
  EnemyState,
  HazardKind,
  MoveEmpower,
  MoveSpec,
  ProjectileSpec,
  RelicDef,
  RivalSoul,
  Sanctuary,
  StatusApp,
  SustainedDo,
  ZoneRegion,
} from '../data/types.js';
import type { CardEngine } from '../engine.js';

export interface Vec2 {
  x: number;
  y: number;
}

export type GameMode = 'title' | 'combat' | 'reward' | 'sanctuary' | 'gameover';

export interface Input {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  dash: boolean;
}

export interface PlayerTrail extends Vec2 {
  t: number;
  color?: string;
}

export interface PlayerState extends Vec2 {
  vx: number;
  vy: number;
  r: number;
  hp: number;
  maxHp: number;
  armor: number;
  speed: number;
  facing: number;
  moveDir: Vec2;
  dashT: number;
  dashCd: number;
  dashDir: Vec2;
  iframes: number;
  untargetable: number;
  dodgeCredited: boolean;
  touchCd: number;
  trail: PlayerTrail[];
  attackT: number;
  basicCount: number;
  empower: MoveEmpower | null;
}

export interface Camera extends Vec2 {
  shake: number;
}

export interface MatchmakingState {
  state: 'idle' | 'searching' | 'choice' | 'denied' | 'duel' | 'party';
  nextT: number;
  searchT: number;
  timeout: number;
}

export interface Banner {
  title: string;
  sub: string;
  t: number;
}

export type Reward =
  | { type: 'card'; options: CardDef[] }
  | { type: 'relic'; options: RelicDef[] };

export type PendingReward = Reward & { heading: string };

export interface BasicCombatCtx {
  def: { element: ElementId };
  buffs: Partial<Buffs>;
  dmgMult: number;
  basic?: boolean;
}

export type CombatCtx = EffectCtx | BasicCombatCtx;

export interface Projectile extends Vec2 {
  vx: number;
  vy: number;
  r: number;
  dmg: number;
  eff: ProjectileSpec;
  ctx: CombatCtx;
  pierce: number;
  life: number;
  t: number;
  boomerang?: boolean;
  phase: number;
  rehit: Map<number, number> | null;
  color: string;
  hit: Set<number>;
  dead?: boolean;
}

export interface EnemyProjectile extends Vec2 {
  vx: number;
  vy: number;
  r: number;
  dmg: number;
  color: string;
  t: number;
  dead?: boolean;
}

export interface Zone extends Vec2 {
  r: number;
  t: number;
  duration: number;
  tickDmg: number;
  tickRate: number;
  tickT: number;
  status: StatusApp | null;
  slow: number;
  follow: boolean;
  color: string;
  element: ElementId;
  ctx: EffectCtx;
}

interface TelegraphBase extends Vec2 {
  t: number;
  dur: number;
  color: string;
  onDone?: (game: GameState) => void;
  decorative?: boolean;
  friendly?: boolean;
  done?: boolean;
}

export type Telegraph =
  | (TelegraphBase & { shape: 'circle'; r: number })
  | (TelegraphBase & { shape: 'rect'; w: number; h: number; ang?: number })
  | (TelegraphBase & { shape: 'ring'; r: number; band: number });

// ground left burning (or inked, or brined) by an enemy — hurts the player standing in it
export interface GroundHazard extends Vec2 {
  r: number;
  t: number;
  dur: number;
  dmg: number;
  tickT: number;
  color: string;
  kind: HazardKind;
}

export interface Trap extends Vec2 {
  r: number;
  armT: number;
  ttl: number;
  dmg: number;
  root: number;
  status: StatusApp | null;
  ctx: EffectCtx;
  color: string;
  dead?: boolean;
}

export interface Sustain {
  def: CardDef;
  ctx: EffectCtx;
  t: number;
  dur: number;
  tick: number;
  tickT: number;
  do: SustainedDo;
  color: string;
}

export interface Summon extends Vec2 {
  kind: 'clone';
  t: number;
  dur: number;
  fireT: number;
  fireRate: number;
  dmg: number;
  ctx: EffectCtx;
}

export interface Pickup extends Vec2 {
  vx: number;
  vy: number;
  kind: 'shard' | 'heart' | 'gold';
  value?: number;
  t: number;
  dead?: boolean;
}

export interface Particle extends Vec2 {
  vx: number;
  vy: number;
  t: number;
  life: number;
  size: number;
  color: string;
  add: boolean;
  drag?: number;
}

export interface Floater extends Vec2 {
  txt: string;
  color: string;
  t: number;
  life: number;
  size: number;
  crit: boolean;
}

interface FxBase {
  color: string;
  t: number;
  life: number;
}

export type Fx =
  | (FxBase & Vec2 & { kind: 'ring' | 'blast' | 'spawn'; r: number })
  | (FxBase & Vec2 & { kind: 'rectblast'; w: number; h: number; ang?: number })
  | (FxBase & Vec2 & { kind: 'arc'; ang: number; arc: number; range: number })
  | (FxBase & { kind: 'bolt' | 'streak'; x1: number; y1: number; x2: number; y2: number })
  | (FxBase & Vec2 & { kind: 'cast' });

export interface DashOverride {
  def: CardDef;
  spec: MoveSpec;
  timeLeft: number;
  dur: number;
  color: string;
}

export interface StolenCard {
  inst: CardInstance;
  t: number;
}

export interface Ally extends RivalSoul {
  t: number;
  dur: number;
  attackT: number;
  castT: number;
  hp: number;
  casting?: CastingState | null;
}

// the passage a world's last boss tears open — it does not wait forever
export interface PortalState extends Vec2 {
  timeLeft: number;
}

export interface DeckEntry {
  id: string;
  lvl: number;
}

export interface GameState {
  bus: EventBus;
  engine: CardEngine;
  rng: Rng;
  enemyIds: UidCounter;
  state: GameMode;
  time: number;
  hitstop: number;
  slowmo: number;
  worldSeed: number;
  world: number;
  playerClass: ClassId;
  player: PlayerState;
  rage: number;
  rageDecayT: number;
  opportunity: number;
  dashOverride: DashOverride | null;
  enemies: EnemyState[];
  projectiles: Projectile[];
  enemyProjectiles: EnemyProjectile[];
  zones: Zone[];
  hazards: GroundHazard[];
  telegraphs: Telegraph[];
  summons: Summon[];
  pickups: Pickup[];
  particles: Particle[];
  floaters: Floater[];
  fx: Fx[];
  sustains: Sustain[];
  traps: Trap[];
  relics: RelicDef[];
  relicRadiusMult: number;
  hasDuelist: boolean;
  hasCrossClass: boolean;
  camera: Camera;
  chunks: Map<string, Chunk>;
  portal: PortalState | null;
  portalRespawnT: number;
  zoneRegion: ZoneRegion | null;
  activeBoss: EnemyState | null;
  mm: MatchmakingState;
  rival: RivalSoul | null;
  ally: Ally | null;
  encounterPause: boolean;
  banner: Banner | null;
  pendingReward: PendingReward | null;
  rewardQueue: PendingReward[];
  stolen: StolenCard | null;
  dangerT: number;
  kills: number;
  runTime: number;
  campsCleared: number;
  bossesSlain: number;
  worldBossesSlain: number;
  duelsWon: number;
  spawnT: number;
  gold: number;
  sanctuary: Sanctuary | null;
  deckIds: DeckEntry[];
  stateLabel: string;
  uiDirty: boolean;
}
