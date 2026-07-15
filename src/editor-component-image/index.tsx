import type { CmsEditorComponentOptions } from '@/lib/util/index';

interface ImageData {
  image: string;
  alt: string;
  title: string;
}

interface FieldLike {
  widget?: string;
  [key: string]: unknown;
}

const image: CmsEditorComponentOptions = {
  label: 'Image',
  id: 'image',
  fromBlock: (match: RegExpMatchArray) =>
    match && {
      image: match[2],
      alt: match[1],
      title: match[4],
    },
  toBlock: (data: unknown) => {
    // Narrow cast: `toBlock`'s public signature takes `unknown` (it's shared
    // across all editor components), but this component is only ever invoked
    // with the `ImageData` shape its own `fields`/`fromBlock` produce.
    const { alt, image, title } = data as ImageData;
    return `![${alt || ''}](${image || ''}${title ? ` "${title.replace(/"/g, '\\"')}"` : ''})`;
  },
  toPreview: (
    data: unknown,
    getAsset: (value: string, field?: unknown) => string,
    fields?: unknown[],
  ) => {
    // Same narrow cast as `toBlock`, for the same reason.
    const { alt, image, title } = data as ImageData;
    const imageField = (fields as FieldLike[] | undefined)?.find(f => f.widget === 'image');
    const src = getAsset(image, imageField);
    return <img src={src || ''} alt={alt || ''} title={title || ''} />;
  },
  pattern: /^!\[([^\]]*)\]\((.*?)(\s"([^"]*)")?\)/,
  fields: [
    {
      label: 'Image',
      name: 'image',
      widget: 'image',
      media_library: {
        allow_multiple: false,
      },
    },
    {
      label: 'Alt Text',
      name: 'alt',
    },
    {
      label: 'Title',
      name: 'title',
    },
  ],
};

export const DecapCmsEditorComponentImage = image;
export default image;
