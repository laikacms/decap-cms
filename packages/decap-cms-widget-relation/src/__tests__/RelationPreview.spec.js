import React from 'react';
import { render } from '@testing-library/react';
import { fromJS } from 'immutable';

import RelationPreview from '../RelationPreview';

describe('RelationPreview', () => {
  it('renders the given value inside the preview container', () => {
    const { container } = render(<RelationPreview value="Related Item" />);
    expect(container.textContent).toBe('Related Item');
  });

  it('renders nothing when value is undefined', () => {
    const { container } = render(<RelationPreview value={undefined} />);
    expect(container.textContent).toBe('');
  });

  describe('DCMS-459: display_fields resolution', () => {
    const field = fromJS({
      name: 'author',
      widget: 'relation',
      collection: 'authors',
      value_field: 'slug',
      search_fields: ['name'],
      display_fields: ['name'],
    });

    it('shows the resolved display_fields label instead of the raw stored value when metadata is cached', () => {
      const fieldsMetaData = fromJS({
        authors: {
          'jane-doe': { name: 'Jane Doe', slug: 'jane-doe' },
        },
      });

      const { container } = render(
        <RelationPreview value="jane-doe" field={field} fieldsMetaData={fieldsMetaData} />,
      );

      expect(container.textContent).toBe('Jane Doe');
      expect(container.textContent).not.toBe('jane-doe');
    });

    it('falls back to the raw value when no metadata is cached for it', () => {
      const { container } = render(
        <RelationPreview value="jane-doe" field={field} fieldsMetaData={undefined} />,
      );

      expect(container.textContent).toBe('jane-doe');
    });

    it('falls back to the raw value when metadata exists but not for this value', () => {
      const fieldsMetaData = fromJS({
        authors: {
          'john-smith': { name: 'John Smith', slug: 'john-smith' },
        },
      });

      const { container } = render(
        <RelationPreview value="jane-doe" field={field} fieldsMetaData={fieldsMetaData} />,
      );

      expect(container.textContent).toBe('jane-doe');
    });

    it('resolves each entry of a multi-value relation to its display_fields label', () => {
      const multiField = field.set('multiple', true);
      const fieldsMetaData = fromJS({
        authors: {
          'jane-doe': { name: 'Jane Doe', slug: 'jane-doe' },
          'john-smith': { name: 'John Smith', slug: 'john-smith' },
        },
      });

      const { container, getAllByRole } = render(
        <RelationPreview
          value={fromJS(['jane-doe', 'john-smith'])}
          field={multiField}
          fieldsMetaData={fieldsMetaData}
        />,
      );

      const items = getAllByRole('listitem').map(li => li.textContent);
      expect(items).toEqual(['Jane Doe', 'John Smith']);
      expect(container.textContent).not.toContain('jane-doe');
    });

    it('falls back to raw values per-item in a multi-value relation with no metadata', () => {
      const multiField = field.set('multiple', true);

      const { getAllByRole } = render(
        <RelationPreview value={fromJS(['jane-doe', 'john-smith'])} field={multiField} />,
      );

      const items = getAllByRole('listitem').map(li => li.textContent);
      expect(items).toEqual(['jane-doe', 'john-smith']);
    });
  });
});
