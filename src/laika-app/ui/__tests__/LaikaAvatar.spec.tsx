import React from 'react';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import LaikaAvatar from '@/laika-app/ui/LaikaAvatar';

/**
 * Base UI's `Avatar.Image` probes the source with `new window.Image()` and
 * only mounts the `<img>` once it reports a successful load. jsdom never
 * loads images, so stub `window.Image` with a synchronously "complete"
 * element: `naturalWidth > 0` means loaded, `0` means error.
 */
const OriginalImage = window.Image;

function stubImage(naturalWidth: number): void {
  class StubImage {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    complete = true;
    naturalWidth = naturalWidth;
    crossOrigin: string | null = null;
    referrerPolicy = '';
    sizes = '';
    srcset = '';
    src = '';
  }
  window.Image = StubImage as unknown as typeof Image;
}

afterEach(() => {
  window.Image = OriginalImage;
});

describe('LaikaAvatar', () => {
  it('falls back to the first letter of name when no src is supplied', () => {
    render(<LaikaAvatar name="Alice" />);
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('falls back to ? when neither name nor src is supplied', () => {
    render(<LaikaAvatar />);
    expect(screen.getByText('?')).toBeInTheDocument();
  });

  it('renders the image once it loads', () => {
    stubImage(64);
    render(<LaikaAvatar name="Alice" src="https://example.test/a.png" />);
    const img = screen.getByRole('img') as HTMLImageElement;
    expect(img.src).toBe('https://example.test/a.png');
    expect(img.alt).toBe('Alice');
    expect(screen.queryByText('A')).not.toBeInTheDocument();
  });

  it('falls back to the initial when the image errors out', () => {
    stubImage(0);
    render(<LaikaAvatar name="Alice" src="https://example.test/missing.png" />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument();
  });
});
