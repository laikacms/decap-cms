import { MessageCircleIcon } from 'lucide-react';

import type { BlockDefinition, BlockPreviewProps } from '@/lib/richtext';

interface TweetData extends Record<string, unknown> {
  id: string;
}

function TweetPreview({ data }: BlockPreviewProps<TweetData>) {
  if (!data.id) return <p>Set a tweet ID to embed a post.</p>;
  // The script-less embed endpoint; avoids loading widgets.js into the CMS.
  return (
    <iframe
      width="550"
      height="300"
      src={`https://platform.twitter.com/embed/Tweet.html?id=${encodeURIComponent(data.id)}`}
      title={`Tweet ${data.id}`}
      style={{ border: 0, maxWidth: '100%' }}
    />
  );
}

/**
 * Tweet/X embed as a registry block (replaces the hardcoded `TweetNode`,
 * whose content was silently dropped at persist). Default markdown encoding
 * is the hugo shortcode; spread-override `formats` before registering to
 * change it.
 */
export const tweetBlock: BlockDefinition<TweetData> = {
  id: 'tweet',
  label: 'Tweet',
  icon: <MessageCircleIcon className="size-4" />,
  fields: [{ name: 'id', label: 'Tweet ID' }],
  defaultData: { id: '' },
  keywords: ['twitter', 'x', 'embed', 'tweet'],
  preview: TweetPreview,
  formats: {
    markdown: {
      pattern: /^{{<\s?tweet (\d+)\s?>}}/,
      fromMatch: match => ({ id: match[1] ?? '' }),
      serialize: data => `{{< tweet ${data.id} >}}`,
    },
  },
};

export default tweetBlock;
