import React from 'react';
import { css } from '@emotion/react';
import styled from '@emotion/styled';

import { isAbsolutePath } from '@/lib/util/index';
import { buttons, shadows, zIndex } from '@/ui/default/index';
import { FileUploadButton } from '@/core/components/UI';

import type { TranslateFunction } from '@/ui/default/index';

const styles = {
  button: css`
    ${buttons.button};
    ${buttons.default};
    display: inline-block;
    margin-left: 15px;
    margin-right: 2px;

    &[disabled] {
      ${buttons.disabled};
      cursor: default;
    }
  `,
};

export const UploadButton = styled(FileUploadButton)`
  ${styles.button};
  ${buttons.gray};
  ${shadows.dropMain};
  margin-bottom: 0;

  span {
    font-size: 14px;
    font-weight: 500;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  input {
    height: 0.1px;
    width: 0.1px;
    margin: 0;
    padding: 0;
    opacity: 0;
    overflow: hidden;
    position: absolute;
    z-index: ${zIndex.zIndex0};
    outline: none;
  }
`;

export const DeleteButton = styled.button`
  ${styles.button};
  ${buttons.lightRed};
`;

export const InsertButton = styled.button`
  ${styles.button};
  ${buttons.green};
`;

const ActionButton = styled.button`
  ${styles.button};
  ${props =>
    !props.disabled &&
    css`
      ${buttons.gray}
    `}
`;

export const DownloadButton = ActionButton;

interface CopyToClipBoardButtonProps {
  disabled: boolean;
  draft?: boolean;
  path?: string;
  name?: string;
  t: TranslateFunction;
}

export function CopyToClipBoardButton({
  disabled,
  draft,
  path,
  name,
  t,
}: CopyToClipBoardButtonProps) {
  const [copied, setCopied] = React.useState(false);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  async function handleCopy() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    await navigator.clipboard.writeText(
      isAbsolutePath(path || '') || !draft ? path || '' : name || '',
    );
    setCopied(true);
    timeoutRef.current = setTimeout(() => setCopied(false), 1500);
  }

  let title: string;
  if (copied) {
    title = t('mediaLibrary.mediaLibraryCard.copied');
  } else if (!path) {
    title = t('mediaLibrary.mediaLibraryCard.copy');
  } else if (isAbsolutePath(path)) {
    title = t('mediaLibrary.mediaLibraryCard.copyUrl');
  } else if (draft) {
    title = t('mediaLibrary.mediaLibraryCard.copyName');
  } else {
    title = t('mediaLibrary.mediaLibraryCard.copyPath');
  }

  return (
    <ActionButton disabled={disabled} onClick={handleCopy}>
      {title}
    </ActionButton>
  );
}
