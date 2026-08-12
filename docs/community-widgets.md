# Community widgets

`@laikacms/decap-cms` supports custom field widgets registered through `Registry.registerWidget`
(re-exported as `CMS.registerWidget`) — see
[`packages/decap-cms/src/core/README.md`](../packages/decap-cms/src/core/README.md) for the
extension registration API and
[`packages/decap-cms/skills/decap-widget-development/SKILL.md`](../packages/decap-cms/skills/decap-widget-development/SKILL.md)
for how to build one (control component, preview component, optional schema/value serializer).

A widget package typically exports a `Widget(opts?)` factory (so a consumer can override fields like
`name` or `schema`) plus the raw `controlComponent`/`previewComponent`, matching the shape used by
this repo's own bundled widgets (`@laikacms/decap-cms/widgets/*`):

```ts
import CMS from '@laikacms/decap-cms';
import MyWidget from 'my-decap-widget-example';

CMS.registerWidget(MyWidget.Widget());
```

This page is a curated, community-maintained list of third-party `registerWidget` packages. It is
the first, smallest slice of the ecosystem work tracked in
[#1426](https://github.com/laikacms/decap-cms/issues/1426) — a hosted demo, first-party starter
templates, and expanded end-user docs are separate, not-yet-built follow-ons.

## How to list your widget here

Open a PR against this file (`docs/community-widgets.md`) adding a row to the table below, sorted
alphabetically by name. Requirements:

- Published on npm and installable standalone (not a fork of this repo).
- README documenting how to register it via `CMS.registerWidget` / `Registry.registerWidget`.
- You are the maintainer, or have the maintainer's OK to list it.

Listing here is not an endorsement or a compatibility guarantee — widgets are maintained
independently of this repo. If a listed package is abandoned or no longer works, open a PR removing
its row.

## Widgets

| Name                                              | Description | npm package | Repo |
| ------------------------------------------------- | ----------- | ----------- | ---- |
| _No community widgets listed yet — be the first!_ |             |             |      |

Looking for widget examples in the meantime? This repo ships several bundled, opt-in widgets under
`@laikacms/decap-cms/widgets/*` (e.g. `radix-icon`, `lucide-icon`, `map`, `aichat`) —
each has its own README under
[`packages/decap-cms/src/widgets/`](../packages/decap-cms/src/widgets/) and is registered the same
way (`CMS.registerWidget(Widget.Widget())`), useful as reference implementations even though they
ship in-tree rather than as standalone npm packages.
