import { INSERT_EMBED_COMMAND } from '@lexical/react/LexicalAutoEmbedPlugin';

import { DropdownMenuItem } from '@/ui/DropdownMenu';
import { useToolbarContext } from '@/ui/editor/context/ToolbarContext';
import { EmbedConfigs } from '@/ui/editor/plugins/embeds/AutoEmbedPlugin';

export function InsertEmbeds() {
  const { activeEditor } = useToolbarContext();
  return EmbedConfigs.map(embedConfig => (
    <DropdownMenuItem
      key={embedConfig.type}
      onClick={() => {
        activeEditor.dispatchCommand(INSERT_EMBED_COMMAND, embedConfig.type);
      }}
    >
      <div className="flex items-center gap-1">
        {embedConfig.icon}
        <span>{embedConfig.contentName}</span>
      </div>
    </DropdownMenuItem>
  ));
}
