import { getStateColors } from '../FieldLabel';
import { colors, colorsRaw } from '../styles';

describe('getStateColors', () => {
  it('returns the error color set when hasErrors is true, regardless of isActive', () => {
    expect(getStateColors({ hasErrors: true })).toEqual({
      background: colors.errorText,
      text: colorsRaw.white,
    });

    expect(getStateColors({ hasErrors: true, isActive: true })).toEqual({
      background: colors.errorText,
      text: colorsRaw.white,
    });

    expect(getStateColors({ hasErrors: true, isActive: false })).toEqual({
      background: colors.errorText,
      text: colorsRaw.white,
    });
  });

  it('returns the active color set when isActive is true and hasErrors is false', () => {
    expect(getStateColors({ isActive: true, hasErrors: false })).toEqual({
      background: colors.active,
      text: colors.textLight,
    });
  });

  it('returns the default color set when neither isActive nor hasErrors is true', () => {
    expect(getStateColors({})).toEqual({
      background: colors.textFieldBorder,
      text: colors.controlLabel,
    });

    expect(getStateColors({ isActive: false, hasErrors: false })).toEqual({
      background: colors.textFieldBorder,
      text: colors.controlLabel,
    });
  });
});
