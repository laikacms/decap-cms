import { fromJS } from 'immutable';

import { isVisible } from '../widgets';

describe('lib/widgets', () => {
  describe('isVisible', () => {
    it('returns false for a hidden widget field (DCMS-301)', () => {
      expect(isVisible(fromJS({ name: 'secret', widget: 'hidden' }))).toBe(false);
    });

    it('returns true for any non-hidden widget field', () => {
      expect(isVisible(fromJS({ name: 'title', widget: 'string' }))).toBe(true);
      expect(isVisible(fromJS({ name: 'body', widget: 'markdown' }))).toBe(true);
    });
  });
});
