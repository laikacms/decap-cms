import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Editor } from '@/ui/editor/Editor';

function editorText(): string {
  return document.querySelector('.ContentEditable__root')?.textContent ?? '';
}

describe('ShareContentPlugin', () => {
  it('describes the share action without leaking internal Lexical playground jargon', async () => {
    render(<Editor format="markdown" />);

    await waitFor(() => expect(editorText()).toBeDefined());

    const button = screen.getByRole('button', { name: 'Copy share link to current editor content' });
    expect(button).toHaveAttribute('title', 'Share');
    expect(button.getAttribute('aria-label')).not.toMatch(/playground/i);
  });
});
