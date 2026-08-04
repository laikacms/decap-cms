import { resolveCredentialRefs, isCredentialRef } from '../resolveCredentialRefs';
import { getCredential } from '../../actions/credentials';

jest.mock('../../actions/credentials', () => ({
  getCredential: jest.fn(),
}));

const mockGetCredential = getCredential as jest.MockedFunction<typeof getCredential>;

describe('isCredentialRef', () => {
  it('recognizes a well-formed credential reference', () => {
    expect(isCredentialRef({ credential: 'uploadcare_public_key' })).toBe(true);
  });

  it('rejects plain objects, even with a similarly named key', () => {
    expect(isCredentialRef({ credential: 'x', other: 1 })).toBe(false);
    expect(isCredentialRef({ credentialish: 'x' })).toBe(false);
    expect(isCredentialRef('credential')).toBe(false);
    expect(isCredentialRef(null)).toBe(false);
    expect(isCredentialRef(['credential'])).toBe(false);
  });
});

// Minimal stand-in for the redux-thunk middleware: invokes thunk actions
// with itself as `dispatch` and a no-op `getState`, and passes plain
// (non-function) actions through untouched.
function makeThunkDispatch() {
  const dispatch = jest.fn((action: unknown) =>
    typeof action === 'function'
      ? (action as (d: unknown, g: () => unknown) => unknown)(dispatch, () => ({}))
      : action,
  );
  return dispatch as unknown as Parameters<typeof resolveCredentialRefs>[0];
}

describe('resolveCredentialRefs', () => {
  beforeEach(() => {
    mockGetCredential.mockReset();
  });

  it('replaces a top-level credential ref with its resolved value', async () => {
    mockGetCredential.mockReturnValue((() =>
      Promise.resolve('resolved-value')) as unknown as ReturnType<typeof getCredential>);

    const result = await resolveCredentialRefs(makeThunkDispatch(), { credential: 'my_key' });

    expect(result).toBe('resolved-value');
    expect(mockGetCredential).toHaveBeenCalledWith('my_key');
  });

  it('recursively resolves nested credential refs inside objects and arrays, leaving other values untouched', async () => {
    mockGetCredential.mockImplementation(
      name =>
        (() => Promise.resolve(`resolved-${name}`)) as unknown as ReturnType<typeof getCredential>,
    );

    const input = {
      name: 'uploadcare',
      multiple: true,
      config: {
        publicKey: { credential: 'uploadcare_public_key' },
        tags: [{ credential: 'tag_a' }, 'plain-tag'],
      },
    };

    const result = await resolveCredentialRefs(makeThunkDispatch(), input);

    expect(result).toEqual({
      name: 'uploadcare',
      multiple: true,
      config: {
        publicKey: 'resolved-uploadcare_public_key',
        tags: ['resolved-tag_a', 'plain-tag'],
      },
    });
  });

  it('passes primitive values (and objects without a config) through unchanged', async () => {
    const input = { name: 'cloudinary', multiple: false };
    const result = await resolveCredentialRefs(makeThunkDispatch(), input);
    expect(result).toEqual(input);
    expect(mockGetCredential).not.toHaveBeenCalled();
  });
});
