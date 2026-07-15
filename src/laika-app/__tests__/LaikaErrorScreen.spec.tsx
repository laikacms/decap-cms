import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/core/i18n', () => ({
  translate: () => (Component: React.ComponentType<any>) => {
    return function Translated(props: any) {
      return <Component {...props} t={(key: string) => key} />;
    };
  },
}));

import LaikaErrorScreen from '@/laika-app/LaikaErrorScreen';

describe('LaikaErrorScreen', () => {
  it('renders error title, message, and report link', () => {
    const { getByText, getByTestId } = render(
      <LaikaErrorScreen
        errorTitle="Boom"
        errorMessage="Stack trace here"
        issueUrl="https://github.com/example/issue?title=Boom"
      />,
    );
    expect(getByText('ui.errorBoundary.title')).toBeInTheDocument();
    expect(getByText('Stack trace here')).toBeInTheDocument();
    expect(getByText('ui.errorBoundary.reportIt')).toBeInTheDocument();
    expect(getByTestId('issue-url').getAttribute('href')).toBe(
      'https://github.com/example/issue?title=Boom',
    );
  });

  it('shows the download-recovered-draft action when a backup is supplied', () => {
    const { getByText } = render(
      <LaikaErrorScreen
        errorTitle="Boom"
        errorMessage="trace"
        issueUrl="https://example.test"
        backup='{"draft":"data"}'
      />,
    );
    expect(getByText('Download recovered draft')).toBeInTheDocument();
  });

  it('omits the download button when no backup is supplied', () => {
    const { queryByText } = render(
      <LaikaErrorScreen errorTitle="Boom" errorMessage="trace" issueUrl="https://example.test" />,
    );
    expect(queryByText('Download recovered draft')).toBeNull();
  });
});
