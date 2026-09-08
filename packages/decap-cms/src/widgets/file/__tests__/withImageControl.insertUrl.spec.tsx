/**
 * RTL coverage for the image widget's "Insert from URL" flow (DCMS-2252).
 *
 * Prior behavior: any string typed into the prompt - including a bare,
 * schemeless non-URL like `notaurl` - was accepted, resolved against the
 * page origin as a relative media-library path, fetched, and stored as a
 * broken `blob:` src. This exercises the full stack (real `PromptDialogHost`,
 * real `checkImageUrl`) against the issue's acceptance criteria: only a
 * request that both parses as an absolute http(s) URL *and* resolves to a
 * 2xx `image/*` response may reach `onChange`; everything else keeps the
 * dialog open with an inline error and leaves the entry untouched.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PromptDialogHost } from '@/ui';
import { DecapCmsWidgetImage } from '@/widgets/image/index';

import type { CmsFieldBase, CmsFieldImage } from '@/lib/util/index';
import type { FileControlProps } from '@/widgets/file/withFileControl';

const ImageControl = DecapCmsWidgetImage.controlComponent;

function jsonResponse(init: { ok: boolean, status?: number, contentType?: string }) {
  return {
    ok: init.ok,
    status: init.status ?? (init.ok ? 200 : 404),
    headers: {
      get: (name: string) => (name.toLowerCase() === 'content-type' ? init.contentType ?? null : null),
    },
  } as Response;
}

function setup(overrides: Partial<FileControlProps> = {}) {
  const onChange = vi.fn();
  const field = { name: 'image', widget: 'image' } as CmsFieldImage & CmsFieldBase;

  render(
    <>
      <ImageControl
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
        value={undefined as unknown as FileControlProps['value']}
        t={(key: string) => key}
        {...overrides}
      />
      <PromptDialogHost />
    </>,
  );

  return { onChange };
}

async function openInsertFromUrl(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByText('editor.editorWidgets.image.chooseUrl'));
  return screen.findByRole('dialog');
}

describe('image widget "Insert from URL" (DCMS-2252)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('commits state for a URL that resolves to an image/* response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ ok: true, status: 200, contentType: 'image/png' }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const user = userEvent.setup();
    const { onChange } = setup();

    await openInsertFromUrl(user);
    await user.type(screen.getByRole('textbox'), 'https://example.com/foo.png');
    await user.click(screen.getByRole('button', { name: 'editor.editorWidgets.image.promptUrlConfirm' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(onChange).toHaveBeenCalledWith('https://example.com/foo.png');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.com/foo.png',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('rejects a non-URL string without ever calling fetch or onChange', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const user = userEvent.setup();
    const { onChange } = setup();

    const dialog = await openInsertFromUrl(user);
    await user.type(screen.getByRole('textbox'), 'notaurl');
    await user.click(screen.getByRole('button', { name: 'editor.editorWidgets.image.promptUrlConfirm' }));

    await screen.findByText('editor.editorWidgets.image.invalidUrl');
    expect(dialog).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('rejects a non-image URL that 404s, keeps the dialog open, and does not call onChange', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: false, status: 404 }));
    vi.stubGlobal('fetch', fetchMock);

    const user = userEvent.setup();
    const { onChange } = setup();

    const dialog = await openInsertFromUrl(user);
    await user.type(screen.getByRole('textbox'), 'https://example.com/missing.png');
    await user.click(screen.getByRole('button', { name: 'editor.editorWidgets.image.promptUrlConfirm' }));

    await screen.findByText('editor.editorWidgets.image.urlFetchError (HTTP 404)');
    expect(dialog).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('rejects a non-image URL that returns HTML, keeps the dialog open, and does not call onChange', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ ok: true, status: 200, contentType: 'text/html; charset=utf-8' }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const user = userEvent.setup();
    const { onChange } = setup();

    const dialog = await openInsertFromUrl(user);
    await user.type(screen.getByRole('textbox'), 'https://example.com/page.html');
    await user.click(screen.getByRole('button', { name: 'editor.editorWidgets.image.promptUrlConfirm' }));

    await screen.findByText('editor.editorWidgets.image.notAnImage');
    expect(dialog).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('accepts the URL after fixing an initially-invalid one, without reopening the dialog', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ ok: true, status: 200, contentType: 'image/jpeg' }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const user = userEvent.setup();
    const { onChange } = setup();

    await openInsertFromUrl(user);
    const input = screen.getByRole('textbox');
    await user.type(input, 'notaurl');
    await user.click(screen.getByRole('button', { name: 'editor.editorWidgets.image.promptUrlConfirm' }));
    await screen.findByText('editor.editorWidgets.image.invalidUrl');

    await user.clear(input);
    await user.type(input, 'https://example.com/fixed.jpg');
    await user.click(screen.getByRole('button', { name: 'editor.editorWidgets.image.promptUrlConfirm' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('https://example.com/fixed.jpg');
  });
});
