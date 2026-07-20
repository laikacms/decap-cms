
import styled from '@emotion/styled';
import React from 'react';
import { useNavigate } from 'react-router-dom';

import { translate } from '@/core/i18n';
import { colors } from '@/ui/default/index';
import { handleNavItemKeyDown, navItemProps } from './listNav';
import { LaikaBadge, LaikaButton, LaikaCard } from './ui';

import type { WorkflowCardRenderProps } from '@/app/components/index';
import type { TranslateFunction } from '@/ui/default/index';

/**
 * Laika-styled editorial-workflow card. Replaces core's `WorkflowCard` via
 * the `renderWorkflowCard` slot. Drag-and-drop still works because the slot
 * is rendered inside core's `DragSource` wrapper — this component only
 * controls the inner card visual.
 */

const Meta = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
  font-size: 12px;
  color: ${colors.controlLabel};
`;

const Title = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: ${colors.textLead};
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
`;

const Body = styled.p`
  margin: 0;
  font-size: 13px;
  color: ${colors.controlLabel};
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
`;

const ClickableSurface = styled.div`
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const CardWrap = styled.div`
  /* Workflow board lays cards out in a 3-column grid via the drop targets,
     so the card itself just needs vertical spacing. */
  margin: 0 0 12px;
`;

interface LaikaWorkflowCardProps extends WorkflowCardRenderProps {
  t: TranslateFunction;
}

function LaikaWorkflowCard({
  collectionLabel,
  title,
  authorLastChange,
  body,
  isModification,
  editLink,
  timestamp,
  onDelete,
  allowPublish,
  canPublish,
  onPublish,
  postAuthor,
  t,
}: LaikaWorkflowCardProps) {
  const navigate = useNavigate();

  return (
    <CardWrap>
      <LaikaCard>
        <ClickableSurface
          role="link"
          tabIndex={0}
          {...navItemProps}
          onClick={() => navigate(editLink)}
          onKeyDown={event => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              navigate(editLink);
              return;
            }
            handleNavItemKeyDown(event);
          }}
        >
          <LaikaCard.Header>
            <LaikaBadge intent="draft">{collectionLabel}</LaikaBadge>
          </LaikaCard.Header>
          <Title>{title}</Title>
          {(timestamp || authorLastChange) && (
            <Meta>
              {timestamp ? <span>{timestamp}</span> : null}
              {authorLastChange ? <span>· {authorLastChange}</span> : null}
              {postAuthor ? <span>· {postAuthor}</span> : null}
            </Meta>
          )}
          {body ? <Body>{body}</Body> : null}
        </ClickableSurface>
        <LaikaCard.Footer>
          <ButtonRow>
            <LaikaButton variant="ghost" size="sm" onClick={onDelete}>
              {isModification
                ? t('workflow.workflowCard.deleteChanges')
                : t('workflow.workflowCard.deleteNewEntry')}
            </LaikaButton>
            {allowPublish
              ? (
                <LaikaButton variant="primary" size="sm" disabled={!canPublish} onClick={onPublish}>
                  {isModification
                    ? t('workflow.workflowCard.publishChanges')
                    : t('workflow.workflowCard.publishNewEntry')}
                </LaikaButton>
              )
              : null}
          </ButtonRow>
        </LaikaCard.Footer>
      </LaikaCard>
    </CardWrap>
  );
}

export default translate()(LaikaWorkflowCard);
