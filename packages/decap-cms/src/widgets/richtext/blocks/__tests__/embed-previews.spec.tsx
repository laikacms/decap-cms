import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { tweetBlock } from '@/widgets/richtext/blocks/tweet';
import { youtubeBlock } from '@/widgets/richtext/blocks/youtube';

const TweetPreview = tweetBlock.preview!;
const YoutubePreview = youtubeBlock.preview!;

describe('TweetPreview', () => {
  it('builds an encoded iframe src from data.id', () => {
    const id = '123/needs encoding';
    const { container } = render(<TweetPreview data={{ id }} definition={tweetBlock} />);

    const iframe = container.querySelector('iframe');
    expect(iframe).not.toBeNull();
    expect(iframe).toHaveAttribute(
      'src',
      `https://platform.twitter.com/embed/Tweet.html?id=${encodeURIComponent(id)}`,
    );
    expect(iframe!.getAttribute('src')).toContain(encodeURIComponent(id));
    expect(iframe!.getAttribute('src')).not.toContain(' ');
  });

  it('renders fallback text when data.id is missing', () => {
    const { container, getByText } = render(
      <TweetPreview data={{ id: '' }} definition={tweetBlock} />,
    );

    expect(getByText('Set a tweet ID to embed a post.')).toBeInTheDocument();
    expect(container.querySelector('iframe')).toBeNull();
  });
});

describe('YoutubePreview', () => {
  it('builds an encoded iframe src from data.id', () => {
    const id = 'abc/123 xyz';
    const { container } = render(<YoutubePreview data={{ id }} definition={youtubeBlock} />);

    const iframe = container.querySelector('iframe');
    expect(iframe).not.toBeNull();
    expect(iframe).toHaveAttribute(
      'src',
      `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}`,
    );
    expect(iframe!.getAttribute('src')).toContain(encodeURIComponent(id));
    expect(iframe!.getAttribute('src')).not.toContain(' ');
  });

  it('renders fallback text when data.id is missing', () => {
    const { container, getByText } = render(
      <YoutubePreview data={{ id: '' }} definition={youtubeBlock} />,
    );

    expect(getByText('Set a YouTube video ID to embed a video.')).toBeInTheDocument();
    expect(container.querySelector('iframe')).toBeNull();
  });
});
