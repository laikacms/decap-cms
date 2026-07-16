import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BLOCK_NODE_TYPE } from '@/lib/richtext/blocks/BlockNode';
import { Editor } from '@/ui/editor/Editor';

import type { BlockDefinition, BlocksConfig } from '@/lib/richtext';
import type { SerializedEditorState } from 'lexical';

function stateWithBlock(componentId: string, data: Record<string, unknown>): SerializedEditorState {
  return {
    root: {
      type: 'root',
      version: 1,
      format: '',
      indent: 0,
      direction: null,
      children: [{ type: BLOCK_NODE_TYPE, version: 1, componentId, data }],
    },
  } as unknown as SerializedEditorState;
}

const youtubeDefinition: BlockDefinition = {
  id: 'youtube',
  label: 'YouTube',
  fields: [{ name: 'id', label: 'Video ID' }],
  preview: ({ data }) => <div data-testid="youtube-preview">video: {String(data.id)}</div>,
};

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('Editor custom blocks', () => {
  it('renders a registered block through its preview component', async () => {
    const blocksConfig: BlocksConfig = { blocks: { youtube: youtubeDefinition } };
    render(
      <Editor
        editorSerializedState={stateWithBlock('youtube', { id: 'abc123' })}
        blocksConfig={blocksConfig}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('youtube-preview')).toHaveTextContent('video: abc123');
    });
    expect(screen.getByRole('button', { name: 'Edit YouTube block' })).toBeInTheDocument();
  });

  it('renders an unknown block as a visible, data-preserving card (never null)', async () => {
    render(
      <Editor
        editorSerializedState={stateWithBlock('mystery', { keep: 'me' })}
        blocksConfig={{ blocks: {} }}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(/Unknown block "mystery"/)).toBeInTheDocument();
    });
    // Raw data stays visible in the fallback preview.
    expect(screen.getByText(/"keep": "me"/)).toBeInTheDocument();
    // Unknown blocks are not editable, only deletable.
    expect(screen.queryByRole('button', { name: /Edit/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete mystery block' })).toBeInTheDocument();
  });

  it('opens the injected inline form on edit and commits prop changes', async () => {
    const onSerializedChange = vi.fn();
    const renderBlockForm: NonNullable<BlocksConfig['renderBlockForm']> = ({
      value,
      onChange,
    }) => (
      <input
        aria-label="Video ID"
        value={String(value.id ?? '')}
        onChange={event => onChange({ ...value, id: event.target.value })}
      />
    );

    render(
      <Editor
        editorSerializedState={stateWithBlock('youtube', { id: 'abc123' })}
        blocksConfig={{ blocks: { youtube: youtubeDefinition }, renderBlockForm }}
        onSerializedChange={onSerializedChange}
      />,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Edit YouTube block' }));
    const input = await screen.findByLabelText('Video ID');
    expect(input).toHaveValue('abc123');

    fireEvent.change(input, { target: { value: 'xyz789' } });

    // The node data update flows out through the change handler...
    await waitFor(() => {
      const lastCall = onSerializedChange.mock.calls.at(-1);
      const serialized = JSON.stringify(lastCall?.[0]);
      expect(serialized).toContain('xyz789');
    });
    // ...the preview reflects it, and the form survives the decorator
    // re-render without remounting (same element, still in the document).
    await waitFor(() => {
      expect(screen.getByTestId('youtube-preview')).toHaveTextContent('video: xyz789');
    });
    expect(screen.getByLabelText('Video ID')).toBe(input);
  });

  it('closes the form with Escape', async () => {
    render(
      <Editor
        editorSerializedState={stateWithBlock('youtube', { id: 'abc123' })}
        blocksConfig={{
          blocks: { youtube: youtubeDefinition },
          renderBlockForm: () => <input aria-label="Video ID" />,
        }}
      />,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Edit YouTube block' }));
    const input = await screen.findByLabelText('Video ID');
    fireEvent.keyDown(input, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByLabelText('Video ID')).not.toBeInTheDocument();
    });
  });

  it('deletes the block from the chrome', async () => {
    const onSerializedChange = vi.fn();
    render(
      <Editor
        editorSerializedState={stateWithBlock('youtube', { id: 'abc123' })}
        blocksConfig={{ blocks: { youtube: youtubeDefinition } }}
        onSerializedChange={onSerializedChange}
      />,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Delete YouTube block' }));

    await waitFor(() => {
      expect(screen.queryByTestId('youtube-preview')).not.toBeInTheDocument();
    });
    const lastCall = onSerializedChange.mock.calls.at(-1);
    expect(JSON.stringify(lastCall?.[0])).not.toContain('decap-block');
  });
});
