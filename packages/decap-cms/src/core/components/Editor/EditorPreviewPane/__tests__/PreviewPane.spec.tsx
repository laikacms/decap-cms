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
});
