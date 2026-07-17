import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { registerBlock, unregisterBlock } from '@/lib/richtext';
import { LexicalPreview } from '@/widgets/richtext/widget/preview';

import type { BlockDefinition } from '@/lib/richtext';

const youtube: BlockDefinition = {
  id: 'youtube',
  label: 'YouTube',
  fields: [{ name: 'id' }],
  preview: ({ data }) => <div data-testid="yt">video:{String(data.id)}</div>,
};

afterEach(() => {
  unregisterBlock('youtube');
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
  it('renders an image block', () => {
    const { container } = render(
      <LexicalPreview
        value={[{ _type: 'image', _key: 'k0', src: 'https://example.com/probe.png', alt: 'probe' }]}
      />,
    );
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img).toHaveAttribute('src', 'https://example.com/probe.png');
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
