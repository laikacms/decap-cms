/**
 * Unit tests for the relation widget's RelationPreview component (DCMS-1367).
 *
 * RelationPreview had zero test coverage. These tests lock down its
 * behavior: it renders whatever resolved value it is given, renders nothing
 * for an empty/undefined value, and renders a multi-value array of nodes
 * (as produced for `multiple: true` relation fields) as a list.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import RelationPreview from '@/widgets/relation/RelationPreview';

describe('RelationPreview (relation)', () => {
  it('renders the resolved relation value', () => {
    const { container } = render(
      React.createElement(RelationPreview, { value: 'Resolved Title' }),
    );

    expect(container.textContent).toBe('Resolved Title');
  });

  it('renders nothing when value is undefined', () => {
    const { container } = render(React.createElement(RelationPreview, { value: undefined }));

    expect(container.textContent).toBe('');
  });

  it('renders nothing when value is an empty string', () => {
    const { container } = render(React.createElement(RelationPreview, { value: '' }));

    expect(container.textContent).toBe('');
  });

  it('renders a multi-value array of nodes for a multiple relation field', () => {
    const value = [
      React.createElement('span', { key: 'a' }, 'Post A'),
      React.createElement('span', { key: 'b' }, 'Post B'),
    ];

    const { container } = render(React.createElement(RelationPreview, { value }));

    const spans = container.querySelectorAll('span');
    expect(spans).toHaveLength(2);
    expect(spans[0].textContent).toBe('Post A');
    expect(spans[1].textContent).toBe('Post B');
  });
});
