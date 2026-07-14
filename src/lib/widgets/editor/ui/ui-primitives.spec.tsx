import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Checkbox } from './checkbox';
import { Dialog, DialogClose, DialogContent, DialogTitle, DialogTrigger } from './dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';
import { ToggleGroup, ToggleGroupItem } from './toggle-group';

describe('editor UI primitives', () => {
  it('reports the checked state of its native checkbox', () => {
    const onCheckedChange = vi.fn();
    render(<Checkbox aria-label="Include time" onCheckedChange={onCheckedChange} />);

    fireEvent.click(screen.getByRole('checkbox', { name: 'Include time' }));

    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it('updates a multiple toggle group', () => {
    const onValueChange = vi.fn();
    render(
      <ToggleGroup type="multiple" defaultValue={['bold']} onValueChange={onValueChange}>
        <ToggleGroupItem value="bold">Bold</ToggleGroupItem>
        <ToggleGroupItem value="italic">Italic</ToggleGroupItem>
      </ToggleGroup>,
    );

    expect(screen.getByRole('button', { name: 'Bold' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Italic' }));

    expect(onValueChange).toHaveBeenCalledWith(['bold', 'italic']);
    expect(screen.getByRole('button', { name: 'Italic' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows only the active tab panel', () => {
    render(
      <Tabs defaultValue="url">
        <TabsList>
          <TabsTrigger value="url">URL</TabsTrigger>
          <TabsTrigger value="file">File</TabsTrigger>
        </TabsList>
        <TabsContent value="url">URL panel</TabsContent>
        <TabsContent value="file">File panel</TabsContent>
      </Tabs>,
    );

    expect(screen.getByRole('tabpanel')).toHaveTextContent('URL panel');
    const fileTab = screen.getByRole('tab', { name: 'File' });
    fireEvent.mouseDown(fileTab, { button: 0, ctrlKey: false });
    fireEvent.click(fileTab);

    expect(screen.getByRole('tabpanel')).toHaveTextContent('File panel');
    expect(screen.queryByText('URL panel')).not.toBeInTheDocument();

    fireEvent.keyDown(fileTab, { key: 'ArrowLeft' });
    expect(screen.getByRole('tabpanel')).toHaveTextContent('URL panel');
  });

  it('opens and closes a composed dialog', () => {
    render(
      <Dialog>
        <DialogTrigger asChild>
          <button type="button">Open editor dialog</button>
        </DialogTrigger>
        <DialogContent>
          <DialogTitle>Editor dialog</DialogTitle>
          <DialogClose asChild>
            <button type="button">Cancel</button>
          </DialogClose>
        </DialogContent>
      </Dialog>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open editor dialog' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Editor dialog');

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
