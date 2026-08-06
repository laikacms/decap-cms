import { render } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/core/i18n', () => ({
  useTranslate: () => (key: string) => key,
  translate: () => (Component: React.ComponentType<any>) => (props: any) => (
    <Component {...props} t={(key: string) => key} />
  ),
}));

vi.mock('@/core/hooks/useRedux', () => ({
  useAppDispatch: () => vi.fn(),
  useAppSelector: (selector: (state: unknown) => unknown) =>
    selector({ notifications: { notifications: [] } }),
}));
vi.mock('@/core/routing/context', () => ({
  useRouter: () => ({ subscribe: () => () => {} }),
}));

import ErrorBoundary from '@/core/components/UI/ErrorBoundary';
import Notifications from '@/core/components/UI/Notifications';
import { StandaloneAuthPage } from '@/ui/default/index';
import GitLabAuthenticationPage from '@/backends/gitlab/AuthenticationPage';

describe('repro 1896', () => {
  it('gitlab auth page under strict mode', () => {
    const errs: any[] = [];
    const spy = vi.spyOn(console, 'error').mockImplementation((...a) => {
      errs.push(a);
      console.log('CONSOLE.ERROR CALL:', a.map(x => (x && x.stack) || String(x)));
    });

    render(
      <React.StrictMode>
        <ErrorBoundary showBackup config={{ backend: { name: 'gitlab' } } as any}>
          <div>
            <Notifications />
            <StandaloneAuthPage>
              <GitLabAuthenticationPage
                onLogin={() => {}}
                inProgress={false}
                base_url="https://gitlab.com"
                siteId="x"
                config={{ backend: {}, site_url: 'https://example.com' }}
                t={(k: string) => k}
              />
            </StandaloneAuthPage>
          </div>
        </ErrorBoundary>
      </React.StrictMode>,
    );

    spy.mockRestore();
    expect(errs.length).toBe(0);
  });
});
