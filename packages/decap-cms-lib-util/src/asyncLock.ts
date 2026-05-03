import createSemaphore from './semaphore.js';

import type { Semaphore } from './semaphore.js';

export type AsyncLock = { release: () => void; acquire: (timeout?: number) => Promise<boolean> };

export function asyncLock(): AsyncLock {
  let lock: Semaphore = createSemaphore(1);

  function acquire(timeout = 15000) {
    const promise = new Promise<boolean>(resolve => {
      // this makes sure a caller doesn't gets stuck forever awaiting on the lock
      const timeoutId = setTimeout(() => {
        // we reset the lock in that case to allow future consumers to use it without being blocked
        lock = createSemaphore(1);
        resolve(false);
      }, timeout);

      lock.take(() => {
        clearTimeout(timeoutId);
        resolve(true);
      });
    });

    return promise;
  }

  function release() {
    try {
      // suppress too many calls to leave error
      lock.leave();
    } catch (e: unknown) {
      // calling 'leave' too many times might not be good behavior
      // but there is no reason to completely fail on it
      const error = e as Error;
      if (error.message !== 'leave called too many times.') {
        throw e;
      } else {
        console.warn('leave called too many times.');
        lock = createSemaphore(1);
      }
    }
  }

  return { acquire, release };
}
