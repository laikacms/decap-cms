/**
 * Unit tests for the radix-icon widget's IconPreview component (DCMS-1343).
 *
 * IconPreview had zero test coverage. These tests lock down its three
 * branches: falsy value renders nothing, a known icon name renders the
 * resolved icon, and an unknown icon name falls back to `undefined` without
 * throwing.
 */

import { render } from '@testing-library/react';
import * as allIcons from '@radix-ui/react-icons';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { IconPreview } from '@/widgets/radix-icon/IconPreview';

const KNOWN_ICON_NAME = Object.keys(allIcons)[0];

describe('IconPreview (radix-icon)', () => {
  it('renders null when value is falsy', () => {
    const { container } = render(
      React.createElement(IconPreview, { value: undefined, field: {} as never }),
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders null when value is an empty string', () => {
    const { container } = render(
      React.createElement(IconPreview, { value: '', field: {} as never }),
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders the resolved icon for a known icon name', () => {
    const { container } = render(
      React.createElement(IconPreview, { value: KNOWN_ICON_NAME, field: {} as never }),
    );

    const wrapper = container.firstElementChild;
    expect(wrapper).not.toBeNull();
    expect(wrapper?.querySelector('svg')).not.toBeNull();
  });

  it('renders without throwing and shows no icon for an unknown icon name', () => {
    expect(() =>
      render(
        React.createElement(IconPreview, {
          value: 'ThisIconDoesNotExist_xyz123',
          field: {} as never,
        }),
      ),
    ).not.toThrow();

    const { container } = render(
      React.createElement(IconPreview, {
        value: 'ThisIconDoesNotExist_xyz123',
        field: {} as never,
      }),
    );

    expect(container.querySelector('svg')).toBeNull();
  });
});
