import { describe, expect, it } from 'vitest';

import { EventBus } from '../js/core/events.js';
import { CardEngine } from '../js/engine.js';
import { makeRng } from '../js/core/rng.js';
import { cardDef, readCardInstances, readCounts, readPowers } from './helpers/data.js';

const label = { name: 'Test', glyph: '?', element: 'fire', color: '#fff' };

function makeEngine(seed = 1) {
  const bus = new EventBus();
  const engine = new CardEngine(bus, makeRng(seed));
  engine.drawTimer = Number.POSITIVE_INFINITY;
  return { bus, engine };
}

describe('CardEngine drawing and modifiers', () => {
  it('draws on cadence and enforces the six-card queue cap', () => {
    const { engine } = makeEngine();
    engine.setDeck(Array.from({ length: 7 }, () => 'draw'));
    engine.drawTimer = 0.5;
    engine.sustainedActive = true;

    engine.update(0.49);
    expect(engine.queue).toHaveLength(0);
    engine.update(0.02);
    expect(engine.queue).toHaveLength(1);

    while (engine.drawCard('test')) {
      // Draw until the cap rejects another card.
    }
    expect(engine.queue).toHaveLength(6);
    expect(engine.deck).toHaveLength(1);
    expect(engine.drawCard('test')).toBe(false);
  });

  it('matches school, category, and tags while consuming only matches', () => {
    const { engine } = makeEngine();
    engine.addModifier(label, { match: { school: 'Mage' }, count: 2, buff: { dmgMult: 2 } });
    engine.addModifier(label, { match: { cat: 'Spell' }, buff: { channelMult: 0.5 } });
    engine.addModifier(label, { match: { tags: ['Frost'] }, buff: { radiusMult: 1.25, critChance: 0.2 } });
    engine.addModifier(label, { match: { school: 'Warrior' }, buff: { costMult: 0 } });

    const buffs = engine.collectBuffs(cardDef('frost_nova'));

    expect(buffs).toMatchObject({ dmgMult: 2, channelMult: 0.5, radiusMult: 1.25, critChance: 0.2 });
    expect(engine.modStack).toHaveLength(2);
    expect(readCounts(engine.modStack).map((modifier) => modifier.count).sort()).toEqual([1, 1]);
  });

  it('checks modified affordability without consuming modifiers', () => {
    const { engine } = makeEngine();
    const card = engine.makeCard('meteor');
    engine.flow = 3;
    engine.addModifier(label, { match: { cat: 'Spell' }, count: 1, buff: { costMult: 0.5 } });

    expect(engine.canAfford(card)).toBe(true);
    expect(readCounts(engine.modStack)[0].count).toBe(1);
  });
});

describe('CardEngine queue commands', () => {
  it('duplicates and reverses queued cards', () => {
    const { engine } = makeEngine();
    const initial = readCardInstances([
      engine.makeCard('draw'),
      engine.makeCard('battery'),
    ]);
    const [first, second] = initial;
    engine.queue = [first, second];

    engine.queueOp('duplicateNext');
    const duplicated = readCardInstances(engine.queue);
    expect(duplicated).toHaveLength(3);
    expect(duplicated[1]).toMatchObject({ cost: first.cost + 1, lvl: first.lvl, copy: true });
    expect(duplicated[1].uid).not.toBe(first.uid);

    engine.queueOp('reverse');
    expect(readCardInstances(engine.queue).map((card) => card.def.id)).toEqual(['battery', 'draw', 'draw']);
  });

  it('flushes at reduced cost and 35% channel duration', () => {
    const { engine } = makeEngine();
    const card = engine.makeCard('meteor');
    card.cost = 4;
    engine.flow = 10;
    engine.queue = [card];

    engine.queueOp('flush', { costMult: 0.5 });
    expect(engine.startChannel()).toBe(true);
    expect(engine.channel).toMatchObject({
      cost: 2,
      dur: cardDef('meteor').channel * 0.35,
    });
    expect(engine.flow).toBe(8);
    expect(engine.flushMode).toBeNull();
  });

  it('echoes the last card and shuffles all discards into the deck', () => {
    const { engine } = makeEngine(7);
    engine.lastResolvedId = 'battery';
    engine.lastResolvedLvl = 2;
    engine.queueOp('echoLast');

    expect(readCardInstances(engine.queue)[0]).toMatchObject({
      def: cardDef('battery'),
      lvl: 2,
      cost: cardDef('battery').cost + 1,
    });

    engine.discard = [engine.makeCard('draw'), engine.makeCard('quickcast')];
    const before = engine.deck.length;
    engine.queueOp('shuffleAll');
    expect(engine.discard).toHaveLength(0);
    expect(engine.deck).toHaveLength(before + 2);
  });

  it('purges the queue and refunds half its printed cost', () => {
    const { engine } = makeEngine();
    const a = engine.makeCard('draw');
    const b = engine.makeCard('battery');
    a.cost = 3;
    b.cost = 4;
    engine.queue = [a, b];
    engine.flow = 1;

    engine.queueOp('purge');

    expect(engine.queue).toHaveLength(0);
    expect(engine.discard).toHaveLength(2);
    expect(engine.flow).toBe(4);
  });
});

describe('CardEngine powers, enchants, and combo timing', () => {
  it('refreshes duplicate powers and merges basic attack modifiers', () => {
    const { engine } = makeEngine();
    const fire = {
      id: 'test_fire', name: 'Test Fire', glyph: 'F', element: 'fire', school: 'Mage',
    };
    const frost = {
      id: 'test_frost', name: 'Test Frost', glyph: 'I', element: 'frost', school: 'Mage',
    };
    engine.powerDurMult = 1.5;
    engine.addPower(fire, {
      dur: 4,
      power: { dmgMult: 2, rateMult: 0.5, addStatus: ['burn', 1], extraEvery: 3 },
    });
    readPowers(engine.powers)[0].timeLeft = 1;
    engine.addPower(fire, { dur: 4, power: { dmgMult: 2 } });
    engine.addPower(frost, {
      dur: 2,
      power: { arcMult: 1.5, basicOverride: { dmg: 7 }, addStatus: ['chill', 1] },
    }, 2);

    expect(engine.powers).toHaveLength(2);
    const powers = readPowers(engine.powers);
    expect(powers[0].timeLeft).toBe(6);
    expect(powers[1].timeLeft).toBe(6);
    expect(engine.basicMods()).toMatchObject({
      dmgMult: 2,
      rateMult: 0.5,
      arcMult: 1.5,
      extraEvery: 3,
      override: { dmg: 7 },
      addStatus: [['burn', 1], ['chill', 1]],
    });
  });

  it('filters enchant dispatch by status, enemy status, school, and chance', () => {
    const { engine } = makeEngine(9);
    const calls: unknown[] = [];
    engine.runEnchantAction = (action: unknown) => calls.push(action);
    engine.addEnchant({ on: ['statusApplied'], filter: { status: 'burn' }, do: { flow: 1 } }, label);
    engine.addEnchant({ on: ['enemyKilled'], filter: { hasStatus: 'poison' }, do: { draw: 1 } }, label);
    engine.addEnchant({ on: ['cardResolved'], filter: { school: 'Mage' }, do: { flow: 2 } }, label);
    engine.addEnchant({ on: ['cardResolved'], chance: 0, do: { flow: 99 } }, label);

    engine.dispatchEnchants('statusApplied', { status: 'chill' });
    engine.dispatchEnchants('statusApplied', { status: 'burn' });
    engine.dispatchEnchants('enemyKilled', { enemy: { statuses: { poison: { stacks: 1 } } } });
    engine.dispatchEnchants('cardResolved', { school: 'Mage' });

    expect(calls).toEqual([{ flow: 1 }, { draw: 1 }, { flow: 2 }]);
  });

  it('sets the resolve gap and resets combo chains after four seconds', () => {
    const { engine } = makeEngine();
    const card = engine.makeCard('draw');
    const buffs = { repeat: 0 };
    engine.resolveCard = () => {};
    engine.flow = 0;
    engine.combo = 4;
    engine.comboTimer = 1;

    engine.doResolve(card, buffs, null);
    expect(engine.gapT).toBe(0.55);
    expect(engine.combo).toBe(5);
    expect(engine.comboTimer).toBe(4);
    expect(engine.flow).toBe(2);

    engine.update(4.01);
    expect(engine.combo).toBe(0);
  });
});
