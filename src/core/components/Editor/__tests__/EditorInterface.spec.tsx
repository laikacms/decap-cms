/* eslint-disable import/order -- vi.mock calls must precede imports that depend on them */
import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

import React from 'react';

vi.mock('../EditorControlPane/EditorControlPane', () => ({
  default: React.forwardRef((_props: unknown, _ref: unknown) => (
    <div data-testid="control-pane" />
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

import EditorInterface from '../EditorInterface';

import type { CmsCollectionState, CmsEntry } from '../../../../lib/util/index';
import type { TranslateFunction } from '../../../../ui/default/index';

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

    const emotionClass = Array.from(editorContainer.classList).find(cls =>
      cls.startsWith('css-'),
    );
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
});
