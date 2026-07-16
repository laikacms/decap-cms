import { render } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import StringPreview from '@/widgets/string/StringPreview';

const RLO = String.fromCharCode(0x202e);

// DCMS-415 / DCMS-429: the preview pane rendered bidi control characters
// verbatim, so the RLO (U+202E) actually visually reversed the trailing
// text ("admin<RLO>txt.exe" rendered as "admin exe.txt") with no indication
// to the reviewer that a control character was present. Ported from
// origin/main to v4.beta.
describe('StringPreview bidi control visualization (DCMS-415 / DCMS-429)', () => {
  it('renders a visible <RLO> badge instead of the invisible control character', () => {
    const { container } = render(<StringPreview value={`admin${RLO}txt.exe`} />);
    expect(container.textContent).toBe('admin<RLO>txt.exe');
  });

  it('does not reverse or otherwise garble the surrounding text', () => {
    const { container } = render(<StringPreview value={`admin${RLO}txt.exe`} />);
    expect(container.textContent).not.toContain('exe.txt');
  });

  it('renders plain values unchanged', () => {
    const { container } = render(<StringPreview value="admin.txt.exe" />);
    expect(container.textContent).toBe('admin.txt.exe');
  });
});
