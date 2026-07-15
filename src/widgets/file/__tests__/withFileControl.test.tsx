import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';

import { DecapCmsWidgetFile } from '@/widgets/file/index';

import type { CmsFieldFile, CmsFieldBase } from '@/lib/util/index';

const FileControl = DecapCmsWidgetFile.controlComponent;

function setup(field: CmsFieldFile & CmsFieldBase) {
  return render(
    <FileControl
      field={field}
      getAsset={() => ''}
      mediaPaths={{}}
      onAddAsset={vi.fn()}
      onChange={vi.fn()}
      onRemoveInsertedMedia={vi.fn()}
      onOpenMediaLibrary={vi.fn()}
      onClearMediaControl={vi.fn()}
      onRemoveMediaControl={vi.fn()}
      classNameWrapper=""
      value={undefined}
      t={key => key}
    />,
  );
}

describe('file widget control', () => {
  it('shows the "choose URL" button by default when choose_url is omitted from field config', () => {
    // Pinning test for DCMS-592: the docs promise choose_url defaults to
    // true, so omitting the key must still render the "Choose URL" button.
    const field = { name: 'file', widget: 'file' } as CmsFieldFile & CmsFieldBase;

    const { getByText } = setup(field);

    expect(getByText('editor.editorWidgets.file.chooseUrl')).toBeTruthy();
  });

  it('hides the "choose URL" button when choose_url is explicitly false', () => {
    const field = {
      name: 'file',
      widget: 'file',
      choose_url: false,
    } as CmsFieldFile & CmsFieldBase;

    const { queryByText } = setup(field);

    expect(queryByText('editor.editorWidgets.file.chooseUrl')).toBeNull();
  });
});
