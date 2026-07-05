import React from 'react';
import { fromJS } from 'immutable';
import { render } from '@testing-library/react';

import { DecapCmsWidgetRelation } from '../';

jest.mock('react-window', () => {
  function FixedSizeList(props) {
    return props.itemData.options;
  }

  return {
    FixedSizeList,
  };
});

jest.mock('../RelationCache', () => {
  return {
    __esModule: true,
    default: {
      getOptions: jest.fn((collection, searchFields, term, file, queryFn) => {
        return queryFn();
      }),
      clear: jest.fn(),
      invalidateCollection: jest.fn(),
    },
  };
});

const RelationControl = DecapCmsWidgetRelation.controlComponent;

const fieldConfig = {
  name: 'post',
  collection: 'posts',
  display_fields: ['title', 'slug'],
  search_fields: ['title', 'body'],
  value_field: 'title',
  multiple: true,
};

function setupRef() {
  let widgetRef;
  const query = jest.fn(() => Promise.resolve({ payload: { hits: [] } }));
  const onChange = jest.fn();

  render(
    <RelationControl
      field={fromJS(fieldConfig)}
      value={fromJS([])}
      query={query}
      queryHits={[]}
      onChange={onChange}
      forID="relation-field"
      classNameWrapper=""
      setActiveStyle={jest.fn()}
      setInactiveStyle={jest.fn()}
      t={key => key}
      ref={r => (widgetRef = r)}
    />,
  );

  return { ref: widgetRef, onChange };
}

// See DCMS-315: onSortEnd used to build metadata using the key from the
// post-sort value array but the .data from the pre-sort options array,
// which could mismatch after a drag-reorder.
describe('onSortEnd (DCMS-315)', () => {
  it('keeps the metadata key and data referring to the same option after moving a non-last item to the last position', () => {
    const { ref, onChange } = setupRef();

    const options = [
      { value: 'Post # 1', label: 'Post # 1', data: { title: 'Post # 1', id: 1 } },
      { value: 'Post # 2', label: 'Post # 2', data: { title: 'Post # 2', id: 2 } },
      { value: 'Post # 3', label: 'Post # 3', data: { title: 'Post # 3', id: 3 } },
    ];

    // Move the first item (index 0) to the last position (index 2).
    ref.onSortEnd(options)({ oldIndex: 0, newIndex: 2 });

    expect(onChange).toHaveBeenCalledTimes(1);
    const [newValue, metadata] = onChange.mock.calls[0];

    expect(newValue.toJS()).toEqual(['Post # 2', 'Post # 3', 'Post # 1']);

    const lastKey = newValue.last();
    expect(lastKey).toBe('Post # 1');

    const collectionMetadata = metadata.post.posts;
    expect(Object.keys(collectionMetadata)).toEqual(['Post # 1']);
    expect(collectionMetadata['Post # 1']).toEqual({ title: 'Post # 1', id: 1 });
  });
});
