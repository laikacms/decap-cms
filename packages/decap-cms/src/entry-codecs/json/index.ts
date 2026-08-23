import type { CmsEntryCodec, CmsFormatterFunctions, CmsFrontmatterCodec } from '@/lib/util/index';

/**
 * `decap-cms/entry-codecs/json` — the JSON entry codec
 * (`format: json`, `.json` files). This is the identity codec for
 * laika-backend apps (entries are already objects) and typically the only
 * one a laika `/bare` setup registers. Register with
 * `CMS.registerEntryCodec(jsonEntryCodec)`; the fat `/app` and `/laika-app`
 * entries do so out of the box. To use JSON as a frontmatter language, pass
 * `jsonFrontmatterCodec` to `createMarkdownEntryCodec`.
 */

export const jsonFormatter: CmsFormatterFunctions = {
  fromFile(content: string) {
    return JSON.parse(content);
  },

  toFile(data: object) {
    return JSON.stringify(data, null, 2);
  },
};

export const jsonEntryCodec: CmsEntryCodec = {
  name: 'json',
  fileExtensions: ['json'],
  defaultExtension: 'json',
  formatter: jsonFormatter,
};

/**
 * JSON as a frontmatter language for `createMarkdownEntryCodec`. JSON is the
 * odd one out: its braces double as the fences (`{`/`}`), so the metadata
 * block between them is brace-less and parse/stringify must re-add and trim
 * them around the plain JSON formatter.
 */
export const jsonFrontmatterCodec: CmsFrontmatterCodec = {
  codec: jsonEntryCodec,
  delimiters: ['{', '}'],
  parse: input => {
    let JSONinput = input.trim();
    // Fix JSON if leading and trailing brackets were trimmed.
    if (JSONinput.slice(0, 1) !== '{') {
      JSONinput = '{' + JSONinput + '}';
    }
    return jsonFormatter.fromFile(JSONinput);
  },
  stringify: metadata => {
    let JSONoutput = jsonFormatter.toFile(metadata).trim();
    // Trim leading and trailing brackets.
    if (JSONoutput.slice(0, 1) === '{' && JSONoutput.slice(-1) === '}') {
      JSONoutput = JSONoutput.slice(1, -1);
    }
    // Strip the leading newline + indent left over from the outer brace, and
    // any trailing newline + indent. This matches the layout the tests expect
    // when the JSON body is wrapped back inside frontmatter delimiters.
    JSONoutput = JSONoutput.replace(/^\s*\n[ \t]*/, '').replace(/\n[ \t]*$/, '');
    return JSONoutput;
  },
};

export default jsonEntryCodec;
