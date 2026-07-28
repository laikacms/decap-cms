import { getLanguageLoader } from '../languageLoaders';

describe('getLanguageLoader', () => {
  it('returns a loader function for a known mode (javascript)', () => {
    const loader = getLanguageLoader('javascript');
    expect(typeof loader).toBe('function');
  });

  it('returns a loader function for a known mode (python)', () => {
    const loader = getLanguageLoader('python');
    expect(typeof loader).toBe('function');
  });

  it('returns null for an unknown/unsupported mode', () => {
    expect(getLanguageLoader('not-a-real-mode')).toBeNull();
  });

  it('returns null when called with no mode', () => {
    expect(getLanguageLoader(undefined)).toBeNull();
  });
});
