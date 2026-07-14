import { describe, expect, it } from 'vitest';
import nock from 'nock';

import { parseLinkHeader, getAllResponses, getPathDepth, filterByExtension } from '@/lib/util/backendUtil';

function oneLine(strings: TemplateStringsArray, ...values: unknown[]): string {
  return strings
    .reduce(
      (result, str, i) => result + str + (values[i] !== undefined ? String(values[i]) : ''),
      '',
    )
    .replace(/\s+/g, ' ')
    .trim();
}

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
  function generatePulls(length: number) {
    return Array.from({ length }, (_, id) => {
      return { id: id + 1, number: `134${id}`, state: 'open' };
    });
  }

  function createLinkHeaders({ page, pageCount }: { page: number | string; pageCount: number }) {
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
