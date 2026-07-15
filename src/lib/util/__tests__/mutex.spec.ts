import { describe, expect, it, vi } from 'vitest';

import { createMutex } from '@/lib/util/mutex';

function flushMicrotasks() {
  return Promise.resolve();
}

describe('createMutex', () => {
  it('should resolve immediately when the mutex is free', async () => {
    const mutex = createMutex({ timeout: 1000, timeoutError: new Error('timeout') });
    const release = await mutex.acquire();
    expect(typeof release).toEqual('function');
    release();
  });

  it('should serialize concurrent operations', async () => {
    const mutex = createMutex({ timeout: 1000, timeoutError: new Error('timeout') });
    const order: string[] = [];

    async function run(name: string) {
      const release = await mutex.acquire();
      order.push(`${name}:start`);
      await flushMicrotasks();
      order.push(`${name}:end`);
      release();
    }

    await Promise.all([run('a'), run('b'), run('c')]);
    expect(order).toEqual(['a:start', 'a:end', 'b:start', 'b:end', 'c:start', 'c:end']);
  });

  it('should reject with the timeout error when the mutex is held too long', async () => {
    vi.useFakeTimers();
    try {
      const timeoutError = new Error('Request timed out');
      const mutex = createMutex({ timeout: 3000, timeoutError });
      await mutex.acquire();

      const waiting = mutex.acquire();
      const assertion = expect(waiting).rejects.toBe(timeoutError);
      await vi.advanceTimersByTimeAsync(3000);
      await assertion;
    } finally {
      vi.useRealTimers();
    }
  });

  it('should let later waiters proceed after an earlier waiter times out', async () => {
    vi.useFakeTimers();
    try {
      const timeoutError = new Error('Request timed out');
      const mutex = createMutex({ timeout: 3000, timeoutError });
      const releaseFirst = await mutex.acquire();

      const timedOut = mutex.acquire();
      const assertion = expect(timedOut).rejects.toBe(timeoutError);
      await vi.advanceTimersByTimeAsync(3000);
      await assertion;

      let secondAcquired = false;
      const second = mutex.acquire().then(release => {
        secondAcquired = true;
        return release;
      });
      releaseFirst();
      const releaseSecond = await second;
      expect(secondAcquired).toEqual(true);
      releaseSecond();
    } finally {
      vi.useRealTimers();
    }
  });

  it('should not reject an acquire that succeeds before the timeout', async () => {
    vi.useFakeTimers();
    try {
      const mutex = createMutex({ timeout: 3000, timeoutError: new Error('timeout') });
      const releaseFirst = await mutex.acquire();
      const waiting = mutex.acquire();

      await vi.advanceTimersByTimeAsync(1000);
      releaseFirst();
      const releaseSecond = await waiting;
      expect(typeof releaseSecond).toEqual('function');
      releaseSecond();

      // advancing past the original timeout must not cause an unhandled rejection
      await vi.advanceTimersByTimeAsync(5000);
    } finally {
      vi.useRealTimers();
    }
  });
});
