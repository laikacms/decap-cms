import component from '../index';

function getAsset(path) {
  return path;
}

const image = '/image';
const alt = 'alt';
const title = 'title';

describe('editor component image', () => {
  it('should generate empty markdown image from empty object', () => {
    expect(component.toBlock({})).toEqual(`![]()`);
  });

  it('should generate valid markdown from path', () => {
    expect(component.toBlock({ image })).toEqual(`![](/image)`);
  });

  it('should generate valid markdown from path and alt text', () => {
    expect(component.toBlock({ image, alt })).toEqual(`![alt](/image)`);
  });

  it('should generate valid markdown from path and title', () => {
    expect(component.toBlock({ image, title })).toEqual(`![](/image "title")`);
  });

  it('should generate valid markdown from path, alt text, and title ', () => {
    expect(component.toBlock({ image, alt, title })).toEqual(`![alt](/image "title")`);
  });

  it('should escape quotes in title', () => {
    expect(component.toBlock({ image, alt, title: `"ti"tle"` })).toEqual(
      `![alt](/image "\\"ti\\"tle\\"")`,
    );
  });

  it('should generate valid react props', () => {
    expect(component.toPreview({ image, alt, title }, getAsset)).toMatchObject({
      props: { src: image, alt, title },
    });
  });

  it('should match markdown with no properties defined', () => {
    expect(`![]()`).toMatch(component.pattern);
  });

  it('should match markdown with path', () => {
    expect(`![](/image)`).toMatch(component.pattern);
  });

  it('should match markdown with path and alt text', () => {
    expect(`![alt](/image)`).toMatch(component.pattern);
  });

  it('should match markdown with path and title', () => {
    expect(`![](/image "title")`).toMatch(component.pattern);
  });

  it('should match markdown with path, alt text, and title', () => {
    expect(`![alt](/image "title")`).toMatch(component.pattern);
  });

  it('should match markdown with path, alt text, and title', () => {
    expect(`![alt](/image "title")`).toMatch(component.pattern);
  });

  it('should match markdown with arbitrary amount of whitespace', () => {
    expect(`![alt](/image    "title")`).toMatch(component.pattern);
  });

  it('should match markdown with quoted title', () => {
    expect(`![alt](/image "\\"ti\\"tle\\"")`).toMatch(component.pattern);
  });

  it('should parse a matching string into an object via fromBlock', () => {
    const match = component.pattern.exec(`![alt](/image "title")`);
    expect(component.fromBlock(match)).toEqual({
      image: '/image',
      alt: 'alt',
      title: 'title',
    });
  });

  it('should parse a matching string with no alt or title via fromBlock', () => {
    const match = component.pattern.exec(`![](/image)`);
    expect(component.fromBlock(match)).toEqual({
      image: '/image',
      alt: '',
      title: undefined,
    });
  });

  it('should return a falsy value from fromBlock when there is no match', () => {
    const match = component.pattern.exec('not a markdown image');
    expect(match).toBeNull();
    expect(component.fromBlock(match)).toBeFalsy();
  });

  it('should round-trip toBlock(fromBlock(match)) for path, alt, and title', () => {
    const markdown = `![alt](/image "title")`;
    const match = component.pattern.exec(markdown);
    expect(component.toBlock(component.fromBlock(match))).toEqual(markdown);
  });

  it('should round-trip toBlock(fromBlock(match)) for path only', () => {
    const markdown = `![](/image)`;
    const match = component.pattern.exec(markdown);
    expect(component.toBlock(component.fromBlock(match))).toEqual(markdown);
  });

  it('should round-trip toBlock(fromBlock(match)) for a quoted title', () => {
    const markdown = `![alt](/image "\\"ti\\"tle\\"")`;
    const match = component.pattern.exec(markdown);
    expect(component.toBlock(component.fromBlock(match))).toEqual(markdown);
  });
});
