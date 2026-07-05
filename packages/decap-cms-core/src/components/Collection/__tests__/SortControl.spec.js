import { SortDirection } from '../../../types/redux';
import { nextSortDirection, sortIconProps } from '../SortControl';

describe('nextSortDirection', () => {
  it('cycles Ascending to Descending', () => {
    expect(nextSortDirection(SortDirection.Ascending)).toBe(SortDirection.Descending);
  });

  it('cycles Descending to None', () => {
    expect(nextSortDirection(SortDirection.Descending)).toBe(SortDirection.None);
  });

  it('cycles None to Ascending', () => {
    expect(nextSortDirection(SortDirection.None)).toBe(SortDirection.Ascending);
  });

  it('defaults undefined to Ascending', () => {
    expect(nextSortDirection(undefined)).toBe(SortDirection.Ascending);
  });
});

describe('sortIconProps', () => {
  it('returns an up chevron for Ascending', () => {
    expect(sortIconProps(SortDirection.Ascending)).toEqual({
      icon: 'chevron',
      iconDirection: 'up',
      iconSmall: true,
    });
  });

  it('returns a down chevron for Descending', () => {
    expect(sortIconProps(SortDirection.Descending)).toEqual({
      icon: 'chevron',
      iconDirection: 'down',
      iconSmall: true,
    });
  });

  it('returns undefined iconDirection for None', () => {
    expect(sortIconProps(SortDirection.None)).toEqual({
      icon: 'chevron',
      iconDirection: undefined,
      iconSmall: true,
    });
  });
});
