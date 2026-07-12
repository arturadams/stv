import type { CardDef } from '../types.js';

const cards: CardDef[] = [];
function card(def: CardDef): CardDef { cards.push(def); return def; }

// ═══ COLORLESS ═══ the glue — engines that respect the slower rhythm ═══

card({ id: 'draw', name: 'Draw', school: 'Colorless', cat: 'Engine', rarity: 'Common',
  cost: 0, channel: 0.3, targeting: 'none', tags: ['Draw'], glyph: '⎘', element: 'gold',
  text: 'Draw one card into the queue. Grants no Flow.',
  effects: [{ type: 'draw', n: 1 }] });

card({ id: 'extend', name: 'Extend', school: 'Colorless', cat: 'Engine', rarity: 'Uncommon',
  cost: 1, channel: 0.4, targeting: 'none', tags: ['Power', 'Duration'], glyph: '⟢', element: 'gold',
  text: 'Your active Powers last 4 seconds longer.',
  effects: [{ type: 'extendPower', sec: 4 }] });

card({ id: 'quickcast', name: 'Quickcast', school: 'Colorless', cat: 'Modifier', rarity: 'Common',
  cost: 1, channel: 0.3, targeting: 'none', tags: ['Channel'], glyph: '➾', element: 'gold',
  text: 'The next Spell channels 50% faster but loses 20% power.',
  effects: [{ type: 'mod', match: { cat: 'Spell' }, buff: { channelMult: 0.5, dmgMult: 0.8 } }] });

card({ id: 'grand_channel', name: 'Grand Channel', school: 'Colorless', cat: 'Modifier', rarity: 'Uncommon',
  cost: 2, channel: 0.4, targeting: 'none', tags: ['Channel'], glyph: '⌖', element: 'gold',
  text: 'The next Spell channels 60% longer but gains +70% power and +25% area.',
  effects: [{ type: 'mod', match: { cat: 'Spell' }, buff: { channelMult: 1.6, dmgMult: 1.7, radiusMult: 1.25 } }] });

card({ id: 'duplicate', name: 'Duplicate', school: 'Colorless', cat: 'Engine', rarity: 'Uncommon',
  cost: 2, channel: 0.4, targeting: 'none', tags: ['Duplicate'], glyph: '⧠', element: 'gold',
  text: 'Copy the next card in the queue. The copy costs 1 more Flow.',
  effects: [{ type: 'queueOp', op: 'duplicateNext' }] });

card({ id: 'flush_queue', name: 'Flush Queue', school: 'Colorless', cat: 'Engine', rarity: 'Rare',
  cost: 3, channel: 0.7, targeting: 'none', tags: ['Queue'], glyph: '⇶', element: 'gold',
  text: 'Golden energy floods the queue: the queued cards channel at triple speed, while Flow lasts.',
  effects: [{ type: 'queueOp', op: 'flush' }] });

card({ id: 'echo', name: 'Echo', school: 'Colorless', cat: 'Engine', rarity: 'Uncommon',
  cost: 2, channel: 0.4, targeting: 'none', tags: ['Repeat'], glyph: '⟳', element: 'gold',
  text: 'Return the last resolved card to the queue at +1 Flow cost.',
  effects: [{ type: 'queueOp', op: 'echoLast' }] });

card({ id: 'battery', name: 'Battery', school: 'Colorless', cat: 'Engine', rarity: 'Common',
  cost: 1, channel: 0.6, targeting: 'none', tags: ['Flow'], glyph: '♼', element: 'gold',
  text: 'Store momentum: gain 5 Flow over 3 seconds.',
  effects: [{ type: 'flowOverTime', amount: 5, dur: 3 }] });

card({ id: 'shuffle', name: 'Shuffle', school: 'Colorless', cat: 'Engine', rarity: 'Common',
  cost: 1, channel: 0.3, targeting: 'none', tags: ['Deck'], glyph: '♺', element: 'gold',
  text: 'Immediately shuffle the discard pile back into the deck.',
  effects: [{ type: 'queueOp', op: 'shuffleAll' }] });

card({ id: 'purge', name: 'Purge', school: 'Colorless', cat: 'Engine', rarity: 'Uncommon',
  cost: 1, channel: 0.4, targeting: 'none', tags: ['Queue'], glyph: '⌫', element: 'gold',
  text: 'Discard the current queue; gain half its total Flow cost back.',
  effects: [{ type: 'queueOp', op: 'purge' }] });

card({ id: 'overload', name: 'Overload', school: 'Colorless', cat: 'Modifier', rarity: 'Uncommon',
  cost: 2, channel: 0.4, targeting: 'none', tags: ['Risk'], glyph: '⚶', element: 'gold',
  text: 'The next Spell costs double Flow but deals 120% more damage in a wider area.',
  effects: [{ type: 'mod', match: { cat: 'Spell' }, buff: { costMult: 2, dmgMult: 2.2, radiusMult: 1.3 } }] });

card({ id: 'stabilize', name: 'Stabilize', school: 'Colorless', cat: 'Engine', rarity: 'Common',
  cost: 1, channel: 0.4, targeting: 'none', tags: ['Defense'], glyph: '⚖', element: 'gold',
  text: 'Gain 5 Armor — or 16 if a Power is active.',
  effects: [{ type: 'stabilize', low: 5, high: 16 }] });

card({ id: 'momentum', name: 'Momentum', school: 'Colorless', cat: 'Trigger', rarity: 'Uncommon',
  cost: 2, channel: 0.5, targeting: 'none', tags: ['Flow', 'Trigger'], glyph: '∞', element: 'gold',
  text: 'For 30s: whenever a card finishes, gain 1 Flow if you are near enemies.',
  effects: [{ type: 'enchant', dur: 30, on: ['cardResolved'], do: { flowIfNear: 1 } }] });

card({ id: 'grand_flush', name: 'Grand Flush', school: 'Colorless', cat: 'Engine', rarity: 'Legendary',
  cost: 6, channel: 1.2, targeting: 'none', tags: ['Queue', 'Legendary'], glyph: '☩', element: 'gold',
  text: 'Channel briefly, then the entire queue channels at triple speed for half Flow cost.',
  effects: [{ type: 'queueOp', op: 'flush', costMult: 0.5 }] });

export const COLORLESS_CARDS = cards;
