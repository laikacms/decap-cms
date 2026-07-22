import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { PreviewPane } from '@/core/components/Editor/EditorPreviewPane/EditorPreviewPane';
import { FOLDER } from '@/core/constants/collectionTypes';
import { I18n } from '@/core/i18n';
import { registerPreviewTemplate } from '@/core/lib/registry';

import type { CmsCollectionState, CmsEntry } from '@/lib/util/index';

const messages = {
  editor: {
    editorInterface: {
      noPreviewRegistered:
        'No preview available for this collection. Register one with CMS.registerPreviewTemplate().',
      previewPaneTitle: 'Preview pane',
    },
  },
};

const baseProps = {
  fields: [{ name: 'title', widget: 'string', label: 'Title' }],
  entry: { slug: 'entry-1', data: { title: 'Hello' } } as unknown as CmsEntry,
  fieldsMetaData: {},
  getAsset: () => ({ url: '', path: '' }),
  config: {} as any,
  state: { collections: {}, config: {}, integrations: {}, entries: {}, mediaLibrary: {} },
  isLoadingAsset: false,
  boundGetAsset: () => undefined,
} as const;

function renderPreviewPane(collection: CmsCollectionState) {
  return render(
    <I18n locale="en" messages={messages}>
      <PreviewPane {...baseProps} collection={collection} />
    </I18n>,
  );
}

/**
 * DCMS-1230: a collection with no `CMS.registerPreviewTemplate` call used to
 * still render a full-size preview iframe with nothing meaningful in it — a
 * blank void eating half the viewport. Now it renders an inline empty-state
 * message instead, and no iframe at all.
 */
describe('PreviewPane (DCMS-1230)', () => {
  it('renders an inline empty-state message instead of an iframe when no preview template is registered', () => {
    const collection = {
      type: FOLDER,
      name: 'no-preview-collection',
      fields: baseProps.fields,
    } as unknown as CmsCollectionState;

    renderPreviewPane(collection);

    expect(
      screen.getByText(
        'No preview available for this collection. Register one with CMS.registerPreviewTemplate().',
      ),
    ).toBeInTheDocument();
    expect(document.querySelectorAll('iframe')).toHaveLength(0);
  });

  it('still renders the preview iframe when a preview template is registered for the collection', () => {
    function CustomPreview() {
      return <div>custom preview</div>;
    }
    registerPreviewTemplate('has-preview-collection', CustomPreview);

    const collection = {
      type: FOLDER,
      name: 'has-preview-collection',
      fields: baseProps.fields,
    } as unknown as CmsCollectionState;

    renderPreviewPane(collection);

    expect(screen.queryByText(/No preview available/)).not.toBeInTheDocument();
    expect(document.querySelectorAll('iframe')).toHaveLength(1);
  });

  /**
   * DCMS-1391: the empty-state message used `colors.textFieldBorder`
   * (`#dfdfe3`, a 1px input-border colour) as its text colour, yielding a
   * 1.32:1 contrast ratio against the white pane background — effectively
   * invisible. It must use a text-appropriate token that reaches the WCAG
   * 2.1 AA threshold of 4.5:1 for normal text.
   */
  it('renders the empty-state message with a legible text colour (DCMS-1391)', () => {
    const collection = {
      type: FOLDER,
      name: 'no-preview-collection',
      fields: baseProps.fields,
    } as unknown as CmsCollectionState;

    renderPreviewPane(collection);

    const message = screen.getByText(
      'No preview available for this collection. Register one with CMS.registerPreviewTemplate().',
    );
    // jsdom doesn't resolve `var(--token, #fallback)`, so the computed
    // `color` comes back as that raw CSS custom-property expression. Pull
    // the fallback hex out of it directly rather than relying on jsdom to
    // resolve the variable.
    const { color } = getComputedStyle(message);
    const hexMatch = color.match(/#([0-9a-fA-F]{6})/);
    expect(hexMatch).not.toBeNull();
    const hex = hexMatch![1];
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);

    const toLinear = (channel: number) => {
      const c = channel / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    const luminance = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
    // Background is white (#fff), whose relative luminance is 1.
    const contrastOnWhite = (1 + 0.05) / (luminance + 0.05);

    expect(contrastOnWhite).toBeGreaterThanOrEqual(4.5);
  });

  /**
   * DCMS-1338: the preview iframe had no `title`/`aria-label`, so assistive
   * tech announced it as an unnamed frame (WCAG 4.1.2 Name/Role/Value).
   */
  it('gives the preview iframe an accessible name via title (DCMS-1338)', () => {
    function CustomPreview() {
      return <div>custom preview</div>;
    }
    registerPreviewTemplate('titled-preview-collection', CustomPreview);

    const collection = {
      type: FOLDER,
      name: 'titled-preview-collection',
      fields: baseProps.fields,
    } as unknown as CmsCollectionState;

    renderPreviewPane(collection);

    const iframe = document.querySelector('iframe');
    expect(iframe).not.toBeNull();
    expect(iframe).toHaveAttribute('title', 'Preview pane');
  });
});
