import { describe, expect, it } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';

import TextPreview from '../TextPreview';

const RLO = String.fromCharCode(0x202e);

// DCMS-415 / DCMS-429: see StringPreview.spec.tsx for the full rationale.
// Ported from origin/main to v4.beta.
describe('TextPreview bidi control visualization (DCMS-415 / DCMS-429)', () => {
  it('renders a visible <RLO> badge instead of the invisible control character', () => {
    const { container } = render(<TextPreview value={`admin${RLO}txt.exe`} />);
    expect(container.textContent).toBe('admin<RLO>txt.exe');
  });

  it('renders plain values unchanged', () => {
    const { container } = render(<TextPreview value="admin.txt.exe" />);
    expect(container.textContent).toBe('admin.txt.exe');
  });
});
