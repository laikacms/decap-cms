// @ts-nocheck -- ported from upstream JS; strict typing is follow-up work
import merge from 'lodash/merge';

export function mergeMediaConfig(editorComponents, field) {
  // merge editor media library config to image components
  const imageComponent = editorComponents['image'];
  const fields = imageComponent?.fields;
  if (!fields) {
    return;
  }

  const index = fields.findIndex(f => f.widget === 'image');
  if (index === -1) {
    return;
  }

  const f = { ...fields[index] };
  // merge `media_library` config
  if (field.media_library != null) {
    f.media_library = merge({}, field.media_library, f.media_library);
  }
  // merge 'media_folder'
  if (field.media_folder != null && f.media_folder == null) {
    f.media_folder = field.media_folder;
  }
  // merge 'public_folder'
  if (field.public_folder != null && f.public_folder == null) {
    f.public_folder = field.public_folder;
  }
  imageComponent.fields = fields.map((existing, i) => (i === index ? f : existing));
}