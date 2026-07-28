import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import PatLoginForm from '@/ui/default/PatLoginForm';

const t = (key: string) => key;

describe('PatLoginForm (DCMS-1400)', () => {
  it('does not submit an empty token', () => {
    const onSubmit = vi.fn();
    render(<PatLoginForm onSubmit={onSubmit} t={t} />);

    fireEvent.submit(screen.getByRole('button', { name: 'auth.loginWithToken' }).closest('form')!);

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits the trimmed token on form submit', () => {
    const onSubmit = vi.fn();
    render(<PatLoginForm onSubmit={onSubmit} t={t} />);

    fireEvent.change(screen.getByPlaceholderText('auth.personalAccessTokenPlaceholder'), {
      target: { value: '  ghp_example123  ' },
    });
    fireEvent.submit(screen.getByRole('button', { name: 'auth.loginWithToken' }).closest('form')!);

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith('ghp_example123');
  });

  it('does not submit while disabled', () => {
    const onSubmit = vi.fn();
    render(<PatLoginForm onSubmit={onSubmit} disabled t={t} />);

    fireEvent.change(screen.getByPlaceholderText('auth.personalAccessTokenPlaceholder'), {
      target: { value: 'ghp_example123' },
    });
    fireEvent.submit(screen.getByRole('button', { name: 'auth.loggingIn' }).closest('form')!);

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('honors a custom placeholder', () => {
    render(<PatLoginForm onSubmit={vi.fn()} t={t} placeholder="Azure DevOps personal access token" />);

    expect(screen.getByPlaceholderText('Azure DevOps personal access token')).toBeTruthy();
  });
});
