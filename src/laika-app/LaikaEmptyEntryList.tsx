/** @jsxImportSource @emotion/react */
import React from 'react';
import styled from '@emotion/styled';

import { Icon, colors, lengths } from '../ui/default/index';
import { createNewEntry } from '../core/actions/collections';
import { LaikaButton } from './ui';

import type { EntryListEmptyRenderProps } from '../app/components/index';

/**
 * Laika-styled zero state for empty collection listings. Slotted into core
 * via `renderEntryListEmpty`. Shows a friendly icon, the collection label
 * in the message, and (when the collection allows creation) a primary CTA
 * to start a new entry.
 */

const Wrap = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 16px;
`;

const Card = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  max-width: 440px;
  padding: 32px 28px;
  text-align: center;
  background-color: ${colors.foreground};
  border: 1px dashed ${colors.textFieldBorder};
  border-radius: ${lengths.borderRadius};
`;

const IconBubble = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 9999px;
  background-color: ${colors.activeBackground};
  color: ${colors.active};

  & > * {
    transform: scale(1.4);
  }
`;

const Title = styled.h2`
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: ${colors.textLead};
`;

const Body = styled.p`
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  color: ${colors.controlLabel};
`;

function LaikaEmptyEntryList({ collection }: EntryListEmptyRenderProps) {
  const singular = collection?.label_singular || collection?.label || 'entry';
  const title = collection ? 'No ' + collection.label.toLowerCase() + ' yet' : 'No matches';

  return (
    <Wrap>
      <Card>
        <IconBubble>
          <Icon type={collection?.type === 'file_based_collection' ? 'page' : 'write'} />
        </IconBubble>
        <Title>{title}</Title>
        <Body>
          {collection
            ? 'Get started by creating your first ' + singular.toLowerCase() + '.'
            : 'Nothing matches the current filters. Try widening the search.'}
        </Body>
        {collection?.create ? (
          <LaikaButton onClick={() => createNewEntry(collection.name)}>
            Create {singular}
          </LaikaButton>
        ) : null}
      </Card>
    </Wrap>
  );
}

export default LaikaEmptyEntryList;
