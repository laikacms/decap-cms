import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { FileUploadButton } from './FileUploadButton';

describe('FileUploadButton', () => {
  it('exposes an accessible button role and is keyboard-focusable', () => {
    render(<FileUploadButton label="Upload" onChange={vi.fn()} />);

    const control = screen.getByRole('button', { name: 'Upload' });
    expect(control).toHaveAttribute('tabIndex', '0');
  });

  it('opens the file chooser when Enter is pressed on the focused control', async () => {
    const user = userEvent.setup();
    render(<FileUploadButton label="Upload" onChange={vi.fn()} />);

    const control = screen.getByRole('button', { name: 'Upload' });
    const input = control.querySelector('input[type="file"]') as HTMLInputElement;
    const clickSpy = vi.spyOn(input, 'click');

    control.focus();
    await user.keyboard('{Enter}');

    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it('opens the file chooser when Space is pressed on the focused control', async () => {
    const user = userEvent.setup();
    render(<FileUploadButton label="Upload" onChange={vi.fn()} />);

    const control = screen.getByRole('button', { name: 'Upload' });
    const input = control.querySelector('input[type="file"]') as HTMLInputElement;
    const clickSpy = vi.spyOn(input, 'click');

    control.focus();
    await user.keyboard(' ');

    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it('still forwards a pointer click on the label to the hidden input', async () => {
    const user = userEvent.setup();
    render(<FileUploadButton label="Upload" onChange={vi.fn()} />);

    const control = screen.getByRole('button', { name: 'Upload' });
    const input = control.querySelector('input[type="file"]') as HTMLInputElement;
    const clickListener = vi.fn();
    input.addEventListener('click', clickListener);

    await user.click(control);

    expect(clickListener).toHaveBeenCalledTimes(1);
  });

  it('does not open the file chooser via keyboard when disabled', async () => {
    const user = userEvent.setup();
    render(<FileUploadButton label="Upload" onChange={vi.fn()} disabled />);

    const control = screen.getByRole('button', { name: 'Upload' });
    expect(control).toHaveAttribute('tabIndex', '-1');
    expect(control).toHaveAttribute('aria-disabled', 'true');

    const input = control.querySelector('input[type="file"]') as HTMLInputElement;
    const clickSpy = vi.spyOn(input, 'click');

    control.focus();
    await user.keyboard('{Enter}');

    expect(clickSpy).not.toHaveBeenCalled();
  });
});
