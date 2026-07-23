import { render } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import UuidControl from '@/widgets/uuid/UuidControl';

const UUID = '00000000-0000-4000-8000-000000000000';

const defaultProps = {
  onChange: vi.fn(),
  forID: 'test-uuid',
  classNameWrapper: '',
  setActiveStyle: vi.fn(),
  setInactiveStyle: vi.fn(),
  field: { name: 'id', widget: 'uuid' } as any,
};

// Ported from decaporg/decap-cms#6675 (upstream commit 78c079313).
describe('UuidControl', () => {
  it('generates a UUID with a prefix when no value exists', () => {
    const onChange = vi.fn();
    render(
      <UuidControl
        {...defaultProps}
        onChange={onChange}
        field={{ name: 'id', widget: 'uuid', prefix: 'post/' } as any}
      />,
    );

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toMatch(/^post\/[0-9a-f-]{36}$/);
  });

  it('generates a lowercase Base32 UUID when configured', () => {
    const onChange = vi.fn();
    render(
      <UuidControl
        {...defaultProps}
        onChange={onChange}
        field={{ name: 'id', widget: 'uuid', use_b32_encoding: true } as any}
      />,
    );

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toMatch(/^[a-z2-7]{26}$/);
  });

  it('preserves an existing value and does not call onChange', () => {
    const onChange = vi.fn();
    const { container } = render(
      <UuidControl {...defaultProps} onChange={onChange} value="existing-id" />,
    );

    expect(onChange).not.toHaveBeenCalled();
    expect(container.querySelector('input')?.value).toBe('existing-id');
  });

  it.each(['none', 'duplicate'] as const)(
    'does not generate in a non-default locale for an i18n: %s field',
    fieldI18n => {
      const onChange = vi.fn();
      render(
        <UuidControl
          {...defaultProps}
          onChange={onChange}
          field={{ name: 'id', widget: 'uuid', i18n: fieldI18n } as any}
          collection={{ i18n: { structure: 'multiple_files', locales: ['en', 'fr'], default_locale: 'en' } }}
          locale="fr"
        />,
      );

      expect(onChange).not.toHaveBeenCalled();
    },
  );

  it('generates in a non-default locale for a translatable field', () => {
    const onChange = vi.fn();
    render(
      <UuidControl
        {...defaultProps}
        onChange={onChange}
        field={{ name: 'id', widget: 'uuid', i18n: 'translate' } as any}
        collection={{ i18n: { structure: 'multiple_files', locales: ['en', 'fr'], default_locale: 'en' } }}
        locale="fr"
      />,
    );

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('renders read-only by default', () => {
    const { container } = render(<UuidControl {...defaultProps} value={UUID} />);
    expect(container.querySelector('input')).toHaveAttribute('readonly');
  });

  it('is editable when read_only is false', () => {
    const { container } = render(
      <UuidControl
        {...defaultProps}
        value={UUID}
        field={{ name: 'id', widget: 'uuid', read_only: false } as any}
      />,
    );
    expect(container.querySelector('input')).not.toHaveAttribute('readonly');
  });
});
