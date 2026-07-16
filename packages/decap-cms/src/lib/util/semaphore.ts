export type Semaphore = {
  take: (f: (...args: unknown[]) => unknown) => void,
  leave: () => void,
};

export function createSemaphore(count: number): Semaphore {
  let available = count;
  const queue: Array<() => void> = [];

  function take(f: (...args: unknown[]) => unknown): void {
    if (available > 0) {
      available--;
      f();
    } else {
      queue.push(f as () => void);
    }
  }

  function leave(): void {
    if (queue.length > 0) {
      const next = queue.shift()!;
      next();
    } else {
      if (available >= count) {
        throw new Error('leave called too many times.');
      }
      available++;
    }
  }

  return { take, leave };
}

export default createSemaphore;
