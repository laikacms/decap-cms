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
});
