import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { markdownMapper } from '@/format-packs/markdown';
import { registerBlock, registerMapper, unregisterBlock } from '@/lib/richtext';
import { LexicalPreview } from '@/widgets/richtext/widget/preview';

import type { BlockDefinition } from '@/lib/richtext';

/** ZWSP, ZWNJ, ZWJ, BOM/ZWNBSP, word-joiner: the codepoints DCMS-1325 found leaking into preview text nodes. */
const ZERO_WIDTH_CODEPOINTS = new Set([0x200b, 0x200c, 0x200d, 0xfeff, 0x2060]);

function countZeroWidthChars(text: string): number {
  let count = 0;
  for (const ch of text) {
    const codePoint = ch.codePointAt(0);
    if (codePoint !== undefined && ZERO_WIDTH_CODEPOINTS.has(codePoint)) count += 1;
  }
  return count;
}

const youtube: BlockDefinition = {
  id: 'youtube',
  label: 'YouTube',
  fields: [{ name: 'id' }],
  preview: ({ data }) => <div data-testid="yt">video:{String(data.id)}</div>,
};

afterEach(() => {
  unregisterBlock('youtube');
});

/**
 * DCMS-1325: opening an existing entry rendered hundreds of invisible
 * Unicode characters (ZWSP U+200B, ZWNJ U+200C, ZWJ U+200D, BOM U+FEFF,
 * U+2060) into the preview iframe's text nodes, but only for content
 * loaded from the backend, never for freshly typed content. Root cause was
 * `encodeEntry` (`@/core/lib/stega`) appending a `@vercel/stega`-encoded
 * visual-editing marker after every markdown paragraph before the string
 * ever reached this widget's markdown -> Portable Text -> preview pipeline;
 * the markers survived parsing as literal characters inside the rendered
 * heading/paragraph text. Fixed by excluding richtext/markdown fields from
 * that encoding (`stega.tsx`); this guards the richtext preview pipeline
 * itself against ever reintroducing zero-width noise, independent of the
 * stega encoder.
 */
describe('LexicalPreview markdown rendering has no zero-width pollution (DCMS-1325)', () => {
  beforeAll(() => {
    registerMapper(markdownMapper);
  });

  it('renders a plain-text markdown fixture to preview HTML with zero zero-width control characters', () => {
    const md = '# heading\n\nparagraph';
    const { container } = render(<LexicalPreview value={md} field={{ format: 'markdown' }} />);

    expect(container.querySelector('h1')).toHaveTextContent('heading');
    expect(container.querySelector('p')).toHaveTextContent('paragraph');
    expect(countZeroWidthChars(container.innerHTML)).toBe(0);
  });
});

describe('LexicalPreview custom blocks', () => {
  it('renders a registered block through its preview component', () => {
    registerBlock(youtube);
    render(
      <LexicalPreview
        value={[
          { _type: 'youtube', _key: 'k0', id: 'abc123' },
        ]}
      />,
    );
    expect(screen.getByTestId('yt')).toHaveTextContent('video:abc123');
  });

  it('renders nothing (not a JSON dump) for unknown block types', () => {
    const { container } = render(
      <LexicalPreview value={[{ _type: 'mystery', _key: 'k0', secret: 1 }]} />,
    );
    expect(container.textContent).toBe('');
  });
});

describe('LexicalPreview reserved block types', () => {
  it('renders a data: image block immediately (no consent gate needed)', () => {
    const dataSrc = 'data:image/png;base64,iVBORw0KGgo=';
    const { container } = render(
      <LexicalPreview
        value={[{ _type: 'image', _key: 'k0', src: dataSrc, alt: 'probe' }]}
      />,
    );
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img).toHaveAttribute('src', dataSrc);
    expect(img).toHaveAttribute('alt', 'probe');
  });

  it('renders a code block, preserving the language', () => {
    const { container } = render(
      <LexicalPreview
        value={[{ _type: 'code', _key: 'k0', code: 'const x = 1;', language: 'js' }]}
      />,
    );
    const code = container.querySelector('pre > code');
    expect(code).not.toBeNull();
    expect(code).toHaveTextContent('const x = 1;');
    expect(code).toHaveClass('language-js');
  });

  it('renders a horizontal-rule block', () => {
    const { container } = render(
      <LexicalPreview value={[{ _type: 'horizontal-rule', _key: 'k0' }]} />,
    );
    expect(container.querySelector('hr')).not.toBeNull();
  });

  it('renders a table block', () => {
    render(
      <LexicalPreview
        value={[
          {
            _type: 'table',
            _key: 'k0',
            rows: [
              { _type: 'row', _key: 'r0', cells: [{ _type: 'cell', _key: 'c0', value: 'PROBE_TABLE_CELL' }] },
            ],
          },
        ]}
      />,
    );
    expect(screen.getByText('PROBE_TABLE_CELL')).toBeInTheDocument();
  });

  it('renders a table cell whose value is a PortableTextDocument (DCMS-978)', () => {
    render(
      <LexicalPreview
        value={[
          {
            _type: 'table',
            _key: 'k0',
            rows: [
              {
                _type: 'row',
                _key: 'r0',
                cells: [
                  {
                    _type: 'cell',
                    _key: 'c0',
                    value: [
                      {
                        _type: 'block',
                        _key: 'b0',
                        style: 'normal',
                        children: [{ _type: 'span', _key: 's0', text: 'c1', marks: [] }],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ]}
      />,
    );
    expect(screen.getByText('c1')).toBeInTheDocument();
    expect(screen.queryByText('[object Object]')).not.toBeInTheDocument();
  });

  it('does not warn for reserved block types', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(
      <LexicalPreview
        value={[
          { _type: 'image', _key: 'k0', src: 'https://example.com/probe.png', alt: 'probe' },
          { _type: 'code', _key: 'k1', code: 'x', language: null },
          { _type: 'horizontal-rule', _key: 'k2' },
          { _type: 'table', _key: 'k3', rows: [] },
        ]}
      />,
    );
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe('LexicalPreview image block consent gating (DCMS-1166 / GH #1166)', () => {
  /**
   * `ImageNode.__requiresConsent` (DCMS-640) only lives in transient Lexical
   * editor state — it's never part of the persisted `image` PortableText
   * block. The preview pane (`EditorPreviewPane`) renders directly from that
   * persisted block, so without its own gate it fetched an unconsented
   * http(s) `src` the instant the block appeared in preview (e.g. right
   * after a hostile paste, since the preview re-renders on every editor
   * change). This regression-tests that the preview never mounts a live
   * `<img src>` for a remote source until the user explicitly consents.
   */
  it('does not mount a live <img> for an http(s) src until the user consents', () => {
    const { container } = render(
      <LexicalPreview
        value={[{ _type: 'image', _key: 'k0', src: 'http://evil.example.com/beacon', alt: 'probe' }]}
      />,
    );
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByRole('button', { name: /click to load it/i })).toBeInTheDocument();
  });

  it('mounts the <img> only after the consent button is clicked', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <LexicalPreview
        value={[{ _type: 'image', _key: 'k0', src: 'https://example.com/probe.png', alt: 'probe' }]}
      />,
    );
    expect(container.querySelector('img')).toBeNull();

    await user.click(screen.getByRole('button', { name: /click to load it/i }));

    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img).toHaveAttribute('src', 'https://example.com/probe.png');
    expect(img).toHaveAttribute('referrerpolicy', 'no-referrer');
  });

  it('rejects a javascript: src without ever rendering an <img> or a consent gate', () => {
    const { container } = render(
      <LexicalPreview
        value={[{ _type: 'image', _key: 'k0', src: 'javascript:alert(1)', alt: 'probe' }]}
      />,
    );
    expect(container.querySelector('img')).toBeNull();
    expect(screen.queryByRole('button', { name: /click to load it/i })).toBeNull();
  });
});

describe('LexicalPreview html block sanitization (DCMS-672)', () => {
  afterEach(() => {
    delete (window as unknown as { __pwn?: unknown }).__pwn;
  });

  it('strips event-handler attributes so the onerror payload never fires', () => {
    const { container } = render(
      <LexicalPreview
        value={[
          { _type: 'html', _key: 'k0', html: '<img src=x onerror=window.__pwn=1>' },
        ]}
      />,
    );
    expect((window as unknown as { __pwn?: unknown }).__pwn).toBeUndefined();
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img?.hasAttribute('onerror')).toBe(false);
  });

  it('drops <script> tags entirely', () => {
    const { container } = render(
      <LexicalPreview
        value={[
          { _type: 'html', _key: 'k0', html: '<p>hi</p><script>window.__pwn=1</script>' },
        ]}
      />,
    );
    expect((window as unknown as { __pwn?: unknown }).__pwn).toBeUndefined();
    expect(container.querySelectorAll('script')).toHaveLength(0);
    expect(container.textContent).toContain('hi');
  });

  it('rejects javascript: and data: URI schemes on href/src', () => {
    const { container } = render(
      <LexicalPreview
        value={[
          {
            _type: 'html',
            _key: 'k0',
            html:
              '<a href="javascript:window.__pwn=1">click</a><img src="data:text/html,<script>window.__pwn=1</script>">',
          },
        ]}
      />,
    );
    expect((window as unknown as { __pwn?: unknown }).__pwn).toBeUndefined();
    const anchor = container.querySelector('a');
    expect(anchor?.getAttribute('href') ?? '').not.toMatch(/^javascript:/i);
    const img = container.querySelector('img');
    expect(img?.getAttribute('src') ?? '').not.toMatch(/^data:/i);
  });

  it('still renders safe markup untouched', () => {
    const { container } = render(
      <LexicalPreview
        value={[
          { _type: 'html', _key: 'k0', html: '<p>Hello <strong>world</strong></p>' },
        ]}
      />,
    );
    expect(container.querySelector('strong')).toHaveTextContent('world');
  });
});
