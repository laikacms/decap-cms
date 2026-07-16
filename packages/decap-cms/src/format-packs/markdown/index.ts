import {
  DefaultCodeBlockRenderer,
  DefaultHorizontalRuleRenderer,
  DefaultHtmlRenderer,
  DefaultImageRenderer,
  DefaultTableRenderer,
  markdownToPortableText,
  portableTextToMarkdown,
} from '@portabletext/markdown';

import { createKeyGenerator, resolveBlockCodecs } from '@/lib/richtext';

import type { BlockData, BlockFormatCodec, FormatPack, Mapper, PortableTextDocument } from '@/lib/richtext';
import type { PortableTextTypeRenderer } from '@portabletext/markdown';
import type { TypedObject } from '@portabletext/types';

/** Markdown syntax probes; each hit raises the detection score. */
const MARKDOWN_PROBES: readonly RegExp[] = [
  /^#{1,6}\s/m, // ATX heading
  /^\s*[-*+]\s/m, // bullet list
  /^\s*\d+\.\s/m, // ordered list
  /^>\s/m, // blockquote
  /```/, // fenced code
  /\*\*[^*\n]+\*\*/, // bold
  /\[[^\]\n]+\]\([^)\n]+\)/, // link
  /^\s*([-*_])\1{2,}\s*$/m, // thematic break
];

/**
 * Unambiguous MDX constructs. Markdown caps its own score when one matches so
 * a registered `mdx` mapper wins detection outright instead of tying.
 */
const MDX_NEGATIVE_PROBES: readonly RegExp[] = [
  /^import\s.+\sfrom\s/m, // ESM import
  /^export\s/m, // ESM export
  /<[A-Z][A-Za-z0-9]*[\s/>]/, // capitalized JSX component tag
];

/** A codec match located in the markdown source. */
interface LocatedBlockMatch {
  id: string;
  codec: BlockFormatCodec;
  match: RegExpMatchArray;
  start: number;
  end: number;
}

/**
 * Find every codec match in the source, line-boundary anchored, earliest
 * first (ties keep codec registration order); overlapping matches are
 * dropped in favor of the earliest.
 */
function findBlockMatches(
  source: string,
  codecs: Map<string, BlockFormatCodec>,
): LocatedBlockMatch[] {
  const all: LocatedBlockMatch[] = [];
  for (const [id, codec] of codecs) {
    // Normalize to global + multiline so `^`-anchored patterns match at any
    // line start and we can scan the whole source.
    let flags = codec.pattern.flags;
    if (!flags.includes('g')) flags += 'g';
    if (!flags.includes('m')) flags += 'm';
    const pattern = new RegExp(codec.pattern.source, flags);

    for (const match of source.matchAll(pattern)) {
      if (match[0] === '') continue;
      const start = match.index ?? 0;
      // Blocks begin at the start of the document or of a line.
      if (start > 0 && source[start - 1] !== '\n') continue;
      all.push({ id, codec, match, start, end: start + match[0].length });
    }
  }
  all.sort((a, b) => a.start - b.start);

  const accepted: LocatedBlockMatch[] = [];
  let cursor = 0;
  for (const candidate of all) {
    if (candidate.start < cursor) continue;
    accepted.push(candidate);
    cursor = candidate.end;
  }
  return accepted;
}

/**
 * Parse-side options. The `table` matcher opts into structured PT tables
 * (`{_type:'table', headerRows?, rows: [{cells: [{value: blocks}]}]}`, the
 * shape `DefaultTableRenderer` serializes); without it the library flattens
 * every table into bare paragraphs, which loses the table at persist.
 */
function parseOptions(keyGenerator: () => string) {
  return {
    keyGenerator,
    types: {
      table: ({ context, value }: { context: { keyGenerator(): string }, value: object }) => ({
        _type: 'table',
        _key: context.keyGenerator(),
        ...value,
      }),
    },
  };
}

/** Strip PT bookkeeping fields before handing a value to a codec. */
function stripPtMeta(value: Record<string, unknown>): BlockData {
  const { _type, _key, ...data } = value;
  void _type;
  void _key;
  return data;
}

/**
 * Build a Markdown mapper.
 *
 * `resolveCodecs` supplies the custom-block codecs (see
 * `resolveBlockCodecs('markdown')`); it is consulted lazily on every call so
 * blocks registered up-front are always honored without rebuilding the
 * mapper. With no codecs the mapper behaves exactly like the plain
 * `@portabletext/markdown` wrapper.
 *
 * Parsing runs a source pre-pass: codec patterns split the source into
 * markdown and block segments (`@portabletext/markdown` has no parse-side
 * extension point for custom types); block segments become
 * `{_type: id, _key, ...fromMatch(match)}` PT objects. Inline-block parsing
 * from markdown is not supported yet (serialization is).
 */
export function createMarkdownMapper(
  resolveCodecs: () => Map<string, BlockFormatCodec> = () => new Map(),
): Mapper {
  return {
    id: 'markdown',
    label: 'Markdown',

    toPortableText(value: string): PortableTextDocument {
      // Deterministic keys keep `markdown -> PT` stable across calls.
      const keyGenerator = createKeyGenerator('k');
      const codecs = resolveCodecs();
      const matches = codecs.size > 0 ? findBlockMatches(value, codecs) : [];

      if (matches.length === 0) {
        return markdownToPortableText(
          value,
          parseOptions(keyGenerator),
        ) as unknown as PortableTextDocument;
      }

      const doc: PortableTextDocument = [];
      const pushMarkdown = (segment: string): void => {
        if (segment.trim() === '') return;
        doc.push(
          ...(markdownToPortableText(
            segment,
            parseOptions(keyGenerator),
          ) as unknown as PortableTextDocument),
        );
      };

      let cursor = 0;
      for (const { id, codec, match, start, end } of matches) {
        pushMarkdown(value.slice(cursor, start));
        // `_type`/`_key` last so codec data can never clobber them.
        doc.push({ ...codec.fromMatch(match), _type: id, _key: keyGenerator() });
        cursor = end;
      }
      pushMarkdown(value.slice(cursor));

      return doc;
    },

    fromPortableText(doc: PortableTextDocument): string {
      // `markdownToPortableText` emits these custom block types, but the
      // serializer does not register renderers for them by default; without
      // this, each one degrades into a ```json fence of its raw node.
      const types: Record<string, PortableTextTypeRenderer> = {
        code: DefaultCodeBlockRenderer,
        html: DefaultHtmlRenderer,
        image: DefaultImageRenderer,
        'horizontal-rule': DefaultHorizontalRuleRenderer,
        table: DefaultTableRenderer,
      };
      for (const [id, codec] of resolveCodecs()) {
        types[id] = ({ value }) => codec.serialize(stripPtMeta(value as unknown as Record<string, unknown>));
      }

      return portableTextToMarkdown(doc as unknown as TypedObject[], {
        types,
        unknownType: ({ value }) => {
          const type = (value as { _type?: string })._type ?? '(unknown)';
          console.warn(
            `[richtext] no markdown codec for block "${type}"; serializing it as a JSON `
              + 'code fence. Register the block with a `formats.markdown` codec to control '
              + 'its markdown encoding.',
          );
          return '```json\n' + JSON.stringify(value, null, 2) + '\n```';
        },
      });
    },

    detect(value: string): number {
      if (value.trim() === '') return 0;
      let hits = 0;
      for (const probe of MARKDOWN_PROBES) {
        if (probe.test(value)) hits += 1;
      }
      // Plain prose is also valid Markdown, so never score it at zero.
      const score = hits === 0 ? 0.2 : Math.min(1, 0.4 + hits * 0.2);
      // Unambiguous MDX constructs: let a registered `mdx` mapper win outright.
      if (MDX_NEGATIVE_PROBES.some(probe => probe.test(value))) {
        return Math.min(score, 0.8);
      }
      return score;
    },
  };
}

/**
 * The Markdown mapper — the single Portable Text bridge that backs the decap
 * `richtext` widget. Wired to the block registry's `markdown` codecs.
 */
export const markdownMapper: Mapper = createMarkdownMapper(() => resolveBlockCodecs('markdown'));

/** The built-in markdown format pack. */
export const markdownFormat: FormatPack = {
  id: 'markdown',
  label: 'Markdown',
  mapper: ({ resolveCodecs }) => createMarkdownMapper(resolveCodecs),
};

export default markdownMapper;
