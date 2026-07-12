export interface UidCounter {
  next(): number;
  reset(start?: number): void;
}

export function makeUidCounter(start = 1): UidCounter {
  let value = start;

  return {
    next: () => value++,
    reset: (next = 1) => {
      value = next;
    },
  };
}
