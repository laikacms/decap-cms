import { fireEvent, render, screen } from '@testing-library/react';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { markdownFormat } from '@/format-packs/markdown';
import { createRichtextValue, registerFormat, unregisterFormat } from '@/lib/richtext';
import { makeBlockFormRenderer } from '@/widgets/richtext/widget/BlockForm';

import type { BlockDefinition } from '@/lib/richtext';
import type { ComponentType } from 'react';

/**
 * A minimal stand-in for the Redux-connected EditorControl that
 * `EditorControlPane/Widget.tsx` injects: renders a labelled input per field
 * and forwards changes as `onChange(field, newValue)`.
 */
const FakeEditorControl: ComponentType<Record<string, unknown>> = props => {
  const field = props.field as { name: string, label?: string };
  const onChange = props.onChange as (f: unknown, v: unknown) => void;
  return (
    <input
      aria-label={field.label ?? field.name}
      value={String(props.value ?? '')}
      onChange={event => onChange(field, event.target.value)}
    />
  );
};

const deps = {
  editorControl: FakeEditorControl,
  resolveWidget: () => ({}),
  clearFieldErrors: () => {},
  t: (key: string) => key,
};

const definition: BlockDefinition = {
  id: 'youtube',
  label: 'YouTube',
  fields: [
    { name: 'id', label: 'Video ID' },
    { name: 'caption', label: 'Caption' },
  ],
};

// The nested-RichtextValue test parses markdown, which needs the mapper that
// `widgets/richtext/widget/index.ts` normally registers at module load.
beforeAll(() => registerFormat(markdownFormat));
afterAll(() => unregisterFormat('markdown'));

describe('BlockForm', () => {
  it('renders one control per block field with current values', () => {
    const renderBlockForm = makeBlockFormRenderer(deps);
    render(
      <>
        {renderBlockForm({
          definition,
          value: { id: 'abc', caption: 'hi' },
          onChange: () => {},
          onClose: () => {},
        })}
      </>,
    );

    expect(screen.getByLabelText('Video ID')).toHaveValue('abc');
    expect(screen.getByLabelText('Caption')).toHaveValue('hi');
  });

  it('merges a field change into the whole block data object', () => {
    const onChange = vi.fn();
    const renderBlockForm = makeBlockFormRenderer(deps);
    render(
      <>
        {renderBlockForm({
          definition,
          value: { id: 'abc', caption: 'hi' },
          onChange,
          onClose: () => {},
        })}
      </>,
    );

    fireEvent.change(screen.getByLabelText('Video ID'), { target: { value: 'xyz' } });
    expect(onChange).toHaveBeenCalledWith({ id: 'xyz', caption: 'hi' });
  });

  it('normalizes a nested RichtextValue to its Portable Text array', () => {
    const onChange = vi.fn();
    const nested = createRichtextValue('Hello **world**', { hint: 'markdown' });
    const richDefinition: BlockDefinition = {
      id: 'container',
      fields: [{ name: 'children', label: 'Body', widget: 'richtext' }],
    };
    const NestedControl: ComponentType<Record<string, unknown>> = props => (
      <button
        onClick={() => (props.onChange as (f: unknown, v: unknown) => void)(props.field, nested)}
      >
        commit-nested
      </button>
    );

    const renderBlockForm = makeBlockFormRenderer({ ...deps, editorControl: NestedControl });
    render(
      <>
        {renderBlockForm({
          definition: richDefinition,
          value: {},
          onChange,
          onClose: () => {},
        })}
      </>,
    );

    fireEvent.click(screen.getByText('commit-nested'));

    const committed = onChange.mock.calls[0]![0] as { children: unknown };
    expect(Array.isArray(committed.children)).toBe(true);
    expect(committed.children).toEqual(nested.portableText);
  });
});
