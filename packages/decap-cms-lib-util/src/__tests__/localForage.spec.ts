/**
 * Verifies that importing localForage does not throw when localStorage is
 * absent (Node / proxy-server environment). Regression test for DCMS-047.
 */
describe('localForage', () => {
  it('can be imported without throwing in a Node environment', () => {
    // jsdom (Jest default) exposes localStorage; delete it to simulate Node
    const original = (global as Record<string, unknown>).localStorage;
    delete (global as Record<string, unknown>).localStorage;

    expect(() => {
      jest.resetModules();
      require('../localForage');
    }).not.toThrow();

    // Restore for other tests
    (global as Record<string, unknown>).localStorage = original;
  });
});
