# icon-picker widget helpers

This directory does not ship a config-driven `widget:` type. Instead it exports a small React hook,
`useRovingIconFocus`, as a public entry point at `decap-cms/widgets/icon-picker` (see the
`./widgets/*` export in `packages/decap-cms/package.json`). It exists so that an extension author
writing their own icon picker control gets the same keyboard navigation behaviour as the bundled
ones, without having to reimplement roving-tabindex arrow-key handling from scratch. Source:
`index.ts`, `useRovingIconFocus.ts`.

## `useRovingIconFocus`

Implements a [roving tabindex](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/) for a
grid of focusable icon buttons: arrow keys move focus between icons, and the hook tracks which icon
should currently be treated as "active" (roving) so only one icon is tabbable at a time.

### Signature

```ts
function useRovingIconFocus(
  iconNames: string[],
  selectedIconName?: string,
): {
  rovingIconName: string | undefined,
  onArrowKeyDown: (event: React.KeyboardEvent<HTMLElement>, index: number) => void,
  onIconFocus: (iconName: string) => void,
};
```

- `iconNames` (**required**) — the full, ordered list of icon names currently rendered in the grid,
  in the same order as the DOM elements. Arrow-key offsets are computed against this order and
  clamped to its bounds. Source: `useRovingIconFocus.ts`.
- `selectedIconName` (optional) — the icon name that is currently selected in the field (e.g. the
  field's current value). Used as the fallback roving icon before anything has been focused. Ignored
  if it isn't present in `iconNames`. Source: `useRovingIconFocus.ts`.

Returns:

- `rovingIconName` — the icon name that should receive `tabIndex={0}` (all others should get
  `tabIndex={-1}`). Resolution order: the last-focused icon (if it's still in `iconNames`) →
  `selectedIconName` (if it's in `iconNames`) → `iconNames[0]`. Source: `useRovingIconFocus.ts`.
- `onArrowKeyDown(event, index)` — keydown handler to attach to each icon button. `index` is that
  button's position in `iconNames`. Handles `ArrowLeft`/`ArrowRight` (±1) and `ArrowUp`/`ArrowDown`
  (±4, matching the bundled grid's 4-column layout), clamps to the array bounds, calls
  `event.preventDefault()`, updates `rovingIconName`, and moves DOM focus to the target button by
  reading `event.currentTarget.parentElement.children`. Keys other than the four arrow keys are
  ignored (no-op, no `preventDefault()`). Because it locates the next button via
  `parentElement.children`, all icon buttons must be direct siblings under one container element.
  Source: `useRovingIconFocus.ts`.
- `onIconFocus(iconName)` — call from each icon button's `onFocus` handler (e.g. on mouse
  focus/click) to keep `rovingIconName` in sync with whichever icon actually has DOM focus. Source:
  `useRovingIconFocus.ts` (this is `setFocusedIconName` from `useState`).

### Usage example

```tsx
import { useRovingIconFocus } from 'decap-cms/widgets/icon-picker';

function CustomIconPickerControl({ iconNames, value, onChange }: {
  iconNames: string[],
  value?: string,
  onChange: (iconName: string) => void,
}) {
  const { rovingIconName, onArrowKeyDown, onIconFocus } = useRovingIconFocus(iconNames, value);

  return (
    <div role="listbox" aria-label="Icon">
      {iconNames.map((iconName, index) => (
        <button
          key={iconName}
          type="button"
          role="option"
          aria-selected={value === iconName}
          tabIndex={rovingIconName === iconName ? 0 : -1}
          onFocus={() => onIconFocus(iconName)}
          onKeyDown={event => onArrowKeyDown(event, index)}
          onClick={() => onChange(iconName)}
        >
          {iconName}
        </button>
      ))}
    </div>
  );
}
```
