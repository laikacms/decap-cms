import { PlusIcon } from 'lucide-react';

import { Button } from '@/ui/Button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/ui/DropdownMenu';
import { useEditorModal } from '@/ui/editor/editor-hooks/useModal';

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
