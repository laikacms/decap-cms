import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import LaikaTooltip from '@/laika-app/ui/LaikaTooltip';

describe('LaikaTooltip', () => {
  it('renders both the child and the bubble', () => {
    const { getByText, getByRole } = render(
      <LaikaTooltip content="Saves the entry">
        <button>Save</button>
      </LaikaTooltip>,
    );
    expect(getByText('Save')).toBeInTheDocument();
    expect(getByRole('tooltip').textContent).toBe('Saves the entry');
  });

  it('supports a `bottom` placement', () => {
    const { getByRole } = render(
      <LaikaTooltip content="below" placement="bottom">
        <span>thing</span>
      </LaikaTooltip>,
    );
    expect(getByRole('tooltip')).toBeInTheDocument();
  });
});
