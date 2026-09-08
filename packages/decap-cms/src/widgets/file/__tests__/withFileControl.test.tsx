import { act, fireEvent, render } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DecapCmsWidgetFile } from '@/widgets/file/index';
import {
  arrayMove,
  checkImageUrl,
  isAbsoluteImageUrl,
  isSafeUrl,
  sizeOfValue,
  valueListToArray,
} from '@/widgets/file/withFileControl';

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

// DCMS-1086: PR #1085 wired aria-invalid/aria-required/aria-errormessage
// into string/text/number/colorstring/datetime/select/richtext, but missed
// this widget, so the "focus first invalid control" heuristic silently
// skipped past an invalid file field. The "Choose a file" button is the
// perceived control here (the underlying <input type="file"> isn't
// announced), so the aria state is applied to it.
describe('FileControl aria validation wiring (DCMS-1086)', () => {
  function setupWithAria(
    overrides: { field?: Partial<CmsFieldFile>, hasErrors?: boolean, errorListId?: string } = {},
  ) {
    const field = { name: 'file', widget: 'file', ...overrides.field } as CmsFieldFile & CmsFieldBase;
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
        forID="file-field-1"
        hasErrors={overrides.hasErrors}
        errorListId={overrides.errorListId}
      />,
    );
  }

  // DCMS-1389: `aria-required` is not an allowed attribute on the
  // "Choose a file" button's implicit `role="button"` (ARIA 1.3
  // aria-allowed-attr), so required-ness is conveyed via the button's
  // accessible name instead.
  it('never sets aria-required on the choose button, even when required', () => {
    const { getByText } = setupWithAria();
    expect(getByText('editor.editorWidgets.file.choose')).not.toHaveAttribute('aria-required');
  });

  it('conveys required-ness through the accessible name by default', () => {
    const { getByText } = setupWithAria();
    expect(getByText('editor.editorWidgets.file.choose')).toHaveAttribute(
      'aria-label',
      'editor.editorWidgets.file.choose (editor.editorControl.field.required)',
    );
  });

  it('omits the required accessible-name cue when the field is optional', () => {
    const { getByText } = setupWithAria({ field: { required: false } });
    expect(getByText('editor.editorWidgets.file.choose')).not.toHaveAttribute('aria-label');
  });

  it('has no aria-invalid when the field has no errors', () => {
    const { getByText } = setupWithAria();
    expect(getByText('editor.editorWidgets.file.choose')).not.toHaveAttribute('aria-invalid');
  });

  it('sets aria-invalid and aria-errormessage when the field has errors', () => {
    const { getByText } = setupWithAria({ hasErrors: true, errorListId: 'file-field-1-errors' });
    const button = getByText('editor.editorWidgets.file.choose');
    expect(button).toHaveAttribute('aria-invalid', 'true');
    expect(button).toHaveAttribute('aria-errormessage', 'file-field-1-errors');
    expect(button).toHaveAttribute('id', 'file-field-1');
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

// DCMS-2252: unlike isSafeUrl (relative paths intentionally allowed, since
// the file widget can point at a same-origin path), the image widget's
// "Insert from URL" prompt only accepts a URL that's already absolute.
describe('isAbsoluteImageUrl', () => {
  it('allows http URLs', () => {
    expect(isAbsoluteImageUrl('http://example.com/image.png')).toBe(true);
  });

  it('allows https URLs', () => {
    expect(isAbsoluteImageUrl('https://example.com/image.png')).toBe(true);
  });

  it('allows protocol-relative URLs', () => {
    expect(isAbsoluteImageUrl('//example.com/image.png')).toBe(true);
  });

  it('rejects a bare non-URL string with no scheme or host', () => {
    expect(isAbsoluteImageUrl('notaurl')).toBe(false);
  });

  it('rejects a same-origin relative path', () => {
    expect(isAbsoluteImageUrl('/images/foo.png')).toBe(false);
  });

  it('rejects javascript: URLs', () => {
    expect(isAbsoluteImageUrl('javascript:alert(document.cookie)')).toBe(false);
  });

  it('rejects schemes outside the http(s) allowlist, e.g. ftp:', () => {
    expect(isAbsoluteImageUrl('ftp://example.com/image.png')).toBe(false);
  });

  it('rejects empty input', () => {
    expect(isAbsoluteImageUrl('')).toBe(false);
  });
});

// DCMS-2252: the fetch-and-verify half of the "Insert from URL" fix - being
// an absolute URL isn't sufficient, the response must also be a 2xx
// image/* payload.
describe('checkImageUrl', () => {
  function fakeResponse(init: { ok: boolean, status?: number, contentType?: string | null }) {
    return {
      ok: init.ok,
      status: init.status ?? (init.ok ? 200 : 500),
      headers: { get: () => init.contentType ?? null },
    } as Response;
  }

  it('accepts a URL whose response is 2xx with an image/* Content-Type', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(fakeResponse({ ok: true, contentType: 'image/png' }));

    await expect(checkImageUrl('https://example.com/foo.png', { fetchImpl })).resolves.toEqual({ ok: true });
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://example.com/foo.png',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('rejects a non-URL string without calling fetch', async () => {
    const fetchImpl = vi.fn();

    await expect(checkImageUrl('notaurl', { fetchImpl })).resolves.toEqual({ ok: false, error: 'invalid-url' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('rejects a URL that 404s', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(fakeResponse({ ok: false, status: 404 }));

    await expect(checkImageUrl('https://example.com/missing.png', { fetchImpl })).resolves.toEqual({
      ok: false,
      error: 'http-error',
      detail: '404',
    });
  });

  it('rejects a URL that resolves but returns HTML instead of image content', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      fakeResponse({ ok: true, contentType: 'text/html; charset=utf-8' }),
    );

    await expect(checkImageUrl('https://example.com/page.html', { fetchImpl })).resolves.toEqual({
      ok: false,
      error: 'not-an-image',
      detail: 'text/html; charset=utf-8',
    });
  });

  it('rejects a URL that resolves with no Content-Type at all', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(fakeResponse({ ok: true, contentType: null }));

    await expect(checkImageUrl('https://example.com/mystery', { fetchImpl })).resolves.toEqual({
      ok: false,
      error: 'not-an-image',
      detail: '',
    });
  });

  it('treats a network failure as an http-error rather than throwing', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(checkImageUrl('https://example.com/foo.png', { fetchImpl })).resolves.toEqual({
      ok: false,
      error: 'http-error',
    });
  });
});

// DCMS-1292: direct coverage for the pure helpers driving the sortable
// multi-image gallery (arrayMove/sizeOfValue/valueListToArray), previously
// exercised only implicitly (or not at all) via onSortEnd/onRemoveOne/
// handleChange. See withImageControl.test.tsx for onRemoveOne/onReplaceOne
// coverage through the gallery UI, which only the `image` widget renders.
describe('arrayMove', () => {
  it('moves an item forward, preserving the rest in order', () => {
    expect(arrayMove(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd']);
  });

  it('moves an item backward, preserving the rest in order', () => {
    expect(arrayMove(['a', 'b', 'c', 'd'], 3, 1)).toEqual(['a', 'd', 'b', 'c']);
  });

  it('is a no-op when fromIndex equals toIndex', () => {
    expect(arrayMove(['a', 'b', 'c'], 1, 1)).toEqual(['a', 'b', 'c']);
  });

  it('does not mutate the input array', () => {
    const input = ['a', 'b', 'c'];
    arrayMove(input, 0, 2);
    expect(input).toEqual(['a', 'b', 'c']);
  });
});

describe('sizeOfValue', () => {
  it('returns the length of an array value', () => {
    expect(sizeOfValue(['a', 'b', 'c'])).toBe(3);
  });

  it('returns 0 for an empty array', () => {
    expect(sizeOfValue([])).toBe(0);
  });

  it('returns 1 for a non-empty single string value', () => {
    expect(sizeOfValue('a.png')).toBe(1);
  });

  it('returns 0 for an empty string value', () => {
    expect(sizeOfValue('')).toBe(0);
  });
});

describe('valueListToArray', () => {
  it('passes an array value through unchanged', () => {
    const value = ['a.png', 'b.png'];
    expect(valueListToArray(value)).toBe(value);
  });

  it('passes a non-empty string value through unchanged', () => {
    expect(valueListToArray('a.png')).toBe('a.png');
  });

  it('coerces null/undefined to an empty string', () => {
    expect(valueListToArray(null as unknown as string)).toBe('');
    expect(valueListToArray(undefined as unknown as string)).toBe('');
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
