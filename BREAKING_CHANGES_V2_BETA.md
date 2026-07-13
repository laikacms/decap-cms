# Breaking Changes — Decap CMS v2.0 (Beta)

This document lists breaking changes introduced in the Decap CMS v2.0 beta release.

## Removed `window.createClass` support

`window.createClass` (the legacy React `createClass` helper) is no longer supported for
registering custom widgets or editor components.

**Migration:** Convert any class-based widgets that rely on `createClass` to **function
components** (optionally using React hooks for state and lifecycle).

```diff
- const MyControl = window.createClass({
-   getInitialState() { return { value: '' }; },
-   render() {
-     return h('input', { value: this.state.value });
-   },
- });
+ const MyControl = ({ value, onChange }) => {
+   return <input value={value} onChange={e => onChange(e.target.value)} />;
+ };
```

## Removed Sublime Text keymap for CodeMirror

The Sublime Text keymap (`keyMap: "sublime"`) is no longer bundled with the CodeMirror
editor integration.

**Migration:** Use the **VS Code** keymap instead. The VS Code keymap is now the default
and does not require additional configuration. If you were explicitly setting the keymap,
update your configuration:

```diff
- keymap: sublime
+ keymap: default   # VS Code keymap is used by default
```

## Removed `PropTypes` from default exports

`PropTypes` (the legacy `prop-types` package) is no longer re-exported from the
Decap CMS default-exports bundle. Plugin authors who relied on
`window.CMS.PropTypes` (e.g. for runtime prop validation in custom widgets) must
either drop the validation or import `prop-types` directly in their plugin.

React 19 itself no longer runs PropTypes validation, so the runtime check was a
no-op in modern React anyway. We recommend migrating to TypeScript or JSDoc for
prop documentation.

**Migration:**

```diff
- const { PropTypes, React } = window.CMS;
- MyControl.propTypes = { value: PropTypes.string };
+ // Drop the propTypes block, or convert the component to TypeScript / JSDoc.
```

If you must keep runtime validation:

```js
import PropTypes from 'prop-types';   // add prop-types as a direct dep
MyControl.propTypes = { value: PropTypes.string };
```

## Object widget: `field` renamed to `fields`

The singular `field` property on the object widget is no longer supported. You must use
`fields` (plural) instead.

**Migration:** Update your configuration to use `fields` instead of `field`:

```diff
- field:
-   name: author
-   widget: string
+ fields:
+   - name: author
+     widget: string
```

## `markdown` widget renamed to `richtext`

The Portable-Text-backed `markdown` widget is now registered as `richtext`.
Persist-time serialization still emits a markdown string, so on-disk content
is unaffected. A back-compat alias `markdown` remains registered (DCMS-483) for
one minor version; a runtime deprecation warning fires once per session the
first time a `markdown` field is resolved.

**Migration:** Rename widget names in your `config.yml`:

```diff
- { label: 'Body', name: 'body', widget: 'markdown' }
+ { label: 'Body', name: 'body', widget: 'richtext' }
```

