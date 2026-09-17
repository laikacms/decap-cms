// Public entry point for the icon-picker helpers, reachable from outside the
// package as `@laikacms/decap-cms/widgets/icon-picker` via the `./widgets/*`
// export. `@laikacms/decap-cms` does not bundle an icon-picker control itself;
// this hook exists so that an extension author writing their own icon picker
// gets the same keyboard navigation behaviour as this repo's own opt-in icon
// widget extensions (extensions/widgets/lucide-icon, extensions/widgets/radix-icon).
export { useRovingIconFocus } from './useRovingIconFocus';
