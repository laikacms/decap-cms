import { INSERT_EMBED_COMMAND } from '@lexical/react/LexicalAutoEmbedPlugin';

import { type CustomEmbedConfig, EmbedConfigs } from '@/ui/editor/plugins/embeds/AutoEmbedPlugin';
import { ComponentPickerOption } from '@/ui/editor/plugins/picker/ComponentPickerOption';

export function EmbedsPickerPlugin({
  embed,
}: {
  embed: 'tweet' | 'youtube-video',
}) {
  const embedConfig = EmbedConfigs.find(
    config => config.type === embed,
  ) as CustomEmbedConfig;

  return new ComponentPickerOption(`Embed ${embedConfig.contentName}`, {
    icon: embedConfig.icon,
    keywords: [...embedConfig.keywords, 'embed'],
    onSelect: (_, editor) => editor.dispatchCommand(INSERT_EMBED_COMMAND, embedConfig.type),
  });
}
