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
