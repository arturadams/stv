import { CARDS } from '../../js/data.js';
import type { Cat, Rarity, School } from '../../js/data/types.js';

export interface CardDefView {
  id: string;
  school: School;
  cat: Cat;
  rarity: Rarity;
  cost: number;
  channel: number;
  tags: readonly string[];
  world?: number;
  effects: readonly unknown[];
}

export interface DeckEntryView {
  id: string;
  lvl: number;
}

export interface CardInstanceView {
  uid: number;
  cost: number;
  lvl: number;
  copy?: boolean;
  def: CardDefView;
}

export interface CountView {
  count: number;
}

export interface PowerView {
  timeLeft: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isCardDef(value: unknown): value is CardDefView {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.school === 'string'
    && typeof value.cat === 'string'
    && typeof value.rarity === 'string'
    && typeof value.cost === 'number'
    && typeof value.channel === 'number'
    && Array.isArray(value.tags)
    && Array.isArray(value.effects);
}

export function cardDef(id: string): CardDefView {
  const cards: unknown = CARDS;
  if (!isRecord(cards) || !isCardDef(cards[id])) {
    throw new TypeError('expected card definition: ' + id);
  }
  return cards[id];
}

function isDeckEntry(value: unknown): value is DeckEntryView {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.lvl === 'number';
}

export function readDeckEntries(value: unknown): DeckEntryView[] {
  if (!Array.isArray(value) || !value.every(isDeckEntry)) {
    throw new TypeError('expected deck entries');
  }
  return value;
}

function isCardInstance(value: unknown): value is CardInstanceView {
  return isRecord(value)
    && typeof value.uid === 'number'
    && typeof value.cost === 'number'
    && typeof value.lvl === 'number'
    && isCardDef(value.def);
}

export function readCardInstances(value: unknown): CardInstanceView[] {
  if (!Array.isArray(value) || !value.every(isCardInstance)) {
    throw new TypeError('expected card instances');
  }
  return value;
}

function isCount(value: unknown): value is CountView {
  return isRecord(value) && typeof value.count === 'number';
}

export function readCounts(value: unknown): CountView[] {
  if (!Array.isArray(value) || !value.every(isCount)) {
    throw new TypeError('expected modifier counts');
  }
  return value;
}

function isPower(value: unknown): value is PowerView {
  return isRecord(value) && typeof value.timeLeft === 'number';
}

export function readPowers(value: unknown): PowerView[] {
  if (!Array.isArray(value) || !value.every(isPower)) {
    throw new TypeError('expected active powers');
  }
  return value;
}
