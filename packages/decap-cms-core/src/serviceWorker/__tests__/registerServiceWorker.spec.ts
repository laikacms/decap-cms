import { registerServiceWorker } from '../registerServiceWorker';

describe('registerServiceWorker', () => {
  const originalServiceWorker = (navigator as unknown as { serviceWorker?: unknown }).serviceWorker;
  const originalIsSecureContext = window.isSecureContext;

  afterEach(() => {
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: originalServiceWorker,
    });
    Object.defineProperty(window, 'isSecureContext', {
      configurable: true,
      value: originalIsSecureContext,
    });
    jest.restoreAllMocks();
  });

  function stubSecureContext(value: boolean) {
    Object.defineProperty(window, 'isSecureContext', {
      configurable: true,
      value,
    });
  }

  it('does nothing when serviceWorker is unsupported', () => {
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: undefined,
    });
    stubSecureContext(true);

    expect(() => registerServiceWorker()).not.toThrow();
  });

  it('does nothing outside a secure context', () => {
    const register = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { register },
    });
    stubSecureContext(false);

    registerServiceWorker();
    window.dispatchEvent(new Event('load'));

    expect(register).not.toHaveBeenCalled();
  });

  it('registers a blob-backed service worker on window load in a secure context', () => {
    const register = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { register },
    });
    stubSecureContext(true);
    // jsdom's URL.createObjectURL is a no-op stub that always returns
    // undefined (https://github.com/jsdom/jsdom/issues/1721); stub it here
    // so the assertions exercise our own wiring rather than that gap.
    jest.spyOn(URL, 'createObjectURL').mockReturnValue('blob:decap-cms-fake-url');

    registerServiceWorker();
    window.dispatchEvent(new Event('load'));

    expect(register).toHaveBeenCalledTimes(1);
    const [url, options] = register.mock.calls[0];
    expect(url).toEqual(expect.stringContaining('blob:'));
    expect(options).toEqual({ scope: './' });
  });
});
