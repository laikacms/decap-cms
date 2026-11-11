import { describe, expect, it } from 'vitest';

import unsentRequest from '@/lib/util/unsentRequest.js';

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

  describe('fromURL', () => {
    it('should read + in the query string as a space', () => {
      const req = unsentRequest.fromURL(
        'https://api.bitbucket.org/2.0/pullrequests?pagelen=50&q=state+%3D+%22OPEN%22&page=2',
      );

      expect(req.params?.q).toBe('state = "OPEN"');
      expect(unsentRequest.toURL(req)).toBe(
        'https://api.bitbucket.org/2.0/pullrequests?pagelen=50&q=state%20%3D%20%22OPEN%22&page=2',
      );
    });

    it('should keep an encoded plus as a plus', () => {
      const req = unsentRequest.fromURL('https://example.com/search?q=1%2B1');

      expect(req.params?.q).toBe('1+1');
      expect(unsentRequest.toURL(req)).toBe('https://example.com/search?q=1%2B1');
    });
  });
});
