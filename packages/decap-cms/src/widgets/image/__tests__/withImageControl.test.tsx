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

// DCMS-1086: PR #1085 wired aria-invalid/aria-required/aria-errormessage
// into string/text/number/colorstring/datetime/select/richtext, but missed
// this widget (shared with `file` via `withFileControl({ forImage: true })`),
// so the "focus first invalid control" heuristic silently skipped past an
// invalid image field. The "Choose an image" button is the perceived
// control here (the underlying <input type="file"> isn't announced).
describe('ImageControl aria validation wiring (DCMS-1086)', () => {
  function setupWithAria(
    overrides: { field?: Partial<CmsFieldImage>, hasErrors?: boolean, errorListId?: string } = {},
  ) {
    const field = { name: 'image', widget: 'image', ...overrides.field } as CmsFieldImage & CmsFieldBase;
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
        forID="image-field-1"
        hasErrors={overrides.hasErrors}
        errorListId={overrides.errorListId}
      />,
    );
  }

  it('marks a required field as aria-required by default', () => {
    const { getByText } = setupWithAria();
    expect(getByText('editor.editorWidgets.image.choose')).toHaveAttribute('aria-required', 'true');
  });

  it('has no aria-invalid when the field has no errors', () => {
    const { getByText } = setupWithAria();
    expect(getByText('editor.editorWidgets.image.choose')).not.toHaveAttribute('aria-invalid');
  });

  it('sets aria-invalid and aria-errormessage when the field has errors', () => {
    const { getByText } = setupWithAria({ hasErrors: true, errorListId: 'image-field-1-errors' });
    const button = getByText('editor.editorWidgets.image.choose');
    expect(button).toHaveAttribute('aria-invalid', 'true');
    expect(button).toHaveAttribute('aria-errormessage', 'image-field-1-errors');
    expect(button).toHaveAttribute('id', 'image-field-1');
  });
});
