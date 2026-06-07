import isPropValid from '@emotion/is-prop-valid';

/**
 * Default `shouldForwardProp` for laika styled components that wrap a DOM
 * element. Emotion 11's `styled.button` shortcut does NOT auto-filter
 * non-DOM props — anything you pass ends up as an attribute on the
 * underlying element, triggering React warnings ("React does not recognize
 * the `$foo` prop on a DOM element").
 *
 * Using this filter at `styled(<tag>, { shouldForwardProp })`:
 * - `$`-prefixed props are stripped (transient-prop convention).
 * - Any prop `isPropValid` doesn't know (custom `variant`, `buttonSize`,
 *   `intent`, etc.) is stripped.
 * - Standard HTML attributes (`type`, `disabled`, `aria-*`, `data-*`, etc.)
 *   still flow through.
 */
export function laikaShouldForwardProp(prop: string): boolean {
  if (typeof prop !== 'string') return true;
  if (prop.startsWith('$')) return false;
  return isPropValid(prop);
}
