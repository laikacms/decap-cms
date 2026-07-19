---
name: decap-widget-development
description: Build custom field widgets and editor components for Decap CMS (@laikacms/decap-cms). Use when creating or modifying a widget control/preview, adding field validation, or registering a rich-text editor component in a site repo.
---

# Decap CMS widget development

`@laikacms/decap-cms` is a single package with subpath exports (one per `src/<name>/`). Widget
values are **plain JS objects/arrays/primitives**; Immutable.js is gone, do not reintroduce it or
its access patterns (`value.get(...)`). Styling is Emotion only.

## Widget anatomy

A widget is a plain definition object; the convention is a `Widget()` factory so callers can
override fields:

```ts
// index.ts
import controlComponent from './MyWidgetControl';
import previewComponent from './MyWidgetPreview';

const schema = { properties: { max_length: { type: 'number' } } }; // optional

export function Widget(opts = {}) {
  return { name: 'mywidget', controlComponent, previewComponent, schema, ...opts };
}
export default { Widget, controlComponent, previewComponent };
```

Register it once during CMS setup:

```ts
import { DecapCmsCore as CMS } from '@laikacms/decap-cms/core';
import * as MyWidget from './widgets/mywidget';

CMS.registerWidget(MyWidget.Widget());
```

`controlComponent` is required (registration throws without it); `previewComponent` and `schema` are
optional. Registering the same `name` twice warns and the last one wins. Built-in widgets are
importable from subpaths (`@laikacms/decap-cms/widgets/string`, `.../widgets/richtext`, etc.) and
re-registerable with overrides via their own `Widget(opts)`.

## Control component contract

```tsx
import type { CmsWidgetControlProps } from '@laikacms/decap-cms/lib/util';
import React from 'react';

export default function MyWidgetControl({
  value = '',
  field,
  onChange,
  forID,
  classNameWrapper,
  setActiveStyle,
  setInactiveStyle,
}: CmsWidgetControlProps<string>) {
  return (
    <input
      type="text"
      id={forID}
      className={classNameWrapper}
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
      onFocus={setActiveStyle}
      onBlur={setInactiveStyle}
    />
  );
}
```

- `onChange(newValue)` takes the **plain value**, not an event.
- `field` is the plain field-config object; read options directly (`field.max_length`), no `.get()`.
- Wire `forID` to the focusable element and `classNameWrapper` + `setActiveStyle`/`setInactiveStyle`
  for the frame styling, or the control looks broken in the editor.
- Value shapes are plain: `string`, `boolean`, `number | string`, arrays and objects for
  list/object-like widgets.

## Validation

Two layers:

1. **Field-config schema**: the optional `schema` object (`{ properties: { ... } }`) validates what
   site authors may put on the field in `config.yml`.
2. **Runtime value validation**: expose `isValid()` from the control via `forwardRef` +
   `useImperativeHandle`:

```tsx
const MyControl = React.forwardRef(function MyControl(props, ref) {
  React.useImperativeHandle(ref, () => ({
    isValid() {
      if (props.field.max_length && (props.value ?? '').length > props.field.max_length) {
        return { error: { type: 'CUSTOM', message: `Max ${props.field.max_length} characters.` } };
      }
      return true;
    },
  }));
  // ...render
});
```

`isValid()` may return `true`/`false`, `{ error: { type, message } }`, or a `Promise` (async
validation shows a processing state). Presence (`required`) and regex `pattern` checks run
framework-side regardless; do not duplicate them.

## Preview component contract

Props: `{ value, field, entry, getAsset }`. Most previews only need `value`. Wrap output in the
shared container:

```tsx
import { WidgetPreviewContainer } from '@laikacms/decap-cms/ui/default';
import React from 'react';

export default function MyWidgetPreview({ value }: { value?: React.ReactNode }) {
  return <WidgetPreviewContainer>{value}</WidgetPreviewContainer>;
}
```

For whole-collection previews use `CMS.registerPreviewTemplate(collectionName, Component)`; the
component receives `entry`, `widgetFor`/`widgetsFor`, `getAsset`, `fields`. Entry data is plain JS:
`entry.data.title`, not `entry.getIn([...])`.

## Custom blocks (rich-text embeds)

`registerEditorComponent` was removed. `CMS.registerBlock(definition)` adds a custom block type to
the `richtext` widget instead — a PT-native (Portable Text) mechanism, not a `pattern`/`fromBlock`/
`toBlock`/`toPreview` shortcode. Full docs: `src/widgets/richtext/README.md` ("Custom blocks").

```ts
import { markdownFormat } from '@laikacms/decap-cms/format-packs/markdown';
import { CMS } from '@laikacms/decap-cms/laika-app/bare';

CMS.registerBlock({
  id: 'youtube',
  label: 'YouTube',
  fields: [{ name: 'videoId', label: 'Video ID', widget: 'string' }],
  formats: {
    markdown: {
      pattern: /^{{< youtube (\S+) >}}/,
      fromMatch: match => ({ videoId: match[1] }),
      serialize: data => `{{< youtube ${data.videoId} >}}`,
    },
  },
});
CMS.registerRichtextFormat(markdownFormat);
```

- `id` doubles as the Portable Text custom-block `_type` (see the `decap-portable-text` skill):
  agent- or code-authored content targets the component by that id.
- `fields` are decap fields editing the block data (`[]` = no editable props); `formats.markdown`
  is the codec (`pattern`/`fromMatch`/`serialize`) that (de)serializes the block for the markdown
  format pack — other format packs plug in the same way under their own key.
- `CMS.unregisterBlock(id)` removes a block. Register at boot, before any entry is parsed.

## Styling and layering rules

- **Emotion only** (`@emotion/styled`, `css`). No Tailwind, no CSS Modules, no inline style objects
  for themable values.
- Design tokens and shared widget chrome come from `@laikacms/decap-cms/ui/default`: `colors`,
  `lengths`, `zIndex`, `shadows`, `transitions`, plus `WidgetPreviewContainer`, `FieldLabel`,
  `ObjectWidgetTopBar`, `Toggle`, `Icon`. Do not hardcode colors/sizes.
- Interactive primitives (dialogs, popovers, selects, tooltips) come from `@laikacms/decap-cms/ui`
  (Base UI wrappers); do not hand-roll them.
- Layer order is `ui` then `ui/default` then `widgets` then app/core: a widget may import from `ui`
  and `ui/default` but never from `core`, `app`, or `laika-app` internals.
- No em dashes in string/JSX literals (lint-enforced).

## Working inside the decap-cms repo itself

Same contracts, different import style: use the `@/` alias (`@/lib/util/index`,
`@/ui/default/index`), add the widget under `src/widgets/<name>/` with colocated `__tests__/`, and
register it in the arrays in `src/app/extensions.ts` and `src/laika-app/extensions.ts`. Adding a new
subpath export touches `package.json`, which is operator-gated: queue it rather than editing
directly. Verify with `pnpm test:ci`, and end-to-end via the demo app (`pnpm build:demo`).
