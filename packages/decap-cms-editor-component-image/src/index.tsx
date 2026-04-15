interface ImageData {
  image: string;
  alt: string;
  title: string;
}

interface FieldLike {
  get(key: string): unknown;
}

const image = {
  label: 'Image',
  id: 'image',
  fromBlock: (match: RegExpMatchArray) =>
    match && {
      image: match[2],
      alt: match[1],
      title: match[4],
    },
  toBlock: ({ alt, image, title }: ImageData) =>
    `![${alt || ''}](${image || ''}${title ? ` "${title.replace(/"/g, '\\"')}"` : ''})`,
  // eslint-disable-next-line react/display-name
  toPreview: (
    { alt, image, title }: ImageData,
    getAsset: (value: string, field?: FieldLike) => string,
    fields?: FieldLike[],
  ) => {
    const imageField = fields?.find((f: FieldLike) => f.get('widget') === 'image');
    const src = getAsset(image, imageField);
    return <img src={src || ''} alt={alt || ''} title={title || ''} />;
  },
  pattern: /^!\[(.*)\]\((.*?)(\s"(.*)")?\)/,
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
