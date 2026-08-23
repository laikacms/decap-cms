/**
 * Editor component (shortcode) registry.
 *
 * Upstream Decap keeps `registerEditorComponent` in core. This fork's core
 * dropped that API in favour of PT-native blocks, so the registry lives in the
 * widget that actually consumes it. Core can re-export `registerEditorComponent`
 * from here as a thin passthrough; nothing in core needs to know the shape.
 */

import type { EditorComponent, EditorComponentOptions, EditorComponentsRegistry, ShortcodeData } from './types';

/** A pattern that can never match, used when a component declares none. */
const catchesNothing = /.^/;

/**
 * Normalize a raw editor component config into a complete `EditorComponent`.
 * Mirrors upstream's `createEditorComponent` value object, minus Immutable.
 */
export function createEditorComponent(config: EditorComponentOptions): EditorComponent {
  const {
    id,
    label = 'unnamed component',
    icon = 'exclamation-triangle',
    type = 'shortcode',
    widget = 'object',
    pattern = catchesNothing,
    fields = [],
    fromBlock,
    toBlock,
    toPreview,
    ...remainingConfig
  } = config;

  // Bound so a component's methods can never rely on being called as methods of
  // the config object, the way upstream's value object did.
  const boundFromBlock = fromBlock?.bind(null);
  const boundToBlock = toBlock?.bind(null);
  const boundToPreview = toPreview?.bind(null);

  /**
   * Without an explicit `toPreview`, a component that has no widget falls back
   * to rendering its own markdown block. A component with a widget has no
   * fallback: the preview pipeline resolves that widget instead.
   */
  const previewFallback = widget ? undefined : boundToBlock;

  return {
    ...remainingConfig,
    id: id ?? label.replace(/[^A-Z0-9]+/gi, '_'),
    label,
    type,
    icon,
    widget,
    pattern,
    fields,
    fromBlock: boundFromBlock ?? ((): ShortcodeData => ({})),
    toBlock: boundToBlock ?? ((): string => 'Plugin'),
    toPreview: boundToPreview ?? previewFallback,
  };
}

const registry: EditorComponentsRegistry = new Map();

/**
 * Register an editor component (a "shortcode"): a markdown pattern plus the
 * fields, block serializer and preview used to edit it in the visual editor.
 */
export function registerEditorComponent(config: EditorComponentOptions): EditorComponent {
  const component = createEditorComponent(config);

  if (component.type === 'code-block') {
    const codeBlock = [...registry.values()].find(c => c.type === 'code-block');
    if (codeBlock) {
      console.warn(
        `Only one editor component of type "code-block" may be registered. The existing "${codeBlock.id}" component will be replaced.`,
      );
      registry.delete(codeBlock.id);
    }
  }

  registry.set(component.id, component);
  return component;
}

/** Remove a previously registered editor component. */
export function unregisterEditorComponent(id: string): void {
  registry.delete(id);
}

/**
 * The live registry. Callers must treat it as read-only; it is handed out by
 * reference so late registrations are picked up by already-mounted editors.
 */
export function getEditorComponents(): EditorComponentsRegistry {
  return registry;
}

/** Find a registered component by id. */
export function getEditorComponent(id: string): EditorComponent | undefined {
  return registry.get(id);
}
