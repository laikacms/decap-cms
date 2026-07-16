import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, expect, it } from 'vitest';

import LaikaTooltip from '@/laika-app/ui/LaikaTooltip';

describe('LaikaTooltip', () => {
  it('delegates the trigger to the child and shows the tooltip on hover', async () => {
    const user = userEvent.setup();
    render(
      <LaikaTooltip content="Saves the entry">
        <button>Save</button>
      </LaikaTooltip>,
    );

    // The child is the trigger itself: no extra wrapper button.
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    await user.hover(screen.getByRole('button', { name: 'Save' }));
    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip).toHaveTextContent('Saves the entry');
  });

  it('shows the tooltip on keyboard focus and hides it again', async () => {
    const user = userEvent.setup();
    render(
      <LaikaTooltip content="Saves the entry">
        <button>Save</button>
      </LaikaTooltip>,
    );

    await user.tab();
    expect(screen.getByRole('button', { name: 'Save' })).toHaveFocus();
    expect(await screen.findByRole('tooltip')).toBeInTheDocument();

    await user.tab();
    await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument());
  });

  it('supports a `bottom` placement', async () => {
    const user = userEvent.setup();
    render(
      <LaikaTooltip content="below" placement="bottom">
        <button>thing</button>
      </LaikaTooltip>,
    );

    await user.hover(screen.getByRole('button', { name: 'thing' }));
    expect(await screen.findByRole('tooltip')).toHaveTextContent('below');
  });
});
