import React from 'react';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';

import {
  AlertDialogHost,
  ConfirmDialogHost,
  PromptDialogHost,
  confirmDialog,
  promptDialog,
  showAlert,
} from '../AlertDialog';

describe('showAlert / AlertDialogHost', () => {
  it('falls back to window.alert when no host is mounted', async () => {
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

    await showAlert('hello');

    expect(alertSpy).toHaveBeenCalledWith('hello');
    alertSpy.mockRestore();
  });

  it('renders the message and resolves when dismissed', async () => {
    render(<AlertDialogHost />);

    const resolved = jest.fn();
    act(() => {
      showAlert('Something happened', { title: 'Heads up', okLabel: 'Got it' }).then(resolved);
    });

    expect(await screen.findByText('Something happened')).toBeInTheDocument();
    expect(screen.getByText('Heads up')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Got it'));

    await waitFor(() => expect(resolved).toHaveBeenCalled());
  });
});

describe('confirmDialog / ConfirmDialogHost', () => {
  it('falls back to window.confirm when no host is mounted', async () => {
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);

    await expect(confirmDialog('are you sure?')).resolves.toBe(true);
    expect(confirmSpy).toHaveBeenCalledWith('are you sure?');
    confirmSpy.mockRestore();
  });

  it('resolves true when the confirm button is clicked', async () => {
    render(<ConfirmDialogHost />);

    const resolved = jest.fn();
    act(() => {
      confirmDialog('Delete this entry?', { confirmLabel: 'Delete', destructive: true }).then(
        resolved,
      );
    });

    expect(await screen.findByText('Delete this entry?')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Delete'));

    await waitFor(() => expect(resolved).toHaveBeenCalledWith(true));
  });

  it('resolves false when cancel is clicked', async () => {
    render(<ConfirmDialogHost />);

    const resolved = jest.fn();
    act(() => {
      confirmDialog('Delete this entry?').then(resolved);
    });

    expect(await screen.findByText('Delete this entry?')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Cancel'));

    await waitFor(() => expect(resolved).toHaveBeenCalledWith(false));
  });

  it('settles as false when the given signal aborts', async () => {
    render(<ConfirmDialogHost />);
    const controller = new AbortController();

    const resolved = jest.fn();
    act(() => {
      confirmDialog('Delete?', {}, controller.signal).then(resolved);
    });

    act(() => {
      controller.abort();
    });

    await waitFor(() => expect(resolved).toHaveBeenCalledWith(false));
  });
});

describe('promptDialog / PromptDialogHost', () => {
  it('falls back to window.prompt when no host is mounted', async () => {
    const promptSpy = jest.spyOn(window, 'prompt').mockReturnValue('https://example.com');

    await expect(promptDialog('Enter a URL')).resolves.toBe('https://example.com');
    expect(promptSpy).toHaveBeenCalledWith('Enter a URL', undefined);
    promptSpy.mockRestore();
  });

  it('resolves with the entered value on confirm', async () => {
    render(<PromptDialogHost />);

    const resolved = jest.fn();
    act(() => {
      promptDialog('Enter a URL').then(resolved);
    });

    const input = await screen.findByRole('textbox');
    fireEvent.change(input, { target: { value: 'https://example.com' } });
    fireEvent.click(screen.getByText('OK'));

    await waitFor(() => expect(resolved).toHaveBeenCalledWith('https://example.com'));
  });

  it('resolves with null when cancelled', async () => {
    render(<PromptDialogHost />);

    const resolved = jest.fn();
    act(() => {
      promptDialog('Enter a URL').then(resolved);
    });

    await screen.findByText('Enter a URL');
    fireEvent.click(screen.getByText('Cancel'));

    await waitFor(() => expect(resolved).toHaveBeenCalledWith(null));
  });
});
