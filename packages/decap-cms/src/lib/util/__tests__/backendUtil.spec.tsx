import nock from 'nock';
import { describe, expect, it } from 'vitest';

import {
  filterByExtension,
  getAllResponses,
  getPathDepth,
  parseLinkHeader,
  parseResponse,
} from '@/lib/util/backendUtil';
import { oneLine } from '@/lib/util/core-utils/template-literal';
import { APIError } from '@/lib/util/errors/APIError';

describe('parseLinkHeader', () => {
  it('should return the right rel urls', () => {
    const url = 'https://api.github.com/resource';
    const link = oneLine`
      <${url}?page=1>; rel="first",
      <${url}?page=2>; rel="prev",
      <${url}?page=4>; rel="next",
      <${url}?page=5>; rel="last"
    `;
    const linkHeader = parseLinkHeader(link);

    expect(linkHeader.next).toBe(`${url}?page=4`);
    expect(linkHeader.last).toBe(`${url}?page=5`);
    expect(linkHeader.first).toBe(`${url}?page=1`);
    expect(linkHeader.prev).toBe(`${url}?page=2`);
  });

  it('should return an empty object for a null header', () => {
    expect(parseLinkHeader(null)).toEqual({});
  });

  it('should return an empty object for an empty header', () => {
    expect(parseLinkHeader('')).toEqual({});
  });

  it('should unescape + to %20 in urls', () => {
    const link = '<https://api.github.com/resource?q=foo+bar>; rel="next"';
    expect(parseLinkHeader(link)).toEqual({ next: 'https://api.github.com/resource?q=foo%20bar' });
  });

  it('should parse a single-link header', () => {
    const link = '<https://api.github.com/resource?page=2>; rel="next"';
    expect(parseLinkHeader(link)).toEqual({ next: 'https://api.github.com/resource?page=2' });
  });

  it('should throw for a malformed header missing rel', () => {
    const link = '<https://api.github.com/resource?page=2>';
    expect(() => parseLinkHeader(link)).toThrow();
  });

  it('should throw for a malformed header missing the url', () => {
    const link = 'no-angle-brackets-here; rel="next"';
    expect(() => parseLinkHeader(link)).toThrow();
  });
});

describe('getAllResponses', () => {
  function generatePulls(length: number) {
    return Array.from({ length }, (_, id) => {
      return { id: id + 1, number: `134${id}`, state: 'open' };
    });
  }

  function createLinkHeaders({ page, pageCount }: { page: number | string, pageCount: number }) {
    const pageNum = parseInt(String(page), 10);
    const pageCountNum = pageCount;
    const url = 'https://api.github.com/pulls';

    function link(linkPage: number) {
      return `<${url}?page=${linkPage}>`;
    }

    const linkHeader = oneLine`
      ${pageNum === 1 ? '' : `${link(1)}; rel="first",`}
      ${pageNum === pageCountNum ? '' : `${link(pageCount)}; rel="last",`}
      ${pageNum === 1 ? '' : `${link(pageNum - 1)}; rel="prev",`}
      ${pageNum === pageCountNum ? '' : `${link(pageNum + 1)}; rel="next",`}
    `.slice(0, -1);

    return { Link: linkHeader };
  }

  function interceptCall({
    perPage = 30,
    repeat = 1,
    data = [] as ReturnType<typeof generatePulls>,
  } = {}) {
    nock('https://api.github.com')
      .get('/pulls')
      .query(true)
      .times(repeat)
      .reply(uri => {
        const searchParams = new URLSearchParams(uri.split('?')[1]);
        const page = Number(searchParams.get('page') || 1);
        const pageCount = data.length <= perPage ? 1 : Math.ceil(data.length / perPage);
        const pageLastIndex = page * perPage;
        const pageFirstIndex = pageLastIndex - perPage;
        const resp = data.slice(pageFirstIndex, pageLastIndex);
        return [200, resp, createLinkHeaders({ page, pageCount })];
      });
  }

  it('should return all paged response', async () => {
    interceptCall({ repeat: 3, data: generatePulls(70) });
    const res = await getAllResponses('https://api.github.com/pulls', {}, 'next', url => url);
    const pages = await Promise.all(res.map(res => res.json()));

    expect(pages[0]).toHaveLength(30);
    expect(pages[1]).toHaveLength(30);
    expect(pages[2]).toHaveLength(10);
  });
});

describe('getPathDepth', () => {
  it('should return 1 for empty string', () => {
    expect(getPathDepth('')).toBe(1);
  });

  it('should return 2 for path of one nested folder', () => {
    expect(getPathDepth('{{year}}/{{slug}}')).toBe(2);
  });
});

describe('filterByExtension', () => {
  it('should return true when extension matches', () => {
    expect(filterByExtension({ path: 'file.html.md' }, '.html.md')).toBe(true);
    expect(filterByExtension({ path: 'file.html.md' }, 'html.md')).toBe(true);
  });

  it("should return false when extension doesn't match", () => {
    expect(filterByExtension({ path: 'file.json' }, '.html.md')).toBe(false);
    expect(filterByExtension({ path: 'file.json' }, 'html.md')).toBe(false);
  });
});

describe('parseResponse', () => {
  it('should parse a successful json response', async () => {
    const res = new Response(JSON.stringify({ foo: 'bar' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

    await expect(parseResponse(res, { format: 'json' })).resolves.toEqual({ foo: 'bar' });
  });

  it('should parse a successful text response', async () => {
    const res = new Response('hello world', { status: 200 });

    await expect(parseResponse(res, { format: 'text' })).resolves.toBe('hello world');
  });

  it('should parse a successful blob response', async () => {
    const res = new Response('hello world', { status: 200 });

    const body = await parseResponse(res, { format: 'blob' });
    expect(typeof (body as Blob).text).toBe('function');
    await expect((body as Blob).text()).resolves.toBe('hello world');
  });

  it('should default to text format when none is specified', async () => {
    const res = new Response('plain text body', { status: 200 });

    await expect(parseResponse(res, {})).resolves.toBe('plain text body');
  });

  it('should throw an APIError when the format is unsupported', async () => {
    const res = new Response('body', { status: 200 });

    await expect(
      parseResponse(res, { format: 'xml' as unknown as 'text' }),
    ).rejects.toThrow(APIError);
  });

  it('should wrap a formatter error (invalid json Content-Type) into an APIError', async () => {
    const res = new Response('not json', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });

    await expect(parseResponse(res, { format: 'json', apiName: 'github' })).rejects.toMatchObject({
      name: 'API_ERROR',
      api: 'github',
      message: 'text/plain is not a valid JSON Content-Type',
    });
  });

  it('should extract the error message from a json error body when expectingOk is true', async () => {
    const res = new Response(JSON.stringify({ message: 'Not Found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });

    await expect(parseResponse(res, { format: 'json', apiName: 'github' })).rejects.toMatchObject({
      message: 'Not Found',
      status: 404,
      api: 'github',
    });
  });

  it('should fall back to msg or nested error.message for a json error body', async () => {
    const res = new Response(JSON.stringify({ msg: 'bad request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });

    await expect(parseResponse(res, { format: 'json' })).rejects.toMatchObject({
      message: 'bad request',
      status: 400,
    });

    const nestedRes = new Response(JSON.stringify({ error: { message: 'nested error' } }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });

    await expect(parseResponse(nestedRes, { format: 'json' })).rejects.toMatchObject({
      message: 'nested error',
      status: 400,
    });
  });

  it('should use the raw body as the error message for non-json error responses', async () => {
    const res = new Response('server exploded', { status: 500 });

    await expect(parseResponse(res, { format: 'text', apiName: 'gitlab' })).rejects.toMatchObject({
      message: 'server exploded',
      status: 500,
      api: 'gitlab',
    });
  });

  it('should not throw for a non-ok response when expectingOk is false', async () => {
    const res = new Response(JSON.stringify({ message: 'ignored' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });

    await expect(
      parseResponse(res, { format: 'json', expectingOk: false }),
    ).resolves.toEqual({ message: 'ignored' });
  });
});
