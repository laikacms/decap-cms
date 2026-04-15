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
