import { PlusIcon } from 'lucide-react';

import { useEditorModal } from '@/lib/widgets/editor/editor-hooks/use-modal';
import { Button } from '@/lib/widgets/editor/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/lib/widgets/editor/ui/dropdown-menu';

export function BlockInsertPlugin({ children }: { children: React.ReactNode }) {
  const [modal] = useEditorModal();

  return (
    <>
      {modal}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="outline" size="sm" className="gap-1 px-2">
              <PlusIcon className="size-4" />
              <span className="text-sm">Insert</span>
            </Button>
          }
        />
        <DropdownMenuContent>{children}</DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
