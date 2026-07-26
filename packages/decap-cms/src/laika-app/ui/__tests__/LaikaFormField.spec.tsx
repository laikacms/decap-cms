import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { LaikaFormField, LaikaSelect, LaikaTextArea, LaikaTextField } from '@/laika-app/ui/LaikaFormField';

describe('LaikaFormField', () => {
  it('associates its label and supporting text with a text field', () => {
    render(
      <LaikaFormField label="Title" supportingText="Shown in search results">
        <LaikaTextField />
      </LaikaFormField>,
    );

    const input = screen.getByLabelText('Title');
    expect(input).toHaveAccessibleDescription('Shown in search results');
  });

  it('marks its control invalid and announces an error', () => {
    render(
      <LaikaFormField label="Slug" error="A slug is required">
        <LaikaTextField />
      </LaikaFormField>,
    );

    expect(screen.getByLabelText('Slug')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('A slug is required');
  });

  it('associates the label when the control supplies its own id', () => {
    render(
      <LaikaFormField label="Description">
        <LaikaTextField id="entry-description" />
      </LaikaFormField>,
    );

    expect(screen.getByLabelText('Description')).toHaveAttribute('id', 'entry-description');
  });

  it('rejects multiple controls that would receive duplicate generated ids', () => {
    expect(() =>
      render(
        <LaikaFormField label="Range">
          <>
            <LaikaTextField />
            <LaikaTextField />
          </>
        </LaikaFormField>,
      )
    ).toThrow('LaikaFormField requires exactly one Laika form control');
  });
});

describe('Laika form controls', () => {
  it('supports number inputs and forwards input attributes', () => {
    render(<LaikaTextField aria-label="Order" type="number" min={1} />);

    const input = screen.getByLabelText('Order');
    expect(input).toHaveAttribute('type', 'number');
    expect(input).toHaveAttribute('min', '1');
  });

  it('renders a labeled textarea', () => {
    render(
      <LaikaFormField label="Summary">
        <LaikaTextArea rows={4} />
      </LaikaFormField>,
    );

    expect(screen.getByLabelText('Summary')).toHaveAttribute('rows', '4');
  });

  it('renders a labeled native select', () => {
    render(
      <LaikaFormField label="Status">
        <LaikaSelect defaultValue="draft">
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </LaikaSelect>
      </LaikaFormField>,
    );

    expect(screen.getByLabelText('Status')).toHaveValue('draft');
  });
});
