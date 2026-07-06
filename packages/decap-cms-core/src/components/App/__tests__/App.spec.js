/**
 * Unit tests for the isSearchDisabled route guard (DCMS-391).
 *
 * `search: false` previously only hid the sidebar CollectionSearch UI; the
 * `/search/:searchTerm` and `/collections/:name/search/:searchTerm` routes still
 * rendered the search-driving Collection view (and therefore still triggered the
 * rate-limit-heavy "load all entries" search) even when the config disabled it.
 * isSearchDisabled is what those routes now check before rendering, redirecting
 * away instead when search is disabled.
 */
import { isSearchDisabled } from '../App';

describe('isSearchDisabled', () => {
  it('is disabled when config.search is explicitly false', () => {
    expect(isSearchDisabled({ search: false })).toBe(true);
  });

  it('is enabled when config.search is true', () => {
    expect(isSearchDisabled({ search: true })).toBe(false);
  });

  it('is enabled when config.search is omitted', () => {
    expect(isSearchDisabled({})).toBe(false);
  });

  it('is enabled when config is undefined', () => {
    expect(isSearchDisabled(undefined)).toBe(false);
  });
});
