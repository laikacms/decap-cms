import { fireEvent, render } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { DecapCmsWidgetImage } from '@/widgets/image/index';

import type { CmsFieldBase } from '@/lib/util/index';
import type { CmsFieldImage } from '@/lib/util/types/cms/fields/image';

const ImageControl = DecapCmsWidgetImage.controlComponent;

function galleryField(overrides: Partial<CmsFieldImage> = {}): CmsFieldImage & CmsFieldBase {
  return {
    name: 'gallery',
    widget: 'image',
    media_library: { name: 'test', config: { multiple: true }, allow_multiple: true },
    ...overrides,
  } as CmsFieldImage & CmsFieldBase;
}

function renderGallery(value: string[], overrides: Partial<CmsFieldImage> & {
  onOpenMediaLibrary?: ReturnType<typeof vi.fn>,
  onChange?: ReturnType<typeof vi.fn>,
} = {}) {
  const { onOpenMediaLibrary = vi.fn(), onChange = vi.fn(), ...fieldOverrides } = overrides;
  const utils = render(
    <ImageControl
      field={galleryField(fieldOverrides)}
      getAsset={() => ''}
      mediaPaths={{}}
      onAddAsset={vi.fn()}
      onChange={onChange}
      onRemoveInsertedMedia={vi.fn()}
      onOpenMediaLibrary={onOpenMediaLibrary}
      onClearMediaControl={vi.fn()}
      onRemoveMediaControl={vi.fn()}
      classNameWrapper=""
      value={value}
      t={key => key}
    />,
  );
  return { ...utils, onOpenMediaLibrary, onChange };
}

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

  // DCMS-1389: `aria-required` is not an allowed attribute on the
  // "Choose an image" button's implicit `role="button"` (ARIA 1.3
  // aria-allowed-attr), so required-ness is conveyed via the button's
  // accessible name instead.
  it('never sets aria-required on the choose button, even when required', () => {
    const { getByText } = setupWithAria();
    expect(getByText('editor.editorWidgets.image.choose')).not.toHaveAttribute('aria-required');
  });

  it('conveys required-ness through the accessible name by default', () => {
    const { getByText } = setupWithAria();
    expect(getByText('editor.editorWidgets.image.choose')).toHaveAttribute(
      'aria-label',
      'editor.editorWidgets.image.choose (editor.editorControl.field.required)',
    );
  });

  it('omits the required accessible-name cue when the field is optional', () => {
    const { getByText } = setupWithAria({ field: { required: false } });
    expect(getByText('editor.editorWidgets.image.choose')).not.toHaveAttribute('aria-label');
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

// DCMS-1292: `image` is the only widget that renders the sortable gallery
// (`forImage: true` in withFileControl.tsx gates `renderImages`), so
// onRemoveOne/onReplaceOne's real per-item wiring can only be exercised
// here. Each gallery item renders exactly three focusable controls in DOM
// order — [drag handle, replace, remove] (DCMS-1475 added the keyboard-
// reachable `SortableHandle` drag handle) — so item N's replace/remove
// buttons sit at indices [3N + 1, 3N + 2] of getAllByRole('button').
// onSortEnd itself just forwards arrayMove's result through onChange (see
// withFileControl.test.tsx for arrayMove's direct coverage); simulating
// real HTML5 drag-and-drop here would need a react-dnd test backend, which
// isn't wired up in this repo.
describe('gallery reorder/remove/replace (DCMS-1292)', () => {
  it('onReplaceOne opens the media library scoped to the clicked item\'s index', () => {
    const value = ['a.png', 'b.png', 'c.png'];
    const { getAllByRole, onOpenMediaLibrary } = renderGallery(value);

    const buttons = getAllByRole('button');
    fireEvent.click(buttons[4]); // item index 1's replace button

    expect(onOpenMediaLibrary).toHaveBeenCalledWith(
      expect.objectContaining({
        replaceIndex: 1,
        value,
        allowMultiple: false,
        forImage: true,
      }),
    );
  });

  it('onRemoveOne splices out the clicked index and keeps the rest as an array', () => {
    const value = ['a.png', 'b.png', 'c.png'];
    const { getAllByRole, onChange } = renderGallery(value);

    const buttons = getAllByRole('button');
    fireEvent.click(buttons[5]); // item index 1's remove button

    expect(onChange).toHaveBeenCalledWith(['a.png', 'c.png']);
  });

  it('onRemoveOne calls onChange(null), not [], when removing the last remaining item', () => {
    const value = ['only.png'];
    const { getAllByRole, onChange } = renderGallery(value);

    const buttons = getAllByRole('button');
    fireEvent.click(buttons[2]); // the sole item's remove button

    expect(onChange).toHaveBeenCalledWith(null);
  });
});
