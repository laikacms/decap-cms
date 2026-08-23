// Public entry point for the icon-picker helpers, reachable from outside the
// package as `decap-cms/widgets/icon-picker` via the `./widgets/*`
// export. The in-tree icon widgets are not the only intended consumer: an
// extension author writing their own icon picker gets the same keyboard
// navigation behaviour as the bundled ones.
export { useRovingIconFocus } from './useRovingIconFocus';
