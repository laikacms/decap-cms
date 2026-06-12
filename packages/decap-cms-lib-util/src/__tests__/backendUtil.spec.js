import { oneLine } from 'common-tags';
import nock from 'nock';

import {
  parseLinkHeader,
  getAllResponses,
  getPathDepth,
  filterByExtension,
  responseParser,
  parseResponse,
} from '../backendUtil';

function makeResponse({ ok, status, body, contentType = 'application/json' } = {}) {
  return {
    ok,
    status,
    headers: {
      get: key => (key === 'Content-Type' ? contentType : null),
    },
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(String(body)),
    blob: () => Promise.resolve(new Blob([String(body)])),
  };
}

describe('parseResponse', () => {
  it('throws APIError for an unknown format', async () => {
    const res = makeResponse({ ok: true, status: 200, body: 'hello', contentType: 'text/plain' });
    await expect(parseResponse(res, { format: 'unknown' })).rejects.toMatchObject({
      message: expect.stringContaining('unknown is not a supported response format'),
    });
  });

  it('returns text body for ok response with format text', async () => {
    const res = makeResponse({ ok: true, status: 200, body: 'hello world', contentType: 'text/plain' });
    const result = await parseResponse(res, { format: 'text' });
    expect(result).toBe('hello world');
  });

  it('returns parsed JSON object for ok response with format json', async () => {
    const res = makeResponse({ ok: true, status: 200, body: { foo: 'bar' } });
    const result = await parseResponse(res, { format: 'json' });
    expect(result).toEqual({ foo: 'bar' });
  });

  it('throws APIError with body message for non-ok response when expectingOk is true and JSON body has message', async () => {
    const res = makeResponse({ ok: false, status: 422, body: { message: 'Validation failed' } });
    await expect(parseResponse(res, { format: 'json', expectingOk: true, apiName: 'TestAPI' })).rejects.toMatchObject({
      message: expect.stringContaining('Validation failed'),
      status: 422,
      api: 'TestAPI',
    });
  });

  it('returns body without throwing for non-ok response when expectingOk is false', async () => {
    const res = makeResponse({ ok: false, status: 404, body: 'Not Found', contentType: 'text/plain' });
    const result = await parseResponse(res, { format: 'text', expectingOk: false });
    expect(result).toBe('Not Found');
  });
});

describe('responseParser', () => {
  it('returns a function', () => {
    const parser = responseParser({ format: 'json', apiName: 'Test' });
    expect(typeof parser).toBe('function');
  });

  it('resolves to parsed JSON for an ok response', async () => {
    const parser = responseParser({ format: 'json', apiName: 'Test' });
    const res = makeResponse({ ok: true, status: 200, body: { id: 1 } });
    const result = await parser(res);
    expect(result).toEqual({ id: 1 });
  });

  it('rejects with an APIError containing apiName on a non-ok response', async () => {
    const parser = responseParser({ format: 'text', apiName: 'TestAPI' });
    const res = makeResponse({
      ok: false,
      status: 404,
      body: 'Not Found',
      contentType: 'text/plain',
    });
    await expect(parser(res)).rejects.toMatchObject({
      status: 404,
      api: 'TestAPI',
    });
  });

  it('resolves instead of rejecting when expectingOk is false on a non-ok response', async () => {
    const parser = responseParser({ format: 'text', apiName: 'Test', expectingOk: false });
    const res = makeResponse({
      ok: false,
      status: 404,
      body: 'Not Found',
      contentType: 'text/plain',
    });
    const result = await parser(res);
    expect(result).toBe('Not Found');
  });
});

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
});

describe('getAllResponses', () => {
  function generatePulls(length) {
    return Array.from({ length }, (_, id) => {
      return { id: id + 1, number: `134${id}`, state: 'open' };
    });
  }

  function createLinkHeaders({ page, pageCount }) {
    const pageNum = parseInt(page, 10);
    const pageCountNum = parseInt(pageCount, 10);
    const url = 'https://api.github.com/pulls';

    function link(linkPage) {
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

  function interceptCall({ perPage = 30, repeat = 1, data = [] } = {}) {
    nock('https://api.github.com')
      .get('/pulls')
      .query(true)
      .times(repeat)
      .reply(uri => {
        const searchParams = new URLSearchParams(uri.split('?')[1]);
        const page = searchParams.get('page') || 1;
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
