import styled from '@emotion/styled';

import { colors, colorsRaw, transitions, text } from './styles';
import { laikaShouldForwardProp } from '@/ui/styled';

interface StateColors {
  background: string;
  text: string;
}

interface StateColorsMap {
  default: StateColors;
  active: StateColors;
  error: StateColors;
}

const stateColors: StateColorsMap = {
  default: {
    background: colors.textFieldBorder,
    text: colors.controlLabel,
  },
  active: {
    background: colors.active,
    text: colors.textLight,
  },
  error: {
    background: colors.errorText,
    text: colorsRaw.white,
  },
};

export interface FieldLabelStateProps {
  $isActive?: boolean;
  $hasErrors?: boolean;
}

function getStateColors({ $isActive, $hasErrors }: FieldLabelStateProps): StateColors {
  if ($hasErrors) return stateColors.error;
  if ($isActive) return stateColors.active;
  return stateColors.default;
}

const FieldLabel = styled('label', { shouldForwardProp: laikaShouldForwardProp })<FieldLabelStateProps>`
  ${text.fieldLabel};
  color: ${(props: FieldLabelStateProps) => getStateColors(props).text};
  background-color: ${(props: FieldLabelStateProps) => getStateColors(props).background};
  display: inline-block;
  border: 0;
  border-radius: 3px 3px 0 0;
  padding: 3px 6px 2px;
  margin: 0;
  transition: all ${transitions.main};
  position: relative;

  /**
   * Faux outside curve into top of input
   */
  &:before,
  &:after {
    content: '';
    display: block;
    position: absolute;
    top: 0;
    right: -4px;
    height: 100%;
    width: 4px;
    background-color: inherit;
  }

  &:after {
    border-bottom-left-radius: 3px;
    background-color: #fff;
  }
`;

export default FieldLabel;
