/**
 * Unit tests for the shouldShowLogo logic in Header.js (DCMS-081, DCMS-155).
 *
 * Previously (DCMS-081): `logo?.show_in_header && logo?.src` — required show_in_header: true even
 * though the schema only requires src. Fixed to: `logo?.src && logo?.show_in_header !== false`
 *
 * DCMS-155: when only the deprecated `logo_url` key is set, `logo?.src` is undefined so
 * `shouldShowLogo` was always false and the logo never rendered.
 * Fixed to: `(logo?.src || logoUrl) && logo?.show_in_header !== false`
 */

function shouldShowLogo(logo, logoUrl) {
  return (logo?.src || logoUrl) && logo?.show_in_header !== false;
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

  it('hides logo when src is absent and no logoUrl', () => {
    expect(shouldShowLogo({ show_in_header: true })).toBeFalsy();
  });

  it('hides logo when src is empty string and no logoUrl', () => {
    expect(shouldShowLogo({ src: '', show_in_header: true })).toBeFalsy();
  });

  // DCMS-155: deprecated logo_url fallback
  it('shows logo when only logoUrl (deprecated logo_url) is set and logo is undefined', () => {
    expect(shouldShowLogo(undefined, 'https://example.com/logo.png')).toBeTruthy();
  });

  it('shows logo when only logoUrl is set and logo has no src', () => {
    expect(shouldShowLogo({}, 'https://example.com/logo.png')).toBeTruthy();
  });

  it('logo.src takes precedence over logoUrl when both are set', () => {
    expect(
      shouldShowLogo(
        { src: 'https://example.com/logo-new.png' },
        'https://example.com/logo-old.png',
      ),
    ).toBeTruthy();
  });

  it('hides logo when logoUrl is set but show_in_header is explicitly false', () => {
    expect(shouldShowLogo({ show_in_header: false }, 'https://example.com/logo.png')).toBeFalsy();
  });
});
