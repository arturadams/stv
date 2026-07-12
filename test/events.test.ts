import { describe, expect, it } from 'vitest';

import { EVT, EventBus } from '../js/core/events.js';

describe('typed EventBus', () => {
  it('delivers payloads to listeners', () => {
    const bus = new EventBus();
    const amounts: number[] = [];

    bus.on(EVT.flowGained, (payload) => {
      amounts.push(payload.amount);
    });
    bus.emit(EVT.flowGained, { amount: 3, source: 'test' });

    expect(amounts).toEqual([3]);
  });

  it('uses a listener snapshot while emitting', () => {
    const bus = new EventBus();
    const calls: string[] = [];

    bus.on(EVT.queueEmpty, () => {
      calls.push('first');
      bus.on(EVT.queueEmpty, () => calls.push('late'));
    });

    bus.emit(EVT.queueEmpty, {});
    expect(calls).toEqual(['first']);

    bus.emit(EVT.queueEmpty, {});
    expect(calls).toEqual(['first', 'first', 'late']);
  });

  it('exposes constants for every current event', () => {
    expect(Object.values(EVT).sort()).toEqual([
      'cardDrawn',
      'cardQueued',
      'cardResolved',
      'channelStart',
      'comboChanged',
      'dash',
      'deckShuffled',
      'enemyKilled',
      'flowGained',
      'perfectDodge',
      'playerHit',
      'powerExpired',
      'powerGained',
      'queueEmpty',
      'statusApplied',
      'trapTriggered',
    ]);
  });

  it('rejects invalid event payloads at compile time', () => {
    const bus = new EventBus();

    if (false) {
      // @ts-expect-error source is required for flowGained
      bus.emit(EVT.flowGained, { amount: 1 });
      // @ts-expect-error comboChanged requires a numeric combo
      bus.emit(EVT.comboChanged, { combo: 'five' });
      // @ts-expect-error unknown event names are not accepted
      bus.emit('cardResolveTypo', {});
    }

    expect(bus).toBeInstanceOf(EventBus);
  });
});
