import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { getWidgets } from '@/core/lib/registry';

// `schema/config.schema.json`'s `field.widget` enum/examples is hand-maintained
// (it exists only for editor autocompletion — see the schema's own
// `description`/`$comment`) and can drift from the widgets the package
// actually ships. This pins it against two sources of truth:
//
//   1. Every widget name the default app bootstrap paths
//      (`src/app/extensions.ts`, `src/laika-app/extensions.ts`) register on
//      the Registry via `CMS.registerWidget`.
//   2. Widgets that are opt-in (not registered by the default bootstrap, so
//      not covered by (1)) but documented as valid `{ widget: '<name>' }`
//      values: `ai-chat` (README.md "AI chat" + src/widgets/aichat/README.md),
//      `lucide-icon` and `radix-icon` (their own widget READMEs).
//
// `ai-chat` was missing from the enum (DCMS-1710) even though it is a
// documented, real widget name — this test fails without it.
const schemaPath = path.resolve(__dirname, '../../schema/config.schema.json');

const OPT_IN_DOCUMENTED_WIDGETS = ['ai-chat', 'lucide-icon', 'radix-icon'];

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
  it('includes every widget registered by the default app bootstrap paths', async () => {
    const { registerExtensions: registerAppExtensions } = await import('@/app/extensions');
    const { registerExtensions: registerLaikaAppExtensions } = await import('@/laika-app/extensions');
    registerAppExtensions();
    registerLaikaAppExtensions();

    const registeredWidgetNames = getWidgets().map(widget => widget.name);
    expect(registeredWidgetNames.length).toBeGreaterThan(0);

    const enumValues = loadWidgetEnum();

    for (const name of registeredWidgetNames) {
      expect(enumValues, `widget "${name}" is registered but missing from the schema's widget enum`)
        .toContain(name);
    }
  });

  it('includes the documented opt-in widgets not covered by default bootstrap', () => {
    const enumValues = loadWidgetEnum();

    for (const name of OPT_IN_DOCUMENTED_WIDGETS) {
      expect(enumValues, `documented opt-in widget "${name}" is missing from the schema's widget enum`)
        .toContain(name);
    }
  });
});
