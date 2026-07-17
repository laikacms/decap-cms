import { render } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import ObjectPreview from '@/widgets/object/ObjectPreview';

describe('ObjectPreview', () => {
  // Pins DCMS-805: singular `field` and plural `fields` both resolve to the
  // same rendered preview output; `field` is not deprecated or removed.
  it('renders identically whether the field map uses singular `field` or plural `fields`', () => {
    const singular = render(
      <ObjectPreview field={{ field: <span>rendered value</span> }} />,
    );
    const plural = render(
      <ObjectPreview field={{ fields: <span>rendered value</span> }} />,
    );

    expect(singular.container.innerHTML).toEqual(plural.container.innerHTML);
  });
});
