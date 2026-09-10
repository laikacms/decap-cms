import type { EditorComponentsRegistry } from '@/widgets/richtext/types';

/**
 * Restrict the registry to the components a field's `editor_components` names.
 *
 * A field that omits the key gets every registered component, which is the
 * common case. A field that sets it gets exactly the ids it lists, in registry
 * order - so `editor_components: []` deliberately offers none, the way an
 * explicit empty list reads.
 *
 * Ids that match nothing in the registry are ignored rather than reported: the
 * registry is populated by `registerEditorComponent` calls a config file cannot
 * see, so a name that is merely registered later is not a config error.
 */
export function filterEditorComponents(
  editorComponents: EditorComponentsRegistry,
  allowedIds: string[] | undefined,
): EditorComponentsRegistry {
  if (!allowedIds) {
    return editorComponents;
  }

  const allowed = new Set(allowedIds);
  const filtered: EditorComponentsRegistry = new Map();

  for (const [id, component] of editorComponents) {
    if (allowed.has(id)) {
      filtered.set(id, component);
    }
  }

  return filtered;
}
