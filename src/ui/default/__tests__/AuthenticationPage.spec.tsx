import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { StandaloneAuthPage, renderPageLogo } from '@/ui/default/AuthenticationPage';
import { colors } from '@/ui/default/styles';

/**
 * Regression test for DCMS-289: the default Decap brand logo rendered by
 * `renderPageLogo()` (no custom `logo`/`logoUrl` configured) draws its
 * wordmark ("Decap") from `Icon/images/decap.svg`. The wordmark paths used
 * to be hard-locked to `fill="black"` via the `no-fill` class, which opts a
 * path out of the shared `IconWrapper` rule that resolves fill to
 * `currentColor`. On a dark login card (e.g. Laika's dark theme, which sets
 * `--decap-color-textLead` to a light value) that left the wordmark a fixed
 * near-black, unreadable against the dark background - while the pink "D"
 * mark (intentionally `no-fill`, to preserve the brand color) stayed
 * visible.
 *
 * The fix: the wordmark paths no longer carry `no-fill`, so they inherit
 * `currentColor`, and the icon wrapper explicitly sets a themeable
 * `color: ${colors.textLead}` so the wordmark follows the active theme
 * instead of being hardcoded.
 */
describe('AuthenticationPage - default logo dark-theme contrast (DCMS-289)', () => {
  it('renders the default Decap logo (no custom logoUrl) with a themeable wordmark color', () => {
    const { container } = render(<>{renderPageLogo(undefined)}</>);

    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();

    // The pink "D" mark paths stay hardcoded (brand color, no-fill).
    const brandPaths = container.querySelectorAll('path.no-fill');
    expect(brandPaths.length).toBeGreaterThan(0);
    brandPaths.forEach(path => {
      expect(path.getAttribute('fill')).toBe('#FF0082');
    });

    // The wordmark paths must NOT be locked out of the currentColor cascade.
    const wordmarkPaths = Array.from(container.querySelectorAll('path')).filter(
      path => path.getAttribute('fill') === 'black' || path.getAttribute('fill') === '#000',
    );
    expect(wordmarkPaths.length).toBeGreaterThan(0);
    wordmarkPaths.forEach(path => {
      expect(path.classList.contains('no-fill')).toBe(false);
    });
  });

  it('StandaloneAuthPage renders the logo wrapper with an explicit themeable text color', () => {
    const { container } = render(<StandaloneAuthPage>{null}</StandaloneAuthPage>);

    const iconWrapper = container.querySelector('span');
    expect(iconWrapper).toBeTruthy();
    expect(iconWrapper).toHaveStyle({ color: colors.textLead });
  });
});
