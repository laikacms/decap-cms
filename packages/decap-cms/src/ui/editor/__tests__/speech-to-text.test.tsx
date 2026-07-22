import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

// `SpeechToTextPlugin` resolves `SUPPORT_SPEECH_RECOGNITION` once, at module
// evaluation time, from `window.SpeechRecognition` /
// `window.webkitSpeechRecognition`. jsdom doesn't implement either, so the
// stub below must exist *before* the plugin module (transitively pulled in
// by `Editor`) is first evaluated. Static imports are hoisted ahead of any
// top-level statement in this file, so the stub is installed and the whole
// chain is imported dynamically instead.
class MockSpeechRecognition {
  continuous = false;
  interimResults = false;
  addEventListener() {}
  start() {}
  stop() {}
}
(window as unknown as { SpeechRecognition: typeof MockSpeechRecognition }).SpeechRecognition =
  MockSpeechRecognition;

const { Editor } = await import('@/ui/editor/Editor');

function editorText(): string {
  return document.querySelector('.ContentEditable__root')?.textContent ?? '';
}

describe('SpeechToTextPlugin', () => {
  it('labels the mic button with the action the click performs, not the current state', async () => {
    render(<Editor format="markdown" />);

    await waitFor(() => expect(editorText()).toBeDefined());

    // Off: clicking would enable the feature.
    const button = screen.getByRole('button', { name: 'Enable speech to text' });
    expect(button).toHaveAttribute('title', 'Speech To Text');
    expect(screen.queryByRole('button', { name: 'Disable speech to text' })).not.toBeInTheDocument();

    // On: clicking would disable the feature.
    fireEvent.click(button);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Disable speech to text' })).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: 'Enable speech to text' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Disable speech to text' })).toHaveAttribute(
      'title',
      'Speech To Text',
    );
  });
});
