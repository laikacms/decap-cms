# Lucide icon widget

An icon-picker widget that lets editors browse and select icons from the
[Lucide](https://lucide.dev/) icon library. Registers as `widget: 'lucide-icon'`.

This widget is opt-in: it is not registered in `app/extensions.ts`. Consumers import it from the
`@laikacms/decap-cms-widget-lucide-icon` package and register it themselves.

## Usage

### Register the widget

Call `CMS.registerWidget` once during Decap CMS initialisation, before the editor mounts:

```ts
import CMS from '@laikacms/decap-cms';
import WidgetIcon from '@laikacms/decap-cms-widget-lucide-icon';

CMS.registerWidget(WidgetIcon.Widget());
```

Pass `IconWidgetOptions` to `Widget()` to restrict the available icons:

```ts
import WidgetIcon, { type IconWidgetOptions } from '@laikacms/decap-cms-widget-lucide-icon';

const opts: IconWidgetOptions = {
  // Optional: only show icons whose names match this pattern (case-insensitive search
  // is handled by the control itself; this filter applies on top at registration time).
  filter: /^Arrow/,
};

CMS.registerWidget(WidgetIcon.Widget(opts));
```

### Config

After registration, use `widget: lucide-icon` in any collection field:

```yaml
collections:
  - name: pages
    label: Pages
    files:
      - name: home
        label: Home
        file: content/home.md
        fields:
          - label: Icon
            name: icon
            widget: lucide-icon
```

> **Note:** This widget registers as `lucide-icon`. If you also use the `radix-icon` widget (which
> registers as `radix-icon`), both can coexist in the same app without one overwriting the other.

The field value stored in your content files is the Lucide icon name as a string (e.g.
`"ArrowRight"`).

### Rendering the icon in your frontend

```tsx
import * as LucideReact from 'lucide-react';

interface Props {
  icon: string; // value from the CMS field
}

export function Icon({ icon }: Props) {
  const LucideIcon = (LucideReact as Record<string, React.ElementType>)[icon];
  if (!LucideIcon) return null;
  return <LucideIcon />;
}
```

## API

### `DecapCmsWidgetLucideIcon` (default export)

| Property           | Type                                      | Description                               |
| ------------------ | ----------------------------------------- | ----------------------------------------- |
| `name`             | `'lucide-icon'`                           | Widget type name used in Decap config     |
| `Widget`           | `(opts?: IconWidgetOptions) => WidgetDef` | Factory; call this for `registerWidget`   |
| `controlComponent` | `React.FC<IconControlProps>`              | The picker control rendered in the editor |
| `previewComponent` | `React.FC`                                | The preview shown alongside the editor    |

### `IconWidgetOptions`

| Property | Type                                  | Required | Description                                                                               |
| -------- | ------------------------------------- | -------- | ----------------------------------------------------------------------------------------- |
| `filter` | `RegExp \| ((id: string) => boolean)` | no       | Only icons whose names match this pattern (or pass the predicate) are shown in the picker |
