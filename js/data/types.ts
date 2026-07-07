import type { EventMap } from '../core/events.js';

export type School = 'Mage' | 'Warrior' | 'Rogue' | 'Colorless';
export type Cat = 'Power' | 'Skill' | 'Spell' | 'Trigger' | 'Engine' | 'Modifier';
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
export type Targeting = 'none' | 'self' | 'nearest';
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
  | StabilizeEffect
  | DrawEffect
  | QueueOpEffect
  | ModifierEffect
  | EnchantEffect
  | HasteEffect
  | FlowOverTimeEffect
  | MarkEffect
  | SummonEffect;

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
  basic?: boolean;
}
