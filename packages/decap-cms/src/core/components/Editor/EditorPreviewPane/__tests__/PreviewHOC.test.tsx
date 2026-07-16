import { render } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import PreviewHOC from '@/core/components/Editor/EditorPreviewPane/PreviewHOC';

import type { CmsEntryField } from '@/lib/util/index';

// Regression test for DCMS-633: a `RichtextValue` proxy (see
// `src/lib/richtext/RichtextValue.ts`) keeps a stable object identity across
// renders and only mutates its internal `portableText`/`editorState` in
// place. `PreviewHOC`'s memo comparator used to short-circuit purely on
// `prev.value === next.value`, so the richtext preview never re-rendered
// after the first keystroke even though the proxy's contents had changed.

function TextValuePreview({ value }: { value?: { text: string } }) {
  return <div data-testid="preview">{value?.text}</div>;
}

describe('PreviewHOC', () => {
  it('re-renders on every update for the richtext widget, even when the value reference is unchanged', () => {
    const field = { name: 'body', widget: 'richtext' } as CmsEntryField;
    // Simulate the richtext control's stable proxy: same reference, mutated
    // in place, exactly like `LexicalRichtextValue`/`RichtextValue` does.
    const stableProxy: { text: string } = { text: 'first' };

    const { getByTestId, rerender } = render(
      <PreviewHOC previewComponent={TextValuePreview} field={field} value={stableProxy as never} />,
    );
    expect(getByTestId('preview').textContent).toBe('first');

    stableProxy.text = 'second';
    rerender(
      <PreviewHOC previewComponent={TextValuePreview} field={field} value={stableProxy as never} />,
    );

    expect(getByTestId('preview').textContent).toBe('second');
  });

  it('skips re-render for plain widgets when the value reference is unchanged', () => {
    const field = { name: 'title', widget: 'string' } as CmsEntryField;
    let renderCount = 0;
    function CountingPreview({ value }: { value?: unknown }) {
      renderCount += 1;
      return <div data-testid="preview">{String(value)}</div>;
    }

    const stableValue = 'unchanged';
    const { rerender } = render(
      <PreviewHOC previewComponent={CountingPreview} field={field} value={stableValue} />,
    );
    expect(renderCount).toBe(1);

    rerender(
      <PreviewHOC previewComponent={CountingPreview} field={field} value={stableValue} />,
    );
    // Same reference + same field/getAsset/fieldsMetaData -> memo bails out.
    expect(renderCount).toBe(1);
  });
});
