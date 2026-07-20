# Radix icon widget

An icon-picker widget that lets editors browse and select icons from the
[Radix UI Icons](https://www.radix-ui.com/icons) library. Registers as `widget: 'radix-icon'`.

This widget is opt-in: it is not registered in `app/extensions.ts`. Consumers import it from the
`widgets/radix-icon` subpath export and register it themselves.

## Usage

### Register the widget

Call `CMS.registerWidget` once during Decap CMS initialisation, before the editor mounts:

```ts
import CMS from '@laikacms/decap-cms';
import WidgetIcon from '@laikacms/decap-cms/widgets/radix-icon';

CMS.registerWidget(WidgetIcon.Widget());
```

Pass `IconWidgetOptions` to `Widget()` to restrict the available icons:

```ts
import WidgetIcon, { type IconWidgetOptions } from '@laikacms/decap-cms/widgets/radix-icon';

const opts: IconWidgetOptions = {
  // Optional: only show icons whose names match this pattern (case-insensitive search
  // is handled by the control itself; this filter applies on top at registration time).
  filter: /^Arrow/,
};

CMS.registerWidget(WidgetIcon.Widget(opts));
```

### Config

After registration, use `widget: radix-icon` in any collection field:

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
            widget: radix-icon
```

> **Note:** This widget registers as `radix-icon`. If you also use the `lucide-icon` widget (which
> registers as `lucide-icon`), both can coexist in the same app without one overwriting the other.

The field value stored in your content files is the Radix icon component name as a string (e.g.
`"ArrowRightIcon"`). All Radix icons follow the `<Name>Icon` naming convention.

### Rendering the icon in your frontend

```tsx
import * as RadixIcons from '@radix-ui/react-icons';

interface Props {
  icon: string; // value from the CMS field, e.g. "ArrowRightIcon"
}

export function Icon({ icon }: Props) {
  const RadixIcon = (RadixIcons as Record<string, React.ElementType>)[icon];
  if (!RadixIcon) return null;
  return <RadixIcon />;
}
```

## API

### `DecapCmsWidgetRadixIcon` (default export)

| Property           | Type                                      | Description                               |
| ------------------ | ----------------------------------------- | ----------------------------------------- |
| `name`             | `'radix-icon'`                            | Widget type name used in Decap config     |
| `Widget`           | `(opts?: IconWidgetOptions) => WidgetDef` | Factory; call this for `registerWidget`   |
| `controlComponent` | `React.FC<IconControlProps>`              | The picker control rendered in the editor |
| `previewComponent` | `React.FC`                                | The preview shown alongside the editor    |

### `IconWidgetOptions`

| Property | Type                                  | Required | Description                                                                               |
| -------- | ------------------------------------- | -------- | ----------------------------------------------------------------------------------------- |
| `filter` | `RegExp \| ((id: string) => boolean)` | no       | Only icons whose names match this pattern (or pass the predicate) are shown in the picker |
