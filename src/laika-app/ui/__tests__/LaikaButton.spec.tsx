import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import LaikaButton from '@/laika-app/ui/LaikaButton';

function renderInRouter(node: React.ReactNode) {
  return render(<MemoryRouter>{node}</MemoryRouter>);
}

describe('LaikaButton', () => {
  it('renders a button by default', () => {
    const { getByRole } = renderInRouter(<LaikaButton>Save</LaikaButton>);
    const button = getByRole('button');
    expect(button.tagName).toBe('BUTTON');
    expect(button).toHaveTextContent('Save');
    expect(button).toHaveAttribute('type', 'button');
  });

  it('renders a Link when `to` is supplied', () => {
    const { getByRole } = renderInRouter(<LaikaButton to="/settings">Open</LaikaButton>);
    const link = getByRole('link');
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', '/settings');
  });

  it('fires onClick when clicked', () => {
    const onClick = vi.fn();
    const { getByRole } = renderInRouter(<LaikaButton onClick={onClick}>Press</LaikaButton>);
    fireEvent.click(getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('honors the disabled prop', () => {
    const onClick = vi.fn();
    const { getByRole } = renderInRouter(
      <LaikaButton disabled onClick={onClick}>
        No
      </LaikaButton>,
    );
    const button = getByRole('button');
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('forwards the type prop when overridden', () => {
    const { getByRole } = renderInRouter(<LaikaButton type="submit">Submit</LaikaButton>);
    expect(getByRole('button')).toHaveAttribute('type', 'submit');
  });
});
