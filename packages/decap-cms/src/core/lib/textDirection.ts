export type TextDirection = 'ltr' | 'rtl';

/**
 * Detects the effective text direction of the host page so Base UI primitives
 * (menus, selects, sliders, popups) can be told about RTL hosts via
 * `DirectionProvider`. Decap CMS is mounted into a page the integrator owns;
 * an Arabic/Hebrew/Farsi site typically sets `<html dir="rtl">` on its admin
 * page, which flips the CSS layout but is invisible to Base UI (its direction
 * context defaults to `ltr`).
 *
 * Resolution order:
 * 1. the nearest ancestor `dir` attribute (`element.closest('[dir]')`), the
 *    explicit author signal and the only one jsdom can resolve;
 * 2. the computed CSS `direction` of the element, which covers stylesheets
 *    that set `direction: rtl` without a `dir` attribute;
 * 3. `ltr` as the default (also used for `dir="auto"` and non-DOM
 *    environments).
 */
export function detectTextDirection(element?: HTMLElement): TextDirection {
  if (typeof document === 'undefined') {
    return 'ltr';
  }
  const target = element ?? document.documentElement;

  const dirAttribute = target.closest('[dir]')?.getAttribute('dir')?.toLowerCase();
  if (dirAttribute === 'rtl' || dirAttribute === 'ltr') {
    return dirAttribute;
  }

  if (typeof window !== 'undefined' && typeof window.getComputedStyle === 'function') {
    if (window.getComputedStyle(target).direction === 'rtl') {
      return 'rtl';
    }
  }

  return 'ltr';
}
