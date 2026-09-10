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
// A name in the enum that no package in this repo ships is a broken promise to
// anyone reading the autocompletion, so the enum tracks what v4 can actually
// resolve (DCMS-1710).
const schemaPath = path.resolve(__dirname, '../../schema/config.schema.json');

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

  // `hidden` is special-cased by EditorControlPane (it short-circuits before
  // widget resolution — see `field.widget === 'hidden'` in
  // EditorControlPane.tsx) and never goes through `registerWidget`/`getWidget`.
  // It is the only legitimate enum entry with no Registry entry.
  const NON_REGISTRY_WIDGET_NAMES = new Set(['hidden']);

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
