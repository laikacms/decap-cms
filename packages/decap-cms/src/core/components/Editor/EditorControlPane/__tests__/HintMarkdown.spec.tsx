import { render } from '@testing-library/react';
import React from 'react';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import HintMarkdown from '@/core/components/Editor/EditorControlPane/HintMarkdown';
import { markdownFormat } from '@/format-packs/markdown/index';
import { registerFormat, unregisterFormat } from '@/lib/richtext';

/**
 * HintMarkdown replaces react-markdown for field hints (dependency
 * reduction). Hints are parsed with the registered markdown format pack's
 * own mapper — core bundles no markdown parser. With the pack registered
 * it must keep the old behavior: only inline a/strong/em/del are rendered,
 * all other markdown is unwrapped to text, raw HTML is dropped, and links
 * open in a new tab. Without the pack the hint renders as plain text.
 */
describe('HintMarkdown with the markdown format pack registered', () => {
  beforeAll(() => {
    registerFormat(markdownFormat);
  });

  afterAll(() => {
    unregisterFormat('markdown');
  });
  it('renders plain text', () => {
    const { container } = render(<HintMarkdown source="Just a hint" />);
    expect(container).toHaveTextContent('Just a hint');
    expect(container.querySelector('p')).toBeNull();
  });

  it('renders bold, italic and strikethrough', () => {
    const { container } = render(<HintMarkdown source="**bold** *italic* ~~gone~~" />);
    expect(container.querySelector('strong')).toHaveTextContent('bold');
    expect(container.querySelector('em')).toHaveTextContent('italic');
    expect(container.querySelector('del')).toHaveTextContent('gone');
  });

  it('renders links opening in a new tab with inherited color', () => {
    const { container } = render(<HintMarkdown source="See [the docs](https://example.com)" />);
    const link = container.querySelector('a');
    expect(link).toHaveAttribute('href', 'https://example.com');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(link?.style.color).toBe('inherit');
    expect(link).toHaveTextContent('the docs');
  });

  it('unwraps disallowed block elements to their text content', () => {
    const { container } = render(<HintMarkdown source={'# Heading\n\n- item one\n- item two\n\n> quote'} />);
    expect(container.querySelector('h1, ul, li, blockquote, p')).toBeNull();
    expect(container).toHaveTextContent('Heading');
    expect(container).toHaveTextContent('item one');
    expect(container).toHaveTextContent('item two');
    expect(container).toHaveTextContent('quote');
  });

  it('unwraps inline code to text', () => {
    const { container } = render(<HintMarkdown source="use `slug` here" />);
    expect(container.querySelector('code')).toBeNull();
    expect(container).toHaveTextContent('use slug here');
  });

  it('drops raw HTML tags without rendering them as elements', () => {
    const { container } = render(<HintMarkdown source={'before <script>alert(1)</script><b>x</b> after'} />);
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('b')).toBeNull();
    expect(container.innerHTML).not.toContain('<script');
    expect(container).toHaveTextContent('before');
    expect(container).toHaveTextContent('after');
  });

  it('renders nested inline formatting inside links', () => {
    const { container } = render(<HintMarkdown source="[**bold link**](https://example.com)" />);
    const link = container.querySelector('a');
    expect(link?.querySelector('strong')).toHaveTextContent('bold link');
  });
});

describe('HintMarkdown without the markdown format pack', () => {
  it('renders the hint as plain text, markdown syntax included', () => {
    const source = 'See [the docs](https://example.com) for **bold** ideas';
    const { container } = render(<HintMarkdown source={source} />);
    expect(container.querySelector('a, strong, em, del')).toBeNull();
    expect(container.textContent).toBe(source);
  });
});
