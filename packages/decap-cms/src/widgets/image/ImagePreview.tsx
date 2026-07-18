import styled from '@emotion/styled';
import React, { useEffect, useState } from 'react';

import { WidgetPreviewContainer } from '@/ui/default/index';

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

// DCMS-1036 / decaporg#7416: resolving getAsset() during render dispatches
// redux actions synchronously, which triggers React's "Cannot update a
// component while rendering a different component" warning. Resolve in an
// effect instead, and revoke object URLs created for File values on cleanup.
function StyledImageAsset({ getAsset, value, field }: StyledImageAssetProps) {
  const [src, setSrc] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!value) {
      setSrc(undefined);
      return;
    }

    if (value instanceof File) {
      const objectUrl = URL.createObjectURL(value);
      setSrc(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }

    setSrc(getAsset(value, field));
  }, [value, field, getAsset]);

  return <StyledImage src={src || ''} />;
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
      {props.value ? <ImagePreviewContent value={props.value} getAsset={props.getAsset} field={props.field} /> : null}
    </WidgetPreviewContainer>
  );
}

export default ImagePreview;
