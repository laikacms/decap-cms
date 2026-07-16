import { $createParagraphNode, $getRoot } from 'lexical';
import { describe, expect, it } from 'vitest';

import { createHeadlessEditor } from '@/lib/richtext/lexical/headlessEditor';
import { $createTweetNode, TweetNode } from '@/ui/editor/nodes/embeds/TweetNode';
import { TWEET } from '@/ui/editor/transformers/tweet-transformer';

describe('TWEET transformer', () => {
  describe('regExp', () => {
    it.each([
      '<tweet id="123456789" />',
      '<tweet id="abc" />',
      '<tweet id="123"/>',
    ])('matches %j', input => {
      expect(TWEET.regExp.test(input)).toBe(true);
    });

    it.each([
      'tweet id="123"',
      '<tweet id=123 />',
      '<tweet id="" />foo',
      '<tweet />',
    ])('does not match %j', input => {
      expect(TWEET.regExp.test(input)).toBe(false);
    });

    it('captures the tweet id', () => {
      const match = '<tweet id="987654321" />'.match(TWEET.regExp);
      expect(match?.[1]).toBe('987654321');
    });
  });

  describe('export', () => {
    it('renders a tweet node as a <tweet> tag', () => {
      const editor = createHeadlessEditor([TweetNode]);

      let output: string | null = null;
      editor.update(
        () => {
          const node = $createTweetNode('123456789');
          output = TWEET.export(node, () => '');
        },
        { discrete: true },
      );

      expect(output).toBe('<tweet id="123456789" />');
    });

    it('returns null for a non-tweet node', () => {
      const editor = createHeadlessEditor([TweetNode]);

      let output: string | null = null;
      editor.update(
        () => {
          const paragraph = $createParagraphNode();
          $getRoot().append(paragraph);
          output = TWEET.export(paragraph, () => '');
        },
        { discrete: true },
      );

      expect(output).toBeNull();
    });
  });
});
