import { describe, expect, it } from 'vitest';

import { uuidToBase32 } from '@/widgets/uuid/base32';

describe('uuidToBase32', () => {
  it('encodes the nil UUID', () => {
    expect(uuidToBase32('00000000-0000-0000-0000-000000000000')).toBe('aaaaaaaaaaaaaaaaaaaaaaaaaa');
  });

  it('strips dashes before encoding', () => {
    const withDashes = uuidToBase32('12345678-1234-4234-8234-123456789abc');
    const withoutDashes = uuidToBase32('1234567812344234823 4123456789abc'.replace(/ /g, ''));
    expect(withDashes).toBe(withoutDashes);
  });

  it('produces only lowercase RFC 4648 alphabet characters', () => {
    const encoded = uuidToBase32('ffffffff-ffff-ffff-ffff-ffffffffffff');
    expect(encoded).toMatch(/^[a-z2-7]+$/);
  });

  it('is deterministic for the same input', () => {
    const uuid = 'abcdef01-2345-6789-abcd-ef0123456789';
    expect(uuidToBase32(uuid)).toBe(uuidToBase32(uuid));
  });
});
