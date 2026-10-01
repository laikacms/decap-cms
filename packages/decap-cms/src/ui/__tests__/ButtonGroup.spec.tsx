import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ButtonGroup, ButtonGroupSeparator, ButtonGroupText } from '@/ui/ButtonGroup';

describe('ButtonGroup', () => {
  it('renders a horizontal group by default', () => {
    render(<ButtonGroup data-testid="group" />);

    const group = screen.getByRole('group');
    expect(group).toHaveAttribute('data-slot', 'button-group');
    expect(group).toHaveAttribute('data-orientation', 'horizontal');
  });

  it('reflects the vertical orientation', () => {
    render(<ButtonGroup orientation="vertical" />);

    expect(screen.getByRole('group')).toHaveAttribute('data-orientation', 'vertical');
  });

  it('passes className and extra props through', () => {
    render(<ButtonGroup className="extra" aria-label="Formatting" id="bg" />);

    const group = screen.getByRole('group', { name: 'Formatting' });
    expect(group).toHaveClass('extra');
    expect(group).toHaveAttribute('id', 'bg');
  });
});

describe('ButtonGroupText', () => {
  it('passes className and extra props through', () => {
    render(
      <ButtonGroupText className="label" data-testid="text">
        Prefix
      </ButtonGroupText>,
    );

    const text = screen.getByTestId('text');
    expect(text).toHaveClass('label');
    expect(text).toHaveTextContent('Prefix');
  });
});

describe('ButtonGroupSeparator', () => {
  it('defaults to vertical orientation and sets its data-slot', () => {
    const { container } = render(<ButtonGroupSeparator />);

    const separator = container.querySelector('[data-slot="button-group-separator"]');
    expect(separator).not.toBeNull();
    expect(separator).toHaveAttribute('data-orientation', 'vertical');
  });

  it('honours an explicit horizontal orientation', () => {
    const { container } = render(<ButtonGroupSeparator orientation="horizontal" />);

    expect(container.querySelector('[data-slot="button-group-separator"]')).toHaveAttribute(
      'data-orientation',
      'horizontal',
    );
  });
});
