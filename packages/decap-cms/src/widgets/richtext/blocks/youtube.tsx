import { VideoIcon } from '@/ui/icons/index';

import type { BlockDefinition, BlockPreviewProps } from '@/lib/richtext';

interface YoutubeData extends Record<string, unknown> {
  id: string;
}

function YoutubePreview({ data }: BlockPreviewProps<YoutubeData>) {
  if (!data.id) return <p>Set a YouTube video ID to embed a video.</p>;
  return (
    <iframe
      width="560"
      height="315"
      src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(data.id)}`}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
      title="YouTube video"
      style={{ border: 0, maxWidth: '100%' }}
    />
  );
}

/**
 * YouTube embed as a registry block (replaces the hardcoded `YouTubeNode`,
 * whose content was silently dropped at persist). Default markdown encoding
 * is the hugo shortcode; spread-override `formats` before registering to
 * change it.
 */
export const youtubeBlock: BlockDefinition<YoutubeData> = {
  id: 'youtube',
  label: 'YouTube',
  icon: <VideoIcon className="size-4" />,
  fields: [{ name: 'id', label: 'Video ID' }],
  defaultData: { id: '' },
  keywords: ['video', 'embed', 'youtube'],
  preview: YoutubePreview,
  formats: {
    markdown: {
      pattern: /^{{<\s?youtube (\S+)\s?>}}/,
      fromMatch: match => ({ id: match[1] ?? '' }),
      serialize: data => `{{< youtube ${data.id} >}}`,
    },
  },
};

export default youtubeBlock;
