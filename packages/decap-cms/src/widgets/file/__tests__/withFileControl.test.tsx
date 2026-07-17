import { act, fireEvent, render } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { isSafeUrl } from '@/widgets/file/withFileControl';
import { DecapCmsWidgetFile } from '@/widgets/file/index';

import type { CmsFieldBase, CmsFieldFile } from '@/lib/util/index';

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

// DCMS-577 / DCMS-668: 'Insert from URL' must not persist javascript:/data:/vbscript: URLs,
// since downstream (non-React) renderers of the saved entry have no equivalent runtime guard.
// This guard regressed during the v4.beta rewrite that moved this widget out of the path
// PR #707 originally patched; these tests pin it against regressing again.
describe('isSafeUrl', () => {
  it('allows http URLs', () => {
    expect(isSafeUrl('http://example.com/image.png')).toBe(true);
  });

  it('allows https URLs', () => {
    expect(isSafeUrl('https://example.com/image.png')).toBe(true);
  });

  it('allows protocol-relative URLs', () => {
    expect(isSafeUrl('//example.com/image.png')).toBe(true);
  });

  it('allows relative URLs (resolved against the page origin)', () => {
    expect(isSafeUrl('/images/foo.png')).toBe(true);
  });

  it('rejects javascript: URLs', () => {
    expect(isSafeUrl('javascript:alert(document.cookie)')).toBe(false);
  });

  it('rejects data: URLs', () => {
    expect(isSafeUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
  });

  it('rejects vbscript: URLs', () => {
    expect(isSafeUrl('vbscript:msgbox(1)')).toBe(false);
  });

  it('rejects schemes outside the http(s) allowlist, e.g. ftp:', () => {
    expect(isSafeUrl('ftp://example.com/image.png')).toBe(false);
  });

  it('rejects empty input', () => {
    expect(isSafeUrl('')).toBe(false);
  });
});

describe('handleUrl (Insert from URL prompt)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // withFileControl migrated off native window.prompt/alert to the
  // AlertDialog-backed promptDialog/showAlert primitives (DCMS-658). No
  // PromptDialogHost/AlertDialogHost is mounted in these tests, so both fall
  // back to window.prompt/window.alert, but the fallback still resolves via
  // a promise, so clicks must be flushed with `await act(async () => {})`.
  it('accepts a valid http(s) URL and forwards it to onChange', async () => {
    vi.spyOn(window, 'prompt').mockReturnValue('https://example.com/image.png');
    const onChange = vi.fn();
    const field = { name: 'file', widget: 'file' } as CmsFieldFile & CmsFieldBase;

    const { getByText } = render(
      <FileControl
        field={field}
        getAsset={() => ''}
        mediaPaths={{}}
        onAddAsset={vi.fn()}
        onChange={onChange}
        onRemoveInsertedMedia={vi.fn()}
        onOpenMediaLibrary={vi.fn()}
        onClearMediaControl={vi.fn()}
        onRemoveMediaControl={vi.fn()}
        classNameWrapper=""
        value={undefined}
        t={key => key}
      />,
    );

    await act(async () => {
      fireEvent.click(getByText('editor.editorWidgets.file.chooseUrl'));
    });

    expect(onChange).toHaveBeenCalledWith('https://example.com/image.png');
  });

  it('rejects a javascript: URL, alerts, and does not call onChange', async () => {
    vi.spyOn(window, 'prompt').mockReturnValue('javascript:alert(document.cookie)');
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const onChange = vi.fn();
    const field = { name: 'file', widget: 'file' } as CmsFieldFile & CmsFieldBase;

    const { getByText } = render(
      <FileControl
        field={field}
        getAsset={() => ''}
        mediaPaths={{}}
        onAddAsset={vi.fn()}
        onChange={onChange}
        onRemoveInsertedMedia={vi.fn()}
        onOpenMediaLibrary={vi.fn()}
        onClearMediaControl={vi.fn()}
        onRemoveMediaControl={vi.fn()}
        classNameWrapper=""
        value={undefined}
        t={key => key}
      />,
    );

    await act(async () => {
      fireEvent.click(getByText('editor.editorWidgets.file.chooseUrl'));
    });

    expect(onChange).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith('editor.editorWidgets.file.invalidUrl');
  });

  it('rejects a data: URL and does not call onChange', async () => {
    vi.spyOn(window, 'prompt').mockReturnValue('data:text/html,<script>alert(1)</script>');
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    const onChange = vi.fn();
    const field = { name: 'file', widget: 'file' } as CmsFieldFile & CmsFieldBase;

    const { getByText } = render(
      <FileControl
        field={field}
        getAsset={() => ''}
        mediaPaths={{}}
        onAddAsset={vi.fn()}
        onChange={onChange}
        onRemoveInsertedMedia={vi.fn()}
        onOpenMediaLibrary={vi.fn()}
        onClearMediaControl={vi.fn()}
        onRemoveMediaControl={vi.fn()}
        classNameWrapper=""
        value={undefined}
        t={key => key}
      />,
    );

    await act(async () => {
      fireEvent.click(getByText('editor.editorWidgets.file.chooseUrl'));
    });

    expect(onChange).not.toHaveBeenCalled();
  });

  it('rejects a vbscript: URL and does not call onChange', async () => {
    vi.spyOn(window, 'prompt').mockReturnValue('vbscript:msgbox(1)');
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    const onChange = vi.fn();
    const field = { name: 'file', widget: 'file' } as CmsFieldFile & CmsFieldBase;

    const { getByText } = render(
      <FileControl
        field={field}
        getAsset={() => ''}
        mediaPaths={{}}
        onAddAsset={vi.fn()}
        onChange={onChange}
        onRemoveInsertedMedia={vi.fn()}
        onOpenMediaLibrary={vi.fn()}
        onClearMediaControl={vi.fn()}
        onRemoveMediaControl={vi.fn()}
        classNameWrapper=""
        value={undefined}
        t={key => key}
      />,
    );

    await act(async () => {
      fireEvent.click(getByText('editor.editorWidgets.file.chooseUrl'));
    });

    expect(onChange).not.toHaveBeenCalled();
  });
});
