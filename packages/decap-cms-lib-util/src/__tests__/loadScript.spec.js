import loadScript from '../loadScript';

function makeScriptMock() {
  return {
    src: '',
    onload: null,
    onreadystatechange: null,
    onerror: null,
  };
}

function setupDomMocks(script, { triggerOnload, readyState, triggerOnerror, errorArg } = {}) {
  const appendChildMock = jest.fn().mockImplementation(() => {
    if (triggerOnerror) {
      script.onerror(errorArg ?? new Error('load failed'));
    } else if (triggerOnload) {
      if (readyState !== undefined) {
        script.readyState = readyState;
      }
      script.onload.call(script);
    }
  });

  const headMock = { appendChild: appendChildMock };

  jest.spyOn(document, 'getElementsByTagName').mockReturnValue([headMock]);
  jest.spyOn(document, 'createElement').mockReturnValue(script);

  return { appendChildMock };
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('loadScript', () => {
  it('resolves when onload fires with readyState === "loaded"', async () => {
    const script = makeScriptMock();
    setupDomMocks(script, { triggerOnload: true, readyState: 'loaded' });

    await expect(loadScript('https://example.com/lib.js')).resolves.toBeUndefined();
  });

  it('resolves when onload fires with readyState === "complete"', async () => {
    const script = makeScriptMock();
    setupDomMocks(script, { triggerOnload: true, readyState: 'complete' });

    await expect(loadScript('https://example.com/lib.js')).resolves.toBeUndefined();
  });

  it('resolves when onload fires with no readyState (undefined)', async () => {
    const script = makeScriptMock();
    // readyState left undefined — falsy branch in the condition passes
    setupDomMocks(script, { triggerOnload: true });

    await expect(loadScript('https://example.com/lib.js')).resolves.toBeUndefined();
  });

  it('rejects when onerror fires', async () => {
    const script = makeScriptMock();
    const error = new Error('network error');
    setupDomMocks(script, { triggerOnerror: true, errorArg: error });

    await expect(loadScript('https://example.com/lib.js')).rejects.toBe(error);
  });

  it('does not resolve on non-terminal readyState (e.g. "loading") — done guard', async () => {
    const script = makeScriptMock();
    setupDomMocks(script, { triggerOnload: true, readyState: 'loading' });

    // Non-terminal readyState falls into else branch which calls reject()
    await expect(loadScript('https://example.com/lib.js')).rejects.toBeUndefined();
  });

  it('sets the script src to the provided url', () => {
    const script = makeScriptMock();
    const headMock = { appendChild: jest.fn() };
    jest.spyOn(document, 'getElementsByTagName').mockReturnValue([headMock]);
    jest.spyOn(document, 'createElement').mockReturnValue(script);

    loadScript('https://example.com/analytics.js').catch(() => {});

    expect(script.src).toBe('https://example.com/analytics.js');
  });
});
