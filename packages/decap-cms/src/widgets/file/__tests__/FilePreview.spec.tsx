/**
 * Unit tests for the file widget's FilePreview component (DCMS-1351).
 *
 * FilePreview had zero test coverage. These tests lock down its three
 * branches: falsy value renders nothing, a string value renders a single
 * link whose `href` comes from `getAsset`, and an array value renders one
 * link per entry.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import FilePreview from '@/widgets/file/FilePreview';

describe('FilePreview (file)', () => {
  it('renders nothing when value is falsy', () => {
    const getAsset = vi.fn();

    const { container } = render(
      React.createElement(FilePreview, { value: undefined, getAsset }),
    );

    expect(container.querySelectorAll('a')).toHaveLength(0);
    expect(getAsset).not.toHaveBeenCalled();
  });

  it('renders nothing when value is an empty string', () => {
    const getAsset = vi.fn();

    const { container } = render(React.createElement(FilePreview, { value: '', getAsset }));

    expect(container.querySelectorAll('a')).toHaveLength(0);
  });

  it('renders a single link with an href derived from getAsset for a string value', () => {
    const getAsset = vi.fn((value: string) => `https://cdn.example.com/${value}`);

    const { container } = render(
      React.createElement(FilePreview, { value: 'report.pdf', getAsset }),
    );

    const links = container.querySelectorAll('a');
    expect(links).toHaveLength(1);
    expect(links[0].getAttribute('href')).toBe('https://cdn.example.com/report.pdf');
    expect(links[0].textContent).toBe('report.pdf');
    expect(getAsset).toHaveBeenCalledWith('report.pdf', undefined);
  });

  it('renders one link per entry for an array value', () => {
    const getAsset = vi.fn((value: string) => `https://cdn.example.com/${value}`);
    const value = ['a.pdf', 'b.pdf', 'c.pdf'];

    const { container } = render(React.createElement(FilePreview, { value, getAsset }));

    const links = container.querySelectorAll('a');
    expect(links).toHaveLength(value.length);
    value.forEach((path, index) => {
      expect(links[index].getAttribute('href')).toBe(`https://cdn.example.com/${path}`);
      expect(links[index].textContent).toBe(path);
    });
  });
});

describe('FilePreview (file) unsaved media', () => {
  function renderLinks(value: string | string[], href: string) {
    const { container } = render(
      React.createElement(FilePreview, { value, getAsset: () => href, field: {} } as any),
    );
    return [...container.querySelectorAll('a')];
  }

  it('downloads unsaved media instead of opening it in the CMS origin', () => {
    const [link] = renderLinks('uploads/drawing.svg', 'blob:http://localhost/1234');

    expect(link.getAttribute('href')).toBe('blob:http://localhost/1234');
    expect(link.getAttribute('download')).toBe('drawing.svg');
  });

  it('downloads data URLs', () => {
    const [link] = renderLinks('drawing.svg', 'data:image/svg+xml,<svg/>');

    expect(link.getAttribute('download')).toBe('drawing.svg');
  });

  it('opens saved media in a new tab', () => {
    const [link] = renderLinks('uploads/report.pdf', 'https://example.com/uploads/report.pdf');

    expect(link.hasAttribute('download')).toBe(false);
    expect(link.getAttribute('target')).toBe('_blank');
  });

  it('handles a list of files', () => {
    const links = renderLinks(['a.svg', 'b.svg'], 'blob:http://localhost/5678');

    expect(links.map(link => link.getAttribute('download'))).toEqual(['a.svg', 'b.svg']);
  });
});
