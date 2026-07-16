import { render } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { DecapCmsWidgetImage } from '@/widgets/image/index';

import type { CmsFieldBase } from '@/lib/util/index';
import type { CmsFieldImage } from '@/lib/util/types/cms/fields/image';

const ImageControl = DecapCmsWidgetImage.controlComponent;

function setup(field: CmsFieldImage & CmsFieldBase) {
  return render(
    <ImageControl
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

describe('image widget control', () => {
  it('shows the "choose URL" button by default when choose_url is omitted from field config', () => {
    // Pinning test for DCMS-592: the docs promise choose_url defaults to
    // true, so omitting the key must still render the "Choose URL" button.
    const field = { name: 'image', widget: 'image' } as CmsFieldImage & CmsFieldBase;

    const { getByText } = setup(field);

    expect(getByText('editor.editorWidgets.image.chooseUrl')).toBeTruthy();
  });

  it('hides the "choose URL" button when choose_url is explicitly false', () => {
    const field = {
      name: 'image',
      widget: 'image',
      choose_url: false,
    } as CmsFieldImage & CmsFieldBase;

    const { queryByText } = setup(field);

    expect(queryByText('editor.editorWidgets.image.chooseUrl')).toBeNull();
  });
});
