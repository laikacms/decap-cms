import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Field, FieldDescription, FieldError, FieldLabel } from '@/ui/Field';
import { Input } from '@/ui/Input';

describe('Field (Base UI)', () => {
  it('associates FieldLabel with Input automatically inside a Field', () => {
    render(
      <Field>
        <FieldLabel>Image URL</FieldLabel>
        <Input />
      </Field>,
    );

    const input = screen.getByLabelText('Image URL');
    expect(input).toBeInTheDocument();
    expect(input.tagName).toBe('INPUT');
  });

  it('keeps working with an explicit htmlFor/id pair', () => {
    render(
      <Field>
        <FieldLabel htmlFor="image-url">Image URL</FieldLabel>
        <Input id="image-url" />
      </Field>,
    );

    expect(screen.getByLabelText('Image URL')).toHaveAttribute('id', 'image-url');
  });

  it('links FieldDescription and FieldError to the control via aria-describedby', () => {
    render(
      <Field>
        <FieldLabel>Name</FieldLabel>
        <Input />
        <FieldDescription>Your full name</FieldDescription>
        <FieldError errors={[{ message: 'Name is required' }]} />
      </Field>,
    );

    const input = screen.getByLabelText('Name');
    const describedBy = input.getAttribute('aria-describedby') ?? '';
    const error = screen.getByRole('alert');
    const description = screen.getByText('Your full name');
    expect(error).toHaveTextContent('Name is required');
    expect(describedBy.split(' ')).toContain(error.id);
    expect(describedBy.split(' ')).toContain(description.id);
  });

  it('renders a deduplicated list for multiple error messages', () => {
    render(
      <Field>
        <FieldError
          errors={[{ message: 'Too short' }, { message: 'Too short' }, { message: 'Invalid characters' }]}
        />
      </Field>,
    );

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('Too short');
    expect(items[1]).toHaveTextContent('Invalid characters');
  });

  it('renders no error when FieldError has no content and the field is not invalid', () => {
    render(
      <Field>
        <FieldError />
      </Field>,
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('Input works standalone as a controlled native input', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    function Controlled() {
      const [value, setValue] = React.useState('');
      return (
        <Input
          aria-label="URL"
          value={value}
          onChange={e => {
            handleChange(e.target.value);
            setValue(e.target.value);
          }}
        />
      );
    }

    render(<Controlled />);
    const input = screen.getByRole('textbox', { name: 'URL' });
    await user.type(input, 'abc');
    expect(input).toHaveValue('abc');
    expect(handleChange).toHaveBeenLastCalledWith('abc');
  });
});
