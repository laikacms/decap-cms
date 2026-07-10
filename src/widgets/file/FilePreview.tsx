import React from 'react';
import styled from '@emotion/styled';

import { WidgetPreviewContainer } from '../../ui/default/index';

interface FileLinkProps {
  href: string;
  path: string;
  className?: string;
}

const FileLink = styled(({ href, path, className }: FileLinkProps) => (
  <a href={href} rel="noopener noreferrer" target="_blank" className={className}>
    {path}
  </a>
))`
  display: block;
`;

interface FileLinkListProps {
  values: string[];
  getAsset: (value: string, field?: unknown) => string;
  field?: unknown;
}

function FileLinkList({ values, getAsset, field }: FileLinkListProps) {
  return (
    <div>
      {values.map((value: string) => (
        <FileLink key={value} path={value} href={getAsset(value, field)} />
      ))}
    </div>
  );
}

interface FileContentProps {
  value: string | string[];
  getAsset: (value: string, field?: unknown) => string;
  field?: unknown;
}

function FileContent(props: FileContentProps) {
  const { value, getAsset, field } = props;
  if (Array.isArray(value)) {
    return <FileLinkList values={value as string[]} getAsset={getAsset} field={field} />;
  }
  return <FileLink key={value} path={value} href={getAsset(value, field)} />;
}

interface FilePreviewProps {
  getAsset: (value: string, field?: unknown) => string;
  value?: string | string[];
  field?: unknown;
}

function FilePreview(props: FilePreviewProps) {
  return (
    <WidgetPreviewContainer>
      {props.value ? (
        <FileContent value={props.value} getAsset={props.getAsset} field={props.field} />
      ) : null}
    </WidgetPreviewContainer>
  );
}

export default FilePreview;
