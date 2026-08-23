import { describe, expect, it } from 'vitest';

import { createEditorComponent } from '@/widgets/richtext/editorComponents';
import { mergeMediaConfig } from '@/widgets/richtext/RichtextControl/mergeMediaConfig';

import type { EditorComponentsRegistry } from '@/widgets/richtext/types';

function registryWithImageComponent(): EditorComponentsRegistry {
  const image = createEditorComponent({
    id: 'image',
    label: 'Image',
    fields: [
      { name: 'alt', widget: 'string' },
      { name: 'src', widget: 'image' },
    ],
  });

  return new Map([[image.id, image]]);
}

function imageField(registry: EditorComponentsRegistry) {
  return registry.get('image')?.fields.find(f => f.widget === 'image');
}

describe('mergeMediaConfig', () => {
  it('pushes the field media_folder and public_folder onto the image sub-field', () => {
    const merged = mergeMediaConfig(registryWithImageComponent(), {
      media_folder: 'static/img',
      public_folder: '/img',
    });

    expect(imageField(merged)).toMatchObject({
      media_folder: 'static/img',
      public_folder: '/img',
    });
  });

  it('does not overwrite folders the sub-field already sets', () => {
    const registry = registryWithImageComponent();
    const image = registry.get('image');
    if (image) image.fields[1].media_folder = 'own/folder';

    const merged = mergeMediaConfig(registry, { media_folder: 'static/img' });

    expect(imageField(merged)?.media_folder).toBe('own/folder');
  });

  it('deep merges media_library with the sub-field winning', () => {
    const registry = registryWithImageComponent();
    const image = registry.get('image');
    if (image) image.fields[1].media_library = { config: { multiple: true } };

    const merged = mergeMediaConfig(registry, {
      media_library: { name: 'uploadcare', config: { multiple: false, publicKey: 'k' } },
    });

    expect(imageField(merged)?.media_library).toEqual({
      name: 'uploadcare',
      config: { multiple: true, publicKey: 'k' },
    });
  });

  it('leaves the source registry untouched', () => {
    const registry = registryWithImageComponent();
    mergeMediaConfig(registry, { media_folder: 'static/img' });

    expect(imageField(registry)?.media_folder).toBeUndefined();
  });

  it('returns the registry unchanged when there is no image component', () => {
    const registry: EditorComponentsRegistry = new Map();
    expect(mergeMediaConfig(registry, { media_folder: 'x' })).toBe(registry);
  });
});
