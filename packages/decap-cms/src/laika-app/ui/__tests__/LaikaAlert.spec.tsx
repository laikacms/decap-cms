import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import LaikaAlert from '@/laika-app/ui/LaikaAlert';

describe('LaikaAlert', () => {
  it.each(
    [
      ['info', 'status'],
      ['success', 'status'],
      ['warning', 'alert'],
      ['danger', 'alert'],
    ] as const,
  )('renders the %s intent as an accessible %s', (intent, role) => {
    render(<LaikaAlert intent={intent}>{intent} message</LaikaAlert>);

    const notice = screen.getByRole(role);
    expect(notice).toHaveTextContent(`${intent} message`);
    expect(notice).toHaveAttribute('data-intent', intent);
    expect(notice).not.toHaveAttribute('intent');
  });

  it('forwards standard div attributes', () => {
    render(
      <LaikaAlert className="custom-alert" data-testid="notice">
        Saved
      </LaikaAlert>,
    );
    expect(screen.getByTestId('notice')).toHaveClass('custom-alert');
  });

  it('allows the live-region role to be overridden', () => {
    render(<LaikaAlert role="log">Activity</LaikaAlert>);
    expect(screen.getByRole('log')).toHaveTextContent('Activity');
  });
});
