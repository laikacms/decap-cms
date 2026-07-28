import styled from '@emotion/styled';
import React from 'react';

import { useTranslate } from '@/core/i18n';
import { colors } from '@/ui/default/index';

import type { MediaFolderBreadcrumb } from '@/core/reducers/mediaLibrary';

const BreadcrumbsContainer = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 2px;
  margin-bottom: 8px;
  font-size: 13px;
`;

const Crumb = styled.button<{ $isCurrent?: boolean }>`
  background: none;
  border: none;
  padding: 2px 4px;
  font: inherit;
  color: ${props => (props.$isCurrent ? colors.text : colors.textLead)};
  font-weight: ${props => (props.$isCurrent ? 600 : 400)};
  cursor: ${props => (props.$isCurrent ? 'default' : 'pointer')};
  text-decoration: ${props => (props.$isCurrent ? 'none' : 'underline')};

  &:disabled {
    cursor: default;
  }
`;

const Separator = styled.span`
  color: ${colors.textLead};
`;

interface MediaLibraryBreadcrumbsProps {
  breadcrumbs: MediaFolderBreadcrumb[];
  onNavigate: (path: string) => void;
}

/**
 * Renders nothing for a single-segment trail (already at the root), so
 * backends/configs without any folder nesting don't show a bare "Media"
 * crumb with nowhere to go.
 */
function MediaLibraryBreadcrumbs({ breadcrumbs, onNavigate }: MediaLibraryBreadcrumbsProps) {
  const t = useTranslate();

  if (breadcrumbs.length <= 1) {
    return null;
  }

  return (
    <BreadcrumbsContainer aria-label={t('mediaLibrary.mediaLibraryBreadcrumbs.regionLabel')}>
      {breadcrumbs.map((crumb, index) => {
        const isCurrent = index === breadcrumbs.length - 1;
        return (
          <React.Fragment key={crumb.path || 'root'}>
            {index > 0 && <Separator aria-hidden="true">/</Separator>}
            <Crumb
              type="button"
              onClick={() => onNavigate(crumb.path)}
              disabled={isCurrent}
              $isCurrent={isCurrent}
              aria-current={isCurrent ? 'page' : undefined}
            >
              {crumb.label}
            </Crumb>
          </React.Fragment>
        );
      })}
    </BreadcrumbsContainer>
  );
}

export default MediaLibraryBreadcrumbs;
