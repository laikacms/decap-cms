import type { EditorComponent, EditorComponentsRegistry, MdastNode } from '@/widgets/richtext/types';
import type { BlockTokenizer, Eat, Processor, UnistNode } from 'unified';

interface ShortcodePluginOptions {
  plugins: EditorComponentsRegistry;
}

interface ShortcodeMatch {
  plugin: EditorComponent;
  match: RegExpMatchArray;
}

/**
 * Find the first registered editor component whose pattern matches the start of
 * the block. Registration order is the resolution order.
 */
function findShortcodeMatch(
  plugins: EditorComponentsRegistry,
  value: string,
): ShortcodeMatch | undefined {
  const potentialMatchValue = value.split('\n\n')[0].trimEnd();

  for (const plugin of plugins.values()) {
    let pattern = plugin.pattern;

    // Plugin patterns must start with a caret (^) to match the beginning of the
    // block. If the pattern does not start with a caret, we add it to ensure
    // that remark consumes only the shortcode, without any leading text.
    if (!pattern.source.startsWith('^')) {
      pattern = new RegExp(`^${pattern.source}`, pattern.flags);
    }

    const match = value.match(pattern) ?? potentialMatchValue.match(pattern);

    if (match) {
      return { plugin, match };
    }
  }

  return undefined;
}

function createShortcodeTokenizer({ plugins }: ShortcodePluginOptions): BlockTokenizer {
  plugins.forEach(plugin => {
    if (plugin.pattern.flags.includes('m')) {
      console.warn(
        `Invalid RegExp: editor component '${plugin.id}' must not use the multiline flag in its pattern.`,
      );
    }
  });

  return function tokenizeShortcode(eat: Eat, value: string, silent?: boolean) {
    const found = findShortcodeMatch(plugins, value);

    if (!found) return;

    const { plugin, match } = found;

    if (match.index !== undefined && match.index > 0) {
      console.warn(
        `Invalid RegExp: editor component '${plugin.id}' must match from the beginning of the block.`,
      );
    }

    if (silent) {
      return true;
    }

    const shortcodeData = plugin.fromBlock(match);

    try {
      const node: MdastNode = {
        type: 'shortcode',
        data: { shortcode: plugin.id, shortcodeData },
      };
      return eat(match[0])(node);
    } catch {
      console.warn(
        `Sent invalid data to remark. Plugin: ${plugin.id}. Value: ${match[0]}. Data: ${JSON.stringify(shortcodeData)}`,
      );
      return false;
    }
  };
}

export function remarkParseShortcodes(this: Processor, options: ShortcodePluginOptions) {
  const Parser = this.Parser;
  if (!Parser) return;

  Parser.prototype.blockTokenizers.shortcode = createShortcodeTokenizer(options);
  Parser.prototype.blockMethods.unshift('shortcode');
}

export function createRemarkShortcodeStringifier({ plugins }: ShortcodePluginOptions) {
  return function remarkStringifyShortcodes(this: Processor) {
    const Compiler = this.Compiler;
    if (!Compiler) return;

    Compiler.prototype.visitors.shortcode = function shortcode(node: UnistNode) {
      const data = node.data;
      const id = data && typeof data.shortcode === 'string' ? data.shortcode : undefined;
      const plugin = id === undefined ? undefined : plugins.get(id);

      if (!plugin) return '';

      const shortcodeData = data?.shortcodeData;
      return plugin.toBlock(isShortcodeData(shortcodeData) ? shortcodeData : {});
    };
  };
}

function isShortcodeData(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
