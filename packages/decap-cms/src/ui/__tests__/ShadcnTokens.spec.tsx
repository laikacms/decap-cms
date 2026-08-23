import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { AlertDialogHost, showAlert } from '@/ui';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/Popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/Select';
import { ShadcnTokensGlobalStyle } from '@/ui/ShadcnTokens';

// DCMS-1851 regression coverage.
//
// `AlertDialog.tsx`/`Popover.tsx`/`Select.tsx` (and their siblings) style
// their popups with `var(--popover)`, `var(--foreground)`, etc. Before this
// fix those tokens were declared only inside the rich-text editor's
// the app-level global styles, so any
// popup rendered without the editor mounted anywhere in the tree resolved
// them to nothing — transparent background, no border, no backdrop.
//
// jsdom doesn't perform `var()` substitution when computing shorthand
// properties like `background-color` (verified empirically: `getComputedStyle`
// echoes the literal `var(--popover)` string whether or not the property is
// declared), so a real "is this pixel opaque" assertion isn't possible here
// — that's covered by the e2e/browser-sim rung instead. What jsdom *can*
// verify, and what actually distinguishes the fixed state from the bug, is
// whether the custom properties the primitives read are declared on
// `:root`/`.dark` at all when only the app-root global style is mounted —
// i.e. without `EditorGlobalStyles`/`<Editor>` anywhere in the tree.
const shadcnTokenNames = [
  '--popover',
  '--popover-foreground',
  '--foreground',
  '--background',
  '--border',
  '--card',
  '--card-foreground',
  '--primary',
  '--primary-foreground',
  '--secondary',
  '--secondary-foreground',
  '--muted',
  '--muted-foreground',
  '--accent',
  '--accent-foreground',
  '--destructive',
  '--destructive-foreground',
  '--input',
  '--ring',
  '--radius',
];

describe('shadcn popover tokens are declared at the app root (DCMS-1851)', () => {
  it('leaves every shadcn token undeclared on :root when no global style mounts it (sanity check for the assertion below)', () => {
    render(<AlertDialogHost />);

    const rootStyle = getComputedStyle(document.documentElement);
    for (const token of shadcnTokenNames) {
      expect(rootStyle.getPropertyValue(token).trim()).toBe('');
    }
  });

  it('declares every shadcn token on :root via ShadcnTokensGlobalStyle, without the rich-text editor anywhere in the tree', () => {
    render(
      <>
        <ShadcnTokensGlobalStyle />
        <AlertDialogHost />
      </>,
    );

    const rootStyle = getComputedStyle(document.documentElement);
    for (const token of shadcnTokenNames) {
      expect(rootStyle.getPropertyValue(token).trim()).not.toBe('');
    }
    expect(rootStyle.getPropertyValue('--popover').trim()).toBe('#ffffff');
    expect(rootStyle.getPropertyValue('--foreground').trim()).toBe('#020817');
  });

  it("overrides the light tokens under .dark (matches the primitives' `.dark`-scoped selector)", () => {
    render(<ShadcnTokensGlobalStyle />);
    document.documentElement.classList.add('dark');

    const rootStyle = getComputedStyle(document.documentElement);
    expect(rootStyle.getPropertyValue('--popover').trim()).toBe('#1c1f26');
    expect(rootStyle.getPropertyValue('--foreground').trim()).toBe('#c8ced8');

    document.documentElement.classList.remove('dark');
  });

  it('renders the AlertDialog popup consuming var(--popover)/var(--foreground) with the tokens available, outside the rich-text editor', async () => {
    render(
      <>
        <ShadcnTokensGlobalStyle />
        <AlertDialogHost />
      </>,
    );

    showAlert('Unsaved changes will be lost.');
    const dialog = await screen.findByRole('alertdialog');

    // Structural assertion that the popup actually reads the token (the
    // literal css prop value), since jsdom can't resolve the var() to a
    // pixel color for us.
    expect(getComputedStyle(dialog).backgroundColor).toBe('var(--popover)');
    expect(getComputedStyle(document.documentElement).getPropertyValue('--popover').trim()).toBe('#ffffff');
  });

  it('renders a Popover outside the rich-text editor with the tokens available', async () => {
    const user = userEvent.setup();
    render(
      <>
        <ShadcnTokensGlobalStyle />
        <Popover>
          <PopoverTrigger render={<button type="button">Open</button>} />
          <PopoverContent>Popover body</PopoverContent>
        </Popover>
      </>,
    );

    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(await screen.findByText('Popover body')).toBeInTheDocument();
    expect(getComputedStyle(document.documentElement).getPropertyValue('--popover').trim()).toBe('#ffffff');
  });

  it('renders a Select outside the rich-text editor with the tokens available', async () => {
    const user = userEvent.setup();
    render(
      <>
        <ShadcnTokensGlobalStyle />
        <Select defaultValue="js" items={[{ value: 'js', label: 'JavaScript' }]}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="js">JavaScript</SelectItem>
          </SelectContent>
        </Select>
      </>,
    );

    await user.click(screen.getByRole('combobox'));
    expect(await screen.findByRole('option', { name: 'JavaScript' })).toBeInTheDocument();
    expect(getComputedStyle(document.documentElement).getPropertyValue('--popover').trim()).toBe('#ffffff');
  });
});
