import { PlateElement } from 'platejs/react';

import type { GetAssetFunction, RichTextElement } from '@/widgets/richtext/types';
import type { PlateElementProps } from 'platejs/react';

function isAbsoluteAssetUrl(url: string) {
  return /^(?:[a-z]+:)?\/\//i.test(url) || url.startsWith('data:') || url.startsWith('blob:');
}

function resolveImageSource(
  url: string | undefined,
  getAsset: GetAssetFunction | undefined,
  field: unknown,
) {
  if (!url) {
    return '';
  }

  if (!getAsset || isAbsoluteAssetUrl(url)) {
    return url;
  }

  const asset = getAsset(url, field);
  return asset === null || asset === undefined ? '' : String(asset);
}

interface ImageElementProps extends PlateElementProps<RichTextElement> {
  getAsset?: GetAssetFunction | undefined;
  field?: unknown | undefined;
}

export default function ImageElement({
  children,
  attributes,
  element,
  getAsset,
  field,
  ...props
}: ImageElementProps) {
  const data = element.data;
  const alt = typeof data?.alt === 'string' ? data.alt : '';
  const title = typeof data?.title === 'string' ? data.title : '';
  const url = typeof data?.url === 'string' ? data.url : undefined;
  const src = resolveImageSource(url, getAsset, field);

  return (
    <PlateElement
      as="span"
      element={element}
      attributes={{ ...attributes, contentEditable: false }}
      style={{ display: 'inline-block' }}
      {...props}
    >
      <img
        src={src}
        alt={alt}
        title={title}
        style={{ maxWidth: '100%', height: 'auto', verticalAlign: 'middle' }}
      />
      {children}
    </PlateElement>
  );
}
