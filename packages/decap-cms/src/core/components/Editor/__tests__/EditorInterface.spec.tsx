/* eslint-disable import/order -- vi.mock calls must precede imports that depend on them */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import React from 'react';

// The mocked pane carries the same `data-field-name` wrappers the real
// EditorControl renders, so the interface's focus behavior is testable.
vi.mock('../EditorControlPane/EditorControlPane', () => ({
  default: React.forwardRef((_props: unknown, _ref: unknown) => (
    <div data-testid="control-pane">
      <div data-field-name="title">
        <input data-testid="title-input" />
      </div>
      <div data-field-name="body">
        <textarea data-testid="body-input" />
      </div>
    </div>
  )),
}));
vi.mock('../EditorPreviewPane/EditorPreviewPane', () => ({
  default: () => <div data-testid="preview-pane" />,
}));
vi.mock('../EditorToolbar', () => ({
  default: () => <div data-testid="toolbar" />,
}));
vi.mock('../../../lib/slots', () => ({
  useCmsSlots: () => ({}),
}));
vi.mock('../../../lib/i18n', () => ({
  hasI18n: () => false,
  getI18nInfo: () => ({ locales: [], defaultLocale: '' }),
  getPreviewEntry: (entry: unknown) => entry,
}));
// `EditorInterface` pulls this in only for `getFileFromSlug`. The real
// module also drags in `actions/config` -> `validateConfig`, which has an
// unrelated static dependency on `lib/i18n`'s enums that the mock above
// doesn't satisfy — stub it out rather than growing that mock to match.
vi.mock('../../../reducers/collections', () => ({
  getFileFromSlug: () => undefined,
}));
// Stub the real react-split-pane@3.2.0 components with buttons that fire the
// same callback shapes (`onResizeStart(event)`, `onResizeEnd(sizes, event)`)
// so DCMS-942's resize-persistence and drag-blocker wiring can be exercised
// without mounting the library's own pointer/keyboard resize machinery.
vi.mock('react-split-pane', () => ({
  SplitPane: ({
    children,
    onResizeStart,
    onResizeEnd,
  }: {
    children: React.ReactNode,
    onResizeStart?: (event: { sizes: number[], source: string }) => void,
    onResizeEnd?: (sizes: number[], event: { sizes: number[], source: string }) => void,
  }) => (
    <div data-testid="split-pane">
      <button
        data-testid="trigger-resize-start"
        onClick={() => onResizeStart?.({ sizes: [300, 300], source: 'pointer' })}
      />
      <button
        data-testid="trigger-resize-end"
        onClick={() =>
          onResizeEnd?.([321, 279], { sizes: [321, 279], source: 'pointer' })
        }
      />
      {children}
    </div>
  ),
  Pane: ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <div className={className}>{children}</div>
  ),
}));

import EditorInterface from '@/core/components/Editor/EditorInterface';

import type { CmsCollectionState, CmsEntry } from '@/lib/util/index';
import type { TranslateFunction } from '@/ui/default/index';

describe('EditorInterface', () => {
  const props = {
    // `editor.preview: false` (+ i18n disabled above) keeps the render on the
    // plain `NoPreviewContainer` branch, so the test doesn't need to mount
    // react-split-pane/react-scroll-sync.
    collection: {
      type: 'other',
      editor: { preview: false },
    } as unknown as CmsCollectionState,
    entry: { slug: 'slug', isPersisting: false } as unknown as CmsEntry,
    fields: [],
    fieldsMetaData: {},
    fieldsErrors: {},
    onChange: vi.fn(),
    onValidate: vi.fn(),
    onPersist: vi.fn(),
    showDelete: true,
    onDelete: vi.fn(),
    onDeleteUnpublishedChanges: vi.fn(),
    onPublish: vi.fn(),
    unPublish: vi.fn(),
    onDuplicate: vi.fn(),
    onChangeStatus: vi.fn(),
    onLogoutClick: vi.fn(),
    loadDeployPreview: vi.fn(),
    draftKey: 'key',
    t: vi.fn((key: string) => key) as unknown as TranslateFunction,
  };

  it('renders the editor container with no top padding (DCMS-440)', () => {
    // The app-shell header this padding used to compensate for is unmounted
    // on editor routes (DCMS-431), so the container must sit flush at top: 0
    // with no reserved space above the sticky toolbar.
    //
    // jsdom doesn't resolve `getComputedStyle` against emotion's injected
    // `<style>` rules, so assert directly against the emitted CSS text for
    // this element's class instead.
    const { container } = render(<EditorInterface {...props} />);
    const editorContainer = container.firstElementChild as HTMLElement;
    expect(editorContainer).not.toBeNull();

    const emotionClass = Array.from(editorContainer.classList).find(cls => cls.startsWith('css-'));
    expect(emotionClass).toBeDefined();

    const emittedCss = Array.from(document.querySelectorAll('style[data-emotion]'))
      .map(style => style.textContent ?? '')
      .join('\n');
    const rule = emittedCss
      .split('}')
      .find(chunk => chunk.includes(`.${emotionClass}{`));

    expect(rule).toBeDefined();
    expect(rule).not.toMatch(/padding-top/);
  });

  // Renders the `editorWithPreview` split-pane branch: preview enabled, i18n
  // disabled (see `../../../lib/i18n` mock above), so `EditorContent` picks
  // `editorWithPreview` rather than `NoPreviewContainer`.
  const previewProps = {
    ...props,
    collection: {
      type: 'other',
      editor: { preview: true },
    } as unknown as CmsCollectionState,
  };

  function pointerEventsOf(el: HTMLElement) {
    const emotionClass = Array.from(el.classList).find(cls => cls.startsWith('css-'));
    expect(emotionClass).toBeDefined();
    const emittedCss = Array.from(document.querySelectorAll('style[data-emotion]'))
      .map(style => style.textContent ?? '')
      .join('\n');
    const rule = emittedCss.split('}').find(chunk => chunk.includes(`.${emotionClass}{`));
    return rule?.match(/pointer-events:([a-z]+)/)?.[1];
  }

  it('persists the split-pane position to localStorage on resize end (DCMS-942)', () => {
    localStorage.removeItem('cms.split-pane-position');
    render(<EditorInterface {...previewProps} />);

    fireEvent.click(screen.getByTestId('trigger-resize-end'));

    expect(localStorage.getItem('cms.split-pane-position')).toBe('321');
  });

  it('shows the pointer-event blocker overlay during a split-pane drag and hides it after (DCMS-942)', () => {
    render(<EditorInterface {...previewProps} />);
    const previewPaneContainer = () => screen.getByTestId('preview-pane').parentElement as HTMLElement;

    expect(pointerEventsOf(previewPaneContainer())).toBe('auto');

    fireEvent.click(screen.getByTestId('trigger-resize-start'));
    expect(pointerEventsOf(previewPaneContainer())).toBe('none');

    fireEvent.click(screen.getByTestId('trigger-resize-end'));
    expect(pointerEventsOf(previewPaneContainer())).toBe('auto');
  });

  describe('keyboard focus management', () => {
    function nextFrame() {
      return act(() => new Promise<void>(resolve => requestAnimationFrame(() => resolve())));
    }

    it('focuses the first field on mount so Tab navigation works immediately', async () => {
      const { getByTestId } = render(<EditorInterface {...props} />);
      await nextFrame();
      expect(document.activeElement).toBe(getByTestId('title-input'));
    });

    it('restores focus to the last-focused field after a draftKey remount (save)', async () => {
      const { getByTestId, rerender } = render(<EditorInterface {...props} />);
      await nextFrame();
      const body = getByTestId('body-input');
      body.focus();
      fireEvent.focusIn(body);

      // A persist re-creates the draft under a new key, remounting the
      // keyed subtree and dropping focus on document.body.
      rerender(<EditorInterface {...props} draftKey="key-2" />);
      expect(document.activeElement).toBe(document.body);
      await nextFrame();
      expect(document.activeElement).toBe(getByTestId('body-input'));
    });

    it('does not steal focus that survived outside the editor body', async () => {
      const { getByTestId, rerender } = render(
        <>
          <button data-testid="save-button" />
          <EditorInterface {...props} />
        </>,
      );
      await nextFrame();
      const saveButton = getByTestId('save-button');
      saveButton.focus();
      rerender(
        <>
          <button data-testid="save-button" />
          <EditorInterface {...props} draftKey="key-2" />
        </>,
      );
      await nextFrame();
      expect(document.activeElement).toBe(saveButton);
    });
  });
});
