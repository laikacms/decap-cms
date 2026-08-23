import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { registerCoreWidgets } from '@/core/components/EditorWidgets';
import { getWidget, getWidgets } from '@/core/lib/registry';

// `schema/config.schema.json`'s `field.widget` enum/examples is hand-maintained
// (it exists only for editor autocompletion — see the schema's own
// `description`/`$comment`) and can drift from the widgets the package
// actually ships. This pins it against two sources of truth:
//
//   1. Every widget name the default app bootstrap path
//      (`src/app/extensions.ts`) registers on the Registry via
//      `CMS.registerWidget`.
//   2. Widget names this package does not ship but the schema still documents,
//      because they ship as their own packages under `extensions/widgets/*`.
//
// `ai-chat` was missing from the enum (DCMS-1710) even though it is a
// documented, real widget name — this test fails without it.
const schemaPath = path.resolve(__dirname, '../../schema/config.schema.json');

// Widgets that live in `extensions/widgets/*` (DCMS-1971). Their names stay in
// the schema enum because they remain valid `widget:` values, but this package
// cannot resolve them: it does not depend on the extension packages, and must
// not, since they depend on it. Each extension package asserts its own name
// against this same schema file, reached through the `./schema/*` export.
const EXTENSION_PACKAGE_WIDGETS = ['map', 'lucide-icon', 'radix-icon', 'ai-chat'];

const IMPORT_BOOTSTRAP_TIMEOUT_MS = 30_000;

function loadWidgetEnum(): string[] {
  const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));
  const widgetProp = schema.definitions?.field?.properties?.widget;
  const enumValues: string[] | undefined = widgetProp?.enum ?? widgetProp?.examples;
  if (!Array.isArray(enumValues)) {
    throw new Error(
      'Expected schema.definitions.field.properties.widget to have an `enum` or `examples` array',
    );
  }
  return enumValues;
}

describe('schema/config.schema.json widget enum/examples (DCMS-1710)', () => {
  it('includes every widget registered by the default app bootstrap path', async () => {
    const { registerExtensions: registerAppExtensions } = await import('@/app/extensions');
    registerAppExtensions();

    const registeredWidgetNames = getWidgets().map(widget => widget.name);
    expect(registeredWidgetNames.length).toBeGreaterThan(0);

    const enumValues = loadWidgetEnum();

    for (const name of registeredWidgetNames) {
      expect(enumValues, `widget "${name}" is registered but missing from the schema's widget enum`)
        .toContain(name);
    }
    // Importing the bootstrap path pulls in the whole app module graph, which
    // can exceed the 5s default when the full suite is running in parallel.
  }, IMPORT_BOOTSTRAP_TIMEOUT_MS);

  it('includes the widget names that ship as extension packages', () => {
    const enumValues = loadWidgetEnum();

    for (const name of EXTENSION_PACKAGE_WIDGETS) {
      expect(enumValues, `extension-package widget "${name}" is missing from the schema's widget enum`)
        .toContain(name);
    }
  });

  // `hidden` is special-cased by EditorControlPane (it short-circuits before
  // widget resolution — see `field.widget === 'hidden'` in
  // EditorControlPane.tsx) and never goes through `registerWidget`/`getWidget`.
  // The extension-package widgets are unresolvable here for a different reason:
  // their controls live in packages this one cannot import. Both are legitimate
  // enum entries with no Registry entry in this package.
  const NON_REGISTRY_WIDGET_NAMES = new Set(['hidden', ...EXTENSION_PACKAGE_WIDGETS]);

  it('lists no widget name that fails to resolve against the Registry (DCMS-1823)', async () => {
    const { registerExtensions: registerAppExtensions } = await import('@/app/extensions');
    registerAppExtensions();
    registerCoreWidgets();

    const enumValues = loadWidgetEnum();
    expect(enumValues.length).toBeGreaterThan(0);

    for (const name of enumValues) {
      if (NON_REGISTRY_WIDGET_NAMES.has(name)) continue;
      expect(
        getWidget(name),
        `widget "${name}" is listed in the schema's widget enum but has no registered `
          + `control, meaning the enum has drifted from the real Widget Registry (e.g. a widget `
          + `was removed, or the name was never a real widget to begin with).`,
      ).toBeDefined();
    }
  }, IMPORT_BOOTSTRAP_TIMEOUT_MS);
});
