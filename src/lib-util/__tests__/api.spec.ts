import { describe, expect, it } from 'vitest';

import * as api from '../API.js';
import { PreviewState } from '../API.js';

describe('Api', () => {
  describe('getPreviewStatus', () => {
    it('should return preview status on matching context', () => {
      const status = {
        context: 'deploy',
        target_url: 'https://example.com',
        state: PreviewState.Success,
      };
      expect(api.getPreviewStatus([status], '')).toEqual(status);
    });

    it('should return undefined on non-matching context', () => {
      const status = {
        context: 'other',
        target_url: 'https://example.com',
        state: PreviewState.Other,
      };
      expect(api.getPreviewStatus([status], '')).toBeUndefined();
    });
  });
});
