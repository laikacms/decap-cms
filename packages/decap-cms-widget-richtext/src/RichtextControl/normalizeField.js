export function normalizeField(field) {
  let normalized = field;
  if (
    normalized.get('editor_components') === undefined &&
    normalized.get('editorComponents') !== undefined
  ) {
    normalized = normalized.set('editor_components', normalized.get('editorComponents'));
  }
  return normalized;
}
