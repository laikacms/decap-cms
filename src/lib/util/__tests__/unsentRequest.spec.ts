import { describe, expect, it } from 'vitest';

import unsentRequest from '../unsentRequest.js';

describe('unsentRequest', () => {
  describe('withHeaders', () => {
    it('should create new request with headers', () => {
      expect(unsentRequest.withHeaders({ Authorization: 'token' })('path')).toEqual({
        url: 'path',
        headers: { Authorization: 'token' },
      });
    });

    it('should add headers to existing request', () => {
      expect(unsentRequest.withHeaders({ Authorization: 'token' }, 'path')).toEqual({
        url: 'path',
        headers: { Authorization: 'token' },
      });
    });
  });
});
