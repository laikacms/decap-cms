/**
 * Styling helpers for the emotion-ported UI components.
 *
 * Built on `@emotion/react` like the rest of the CMS (css prop enabled per
 * file with the `@jsxImportSource @emotion/react` pragma):
 *  - `css` / `keyframes` come straight from `@emotion/react`
 *  - `variants` is a small `cva`-style helper whose variant values are
 *    `SerializedStyles` applied through the css prop
 *  - `cx` joins plain class-name strings (literal utility classes plus a
 *    caller-supplied `className`); emotion itself merges the css prop with
 *    whatever lands in `className`
 */
export { css, keyframes } from '@emotion/react';

import isPropValid from '@emotion/is-prop-valid';

import type { SerializedStyles } from '@emotion/react';

type VariantMap = Record<string, Record<string, SerializedStyles>>;

/** Props selecting one option per variant group. */
export type VariantProps<V extends VariantMap> = {
  [K in keyof V]?: keyof V[K];
};

interface VariantConfig<V extends VariantMap> {
  variants: V;
  defaultVariants?: { [K in keyof V]?: keyof V[K] };
}

/**
 * Build a css-prop style function from a base style and a set of variant
 * groups. Mirrors `class-variance-authority` closely enough for the ported
 * components; the result goes in a `css` prop, not a `className`.
 */
export function variants<V extends VariantMap>(base: SerializedStyles, config: VariantConfig<V>) {
  return (props: VariantProps<V> = {}): SerializedStyles[] => {
    const styles: SerializedStyles[] = [base];
    for (const group of Object.keys(config.variants) as Array<keyof V>) {
      const selected = props[group] ?? config.defaultVariants?.[group];
      if (selected != null) {
        const variantStyles = config.variants[group][selected as string];
        if (variantStyles) styles.push(variantStyles);
      }
    }
    return styles;
  };
}

/** Join plain class-name strings, dropping falsy values. */
export function cx(...classNames: Array<string | false | null | undefined>): string {
  return classNames.filter(Boolean).join(' ');
}

/**
 * Default `shouldForwardProp` for styled components that wrap a DOM element.
 * Emotion 11's `styled.button` shortcut does NOT auto-filter non-DOM props;
 * anything you pass ends up as an attribute on the underlying element,
 * triggering React warnings ("React does not recognize the `$foo` prop on a
 * DOM element").
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

/**
 * Narrows a Base UI component's `className` (which may also be a state
 * callback) to a plain string so it can be merged with `cx`.
 */
export type WithClassName<P> = Omit<P, 'className'> & { className?: string };
