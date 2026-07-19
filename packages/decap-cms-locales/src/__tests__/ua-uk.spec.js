import ua from '../ua';
import uk from '../uk';

describe('Ukrainian locale alias (DCMS-534)', () => {
  it('exposes "uk" as the canonical Ukrainian ISO 639-1 locale key', () => {
    expect(uk).toBeDefined();
    expect(typeof uk).toBe('object');
  });

  it('keeps the legacy "ua" export as an alias of "uk" so they cannot drift again', () => {
    expect(ua).toBe(uk);
    expect(ua).toEqual(uk);
  });
});
