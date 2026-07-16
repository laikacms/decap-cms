/** @jsxImportSource @emotion/react */
import styled from '@emotion/styled';
import React from 'react';

import { colors } from '@/ui/default/index';
import { LaikaSpinner } from './ui';

import type { LoaderRenderProps } from '@/app/components/index';

/**
 * Laika-styled loading indicator. Slotted into core via `renderLoader`.
 * Centers a LaikaSpinner with the supplied label below. When `label` is
 * an array (as in `Entries`' rotating messages), rotates through the
 * messages on a 5-second interval to match the default `<Loader>`'s
 * behavior.
 */

const Block = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 80px 16px;
  color: ${colors.controlLabel};
  font-size: 14px;
  text-align: center;
  min-height: 40vh;
`;

const Label = styled.span`
  font-weight: 500;
`;

function useRotatingLabel(label: React.ReactNode): React.ReactNode {
  const isArray = Array.isArray(label);
  const items = isArray ? (label as React.ReactNode[]) : null;
  const [index, setIndex] = React.useState(0);

  React.useEffect(() => {
    if (!items || items.length <= 1) return;
    const id = setInterval(() => {
      setIndex(prev => (prev + 1) % items.length);
    }, 5000);
    return () => clearInterval(id);
  }, [items]);

  if (items) {
    return items[index] ?? null;
  }
  return label;
}

function LaikaLoader({ label }: LoaderRenderProps) {
  const display = useRotatingLabel(label);
  return (
    <Block role="status" aria-live="polite">
      <LaikaSpinner size="lg" />
      {display ? <Label>{display}</Label> : null}
    </Block>
  );
}

export default LaikaLoader;
