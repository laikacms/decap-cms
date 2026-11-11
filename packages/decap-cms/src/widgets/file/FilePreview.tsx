import styled from '@emotion/styled';
import React from 'react';

import { WidgetPreviewContainer } from '@/ui/default/index';

interface FileLinkProps {
  href: string;
  path: string;
  className?: string;
}

// Media that isn't saved yet is served from a `blob:` URL, which belongs to the
// CMS origin. Opened as a page, an SVG there runs its scripts with access to
// the CMS's storage, including the signed-in user's token, so download it.
function isLocalObjectUrl(href: string) {
  return /^(blob|data):/i.test(String(href));
}

const FileLink = styled(({ href, path, className }: FileLinkProps) => (
  <a
    href={href}
    rel="noopener noreferrer"
    target="_blank"
    download={isLocalObjectUrl(href) ? String(path).split('/').pop() : undefined}
    className={className}
  >
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
      {values.map((value: string) => <FileLink key={value} path={value} href={getAsset(value, field)} />)}
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
      {props.value ? <FileContent value={props.value} getAsset={props.getAsset} field={props.field} /> : null}
    </WidgetPreviewContainer>
  );
}

export default FilePreview;
