import React from 'react';
import { css } from '@emotion/react';
import styled from '@emotion/styled';
import { translate } from 'react-polyglot';

import { Link } from '../../routing/Link';
import { components, colors, colorsRaw, transitions, buttons } from '../../../ui-default/index';

import type { TranslateFunction } from '../../../ui-default/index';

const styles = {
  text: css`
    font-size: 13px;
    font-weight: normal;
    margin-top: 4px;
  `,
  button: css`
    ${buttons.button};
    width: auto;
    flex: 1 0 0;
    font-size: 13px;
    padding: 6px 0;
  `,
};

const WorkflowLink = styled(Link)`
  display: block;
  padding: 0 18px 18px;
  height: 200px;
  overflow: hidden;
`;

const CardCollection = styled.div`
  font-size: 14px;
  color: ${colors.textLead};
  text-transform: uppercase;
  margin-top: 12px;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
`;

const CardTitle = styled.h2`
  margin: 28px 0 0;
  color: ${colors.textLead};
`;

const CardDateContainer = styled.div`
  ${styles.text};
`;

const CardBody = styled.p`
  ${styles.text};
  color: ${colors.text};
  margin: 24px 0 0;
  overflow-wrap: anywhere;
  overflow-wrap: break-word;
  word-break: normal;
  hyphens: auto;
`;

const CardButtonContainer = styled.div`
  background-color: ${colors.foreground};
  position: absolute;
  bottom: 0;
  width: 100%;
  padding: 12px 18px;
  display: flex;
  opacity: 0;
  transition: opacity ${transitions.main};
  cursor: pointer;
`;

const DeleteButton = styled.button`
  ${styles.button};
  background-color: ${colorsRaw.redLight};
  color: ${colorsRaw.red};
  margin-right: 6px;
`;

const PublishButton = styled.button`
  ${styles.button};
  background-color: ${colorsRaw.teal};
  color: ${colors.textLight};
  margin-left: 6px;

  &[disabled] {
    ${buttons.disabled};
  }
`;

const WorkflowCardContainer = styled.div`
  ${components.card};
  margin-bottom: 24px;
  position: relative;
  overflow: hidden;

  &:hover ${CardButtonContainer} {
    opacity: 1;
  }
`;

function lastChangePhraseKey(date: string | undefined, author: string | undefined) {
  if (date && author) {
    return 'lastChange';
  } else if (date) {
    return 'lastChangeNoAuthor';
  } else if (author) {
    return 'lastChangeNoDate';
  }
}

interface CardDateOwnProps {
  date?: string;
  author?: string;
}

const CardDate = translate()(({
  t,
  date,
  author,
}: {
  t: TranslateFunction;
  date?: string;
  author?: string;
}) => {
  const key = lastChangePhraseKey(date, author);
  if (key) {
    return (
      <CardDateContainer>{t(`workflow.workflowCard.${key}`, { date, author })}</CardDateContainer>
    );
  }
  return null;
});

interface WorkflowCardProps {
  collectionLabel: string;
  title?: string;
  authorLastChange?: string;
  body?: string;
  isModification?: boolean;
  editLink: string;
  timestamp: string;
  onDelete: () => void;
  allowPublish: boolean;
  canPublish: boolean;
  onPublish: () => void;
  postAuthor?: string;
  t: TranslateFunction;
}

function WorkflowCard({
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
}: WorkflowCardProps) {
  return (
    <WorkflowCardContainer>
      <WorkflowLink to={editLink}>
        <CardCollection>{collectionLabel}</CardCollection>
        {postAuthor}
        <CardTitle>{title}</CardTitle>
        {(timestamp || authorLastChange) && <CardDate date={timestamp} author={authorLastChange} />}
        <CardBody>{body}</CardBody>
      </WorkflowLink>
      <CardButtonContainer>
        <DeleteButton onClick={onDelete}>
          {isModification
            ? t('workflow.workflowCard.deleteChanges')
            : t('workflow.workflowCard.deleteNewEntry')}
        </DeleteButton>
        {allowPublish && (
          <PublishButton disabled={!canPublish} onClick={onPublish}>
            {isModification
              ? t('workflow.workflowCard.publishChanges')
              : t('workflow.workflowCard.publishNewEntry')}
          </PublishButton>
        )}
      </CardButtonContainer>
    </WorkflowCardContainer>
  );
}

export default translate()(WorkflowCard);
