import type { EventMap } from '../core/events.js';

export type School =
  | 'Mage'
  | 'Warrior'
  | 'Rogue'
  | 'Necromancer'
  | 'Druid'
  | 'Warlock'
  | 'Colorless';
export type Cat = 'Power' | 'Technique' | 'Signature';
export type Rarity = 'Common' | 'Uncommon' | 'Rare' | 'Legendary';
export type ElementId =
  | 'fire'
  | 'frost'
  | 'lightning'
  | 'arcane'
  | 'poison'
  | 'physical'
  | 'shadow'
  | 'gold';
export type StatusName = 'burn' | 'poison' | 'bleed' | 'chill';
export type Targeting =
  | 'none'
  | 'self'
  | 'nearest'
  | 'strongest'
  | 'target_area'
  | 'directional'
  | 'persistent_zone';
export type QueueOpName =
  | 'duplicateNext'
  | 'reverse'
  | 'flush'
  | 'echoLast'
  | 'shuffleAll'
  | 'purge';
export type EventName = keyof EventMap;
export type StatusApp = readonly [StatusName, number];

export interface ExplosionSpec {
  r: number;
  dmg: number;
}

export interface ChainSpec {
  dmg: number;
  jumps: number;
  range: number;
  critChance?: number;
  status?: StatusApp;
}

export interface ProjectileSpec {
  dmg: number;
  speed: number;
  radius: number;
  life?: number;
  pierce?: number;
  boomerang?: boolean;
  rehit?: number;
  count?: number;
  ring?: boolean;
  spread?: number;
  critChance?: number;
  status?: StatusApp;
  element?: ElementId;
  explode?: ExplosionSpec;
  chainOnHit?: ChainSpec;
}

export interface PowerSpec {
  basicOverride?: ProjectileSpec;
  arcMult?: number;
  dmgMult?: number;
  rateMult?: number;
  extraEvery?: number;
  addStatus?: StatusApp;
  element?: ElementId;
  channelMult?: number;
  extendOnHit?: number;
  damageReduction?: number;
  moveSpeedMult?: number;
  signatureChannelMult?: number;
  healingPerSecond?: number;
  cardDamageMult?: number;
  cardLifeSteal?: number;
}

export interface MoveEmpower {
  mult: number;
  crit?: number;
}

export type MoveSpec =
  | {
      kind: 'blink';
      dist: number;
      cd: number;
      untargetable?: number;
      empower?: MoveEmpower;
    }
  | {
      kind: 'charge';
      dist: number;
      cd: number;
      dmg: number;
      gather?: number;
      status?: StatusApp;
    };

export interface PulseSpec {
  r: number;
  dmg: number;
  knockback?: number;
}

export type SustainedDo =
  | { chain: ChainSpec; proj?: never; pulse?: never }
  | { proj: ProjectileSpec; chain?: never; pulse?: never }
  | { pulse: PulseSpec; chain?: never; proj?: never };

export interface EnchantBurst {
  r: number;
  dmg: number;
  element: ElementId;
}

export interface CounterArc {
  dmg: number;
  range: number;
}

export interface SpreadStatus {
  status: StatusName;
  stacks: number;
  r: number;
}

export interface EnchantDo {
  flow?: number;
  flowIfNear?: number;
  draw?: number;
  noFlow?: boolean;
  nextChannelMult?: number;
  cycleAttunement?: boolean;
  burst?: EnchantBurst;
  counterArc?: CounterArc;
  spreadStatus?: SpreadStatus;
}

export interface EnchantFilter {
  status?: StatusName;
  hasStatus?: StatusName;
  school?: School;
}

export interface EnchantSpec {
  on: readonly EventName[];
  filter?: EnchantFilter;
  chance?: number;
  do: EnchantDo;
}

export interface ModMatch {
  school?: School;
  cat?: Cat;
  tags?: readonly string[];
}

export interface ModBuff {
  dmgMult?: number;
  costMult?: number;
  channelMult?: number;
  radiusMult?: number;
  critChance?: number;
  repeat?: number;
  addStatus?: StatusApp;
}

export interface PowerEffect {
  type: 'power';
  dur: number;
  power: PowerSpec;
}

export interface SustainedEffect {
  type: 'sustained';
  dur: number;
  tick: number;
  do: SustainedDo;
}

export interface TrapEffect {
  type: 'trap';
  arm: number;
  r: number;
  dmg: number;
  ttl: number;
  root?: number;
  status?: StatusApp;
}

export interface ExtendPowerEffect {
  type: 'extendPower';
  sec: number;
}

export interface DashOverrideEffect {
  type: 'dashOverride';
  dur: number;
  move: MoveSpec;
}

export type ProjectileEffect = { type: 'proj' } & ProjectileSpec;

export interface AoeEffect {
  type: 'aoe';
  r: number;
  dmg: number;
  status?: StatusApp;
  freeze?: number;
  stun?: number;
  root?: number;
  knockback?: number;
  shake?: number;
  flowPerHit?: number;
  flowFlat?: number;
  flowIfHit?: number;
  atFacing?: number;
  critChance?: number;
}

export interface ZoneEffect {
  type: 'zone';
  r: number;
  duration: number;
  tickDmg: number;
  tickRate?: number;
  status?: StatusApp;
  slow?: number;
  follow?: boolean;
}

interface ArcEffectBase {
  type: 'arc';
  dmg: number;
  range: number;
  arc: number;
  critChance?: number;
  knockback?: number;
  status?: StatusApp;
}

type ArcExecute =
  | { executeBelow: number; executeMult: number }
  | { executeBelow?: never; executeMult?: never };

export type ArcEffect = ArcEffectBase & ArcExecute;
export type ChainEffect = { type: 'chain' } & ChainSpec;

export interface BlinkEffect {
  type: 'blink';
  dist: number;
  away?: boolean;
  untargetable?: number;
  empower?: MoveEmpower;
}

export interface DashAttackEffect {
  type: 'dashAttack';
  dist: number;
  dmg: number;
  gather?: number;
  knockback?: number;
  status?: StatusApp;
  critChance?: number;
}

export interface ArmorEffect {
  type: 'armor';
  amount: number;
}

export interface HealEffect {
  type: 'heal';
  amount: number;
}

export interface StabilizeEffect {
  type: 'stabilize';
  low: number;
  high: number;
}

export interface DrawEffect {
  type: 'draw';
  n: number;
}

export interface QueueOpEffect {
  type: 'queueOp';
  op: QueueOpName;
  costMult?: number;
}

export interface ModifierEffect {
  type: 'mod';
  match: ModMatch;
  count?: number;
  buff: ModBuff;
}

export type EnchantEffect = {
  type: 'enchant';
  dur: number;
} & EnchantSpec;

export interface HasteEffect {
  type: 'haste';
  mult: number;
  dur: number;
}

export interface FlowOverTimeEffect {
  type: 'flowOverTime';
  amount: number;
  dur: number;
}

export interface MarkEffect {
  type: 'mark';
  dur: number;
  amp: number;
  crit?: number;
}

export interface SummonEffect {
  type: 'summon';
  kind: 'clone';
  dur: number;
  fireRate: number;
  dmg: number;
}

export type EffectSpec =
  | PowerEffect
  | SustainedEffect
  | TrapEffect
  | ExtendPowerEffect
  | DashOverrideEffect
  | ProjectileEffect
  | AoeEffect
  | ZoneEffect
  | ArcEffect
  | ChainEffect
  | BlinkEffect
  | DashAttackEffect
  | ArmorEffect
  | HealEffect
  | StabilizeEffect
  | DrawEffect
  | QueueOpEffect
  | ModifierEffect
  | EnchantEffect
  | HasteEffect
  | FlowOverTimeEffect
  | MarkEffect
  | SummonEffect
  | HealthCostEffect
  | HealOverTimeEffect
  | ConsumeStatusEffect
  | CoreMechanicEffect;

export interface CardPreview {
  r: number;
}

export interface CardDef {
  id: string;
  name: string;
  school: School;
  cat: Cat;
  sub?: string;
  rarity: Rarity;
  world?: number;
  cost: number;
  channel: number;
  dur?: number;
  targeting: Targeting;
  preview?: CardPreview;
  tags: readonly string[];
  glyph: string;
  element: ElementId;
  text: string;
  effects: readonly EffectSpec[];
  /** Stable metadata shared by drafts, talents, and the Run Build Board. */
  classId?: ClassId;
  branch?: string;
  secondaryBranch?: string;
  startingCard?: boolean;
  draftOnly?: boolean;
  core?: boolean;
  keywords?: readonly string[];
  implementationNotes?: string;
  // pool-exclusion flag: kept in source/registered in CARD_LIST, but hidden
  // from drafts, starting decks, sanctuary stock, and rival/ally card AI —
  // see Card System v2 (rework_cards.md) §17/§24 for the non-destructive
  // "disable in pools, don't delete" migration rule.
  disabled?: boolean;
}

export interface CardInstance {
  uid: number;
  def: CardDef;
  cost: number;
  lvl: number;
  copy?: boolean;
}

export interface RelicStats {
  maxFlow?: number;
  channelMult?: number;
  radiusMult?: number;
  duelist?: boolean;
  powerDurMult?: number;
  crossClass?: boolean;
}

export interface RelicDef {
  id: string;
  name: string;
  glyph: string;
  color: string;
  text: string;
  enchant?: EnchantSpec;
  stats?: RelicStats;
}

export interface Buffs {
  dmgMult: number;
  costMult: number;
  channelMult: number;
  radiusMult: number;
  critChance: number;
  repeat: number;
  addStatus: StatusApp[];
}

export interface EffectPreview {
  x: number;
  y: number;
  r: number;
  color: string;
  follow?: boolean;
  reticle?: boolean;
  enemy?: unknown;
}

export interface EffectCtx {
  def: CardDef;
  buffs: Buffs;
  dmgMult: number;
  radMult: number;
  preview: EffectPreview | null;
  lvl: number;
  upgradeRank?: number;
  basic?: boolean;
}

export type BehaviorId =
  | 'chase'
  | 'ranged'
  | 'exploder'
  | 'stalker'
  | 'mortar'
  | 'lunge'
  | 'charger'
  | 'geyser'
  | 'stoker'
  | 'warden'
  | 'siren'
  | 'urchin'
  | 'undertow'
  | 'mender'
  | 'toller'
  | 'echoer'
  | 'chorus'
  | 'boss'
  | 'boss_leviathan'
  | 'boss_king'
  | 'boss_sovereign'
  | 'boss_colossus'
  | 'boss_phoenix'
  | 'boss_queen'
  | 'boss_regent'
  | 'boss_reliquary'
  | 'boss_carillon'
  | 'boss_antiphon'
  | 'boss_silence'
  | 'rival';

export type ClassId =
  | 'mage'
  | 'warrior'
  | 'rogue'
  | 'necromancer'
  | 'druid'
  | 'warlock';

export interface TalentDefinition {
  id: string;
  name: string;
  classId: ClassId;
  branch: string;
  text: string;
  keywords: readonly string[];
  effect: {
    cardDamageMult?: number;
    maxHealth?: number;
    statusBonus?: StatusApp;
  };
}

export interface BossBanner {
  title: string;
  sub: string;
}

export interface BossMisfireSpec {
  chance: number;
  radius: number;
  damage: number;
  telegraph: number;
  spread: number;
}

export type BossAttackSpec =
  | { kind: 'summonRing'; id: string; count: number; radius?: number }
  | {
      kind: 'lineSlams';
      count: number;
      spacing: number;
      width: number;
      height: number;
      damage: number;
      telegraph: number;
    }
  | {
      kind: 'runeCircles';
      count: number;
      radius: number;
      damage: number;
      telegraph: number;
      spread: number;
    }
  | { kind: 'cardTheft'; dur: number };

export interface BossPhase {
  hpBelow: number;
  banner?: BossBanner;
  attackInterval: number;
  speedMult?: number;
  misfire?: BossMisfireSpec;
  attacks: readonly BossAttackSpec[];
}

export interface BossScript {
  moveBand?: readonly [min: number, max: number];
  phases: readonly BossPhase[];
}

export interface EnemyDef {
  id: string;
  name: string;
  role: string;
  hp: number;
  speed: number;
  radius: number;
  dmg: number;
  behavior: BehaviorId;
  color: string;
  glow: string;
  shards: number;
  range?: number;
  fireRate?: number;
  projSpeed?: number;
  fuse?: number;
  boomR?: number;
  mortarR?: number;
  mortarTel?: number;
  lungeRange?: number;
  lungeTel?: number;
  lungeSpeed?: number;
  lungeChain?: number;
  waveEvery?: number;
  waveR?: number;
  waveTel?: number;
  waveDmg?: number;
  summonEvery?: number;
  summonId?: string;
  deathBurst?: ExplosionSpec;
  deathSpawn?: { id: string; count: number };
  // exploders that leave the floor poisoned where they pop (brine motes)
  boomHazard?: { r: number; dmg: number; dur: number; kind?: HazardKind };
  // the echo: strikes that land where the player stood a beat ago (shades)
  echoEvery?: number;
  echoDelay?: number;
  echoR?: number;
  echoDmg?: number;
  // the tide: currents that drag the player (sirens, undertow maws)
  pullEvery?: number;
  pullR?: number;
  pullForce?: number;
  // choristers knit the court's wounds shut
  healEvery?: number;
  healR?: number;
  healAmt?: number;
  // reef urchins loose their spines in all directions at once
  volleyEvery?: number;
  volleyCount?: number;
  chargeRange?: number;
  chargeTel?: number;
  chargeSpeed?: number;
  chargeDist?: number;
  ventEvery?: number;
  ventR?: number;
  ventDmg?: number;
  stokeEvery?: number;
  stokeR?: number;
  boss?: boolean;
  minion?: string;
  elite?: boolean;
  rival?: boolean;
  script?: BossScript;
}

export interface EnemyStatusState {
  stacks: number;
  t: number;
  acc?: number;
}

export interface EnemyMark {
  t: number;
  amp: number;
  crit: number;
}

export type EnemyMode =
  | 'spawn'
  | 'active'
  | 'fuse'
  | 'vanish'
  | 'telegraph'
  | 'lunging';

export interface CastingState {
  def: CardDef | null;
  t: number;
  dur: number;
}

export interface EnemyState {
  uid: number;
  def: EnemyDef;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  r: number;
  statuses: Partial<Record<StatusName, EnemyStatusState>>;
  state: EnemyMode;
  stateT: number;
  hitFlash: number;
  freeze: number;
  stun: number;
  root: number;
  frenzy: number;
  kvx: number;
  kvy: number;
  kt: number;
  touchCd: number;
  mark: EnemyMark | null;
  wobble: number;
  dead: boolean;
  campRef?: Camp | null;
  featured?: CardDef[] | null;
  cls?: ClassId | null;
  // Per-behavior scratch state, populated by that behavior's `init` when the
  // enemy spawns (see sim/ai/registry.ts) and narrowed to the right shape by
  // each behavior module — e.g. LungeState, BossState, RivalState. Nothing
  // outside a behavior's own module should read or write this directly.
  ai?: unknown;
}

interface BasicAttack {
  name: string;
  dmg: number;
  rate: number;
  range: number;
  element: ElementId;
}

export interface ArcBasic extends BasicAttack {
  kind: 'arc';
  arc: number;
  knockback: number;
}

export interface ProjBasic extends BasicAttack {
  kind: 'proj';
  speed: number;
  radius: number;
  critChance?: number;
}

export interface ClassResource {
  key: 'mana' | 'rage' | 'focus' | 'souls' | 'spirit' | 'corruption';
  name: string;
  max: number;
  starting: number;
  // seconds per +1 passive tick while in active combat — see player.ts's
  // tickResourceRegen and combat.ts's isActiveCombat.
  regenInterval: number;
  perfectDodgeGain: number;
  color: string;
  pips?: boolean;
}

export interface ClassDef {
  id: ClassId;
  name: string;
  school: Exclude<School, 'Colorless'>;
  color: string;
  glyph: string;
  tagline: string;
  desc: string;
  basic: ArcBasic | ProjBasic;
  resource: ClassResource;
}

export type Rgb = readonly [red: number, green: number, blue: number];

// Each world paints with a different brush: arcane = candle-lit archive stone,
// ember = cracked basalt and lava light, abyss = drowned marble and cold glow,
// requiem = bone-pale basilica dust and violet votive light.
// The theme drives prop generation (map/chunks.ts) and rendering (render.js).
export type WorldTheme = 'arcane' | 'ember' | 'abyss' | 'requiem';

// what a patch of weaponized floor is made of — drives drawHazard (render.js)
export type HazardKind = 'ember' | 'ink' | 'brine' | 'toll';

export interface BiomeDef {
  id: string;
  name: string;
  theme: WorldTheme;
  floor: Rgb;
  tileVar: Rgb;
  grout: string;
  accent: string;
  deco: string;
  hazard: string;
  hazardEdge: string;
}

export interface EnemyTier {
  id: string;
  minThreat: number;
  w: number;
}

export interface WorldDef {
  num: number;
  name: string;
  sub: string;
  sky: string;
  biomes: readonly string[];
  // each boss gate in a world cycles through these — three originals per world
  bosses: readonly string[];
  // the elite that answers when matchmaking finds no rival soul
  guardian: string;
  threatMult: number;
  tiers: readonly EnemyTier[];
}

export interface Point {
  x: number;
  y: number;
}

export interface RivalSoul extends Point {
  cls: ClassId;
  name: string;
  featured: CardDef[];
  color: string;
  wob: number;
}

export interface Sanctuary extends Point {
  r: number;
  seed: number;
  lock: boolean;
  stock: CardDef[] | null;
}

export interface Pillar extends Point {
  r: number;
}

export interface MapDecoration extends Point {
  rot: number;
  kind: 'card' | 'rune';
  g: number;
}

export interface Shrine extends Point {
  r: number;
  cd: number;
}

export interface Camp extends Point {
  r: number;
  size: number;
  cleared: boolean;
  engaged: boolean;
  alive: number;
}

export interface Landmark extends Point {
  r: number;
  zoneR: number;
  cleared: boolean;
  engaged: boolean;
}

export interface Treasure extends Point {
  opened: boolean;
}

export interface Chunk {
  cx: number;
  cy: number;
  biome: BiomeDef;
  pillars: Pillar[];
  pools: Pillar[];
  candles: Point[];
  deco: MapDecoration[];
  shrine?: Shrine;
  camp?: Camp;
  landmark?: Landmark;
  treasure?: Treasure;
  sanctuary?: Sanctuary;
}

export interface ZoneRegion extends Point {
  r: number;
  kind: 'boss' | 'duel';
  landmark?: Landmark;
}

export interface HealthCostEffect {
  type: 'healthCost';
  amount: number;
}

export interface HealOverTimeEffect {
  type: 'healOverTime';
  amount: number;
  dur: number;
}

export interface ConsumeStatusEffect {
  type: 'consumeStatus';
  status: StatusName;
  maxStacks: number;
  damagePerStack: number;
  minStacks?: number;
  fallbackStacks?: number;
  retainOnBoss?: number;
}

/** Complex core-pack mechanics are centralized in one resolver. */
export interface CoreMechanicEffect {
  type: 'coreMechanic';
  id:
    | 'flameSigil'
    | 'bloodRage'
    | 'riposte'
    | 'challenge'
    | 'guardedStance'
    | 'deathmark'
    | 'toxicDart'
    | 'silentVerdict'
    | 'darkSacrifice'
    | 'graveCommand'
    | 'deathlyPact'
    | 'wolfAspect'
    | 'bearAspect'
    | 'renewal'
    | 'bloodPact'
    | 'doom'
    | 'hexOfFrailty'
    | 'apocalypse';
  dur?: number;
}
