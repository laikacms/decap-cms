/**
 * The `hidden` widget is a pseudo-widget: it has no registered control or
 * preview component (see `resolveWidget` in `./registry`), so any code path
 * that tries to render it falls through to the generic "unknown widget"
 * fallback. Since a hidden field is meant to be invisible to the editor,
 * every place that renders widgets (control pane, default preview template,
 * nested preview resolution) must exclude `hidden` fields before attempting
 * to resolve/render them.
 */
export function isVisible(field) {
  return field.get('widget') !== 'hidden';
}
