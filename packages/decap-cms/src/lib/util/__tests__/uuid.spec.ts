import { describe, expect, it, vi } from 'vitest';

import { randomUUID } from '@/lib/util/uuid.js';

const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('randomUUID', () => {
  it('uses the native crypto.randomUUID when available', () => {
    const nativeUuid = '11111111-1111-4111-8111-111111111111';
    const mockedUuid = vi
      .spyOn(crypto, 'randomUUID')
      .mockReturnValue(nativeUuid as ReturnType<typeof crypto.randomUUID>);

    try {
      expect(randomUUID()).toBe(nativeUuid);
      expect(mockedUuid).toHaveBeenCalledTimes(1);
    } finally {
      mockedUuid.mockRestore();
    }
  });

  it('falls back to crypto.getRandomValues when crypto.randomUUID is unavailable', () => {
    const originalDescriptor = Object.getOwnPropertyDescriptor(crypto, 'randomUUID');
    Object.defineProperty(crypto, 'randomUUID', {
      value: undefined,
      configurable: true,
      writable: true,
    });
    const getRandomValuesSpy = vi.spyOn(crypto, 'getRandomValues');

    try {
      expect(typeof crypto.randomUUID).not.toBe('function');
      expect(typeof crypto.getRandomValues).toBe('function');

      const uuid = randomUUID();

      expect(uuid).toMatch(UUID_V4_PATTERN);
      expect(getRandomValuesSpy).toHaveBeenCalledTimes(1);
    } finally {
      getRandomValuesSpy.mockRestore();
      if (originalDescriptor) {
        Object.defineProperty(crypto, 'randomUUID', originalDescriptor);
      }
    }
  });

  it('falls back to Math.random when crypto is fully unavailable', () => {
    const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
    Object.defineProperty(globalThis, 'crypto', {
      value: undefined,
      configurable: true,
      writable: true,
    });

    try {
      expect(typeof crypto).toBe('undefined');

      const uuid = randomUUID();

      expect(uuid).toMatch(/^k-[0-9a-z]+-[0-9a-z]+$/);
      expect(uuid).not.toMatch(UUID_V4_PATTERN);
    } finally {
      if (originalDescriptor) {
        Object.defineProperty(globalThis, 'crypto', originalDescriptor);
      }
    }
  });
});
