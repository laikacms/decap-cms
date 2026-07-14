import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import LaikaBadge from '@/laika-app/ui/LaikaBadge';
import LaikaTag from '@/laika-app/ui/LaikaTag';

describe('LaikaBadge', () => {
  it('renders children inside a span', () => {
    const { getByText } = render(<LaikaBadge>5</LaikaBadge>);
    const node = getByText('5');
    expect(node.tagName).toBe('SPAN');
  });

  it('accepts all intent variants without throwing', () => {
    const intents = ['neutral', 'info', 'success', 'warning', 'danger', 'draft'] as const;
    intents.forEach(intent => {
      const { getByText } = render(<LaikaBadge intent={intent}>{intent}</LaikaBadge>);
      expect(getByText(intent)).toBeInTheDocument();
    });
  });
});

describe('LaikaTag', () => {
  it('renders children without a remove button by default', () => {
    const { getByText, queryByRole } = render(<LaikaTag>draft</LaikaTag>);
    expect(getByText('draft')).toBeInTheDocument();
    expect(queryByRole('button')).toBeNull();
  });

  it('renders a remove button when onRemove is supplied', () => {
    const onRemove = vi.fn();
    const { getByRole } = render(
      <LaikaTag onRemove={onRemove} removeLabel="Remove draft tag">
        draft
      </LaikaTag>,
    );
    const button = getByRole('button', { name: 'Remove draft tag' });
    fireEvent.click(button);
    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});
