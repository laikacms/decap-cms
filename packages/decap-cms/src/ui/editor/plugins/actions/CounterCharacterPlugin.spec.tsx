import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { $createParagraphNode, $createTextNode, $getRoot } from 'lexical';
import { act, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  CounterCharacterPlugin,
  countWords,
  pluralize,
  strlen,
  utf8Length,
} from './CounterCharacterPlugin';

const MULTI_BYTE = 'é€😀';

describe('utf8Length / strlen', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('counts UTF-8 bytes with TextEncoder', () => {
    expect(utf8Length('abc')).toBe(3);
    expect(utf8Length(MULTI_BYTE)).toBe(2 + 3 + 4);
    expect(utf8Length('')).toBe(0);
  });

  it('strlen differs between UTF-8 and UTF-16 for multi-byte text', () => {
    expect(strlen(MULTI_BYTE, 'UTF-8')).toBe(9);
    expect(strlen(MULTI_BYTE, 'UTF-16')).toBe(4);
    expect(strlen('abc', 'UTF-8')).toBe(strlen('abc', 'UTF-16'));
  });

  it('falls back to encodeURIComponent with the same length for BMP text', () => {
    const samples = ['', 'abc', 'é€', 'a€b c é'];
    const expected = samples.map(t => utf8Length(t));
    vi.stubGlobal('TextEncoder', undefined);
    expect(window.TextEncoder).toBeUndefined();
    expect(samples.map(t => utf8Length(t))).toEqual(expected);
    expect(strlen('é€', 'UTF-8')).toBe(5);
  });

  it('fallback over-counts astral chars by one per surrogate pair (pinned quirk)', () => {
    expect(utf8Length('😀')).toBe(4);
    vi.stubGlobal('TextEncoder', undefined);
    expect(utf8Length('😀')).toBe(5);
  });
});

describe('countWords', () => {
  it('handles empty and whitespace-only input', () => {
    expect(countWords('')).toBe(0);
    expect(countWords('   \n\t ')).toBe(0);
  });

  it('ignores leading, trailing and repeated whitespace', () => {
    expect(countWords('  hello   world  ')).toBe(2);
    expect(countWords('one')).toBe(1);
  });

  it('splits on newlines', () => {
    expect(countWords('one\ntwo\n\nthree')).toBe(3);
  });
});

describe('pluralize', () => {
  it('is singular only for exactly 1', () => {
    expect(pluralize(1, 'word')).toBe('word');
    expect(pluralize(0, 'word')).toBe('words');
    expect(pluralize(2, 'word')).toBe('words');
  });
});

describe('CounterCharacterPlugin footer', () => {
  function renderFooter(text: string, charset?: 'UTF-8' | 'UTF-16') {
    return render(
      <LexicalComposer
        initialConfig={{
          namespace: 'test',
          onError: (e: Error) => {
            throw e;
          },
          editorState: () => {
            const p = $createParagraphNode();
            if (text) p.append($createTextNode(text));
            $getRoot().append(p);
          },
        }}
      >
        <CounterCharacterPlugin charset={charset} />
      </LexicalComposer>
    );
  }

  it('renders plural for zero', async () => {
    const { container } = renderFooter('');
    await act(async () => {});
    expect(container.textContent).toContain('0 characters');
    expect(container.textContent).toContain('0 words');
  });

  it('renders singular for one character and one word', async () => {
    const { container } = renderFooter('a');
    await act(async () => {});
    expect(container.textContent).toContain('1 character');
    expect(container.textContent).toContain('1 word');
    expect(container.textContent).not.toContain('1 words');
  });

  it('renders plural for two', async () => {
    const { container } = renderFooter('ab cd');
    await act(async () => {});
    expect(container.textContent).toContain('5 characters');
    expect(container.textContent).toContain('2 words');
  });

  it('honours the UTF-8 charset', async () => {
    const { container } = renderFooter(MULTI_BYTE, 'UTF-8');
    await act(async () => {});
    expect(container.textContent).toContain('9 characters');
  });
});
