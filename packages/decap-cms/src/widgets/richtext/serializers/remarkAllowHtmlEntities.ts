import type { Eat, InlineTokenizer, ParserInstance, Processor } from 'unified';

/**
 * This is a port of the `remark-parse` text tokenizer, adapted to exclude
 * HTML entity decoding.
 */
const text: InlineTokenizer = function tokenizeText(
  this: ParserInstance,
  eat: Eat,
  value: string,
  silent?: boolean,
) {
  /* istanbul ignore if - never used (yet) */
  if (silent) {
    return true;
  }

  const methods = this.inlineMethods;
  const tokenizers = this.inlineTokenizers;
  let min = value.length;
  let index = -1;

  while (++index < methods.length) {
    const name = methods[index];

    if (name === 'text' || !tokenizers[name]) {
      continue;
    }

    const locator = tokenizers[name].locator;

    if (!locator) {
      eat.file.fail('Missing locator: `' + name + '`');
      continue;
    }

    const position = locator.call(this, value, 1);

    if (position !== -1 && position < min) {
      min = position;
    }
  }

  const subvalue = value.slice(0, min);

  return eat(subvalue)({
    type: 'text',
    value: subvalue,
  });
};

export default function remarkAllowHtmlEntities(this: Processor) {
  if (!this.Parser) return;
  this.Parser.prototype.inlineTokenizers.text = text;
}
