import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

import Widget from '../index';

// The CMS package's own enum pin (config-schema-widget-enum.test.ts) cannot
// resolve this widget: it does not depend on this package. So the other half of
// that guard lives here, reading the same published schema asset through the
// `./schema/*` export. If this package's widget name drifts from the schema, or
// the name is dropped from the enum, this fails.
const require = createRequire(import.meta.url);
const schema = require('decap-cms/schema/config.schema.json');

const WIDGET_NAME = 'map';

describe('map widget name is documented in the CMS config schema', () => {
  it('registers under the documented name', () => {
    expect(Widget.Widget().name).toBe(WIDGET_NAME);
  });

  it('appears in the schema widget enum', () => {
    const widgetProp = schema.definitions?.field?.properties?.widget;
    const enumValues: string[] = widgetProp?.enum ?? widgetProp?.examples ?? [];

    expect(enumValues).toContain(WIDGET_NAME);
  });
});
