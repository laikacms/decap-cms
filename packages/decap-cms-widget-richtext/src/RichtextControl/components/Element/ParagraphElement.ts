// @ts-nocheck -- ported from upstream JS; strict typing is follow-up work
import styled from '@emotion/styled';
import { PlateElement } from 'platejs/react';

const bottomMargin = '16px';

const ParagraphElement = styled(PlateElement)`
  margin-bottom: ${bottomMargin};
`;

export default ParagraphElement;