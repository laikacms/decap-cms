import { Map, fromJS } from 'immutable';

import { mergeMediaConfig } from '../mergeMediaConfig';

describe('mergeMediaConfig', () => {
  function imageWidgetFields({ media_library, media_folder, public_folder } = {}) {
    return fromJS([
      {
        label: 'Image',
        name: 'image',
        widget: 'image',
        ...(media_library && { media_library }),
        ...(media_folder && { media_folder }),
        ...(public_folder && { public_folder }),
      },
      { label: 'Alt Text', name: 'alt' },
      { label: 'Title', name: 'title' },
    ]);
  }

  function editorComponentsWithImage(fields) {
    return Map({
      image: {
        id: 'image',
        label: 'Image',
        type: 'shortcode',
        icon: 'exclamation-triangle',
        widget: 'object',
        pattern: {},
        fields,
      },
    });
  }

  it('is a no-op when editorComponents has no image component', () => {
    const editorComponents = Map({
      'code-block': { id: 'code-block', fields: fromJS([]) },
    });
    const before = editorComponents;
    const field = fromJS({
      widget: 'markdown',
      media_library: { config: { max_file_size: 1234 } },
    });

    mergeMediaConfig(editorComponents, field);

    expect(editorComponents).toEqual(before);
    expect(editorComponents.has('code-block')).toBe(true);
  });

  it('is a no-op when the image component has no fields', () => {
    const editorComponents = Map({
      image: { id: 'image', label: 'Image', widget: 'object' },
    });
    const field = fromJS({
      widget: 'markdown',
      media_library: { config: { max_file_size: 1234 } },
    });

    expect(() => mergeMediaConfig(editorComponents, field)).not.toThrow();
    expect(editorComponents.get('image').fields).toBeUndefined();
  });

  it('deep-merges media_library, with the existing image field config winning on key conflicts', () => {
    const editorComponents = editorComponentsWithImage(
      imageWidgetFields({ media_library: { allow_multiple: false, config: { crop: true } } }),
    );
    const field = fromJS({
      widget: 'markdown',
      media_library: { allow_multiple: true, config: { max_file_size: 1234 } },
    });

    mergeMediaConfig(editorComponents, field);

    const imageField = editorComponents.get('image').fields.get(0);
    // union of keys, but on the overlapping `allow_multiple` key the existing
    // image-field value wins because the call is `field.mergeDeep(imageField)`.
    expect(imageField.get('media_library').toJS()).toEqual({
      allow_multiple: false,
      config: { crop: true, max_file_size: 1234 },
    });
  });

  it('sets media_library on the image field when the image field had none', () => {
    const editorComponents = editorComponentsWithImage(imageWidgetFields());
    const field = fromJS({
      widget: 'markdown',
      media_library: { config: { max_file_size: 1234 } },
    });

    mergeMediaConfig(editorComponents, field);

    expect(editorComponents.get('image').fields.get(0).get('media_library').toJS()).toEqual({
      config: { max_file_size: 1234 },
    });
  });

  it('leaves media_library untouched when the field defines none', () => {
    const editorComponents = editorComponentsWithImage(
      imageWidgetFields({ media_library: { allow_multiple: false } }),
    );
    const field = fromJS({ widget: 'markdown' });

    mergeMediaConfig(editorComponents, field);

    expect(editorComponents.get('image').fields.get(0).get('media_library').toJS()).toEqual({
      allow_multiple: false,
    });
  });

  it('applies media_folder from the field when the image field has none', () => {
    const editorComponents = editorComponentsWithImage(imageWidgetFields());
    const field = fromJS({
      widget: 'markdown',
      media_folder: '/{{media_folder}}/posts/images/widget/body',
    });

    mergeMediaConfig(editorComponents, field);

    expect(editorComponents.get('image').fields.get(0).get('media_folder')).toEqual(
      '/{{media_folder}}/posts/images/widget/body',
    );
  });

  it('does not override an existing media_folder on the image field', () => {
    const editorComponents = editorComponentsWithImage(
      imageWidgetFields({ media_folder: '/existing/media_folder' }),
    );
    const field = fromJS({
      widget: 'markdown',
      media_folder: '/{{media_folder}}/posts/images/widget/body',
    });

    mergeMediaConfig(editorComponents, field);

    expect(editorComponents.get('image').fields.get(0).get('media_folder')).toEqual(
      '/existing/media_folder',
    );
  });

  it('applies public_folder from the field when the image field has none', () => {
    const editorComponents = editorComponentsWithImage(imageWidgetFields());
    const field = fromJS({
      widget: 'markdown',
      public_folder: '{{public_folder}}/posts/images/widget/body',
    });

    mergeMediaConfig(editorComponents, field);

    expect(editorComponents.get('image').fields.get(0).get('public_folder')).toEqual(
      '{{public_folder}}/posts/images/widget/body',
    );
  });

  it('does not override an existing public_folder on the image field', () => {
    const editorComponents = editorComponentsWithImage(
      imageWidgetFields({ public_folder: '/existing/public_folder' }),
    );
    const field = fromJS({
      widget: 'markdown',
      public_folder: '{{public_folder}}/posts/images/widget/body',
    });

    mergeMediaConfig(editorComponents, field);

    expect(editorComponents.get('image').fields.get(0).get('public_folder')).toEqual(
      '/existing/public_folder',
    );
  });

  it('leaves non-image fields (alt, title) untouched', () => {
    const editorComponents = editorComponentsWithImage(imageWidgetFields());
    const field = fromJS({
      widget: 'markdown',
      media_folder: '/{{media_folder}}/posts/images/widget/body',
      public_folder: '{{public_folder}}/posts/images/widget/body',
      media_library: { config: { max_file_size: 1234 } },
    });

    mergeMediaConfig(editorComponents, field);

    const fields = editorComponents.get('image').fields;
    expect(fields.get(1).toJS()).toEqual({ label: 'Alt Text', name: 'alt' });
    expect(fields.get(2).toJS()).toEqual({ label: 'Title', name: 'title' });
  });

  it('when no field has widget "image", List.update(-1, ...) falls back to updating the last field', () => {
    // findIndex returns -1 when nothing matches `widget === 'image'`. Immutable's
    // List#update treats a negative index as counting from the end of the list,
    // so this ends up mutating the *last* field instead of being a true no-op.
    // This test documents the actual (surprising) current behavior.
    const fields = fromJS([
      { label: 'Alt Text', name: 'alt' },
      { label: 'Title', name: 'title' },
    ]);
    const editorComponents = editorComponentsWithImage(fields);
    const field = fromJS({
      widget: 'markdown',
      media_folder: '/{{media_folder}}/posts/images/widget/body',
    });

    mergeMediaConfig(editorComponents, field);

    const updatedFields = editorComponents.get('image').fields;
    expect(updatedFields.get(0).toJS()).toEqual({ label: 'Alt Text', name: 'alt' });
    expect(updatedFields.get(1).toJS()).toEqual({
      label: 'Title',
      name: 'title',
      media_folder: '/{{media_folder}}/posts/images/widget/body',
    });
  });

  it('is a full no-op when the field has no media config at all', () => {
    const fields = imageWidgetFields();
    const editorComponents = editorComponentsWithImage(fields);
    const field = fromJS({ widget: 'markdown' });

    mergeMediaConfig(editorComponents, field);

    expect(editorComponents.get('image').fields).toEqual(fields);
  });
});
