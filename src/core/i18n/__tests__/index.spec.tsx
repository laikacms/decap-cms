import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { I18n, translate, useTranslate } from '@/core/i18n';

import type { TranslateFunction } from '@/core/i18n';

const messages = {
  greeting: 'Hello, %{name}!',
  entries: '%{smart_count} entry |||| %{smart_count} entries',
};

function HookConsumer() {
  const t = useTranslate();
  return <div>{t('entries', { smart_count: 2 })}</div>;
}

function HocConsumer({ t }: { t: TranslateFunction }) {
  return <div>{t('greeting', { name: 'Spike' })}</div>;
}

const TranslatedHocConsumer = translate()(HocConsumer);

describe('I18n', () => {
  it('provides t via useTranslate', () => {
    render(
      <I18n locale="en" messages={messages}>
        <HookConsumer />
      </I18n>,
    );
    expect(screen.getByText('2 entries')).toBeInTheDocument();
  });

  it('injects t via the translate HOC', () => {
    render(
      <I18n locale="en" messages={messages}>
        <TranslatedHocConsumer />
      </I18n>,
    );
    expect(screen.getByText('Hello, Spike!')).toBeInTheDocument();
  });

  it('throws a descriptive error when useTranslate is used without a provider', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<HookConsumer />)).toThrow(
      'useTranslate must be used within an <I18n> provider',
    );
    error.mockRestore();
  });
});
