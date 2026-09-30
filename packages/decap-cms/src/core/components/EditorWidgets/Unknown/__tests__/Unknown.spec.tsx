import { render } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { I18n } from '@/core/i18n';
import UnknownControl from '@/core/components/EditorWidgets/Unknown/UnknownControl';
import UnknownPreview from '@/core/components/EditorWidgets/Unknown/UnknownPreview';

import type { CmsEntryField } from '@/lib/util/index';
import type { CmsLocalePhrases } from '@/lib/util/types/cms/common';

const messages = {
  editor: {
    editorWidgets: {
      unknownControl: { noControl: 'No control for widget "%{widget}".' },
      unknownPreview: { noPreview: 'No preview for widget "%{widget}".' },
    },
  },
} as unknown as CmsLocalePhrases;

function renderWithI18n(ui: React.ReactElement) {
  return render(
    <I18n locale="en" messages={messages}>
      {ui}
    </I18n>,
  );
}

const fooField = { widget: 'foo' } as CmsEntryField;

describe('UnknownControl', () => {
  it('renders the noControl message interpolated with the widget name', () => {
    const { container } = renderWithI18n(<UnknownControl field={fooField} />);
    expect(container.textContent).toBe('No control for widget "foo".');
  });

  it('renders without throwing when field is undefined', () => {
    expect(() => renderWithI18n(<UnknownControl />)).not.toThrow();
  });
});

describe('UnknownPreview', () => {
  it('renders the noPreview message interpolated with the widget name', () => {
    const { container } = renderWithI18n(<UnknownPreview field={fooField} />);
    expect(container.textContent).toBe('No preview for widget "foo".');
  });

  it('wraps the message in the nc-widgetPreview element', () => {
    const { container } = renderWithI18n(<UnknownPreview field={fooField} />);
    const wrapper = container.querySelector('.nc-widgetPreview');
    expect(wrapper).not.toBeNull();
    expect(wrapper?.textContent).toBe('No preview for widget "foo".');
  });

  it('renders without throwing when field is undefined', () => {
    expect(() => renderWithI18n(<UnknownPreview />)).not.toThrow();
  });
});
