import { fireEvent, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import Toggle from '@/ui/default/Toggle';

/**
 * Regression test for DCMS-543: `Toggle` used to seed a `useState(active)`
 * from the `active` prop and never re-synced on prop change, so it could
 * drift from the form value it was supposed to reflect. It's now a
 * controlled Base UI `Switch` driven directly by `active`.
 */
describe('Toggle - prop-sync (DCMS-543)', () => {
  it('reflects a new `active` value on re-render without remounting', () => {
    const { getByRole, rerender } = render(<Toggle active={false} />);

    const toggle = getByRole('switch');
    expect(toggle.getAttribute('aria-checked')).toBe('false');

    rerender(<Toggle active={true} />);

    expect(getByRole('switch')).toBe(toggle);
    expect(toggle.getAttribute('aria-checked')).toBe('true');
  });

  it('exposes role="switch" and keeps aria-checked in sync with clicks', () => {
    const onChange = vi.fn();
    const { getByRole } = render(<Toggle active={false} onChange={onChange} />);

    const toggle = getByRole('switch');
    expect(toggle.getAttribute('role')).toBe('switch');

    fireEvent.click(toggle);
    expect(onChange.mock.calls[0][0]).toBe(true);
  });

  it('toggles on Space and Enter keypresses', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    function ControlledToggle() {
      const [active, setActive] = React.useState(false);
      return (
        <Toggle
          active={active}
          onChange={next => {
            setActive(next);
            onChange(next);
          }}
        />
      );
    }

    const { getByRole } = render(<ControlledToggle />);
    const toggle = getByRole('switch');

    await user.tab();
    expect(toggle).toHaveFocus();

    await user.keyboard(' ');
    expect(onChange.mock.calls[0][0]).toBe(true);

    await user.keyboard('{Enter}');
    expect(onChange.mock.calls[1][0]).toBe(false);
  });
});
