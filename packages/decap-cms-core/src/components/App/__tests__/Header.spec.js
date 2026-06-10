/**
 * Unit tests for the shouldShowLogo logic in Header.js (DCMS-081).
 *
 * Previously: `logo?.show_in_header && logo?.src` — required show_in_header: true even
 * though the schema only requires src.
 * Fixed to: `logo?.src && logo?.show_in_header !== false`
 */

function shouldShowLogo(logo) {
  return logo?.src && logo?.show_in_header !== false;
}

describe('Header shouldShowLogo', () => {
  it('shows logo when only src is set (show_in_header omitted)', () => {
    expect(shouldShowLogo({ src: 'https://example.com/logo.png' })).toBeTruthy();
  });

  it('shows logo when src is set and show_in_header is true', () => {
    expect(
      shouldShowLogo({ src: 'https://example.com/logo.png', show_in_header: true }),
    ).toBeTruthy();
  });

  it('hides logo when src is set but show_in_header is explicitly false', () => {
    expect(
      shouldShowLogo({ src: 'https://example.com/logo.png', show_in_header: false }),
    ).toBeFalsy();
  });

  it('hides logo when logo is undefined', () => {
    expect(shouldShowLogo(undefined)).toBeFalsy();
  });

  it('hides logo when src is absent', () => {
    expect(shouldShowLogo({ show_in_header: true })).toBeFalsy();
  });

  it('hides logo when src is empty string', () => {
    expect(shouldShowLogo({ src: '', show_in_header: true })).toBeFalsy();
  });
});
