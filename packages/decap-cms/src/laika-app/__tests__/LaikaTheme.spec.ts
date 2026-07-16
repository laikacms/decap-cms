import { describe, expect, it, vi } from 'vitest';

import { laikaDarkTheme, laikaLightTheme, resolveTheme } from '@/laika-app/laikaThemes';

describe('laika themes', () => {
  it('light theme overrides only active tokens', () => {
    expect(laikaLightTheme.colors?.active).toBeDefined();
    expect(laikaLightTheme.colors?.activeBackground).toBeDefined();
  });

  it('dark theme overrides background/foreground/text tokens', () => {
    expect(laikaDarkTheme.colors?.background).toBeDefined();
    expect(laikaDarkTheme.colors?.foreground).toBeDefined();
    expect(laikaDarkTheme.colors?.text).toBeDefined();
    expect(laikaDarkTheme.colors?.textLead).toBeDefined();
    expect(laikaDarkTheme.colors?.inputBackground).toBeDefined();
    expect(laikaDarkTheme.colors?.textFieldBorder).toBeDefined();
  });

  it('dark theme overrides status tokens so badges read clearly', () => {
    expect(laikaDarkTheme.colors?.errorBackground).toBeDefined();
    expect(laikaDarkTheme.colors?.errorText).toBeDefined();
    expect(laikaDarkTheme.colors?.successBackground).toBeDefined();
    expect(laikaDarkTheme.colors?.successText).toBeDefined();
    expect(laikaDarkTheme.colors?.warnBackground).toBeDefined();
    expect(laikaDarkTheme.colors?.warnText).toBeDefined();
    expect(laikaDarkTheme.colors?.statusDraftBackground).toBeDefined();
    expect(laikaDarkTheme.colors?.statusReviewBackground).toBeDefined();
    expect(laikaDarkTheme.colors?.statusReadyBackground).toBeDefined();
    expect(laikaDarkTheme.colors?.mediaDraftBackground).toBeDefined();
  });

  it('resolves explicit modes without consulting the OS', () => {
    expect(resolveTheme('light')).toBe(laikaLightTheme);
    expect(resolveTheme('dark')).toBe(laikaDarkTheme);
  });

  it('resolves system mode to dark when matchMedia reports dark', () => {
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn().mockReturnValue({ matches: true } as MediaQueryList);
    try {
      expect(resolveTheme('system')).toBe(laikaDarkTheme);
    } finally {
      window.matchMedia = originalMatchMedia;
    }
  });

  it('resolves system mode to light when matchMedia reports light', () => {
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn().mockReturnValue({ matches: false } as MediaQueryList);
    try {
      expect(resolveTheme('system')).toBe(laikaLightTheme);
    } finally {
      window.matchMedia = originalMatchMedia;
    }
  });
});
