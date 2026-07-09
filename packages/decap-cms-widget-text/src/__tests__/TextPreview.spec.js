import React from 'react';
import { render } from '@testing-library/react';

import TextPreview from '../TextPreview';

describe('TextPreview', () => {
  it('renders the given value inside the preview container', () => {
    const { container } = render(<TextPreview value="Hello World" />);
    expect(container.textContent).toBe('Hello World');
  });

  it('renders nothing when value is undefined', () => {
    const { container } = render(<TextPreview value={undefined} />);
    expect(container.textContent).toBe('');
  });

  it('renders nothing when value is an empty string', () => {
    const { container } = render(<TextPreview value="" />);
    expect(container.textContent).toBe('');
  });

  // DCMS-415: see StringPreview.spec.js for the full rationale.
  describe('bidi control visualization (DCMS-415)', () => {
    const RLO = String.fromCharCode(0x202e);

    it('renders a visible <RLO> badge instead of the invisible control character', () => {
      const { container } = render(<TextPreview value={`admin${RLO}txt.exe`} />);
      expect(container.textContent).toBe('admin<RLO>txt.exe');
    });

    it('renders plain values unchanged', () => {
      const { container } = render(<TextPreview value="admin.txt.exe" />);
      expect(container.textContent).toBe('admin.txt.exe');
    });
  });
});
