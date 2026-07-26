import React from 'react';
import { render } from '@testing-library/react';

import { Modal } from '../Modal';

jest.spyOn(console, 'error').mockImplementation(() => ({}));

describe('Modal', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    const root = document.createElement('div');
    root.setAttribute('id', 'nc-root');
    document.body.appendChild(root);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should not log a prop-type warning when children is a render-prop function', () => {
    render(
      <Modal isOpen onClose={jest.fn()}>
        {() => <div>rendered</div>}
      </Modal>,
    );

    expect(console.error).not.toHaveBeenCalledWith(expect.stringContaining('Failed prop type'));
  });

  it('should give the dialog an accessible name via ariaLabel', () => {
    render(
      <Modal isOpen onClose={jest.fn()} ariaLabel="Media assets">
        <div>content</div>
      </Modal>,
    );

    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog.getAttribute('aria-label')).toBe('Media assets');
  });

  it('should give the dialog an accessible name via ariaLabelledby', () => {
    render(
      <Modal isOpen onClose={jest.fn()} ariaLabelledby="modal-title">
        <h1 id="modal-title">Media assets</h1>
      </Modal>,
    );

    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog.getAttribute('aria-labelledby')).toBe('modal-title');
  });
});
