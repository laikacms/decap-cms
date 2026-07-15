import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Checkbox } from '@/ui/Checkbox';
import { Dialog, DialogClose, DialogContent, DialogTitle, DialogTrigger } from '@/ui/Dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/Tabs';
import { ToggleGroup, ToggleGroupItem } from '@/ui/ToggleGroup';

describe('editor UI primitives', () => {
  it('reports the checked state of its native checkbox', () => {
    const onCheckedChange = vi.fn();
    render(<Checkbox aria-label="Include time" onCheckedChange={onCheckedChange} />);

    fireEvent.click(screen.getByRole('checkbox', { name: 'Include time' }));

    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  describe('ToggleGroup (Base UI)', () => {
    it('updates a multiple toggle group', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(
        <ToggleGroup type="multiple" defaultValue={['bold']} onValueChange={onValueChange}>
          <ToggleGroupItem value="bold">Bold</ToggleGroupItem>
          <ToggleGroupItem value="italic">Italic</ToggleGroupItem>
        </ToggleGroup>,
      );

      expect(screen.getByRole('group')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Bold' })).toHaveAttribute('aria-pressed', 'true');

      await user.click(screen.getByRole('button', { name: 'Italic' }));

      expect(onValueChange).toHaveBeenCalledWith(['bold', 'italic']);
      expect(screen.getByRole('button', { name: 'Italic' })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
    });

    it('deselects the pressed item in a single toggle group', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(
        <ToggleGroup type="single" defaultValue="subscript" onValueChange={onValueChange}>
          <ToggleGroupItem value="subscript">Subscript</ToggleGroupItem>
          <ToggleGroupItem value="superscript">Superscript</ToggleGroupItem>
        </ToggleGroup>,
      );

      const subscript = screen.getByRole('button', { name: 'Subscript' });
      expect(subscript).toHaveAttribute('aria-pressed', 'true');

      await user.click(screen.getByRole('button', { name: 'Superscript' }));
      expect(onValueChange).toHaveBeenLastCalledWith('superscript');
      expect(subscript).toHaveAttribute('aria-pressed', 'false');

      await user.click(screen.getByRole('button', { name: 'Superscript' }));
      expect(onValueChange).toHaveBeenLastCalledWith('');
    });

    it('moves focus between items with arrow keys', async () => {
      const user = userEvent.setup();
      render(
        <ToggleGroup type="multiple">
          <ToggleGroupItem value="bold">Bold</ToggleGroupItem>
          <ToggleGroupItem value="italic">Italic</ToggleGroupItem>
        </ToggleGroup>,
      );

      await user.click(screen.getByRole('button', { name: 'Bold' }));
      expect(screen.getByRole('button', { name: 'Bold' })).toHaveFocus();

      await user.keyboard('{ArrowRight}');
      expect(screen.getByRole('button', { name: 'Italic' })).toHaveFocus();
    });
  });

  describe('Tabs (Base UI)', () => {
    it('shows only the active tab panel', async () => {
      const user = userEvent.setup();
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

      expect(screen.getByRole('tablist')).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'URL' })).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByRole('tabpanel')).toHaveTextContent('URL panel');

      await user.click(screen.getByRole('tab', { name: 'File' }));

      expect(screen.getByRole('tab', { name: 'File' })).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByRole('tabpanel')).toHaveTextContent('File panel');
      expect(screen.queryByText('URL panel')).not.toBeInTheDocument();
    });

    it('activates tabs with arrow keys', async () => {
      const user = userEvent.setup();
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

      await user.click(screen.getByRole('tab', { name: 'File' }));
      expect(screen.getByRole('tabpanel')).toHaveTextContent('File panel');

      await user.keyboard('{ArrowLeft}');

      expect(screen.getByRole('tab', { name: 'URL' })).toHaveFocus();
      expect(screen.getByRole('tabpanel')).toHaveTextContent('URL panel');
    });

    it('reports value changes to the consumer', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(
        <Tabs value="url" onValueChange={onValueChange}>
          <TabsList>
            <TabsTrigger value="url">URL</TabsTrigger>
            <TabsTrigger value="file">File</TabsTrigger>
          </TabsList>
          <TabsContent value="url">URL panel</TabsContent>
          <TabsContent value="file">File panel</TabsContent>
        </Tabs>,
      );

      await user.click(screen.getByRole('tab', { name: 'File' }));

      expect(onValueChange).toHaveBeenCalledWith('file');
      expect(screen.getByRole('tabpanel')).toHaveTextContent('URL panel');
    });
  });

  describe('Dialog (Base UI)', () => {
    afterEach(() => {
      document.getElementById('nc-root')?.remove();
    });

    it('opens and closes a composed dialog with native aria wiring', async () => {
      const user = userEvent.setup();
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

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Open editor dialog' }));
      expect(screen.getByRole('dialog', { name: 'Editor dialog' })).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Cancel' }));
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });

    it('portals the dialog into #nc-root when present', () => {
      const root = document.createElement('div');
      root.id = 'nc-root';
      document.body.appendChild(root);

      render(
        <Dialog open>
          <DialogContent>
            <DialogTitle>Portaled dialog</DialogTitle>
          </DialogContent>
        </Dialog>,
        { container: root },
      );

      expect(root.contains(screen.getByRole('dialog'))).toBe(true);
    });
  });
});
