import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Button } from '@/ui/Button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/ui/DropdownMenu';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/Popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/Select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/ui/Tooltip';

describe('editor popup primitives (Base UI)', () => {
  it('opens a dropdown menu and fires the item handler', async () => {
    const user = userEvent.setup();
    const onFormat = vi.fn();
    render(
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button>Format</Button>} />
        <DropdownMenuContent>
          <DropdownMenuItem onClick={onFormat}>Heading 1</DropdownMenuItem>
          <DropdownMenuItem>Paragraph</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    await user.click(screen.getByRole('button', { name: 'Format' }));
    const item = await screen.findByRole('menuitem', { name: 'Heading 1' });

    await user.click(item);
    expect(onFormat).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
  });

  it('selects a value and reports it through onValueChange', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <Select
        defaultValue="js"
        onValueChange={onValueChange}
        items={[
          { value: 'js', label: 'JavaScript' },
          { value: 'ts', label: 'TypeScript' },
        ]}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="js">JavaScript</SelectItem>
          <SelectItem value="ts">TypeScript</SelectItem>
        </SelectContent>
      </Select>,
    );

    const trigger = screen.getByRole('combobox');
    expect(trigger).toHaveTextContent('JavaScript');

    await user.click(trigger);
    await user.click(await screen.findByRole('option', { name: 'TypeScript' }));

    expect(onValueChange).toHaveBeenCalledWith('ts');
    await waitFor(() => expect(trigger).toHaveTextContent('TypeScript'));
  });

  it('shows a tooltip on hover', async () => {
    const user = userEvent.setup();
    render(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger render={<Button>Clear</Button>} />
          <TooltipContent>Clear Editor</TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    );

    await user.hover(screen.getByRole('button', { name: 'Clear' }));
    expect(await screen.findByText('Clear Editor')).toBeInTheDocument();
  });

  it('shows a tooltip on keyboard focus, dismisses on Escape, and wires aria-describedby', async () => {
    const user = userEvent.setup();
    render(
      <Tooltip>
        <TooltipTrigger delay={0} render={<Button>Save</Button>} />
        <TooltipContent side="bottom">Saves the entry</TooltipContent>
      </Tooltip>,
    );

    await user.tab();
    const trigger = screen.getByRole('button', { name: 'Save' });
    expect(trigger).toHaveFocus();
    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip).toHaveTextContent('Saves the entry');
    expect(trigger).toHaveAttribute('aria-describedby', tooltip.id);

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument());
  });

  it('opens and closes a popover from its trigger', async () => {
    const user = userEvent.setup();
    render(
      <Popover>
        <PopoverTrigger render={<Button>Insert date</Button>} />
        <PopoverContent>Pick a date</PopoverContent>
      </Popover>,
    );

    expect(screen.queryByText('Pick a date')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Insert date' }));
    expect(await screen.findByText('Pick a date')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByText('Pick a date')).not.toBeInTheDocument());
  });
});
