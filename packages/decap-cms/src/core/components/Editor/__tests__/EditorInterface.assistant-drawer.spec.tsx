/* eslint-disable import/order -- vi.mock calls must precede imports that depend on them */
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import React from 'react';

/**
 * DCMS-2283 — the assistant drawer (`EditorPanels`) is `position: absolute`
 * over the right edge of `Editor`, on top of the preview column. Opening it
 * used to leave the preview at its pre-open width, so the drawer painted
 * over — and clipped — the right edge of every preview line.
 *
 * `EditorInterface` now measures the open drawer's real width and reserves
 * that much space via `EditorContentContainer`'s `padding-right`, which lets
 * the react-split-pane container (a plain block-level child) actually
 * shrink instead of being overlaid. This suite exercises that wiring end to
 * end with the *real* `EditorPanels`, only stubbing the parts of the editor
 * that need a full app/store to mount.
 */

vi.mock('../EditorControlPane/EditorControlPane', () => ({
  default: React.forwardRef((_props: unknown, ref: unknown) => {
    if (typeof ref === 'function') {
      ref({ validate: () => {}, focus: () => {}, switchToDefaultLocale: () => Promise.resolve() });
    }
    return <div data-testid="control-pane" />;
  }),
}));
vi.mock('../EditorPreviewPane/EditorPreviewPane', () => ({
  default: () => <div data-testid="preview-pane" />,
}));
vi.mock('../EditorToolbar', () => ({
  default: () => <div data-testid="toolbar" />,
}));
vi.mock('../EntryLockBanner', () => ({
  default: () => null,
}));
vi.mock('../../../lib/slots', () => ({
  useCmsSlots: () => ({
    editorPanels: [
      {
        id: 'notes',
        label: 'Notes',
        render: () => <div>notes panel body</div>,
      },
    ],
  }),
}));
vi.mock('../../../lib/i18n', async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  hasI18n: () => false,
  getI18nInfo: () => ({ locales: [], defaultLocale: '' }),
  getPreviewEntry: (entry: unknown) => entry,
}));
vi.mock('../../../reducers/collections', () => ({
  getFileFromSlug: () => undefined,
  selectEntryCollectionTitle: () => undefined,
}));
// Real `react-split-pane` measures its own container via `ResizeObserver`
// and isn't the thing under test here (that's `EditorContentContainer`'s
// padding) — stub it the same minimal way the sibling spec file does.
vi.mock('react-split-pane', () => ({
  SplitPane: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="split-pane">{children}</div>
  ),
  Pane: ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <div className={className}>{children}</div>
  ),
}));

import EditorInterface from '@/core/components/Editor/EditorInterface';

import type { CmsCollectionState, CmsEntry } from '@/lib/util/index';
import type { TranslateFunction } from '@/ui/default/index';

const DRAWER_WIDTH = 380;

/** Reads the emitted emotion CSS for `el`'s dynamic class, since jsdom does
 * not resolve `getComputedStyle` against emotion's injected `<style>` rules
 * (same technique the sibling `EditorInterface.spec.tsx` uses). */
function paddingRightOf(el: HTMLElement): string | undefined {
  const emotionClass = Array.from(el.classList).find(cls => cls.startsWith('css-'));
  expect(emotionClass).toBeDefined();
  const emittedCss = Array.from(document.querySelectorAll('style[data-emotion]'))
    .map(style => style.textContent ?? '')
    .join('\n');
  const rule = emittedCss.split('}').find(chunk => chunk.includes(`.${emotionClass}{`));
  return rule?.match(/padding-right:([^;]+)/)?.[1];
}

describe('EditorInterface assistant drawer layout (DCMS-2283)', () => {
  const props = {
    collection: {
      type: 'other',
      editor: { preview: true },
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

  let originalGetBoundingClientRect: typeof HTMLElement.prototype.getBoundingClientRect;

  beforeEach(() => {
    // jsdom's `getBoundingClientRect` always returns a zeroed rect. Give the
    // drawer (an `<aside>`) a realistic measured width — the same value
    // `EditorPanels`' own `DRAWER_WIDTH` constant renders it at — while
    // leaving every other element's rect untouched.
    originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;
    HTMLElement.prototype.getBoundingClientRect = function (this: HTMLElement) {
      if (this.tagName === 'ASIDE') {
        return { width: DRAWER_WIDTH, height: 600, top: 0, left: 0, right: DRAWER_WIDTH, bottom: 600, x: 0, y: 0, toJSON: () => ({}) };
      }
      return originalGetBoundingClientRect.call(this);
    };
  });

  afterEach(() => {
    HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
  });

  it('reserves no space for the preview column while the drawer is closed', () => {
    render(<EditorInterface {...props} />);

    const contentContainer = screen.getByTestId('editor-content-container');
    expect(paddingRightOf(contentContainer)).toBe('0px');
  });

  it('shrinks the preview column by the drawer width once opened, and restores it on close', () => {
    render(<EditorInterface {...props} />);

    fireEvent.click(screen.getByRole('button', { name: 'editor.editorInterface.openPanels' }));
    expect(screen.getByText('notes panel body')).toBeInTheDocument();

    const contentContainer = screen.getByTestId('editor-content-container');
    // Acceptance criterion: opening the drawer shrinks the preview column by
    // (at least) the drawer's own footprint, so the drawer sits beside — not
    // on top of — the preview content instead of clipping its right edge.
    expect(paddingRightOf(contentContainer)).toBe(`${DRAWER_WIDTH}px`);

    fireEvent.click(screen.getByRole('button', { name: 'editor.editorInterface.closePanels' }));
    expect(paddingRightOf(contentContainer)).toBe('0px');
  });
});
