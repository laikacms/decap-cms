/**
 * Unit tests for the shared control that `withFileControl.tsx` exports
 * (DCMS-1382). `withFileControl()` backs the `file` widget, and
 * `withFileControl({ forImage: true })` backs the `image` widget
 * (see `@/widgets/image/index`), but before this file the control itself
 * had zero direct coverage — `withFileControl.test.tsx` and
 * `withImageControl.test.tsx` only exercise it indirectly through the
 * `file`/`image` widget entry points and a handful of specific regressions
 * (choose_url, aria wiring, gallery reorder/remove/replace, isSafeUrl,
 * arrayMove/sizeOfValue/valueListToArray). This file covers the control's
 * core render/onChange contract directly, in both modes:
 *  - file mode (`forImage` omitted): no-value vs single-value vs
 *    multiple-value (array) rendering, and the "choose" onOpenMediaLibrary
 *    call
 *  - image mode (`forImage: true`): no-value vs single-image vs
 *    multiple-image (gallery) rendering, and the "choose" onOpenMediaLibrary
 *    call with `forImage: true`
 *  - multiple-value handling in both modes, including the "add more" /
 *    "remove all" label switch that's driven by `field.media_library.config.multiple`
 *    independently of whether the current value happens to be an array
 */

import { render } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import withFileControl from '@/widgets/file/withFileControl';

import type { CmsFieldBase, CmsFieldFile } from '@/lib/util/index';
import type { CmsFieldImage } from '@/lib/util/types/cms/fields/image';
import type { FileControlProps } from '@/widgets/file/withFileControl';

const FileControl = withFileControl();
const ImageControl = withFileControl({ forImage: true });

function baseProps(overrides: Partial<FileControlProps> = {}): FileControlProps {
  return {
    field: { name: 'file', widget: 'file' } as CmsFieldFile & CmsFieldBase,
    getAsset: vi.fn((value: string) => `https://cdn.example.com/${value}`),
    mediaPaths: {},
    onAddAsset: vi.fn(),
    onChange: vi.fn(),
    onRemoveInsertedMedia: vi.fn(),
    onOpenMediaLibrary: vi.fn(),
    onClearMediaControl: vi.fn(),
    onRemoveMediaControl: vi.fn(),
    classNameWrapper: '',
    value: undefined as unknown as FileControlProps['value'],
    t: (key: string) => key,
    ...overrides,
  };
}

describe('withFileControl (file mode)', () => {
  it('renders the "choose a file" empty state and no file links when there is no value', () => {
    const { getByText, queryByRole } = render(<FileControl {...baseProps()} />);

    expect(getByText('editor.editorWidgets.file.choose')).toBeTruthy();
    expect(queryByRole('list')).toBeNull();
  });

  it('clicking "choose a file" calls onOpenMediaLibrary scoped to this control, not for an image', () => {
    const onOpenMediaLibrary = vi.fn();
    const field = {
      name: 'file',
      widget: 'file',
      private: true,
    } as CmsFieldFile & CmsFieldBase;
    const { getByText } = render(
      <FileControl {...baseProps({ field, onOpenMediaLibrary })} />,
    );

    getByText('editor.editorWidgets.file.choose').click();

    expect(onOpenMediaLibrary).toHaveBeenCalledWith(
      expect.objectContaining({
        forImage: undefined, // withFileControl() (no forImage: true) never sets this to true
        privateUpload: true,
        value: '',
      }),
    );
  });

  it('renders a single selected value as a file link and offers "choose different" / "remove"', () => {
    const { getByText, container } = render(
      <FileControl {...baseProps({ value: 'report.pdf' })} />,
    );

    expect(container.textContent).toContain('report.pdf');
    expect(getByText('editor.editorWidgets.file.chooseDifferent')).toBeTruthy();
    expect(getByText('editor.editorWidgets.file.remove')).toBeTruthy();
    expect(container.querySelector('a')).toBeNull(); // short filenames render as plain text, not a link
  });

  it('clicking "remove" clears the media control and calls onChange with an empty string', () => {
    const onChange = vi.fn();
    const onClearMediaControl = vi.fn();
    const { getByText } = render(
      <FileControl {...baseProps({ value: 'report.pdf', onChange, onClearMediaControl })} />,
    );

    getByText('editor.editorWidgets.file.remove').click();

    expect(onClearMediaControl).toHaveBeenCalled();
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('renders one list item per entry for a multiple (array) value', () => {
    const value = ['a.pdf', 'b.pdf', 'c.pdf'];
    const { container } = render(<FileControl {...baseProps({ value })} />);

    const items = container.querySelectorAll('li');
    expect(items).toHaveLength(3);
    value.forEach((name, index) => {
      expect(items[index].textContent).toBe(name);
    });
  });

  it('shows "add more" / "remove all" only when the field config allows multiple, independent of the value shape', () => {
    const value = ['a.pdf', 'b.pdf'];
    const multiField = {
      name: 'file',
      widget: 'file',
      media_library: { name: 'test', config: { multiple: true }, allow_multiple: true },
    } as CmsFieldFile & CmsFieldBase;

    const { getByText: getByTextMulti } = render(
      <FileControl {...baseProps({ field: multiField, value })} />,
    );
    expect(getByTextMulti('editor.editorWidgets.file.addMore')).toBeTruthy();
    expect(getByTextMulti('editor.editorWidgets.file.removeAll')).toBeTruthy();

    const { getByText: getByTextSingleConfig } = render(
      <FileControl {...baseProps({ value })} />,
    );
    expect(getByTextSingleConfig('editor.editorWidgets.file.chooseDifferent')).toBeTruthy();
    expect(getByTextSingleConfig('editor.editorWidgets.file.remove')).toBeTruthy();
  });
});

describe('withFileControl (image mode, forImage: true)', () => {
  function imageField(overrides: Partial<CmsFieldImage> = {}): CmsFieldImage & CmsFieldBase {
    return {
      name: 'image',
      widget: 'image',
      ...overrides,
    } as CmsFieldImage & CmsFieldBase;
  }

  it('renders the "choose an image" empty state and no image preview when there is no value', () => {
    const { getByText, container } = render(
      <ImageControl {...baseProps({ field: imageField() })} />,
    );

    expect(getByText('editor.editorWidgets.image.choose')).toBeTruthy();
    expect(container.querySelectorAll('img')).toHaveLength(0);
  });

  it('clicking "choose an image" calls onOpenMediaLibrary with forImage: true', () => {
    const onOpenMediaLibrary = vi.fn();
    const { getByText } = render(
      <ImageControl {...baseProps({ field: imageField(), onOpenMediaLibrary })} />,
    );

    getByText('editor.editorWidgets.image.choose').click();

    expect(onOpenMediaLibrary).toHaveBeenCalledWith(
      expect.objectContaining({ forImage: true }),
    );
  });

  it('renders a single selected value as one resolved image, not a file link list', async () => {
    const getAsset = vi.fn((value: string) => `https://cdn.example.com/${value}`);
    const { container, findByText } = render(
      <ImageControl {...baseProps({ field: imageField(), value: 'photo.png', getAsset })} />,
    );

    const images = await Promise.resolve(container.querySelectorAll('img'));
    expect(images).toHaveLength(1);
    expect(images[0].getAttribute('src')).toBe('https://cdn.example.com/photo.png');
    expect(container.querySelector('ul')).toBeNull();
    await expect(findByText('editor.editorWidgets.image.chooseDifferent')).resolves.toBeTruthy();
  });

  it('renders one resolved image per entry for a multiple (gallery) value and offers "add more" / "remove all"', async () => {
    const value = ['a.png', 'b.png', 'c.png'];
    const field = imageField({
      media_library: { name: 'test', config: { multiple: true }, allow_multiple: true },
    });
    const getAsset = vi.fn((v: string) => `https://cdn.example.com/${v}`);

    const { container, findByText } = render(
      <ImageControl {...baseProps({ field, value, getAsset })} />,
    );

    await expect(findByText('editor.editorWidgets.image.addMore')).resolves.toBeTruthy();
    expect(container.querySelectorAll('img')).toHaveLength(3);
    expect(getByAllRemoveAllLabel(container)).toBeTruthy();
  });

  function getByAllRemoveAllLabel(container: HTMLElement) {
    return Array.from(container.querySelectorAll('button')).find(
      button => button.textContent === 'editor.editorWidgets.image.removeAll',
    );
  }
});
