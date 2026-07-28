import reducer from '../credentials';
import { credentialRequest, credentialSuccess, credentialFailure } from '../../actions/credentials';

describe('credentials reducer', () => {
  it('has an empty default state', () => {
    expect(reducer(undefined, { type: '@@INIT' } as never)).toEqual({});
  });

  it('marks a credential as loading on request', () => {
    const state = reducer({}, credentialRequest('key'));
    expect(state).toEqual({ key: { status: 'loading' } });
  });

  it('stores the value on success', () => {
    const state = reducer({ key: { status: 'loading' } }, credentialSuccess('key', 'secret'));
    expect(state).toEqual({ key: { status: 'success', value: 'secret' } });
  });

  it('stores the error on failure without keeping a stale value', () => {
    const state = reducer(
      { key: { status: 'success', value: 'secret' } },
      credentialFailure('key', 'boom'),
    );
    expect(state).toEqual({ key: { status: 'error', error: 'boom' } });
  });

  it('keeps unrelated credential entries untouched', () => {
    const state = reducer(
      { other: { status: 'success', value: 'other-secret' } },
      credentialRequest('key'),
    );
    expect(state).toEqual({
      other: { status: 'success', value: 'other-secret' },
      key: { status: 'loading' },
    });
  });
});
