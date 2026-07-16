import styled from '@emotion/styled';
import React from 'react';

import Icon from './Icon';
import { colorsRaw } from './styles';

const GoBackButtonStyle = styled.a`
  display: flex;
  align-items: center;

  margin-top: 50px;
  padding: 10px;

  font-size: 14px;
`;

const ButtonText = styled.p`
  color: ${colorsRaw.gray};
  margin: 0 10px;
`;

export interface TranslateFunction {
  (key: string, options?: Record<string, unknown>): string;
}

export interface GoBackButtonProps {
  href: string;
  t: TranslateFunction;
}

export default function GoBackButton({ href, t }: GoBackButtonProps) {
  return (
    <GoBackButtonStyle href={href}>
      <Icon type="arrow" size="small" />
      <ButtonText>{t('ui.default.goBackToSite')}</ButtonText>
    </GoBackButtonStyle>
  );
}
