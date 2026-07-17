import { describe, expect, it } from 'vitest';

import { matchExtraRoute, matchExtraRoutePattern } from '@/core/routing/extraRoutes';

describe('matchExtraRoutePattern', () => {
  it('matches a literal pattern exactly, capturing nothing', () => {
    expect(matchExtraRoutePattern('/shop/orders', '/shop/orders')).toEqual({});
  });

  it('rejects a literal pattern on any other path', () => {
    expect(matchExtraRoutePattern('/shop/orders', '/shop/orders/123')).toBeNull();
    expect(matchExtraRoutePattern('/shop/orders', '/shop')).toBeNull();
    expect(matchExtraRoutePattern('/shop/orders', '/shop/orders/')).toBeNull();
  });

  it('captures a :param segment, percent-decoded', () => {
    expect(matchExtraRoutePattern('/shop/orders/:id', '/shop/orders/01ABC')).toEqual({
      id: '01ABC',
    });
    expect(matchExtraRoutePattern('/shop/products/:id/edit', '/shop/products/a%2Fb/edit')).toEqual(
      { id: 'a/b' },
    );
  });

  it('rejects an empty :param segment', () => {
    expect(matchExtraRoutePattern('/shop/orders/:id', '/shop/orders/')).toBeNull();
  });

  it('rejects when literal segments differ around a capture', () => {
    expect(matchExtraRoutePattern('/shop/orders/:id', '/shop/mail/123')).toBeNull();
    expect(matchExtraRoutePattern('/shop/products/:id/edit', '/shop/products/123/copy')).toBeNull();
  });

  it('rejects extra trailing segments after the pattern is consumed', () => {
    expect(matchExtraRoutePattern('/shop/orders/:id', '/shop/orders/123/lines')).toBeNull();
  });

  it('fails the match (instead of throwing) on a malformed escape', () => {
    expect(matchExtraRoutePattern('/shop/orders/:id', '/shop/orders/%ZZ')).toBeNull();
  });

  it('captures the remainder under * for a trailing splat', () => {
    expect(matchExtraRoutePattern('/docs/*', '/docs/guides/setup')).toEqual({
      '*': 'guides/setup',
    });
    expect(matchExtraRoutePattern('/docs/*', '/docs/one')).toEqual({ '*': 'one' });
  });

  it('rejects a splat with nothing left to capture', () => {
    expect(matchExtraRoutePattern('/docs/*', '/docs')).toBeNull();
    expect(matchExtraRoutePattern('/docs/*', '/docs/')).toBeNull();
  });

  it('keeps the historical exact-match fast-path for odd literal patterns', () => {
    expect(matchExtraRoutePattern('/docs/:colon', '/docs/:colon')).toEqual({});
  });
});

describe('matchExtraRoute', () => {
  const routes = [
    { path: '/shop/orders', element: 'list' },
    { path: '/shop/orders/new', element: 'new' },
    { path: '/shop/orders/:id', element: 'detail' },
  ];

  it('returns the first matching route in declaration order', () => {
    expect(matchExtraRoute(routes, '/shop/orders/new')?.route.element).toBe('new');
    const detail = matchExtraRoute(routes, '/shop/orders/01ABC');
    expect(detail?.route.element).toBe('detail');
    expect(detail?.params).toEqual({ id: '01ABC' });
  });

  it('returns null when nothing matches or routes are absent', () => {
    expect(matchExtraRoute(routes, '/elsewhere')).toBeNull();
    expect(matchExtraRoute(undefined, '/shop/orders')).toBeNull();
  });
});
