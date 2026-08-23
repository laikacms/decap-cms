import { merge } from 'lodash-es';

import type { EditorComponentField, EditorComponentsRegistry } from '@/widgets/richtext/types';

/** The media settings a richtext field can pass down to its image component. */
export interface MediaConfigSource {
  media_library?: Record<string, unknown> | undefined;
  media_folder?: string | undefined;
  public_folder?: string | undefined;
}

/**
 * Push the richtext field's own media settings down into the `image` editor
 * component's image sub-field, so inserting an image from inside the editor
 * uses the same media library, folder and public folder as the field itself.
 *
 * Upstream mutated the registry in place. Here the registry is shared plain
 * objects, so a new registry is returned instead and the original is left
 * untouched.
 */
export function mergeMediaConfig(
  editorComponents: EditorComponentsRegistry,
  field: MediaConfigSource,
): EditorComponentsRegistry {
  const imageComponent = editorComponents.get('image');
  const fields = imageComponent?.fields;

  if (!imageComponent || !fields) {
    return editorComponents;
  }

  const index = fields.findIndex(f => f.widget === 'image');

  if (index === -1) {
    return editorComponents;
  }

  const imageField: EditorComponentField = { ...fields[index] };

  // merge `media_library` config, with the sub-field's own values winning
  if (field.media_library) {
    imageField.media_library = merge({}, field.media_library, imageField.media_library);
  }
  // merge 'media_folder'
  if (field.media_folder !== undefined && imageField.media_folder === undefined) {
    imageField.media_folder = field.media_folder;
  }
  // merge 'public_folder'
  if (field.public_folder !== undefined && imageField.public_folder === undefined) {
    imageField.public_folder = field.public_folder;
  }

  const mergedFields = [...fields];
  mergedFields[index] = imageField;

  const merged = new Map(editorComponents);
  merged.set(imageComponent.id, { ...imageComponent, fields: mergedFields });
  return merged;
}
