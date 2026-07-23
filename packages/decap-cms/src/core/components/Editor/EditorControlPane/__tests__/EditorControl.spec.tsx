import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { LabelComponent, styleStrings } from '@/core/components/Editor/EditorControlPane/EditorControl';
import { colors } from '@/ui/default/index';

import type { CmsEntryField } from '@/lib/util/index';

/**
 * Regression test for DCMS-421: the widget input value text color was
 * hardcoded to `#444a57` in `styleStrings.widget` instead of resolving
 * through the themeable `colors` token layer. Every other token in the
 * same style block (`colors.inputBackground`, `borders.textField`, etc.)
 * already followed the theme, so on the laika-app dark theme the typed
 * value rendered at ~1.66:1 contrast against the dark input background -
 * a WCAG AA (4.5:1) failure.
 *
 * `colors.textLead` is used (rather than `colors.text`) because it is the
 * only token of the two that clears 4.5:1 against `colors.inputBackground`
 * on both the default light theme (white input, ~11.2:1) and the
 * laika-app dark theme override (~15:1), while `colors.text` only reaches
 * ~3.9:1 on light and fails AA there.
 */
describe('EditorControl styleStrings - widget text theming (DCMS-421)', () => {
  it('widget input color resolves through the themeable textLead token', () => {
    expect(styleStrings.widget).toContain(colors.textLead);
  });

  it('widget input color is not hardcoded to the old non-theme-aware value', () => {
    expect(styleStrings.widget).not.toMatch(/color:\s*#444a57/i);
  });

  it('widget input background still uses the themeable inputBackground token', () => {
    expect(styleStrings.widget).toContain(colors.inputBackground);
  });
});

/**
 * Regression test for DCMS-1499 / DCMS-1484: v4.beta's EditorControl.tsx
 * shipped the inverted required-marker convention (optional fields got an
 * explicit "(optional)" suffix, required fields got nothing) even though
 * the same bug was already fixed on `main` (EditorControl.js, PR #1486,
 * commit 0f6698af4). Required fields must carry a visible "*" marker next
 * to the label; optional fields must render no marker at all.
 */
describe('EditorControl LabelComponent - required field marker (DCMS-1499)', () => {
  const t = (key: string) => key;
  const baseField = { name: 'title', label: 'Title' } as unknown as CmsEntryField;

  function renderLabel(field: CmsEntryField) {
    return render(
      <LabelComponent
        field={field}
        isActive={false}
        hasErrors={false}
        uniqueFieldId="title-field-1"
        isFieldRequired={(field as any).required !== false}
        t={t}
      />,
    );
  }

  it('renders a visible "*" marker when required is omitted (defaults to required)', () => {
    renderLabel(baseField);

    expect(screen.getByText('*', { exact: false })).toBeInTheDocument();
    expect(screen.queryByText(/optional/i)).not.toBeInTheDocument();
  });

  it('renders a visible "*" marker when required is explicitly true', () => {
    renderLabel({ ...baseField, required: true } as unknown as CmsEntryField);

    expect(screen.getByText('*', { exact: false })).toBeInTheDocument();
    expect(screen.queryByText(/optional/i)).not.toBeInTheDocument();
  });

  it('renders no marker when required is explicitly false', () => {
    renderLabel({ ...baseField, required: false } as unknown as CmsEntryField);

    expect(screen.queryByText('*', { exact: false })).not.toBeInTheDocument();
    expect(screen.queryByText(/optional/i)).not.toBeInTheDocument();
  });
});
