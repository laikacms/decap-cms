import React from 'react';
import styled from '@emotion/styled';

import { WidgetPreviewContainer } from '../ui-default/index';

interface StyledImageInnerProps {
  src: string;
  className?: string;
}

const StyledImage = styled(({ src, className }: StyledImageInnerProps) => (
  <img src={src || ''} role="presentation" className={className} />
))`
  display: block;
  max-width: 100%;
  height: auto;
`;

interface StyledImageAssetProps {
  getAsset: (value: string, field?: unknown) => string;
  value: string | File;
  field?: unknown;
}

function StyledImageAsset({ getAsset, value, field }: StyledImageAssetProps) {
  let src;
  if (value instanceof File) {
    src = URL.createObjectURL(value);
  } else {
    src = getAsset(value, field);
  }
  return <StyledImage src={src} />;
}

interface ImagePreviewContentProps {
  value: string | string[] | File;
  getAsset: (value: string, field?: unknown) => string;
  field?: unknown;
}

function ImagePreviewContent(props: ImagePreviewContentProps) {
  const { value, getAsset, field } = props;
  if (Array.isArray(value)) {
    return (value as string[]).map((val: string, index: number) => (
      <StyledImageAsset key={index} value={val} getAsset={getAsset} field={field} />
    ));
  }
  return <StyledImageAsset value={value} getAsset={getAsset} field={field} />;
}

interface ImagePreviewProps {
  getAsset: (value: string, field?: unknown) => string;
  value?: string | string[] | File;
  field?: unknown;
}

function ImagePreview(props: ImagePreviewProps) {
  return (
    <WidgetPreviewContainer>
      {props.value ? (
        <ImagePreviewContent value={props.value} getAsset={props.getAsset} field={props.field} />
      ) : null}
    </WidgetPreviewContainer>
  );
}

export default ImagePreview;
