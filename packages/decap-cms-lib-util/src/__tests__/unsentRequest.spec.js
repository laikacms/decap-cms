import unsentRequest from '../unsentRequest';

describe('unsentRequest', () => {
  describe('withHeaders', () => {
    it('should create new request with headers', () => {
      const req = unsentRequest.withHeaders({ Authorization: 'token' })('path');
      expect(req).toMatchObject({
        url: 'path',
        headers: { Authorization: 'token' },
      });
    });

    it('should add headers to existing request', () => {
      const req = unsentRequest.withHeaders({ Authorization: 'token' }, 'path');
      expect(req).toMatchObject({
        url: 'path',
        headers: { Authorization: 'token' },
      });
    });
  });

  describe('fromURL', () => {
    it('should parse a plain URL with no query params', () => {
      const req = unsentRequest.fromURL('https://api.example.com/repos');
      expect(req.url).toBe('https://api.example.com/repos');
      expect(req.params).toBeUndefined();
    });

    it('should parse query params into a plain object', () => {
      const req = unsentRequest.fromURL('https://api.example.com/repos?owner=alice&page=2');
      expect(req.url).toBe('https://api.example.com/repos');
      expect(req.params.owner).toBe('alice');
      expect(req.params.page).toBe('2');
    });

    it('should decode percent-encoded query param values', () => {
      const req = unsentRequest.fromURL('https://api.example.com/search?q=hello%20world');
      expect(req.params.q).toBe('hello world');
    });
  });

  describe('toURL', () => {
    it('should return just the URL when no params are set', () => {
      const req = unsentRequest.fromURL('https://api.example.com/repos');
      expect(unsentRequest.toURL(req)).toBe('https://api.example.com/repos');
    });

    it('should append encoded query params', () => {
      const req = unsentRequest.fromURL('https://api.example.com/repos?owner=alice&page=2');
      const url = unsentRequest.toURL(req);
      expect(url).toContain('owner=alice');
      expect(url).toContain('page=2');
      expect(url.startsWith('https://api.example.com/repos?')).toBe(true);
    });

    it('should round-trip with fromURL', () => {
      const original = 'https://api.example.com/search?q=hello%20world';
      const roundTripped = unsentRequest.toURL(unsentRequest.fromURL(original));
      expect(decodeURIComponent(roundTripped)).toBe(decodeURIComponent(original));
    });
  });

  describe('withMethod', () => {
    it('should set the method (curried)', () => {
      const req = unsentRequest.withMethod('POST')('https://api.example.com/repos');
      expect(req.method).toBe('POST');
      expect(req.url).toBe('https://api.example.com/repos');
    });

    it('should set the method (two-arg)', () => {
      const req = unsentRequest.withMethod('PUT', 'https://api.example.com/repos');
      expect(req.method).toBe('PUT');
    });

    it('should override an existing method', () => {
      const base = unsentRequest.withMethod('GET')('https://api.example.com/repos');
      const updated = unsentRequest.withMethod('DELETE')(base);
      expect(updated.method).toBe('DELETE');
    });
  });

  describe('withBody', () => {
    it('should set the body (curried)', () => {
      const req = unsentRequest.withBody('{"key":"value"}')('https://api.example.com/repos');
      expect(req.body).toBe('{"key":"value"}');
    });

    it('should set the body (two-arg)', () => {
      const req = unsentRequest.withBody('payload', 'https://api.example.com/repos');
      expect(req.body).toBe('payload');
    });
  });

  describe('withParams', () => {
    it('should add query params to a request with no existing params', () => {
      const req = unsentRequest.withParams({ per_page: '10' }, 'https://api.example.com/repos');
      expect(req.params.per_page).toBe('10');
    });

    it('should merge query params with existing params', () => {
      const base = unsentRequest.fromURL('https://api.example.com/repos?owner=alice');
      const req = unsentRequest.withParams({ page: '2' }, base);
      expect(req.params.owner).toBe('alice');
      expect(req.params.page).toBe('2');
    });

    it('should override existing params with the same key', () => {
      const base = unsentRequest.fromURL('https://api.example.com/repos?page=1');
      const req = unsentRequest.withParams({ page: '3' }, base);
      expect(req.params.page).toBe('3');
    });
  });

  describe('withRoot', () => {
    it('should prepend root to a relative URL', () => {
      const req = unsentRequest.withRoot('https://api.example.com', 'repos');
      expect(req.url).toBe('https://api.example.com/repos');
    });

    it('should not add double slashes at the join point', () => {
      const req = unsentRequest.withRoot('https://api.example.com', 'repos/list');
      expect(req.url).toBe('https://api.example.com/repos/list');
    });

    it('should not modify an already-absolute URL', () => {
      const req = unsentRequest.withRoot(
        'https://proxy.example.com',
        'https://api.example.com/repos',
      );
      expect(req.url).toBe('https://api.example.com/repos');
    });

    it('should handle a leading slash on the path', () => {
      const req = unsentRequest.withRoot('https://api.example.com', '/repos');
      expect(req.url).toBe('https://api.example.com/repos');
    });
  });

  describe('withNoCache', () => {
    it('should set cache to no-cache on a new request', () => {
      const req = unsentRequest.withNoCache('https://api.example.com/repos');
      expect(req.cache).toBe('no-cache');
    });

    it('should set cache to no-cache on an existing request', () => {
      const base = unsentRequest.fromURL('https://api.example.com/repos');
      const req = unsentRequest.withNoCache(base);
      expect(req.cache).toBe('no-cache');
    });
  });
});
