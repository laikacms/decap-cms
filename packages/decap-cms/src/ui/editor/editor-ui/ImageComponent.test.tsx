import { fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Editor } from '@/ui/editor/Editor';
import { isFirefox } from './ImageComponent';

import type { SerializedEditorState } from 'lexical';

// GH #1890: DRAGSTART_COMMAND used to call `event.preventDefault()`
// unconditionally for every browser, even though the adjacent comment
// claimed it was a Firefox-only workaround. It's now scoped to Firefox via
// `isFirefox()`, so native image drag & drop works again in Chrome/Safari.

function imageEditorState(src: string): SerializedEditorState {
  return {
    root: {
      children: [
        {
          altText: 'a cat',
          height: 0,
          maxWidth: 800,
          requiresConsent: false,
          src,
          type: 'image',
          version: 1,
          width: 0,
        },
      ],
      direction: null,
      format: '',
      indent: 0,
      type: 'root',
      version: 1,
    },
  } as unknown as SerializedEditorState;
}

function stubUserAgent(userAgent: string) {
  vi.stubGlobal('navigator', {
    ...navigator,
    userAgent,
  });
}

// jsdom never actually decodes images, so `new Image()` + `.src = ...` never
// fires `onload`/`onerror` and `useSuspenseImage`'s Suspense boundary hangs
// forever. Stub a fake Image that resolves on the next microtask (after
// ImageComponent has had a chance to attach its onload/onerror handlers) so
// the real `<img>` mounts and DRAGSTART_COMMAND has something to fire on.
class FakeImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  naturalWidth = 1;
  naturalHeight = 1;
  referrerPolicy = '';

  set src(_value: string) {
    queueMicrotask(() => this.onload?.());
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
});

const CHROME_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const FIREFOX_UA = 'Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/117.0';

describe('isFirefox', () => {
  it('is true only for a Firefox user agent', () => {
    stubUserAgent(FIREFOX_UA);
    expect(isFirefox()).toBe(true);

    stubUserAgent(CHROME_UA);
    expect(isFirefox()).toBe(false);
  });
});

describe('ImageComponent DRAGSTART_COMMAND', () => {
  const DATA_IMAGE_SRC = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

  it('does not preventDefault on a non-Firefox drag (native browser drag stays enabled)', async () => {
    stubUserAgent(CHROME_UA);
    vi.stubGlobal('Image', FakeImage);

    render(<Editor editorSerializedState={imageEditorState(DATA_IMAGE_SRC)} format="markdown" />);

    const img = await waitFor(() => {
      const el = document.querySelector('img');
      if (!el) throw new Error('image did not render');
      return el;
    });

    const wasNotCancelled = fireEvent.dragStart(img);
    expect(wasNotCancelled).toBe(true);
  });

  it('preventDefaults the drag on Firefox', async () => {
    stubUserAgent(FIREFOX_UA);
    vi.stubGlobal('Image', FakeImage);

    render(<Editor editorSerializedState={imageEditorState(DATA_IMAGE_SRC)} format="markdown" />);

    const img = await waitFor(() => {
      const el = document.querySelector('img');
      if (!el) throw new Error('image did not render');
      return el;
    });

    const wasNotCancelled = fireEvent.dragStart(img);
    expect(wasNotCancelled).toBe(false);
  });
});
