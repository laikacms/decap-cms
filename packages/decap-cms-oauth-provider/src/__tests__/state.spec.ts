import '../test-setup.js';

import { createNonce, InvalidStateError, signState, verifyState } from '../state';

describe('state', () => {
  it('round-trips a signed payload', async () => {
    const payload = { n: createNonce(), o: 'https://cms.example.com', t: Date.now() };
    const token = await signState(payload, 'secret');
    const verified = await verifyState(token, 'secret', 10 * 60 * 1000);
    expect(verified).toEqual(payload);
  });

  it('rejects a token signed with a different secret', async () => {
    const token = await signState(
      { n: createNonce(), o: 'https://cms.example.com', t: Date.now() },
      'secret-a',
    );
    await expect(verifyState(token, 'secret-b', 10 * 60 * 1000)).rejects.toBeInstanceOf(
      InvalidStateError,
    );
  });

  it('rejects a tampered token', async () => {
    const token = await signState(
      { n: createNonce(), o: 'https://cms.example.com', t: Date.now() },
      'secret',
    );
    const [payload] = token.split('.');
    const tampered = `${payload}.not-a-real-signature`;
    await expect(verifyState(tampered, 'secret', 10 * 60 * 1000)).rejects.toBeInstanceOf(
      InvalidStateError,
    );
  });

  it('rejects a malformed token', async () => {
    await expect(verifyState('not-a-token', 'secret', 10 * 60 * 1000)).rejects.toBeInstanceOf(
      InvalidStateError,
    );
  });

  it('rejects an expired token', async () => {
    const token = await signState(
      { n: createNonce(), o: 'https://cms.example.com', t: Date.now() - 60_000 },
      'secret',
    );
    await expect(verifyState(token, 'secret', 1_000)).rejects.toThrow('expired');
  });

  it('produces distinct nonces', () => {
    expect(createNonce()).not.toEqual(createNonce());
  });
});
