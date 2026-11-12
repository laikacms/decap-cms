import { act, fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/core/actions/deployStatus', () => ({
  loadDeployHistory: vi.fn((options?: { silent?: boolean }) => ({ type: 'LOAD_DEPLOY_HISTORY', options })),
  selectCommitUrl: vi.fn(() => null),
}));

import { loadDeployHistory, selectCommitUrl } from '@/core/actions/deployStatus';
import Deploys, { DEPLOYS_REFRESH_MS } from '@/core/components/Deploys/Deploys';
import { I18n } from '@/core/i18n';
import { initialDeployStatusState } from '@/core/reducers/deployStatus';
import { en } from '@/locales';

import type { DeployStatusState } from '@/core/reducers/deployStatus';
import type { Deployment } from '@/lib/backend/index';

const mockStore = configureMockStore<any>([]);

function table() {
  return within(screen.getByRole('table'));
}

function row(overrides: Partial<Deployment> = {}): Deployment {
  return {
    commit_sha: 'abc1234def5678',
    source: 'webhook',
    external_id: 'deploy-1',
    provider_label: 'Netlify',
    state: 'success',
    target_url: 'https://site.example',
    error_message: null,
    finished_at: '2026-09-02T10:00:00.000Z',
    updated_at: '2026-09-02T10:00:00.000Z',
    ...overrides,
  };
}

function renderPage(deployStatus: Partial<DeployStatusState> = {}) {
  const store = mockStore({
    config: {},
    deployStatus: {
      ...initialDeployStatusState,
      supported: true,
      pageEnabled: true,
      loaded: true,
      ...deployStatus,
    },
  });

  const view = render(
    <Provider store={store}>
      <I18n locale="en" messages={en}>
        <Deploys />
      </I18n>
    </Provider>,
  );

  return { store, ...view };
}

function loads(store: ReturnType<typeof mockStore>) {
  return store.getActions().filter(action => action.type === 'LOAD_DEPLOY_HISTORY');
}

describe('Deploys page', () => {
  beforeEach(() => {
    vi.mocked(loadDeployHistory).mockClear();
    vi.mocked(selectCommitUrl).mockReset().mockReturnValue(null);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('answers the editor question first, in a sentence', () => {
    renderPage({ latest: row(), deployments: [row()] });

    expect(screen.getByRole('heading', { name: 'Deploys' })).toBeInTheDocument();
    expect(screen.getByText(/Your latest change is live/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View site' })).toHaveAttribute('href', 'https://site.example');
  });

  it('says how many changes are publishing, with the plural form', () => {
    renderPage({ pendingCount: 2, latest: row(), deployments: [row()] });

    expect(screen.getByText('Publishing 2 changes: waiting for your site to build.')).toBeInTheDocument();
  });

  it('lists deploys with their host, commit and state', () => {
    renderPage({
      latest: row(),
      deployments: [row(), row({ external_id: 'deploy-2', state: 'failed', error_message: 'Build script failed' })],
    });

    expect(table().getAllByText('abc1234')).toHaveLength(2);
    expect(table().getAllByText('Netlify')).toHaveLength(2);
    expect(table().getByText('Build script failed')).toBeInTheDocument();
    expect(table().getAllByRole('columnheader').map(cell => cell.textContent)).toEqual([
      'State',
      'Saved entry',
      'Published to',
      'Reported by',
      'Commit',
      'When',
    ]);
  });

  // Not a failure: the change ships inside a newer deploy.
  it('calls a cancelled deploy superseded, not failed', () => {
    renderPage({ deployments: [row({ state: 'canceled' })], latest: row({ state: 'canceled' }) });

    expect(table().getByText('Superseded')).toBeInTheDocument();
    expect(table().queryByText('Failed')).not.toBeInTheDocument();
  });

  // The single most likely reason someone opens this page.
  it('explains an empty page instead of shrugging at it', () => {
    renderPage({ deployments: [], loaded: true });

    expect(screen.getByText(/Netlify does not report branch or production deploys/)).toBeInTheDocument();
  });

  it('says it is loading before the first read completes', () => {
    renderPage({ deployments: [], loaded: false });

    expect(screen.getByText('Loading deploys…')).toBeInTheDocument();
  });

  it('names the sources when a site reports from more than one', () => {
    renderPage({
      deployments: [row(), row({ external_id: 'd2', source: 'github_deployment', provider_label: 'Vercel' })],
    });

    expect(screen.getByText(/Netlify, Vercel/)).toBeInTheDocument();
  });

  it('does not claim a single source is several', () => {
    renderPage({ deployments: [row(), row({ external_id: 'd2' })] });

    expect(screen.queryByText(/reported from more than one place/)).not.toBeInTheDocument();
  });

  // Opening the page and pressing Refresh are the reads it makes on its own
  // account, besides the timer below; nothing else polls.
  it('reads deploys on mount and again on Refresh', () => {
    const { store } = renderPage({ deployments: [row()], latest: row() });

    expect(loads(store)).toEqual([{ type: 'LOAD_DEPLOY_HISTORY', options: { silent: false } }]);

    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));

    expect(loads(store)).toHaveLength(2);
  });

  it('does not let Refresh stack reads while one is in flight', () => {
    const { store } = renderPage({ deployments: [row()], latest: row(), isFetching: true });

    const button = screen.getByRole('button', { name: 'Refreshing…' });
    expect(button).toBeDisabled();
    fireEvent.click(button);

    expect(loads(store)).toHaveLength(1);
  });

  // A build finishing while the page is open should change the page, not
  // wait for someone to reload it.
  it('refreshes itself while it is open, silently, and stops on unmount', () => {
    vi.useFakeTimers();
    const { store, unmount } = renderPage({ deployments: [row()], latest: row() });

    act(() => {
      vi.advanceTimersByTime(DEPLOYS_REFRESH_MS * 3);
    });

    expect(loads(store)).toHaveLength(4);
    // Silent, or the Refresh button would flicker every ten seconds.
    expect(loads(store)[3]).toEqual({ type: 'LOAD_DEPLOY_HISTORY', options: { silent: true } });

    unmount();
    act(() => {
      vi.advanceTimersByTime(DEPLOYS_REFRESH_MS * 6);
    });

    // The repeating read belongs to this page; leaving it leaves an idle CMS
    // polling zero times.
    expect(loads(store)).toHaveLength(4);
  });

  it('pauses on a hidden tab and reads once on return', () => {
    vi.useFakeTimers();
    const { store } = renderPage({ deployments: [row()], latest: row() });
    const hidden = vi.spyOn(document, 'hidden', 'get');

    hidden.mockReturnValue(true);
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
      vi.advanceTimersByTime(DEPLOYS_REFRESH_MS * 5);
    });
    expect(loads(store)).toHaveLength(1);

    hidden.mockReturnValue(false);
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(loads(store)).toHaveLength(2);

    hidden.mockRestore();
  });

  // Only one deploy is live at a time. Calling every past success "Live" is
  // simply untrue, and the page is the place someone goes to check.
  it('calls only the newest success Live, and the rest Deployed', () => {
    renderPage({
      deployments: [row({ external_id: 'newest' }), row({ external_id: 'older' }), row({ external_id: 'oldest' })],
    });

    expect(table().getAllByText('Live')).toHaveLength(1);
    expect(table().getAllByText('Deployed')).toHaveLength(2);
  });

  // A `cms/...` branch deploy is live at its own URL and is not the published site.
  it('says which URL a Live on another branch is live at', () => {
    renderPage({
      branch: 'turbo',
      deployments: [
        row({ external_id: 'workflow', branch: 'cms/posts/some-entry' }),
        row({ external_id: 'site', branch: 'turbo' }),
      ],
    });

    const workflowRow = table().getByText('cms/posts/some-entry').closest('tr') as HTMLElement;
    expect(within(workflowRow).getByTitle(/not the published site/)).toBeInTheDocument();
    // The site's own Live is unqualified: it IS the published site.
    const siteRow = table().getByText('turbo').closest('tr') as HTMLElement;
    expect(within(siteRow).queryByTitle(/not the published site/)).not.toBeInTheDocument();
  });

  // However many branches the table calls Live, the summary stays scoped to
  // the site's own.
  it('does not let a branch deploy speak for the site', () => {
    renderPage({
      branch: 'turbo',
      // `latest` is what the reducer already scoped to the site branch.
      latest: null,
      deployments: [row({ external_id: 'workflow', branch: 'cms/posts/some-entry' })],
    });

    expect(screen.getByText(/No deploy has been reported/)).toBeInTheDocument();
    expect(screen.queryByText(/Your latest change is live/)).not.toBeInTheDocument();
  });

  it('links the state to the deploy and the commit to the commit', () => {
    vi.mocked(selectCommitUrl).mockImplementation((_state, sha) => `https://github.com/acme/site/commit/${sha}`);
    renderPage({ deployments: [row()], latest: row() });

    const commitLink = screen.getByText('abc1234').closest('a');
    expect(commitLink).toHaveAttribute('href', 'https://github.com/acme/site/commit/abc1234def5678');
    // A commit that links to the deployed site looks like it will show you
    // the change and shows you the home page.
    expect(table().getByRole('link', { name: 'Live' })).toHaveAttribute('href', 'https://site.example');
  });

  it('leaves the commit as plain text when the backend cannot link it', () => {
    renderPage({ deployments: [row()] });

    expect(screen.getByText('abc1234').closest('a')).toBeNull();
  });

  // The entry's title, the same value the notification shows.
  it('names the entry a deploy carried', () => {
    renderPage({ deployments: [row()], entryLabels: { abc1234def5678: 'Spring menu' } });

    expect(table().getByText('Spring menu')).toBeInTheDocument();
  });

  it('leaves the entry blank for a commit the CMS did not make', () => {
    renderPage({ deployments: [row()], entryLabels: {} });

    // A dash, not a guess: a commit from a git push has no entry behind it.
    expect(table().queryByText('Spring menu')).not.toBeInTheDocument();
    expect(table().getAllByText('-').length).toBeGreaterThan(0);
  });

  // A build nobody has mentioned for half an hour is not "Building": a
  // deleted branch's Deploy Preview is never reported again.
  describe('a build that stopped being reported', () => {
    function longAgo() {
      return new Date(Date.now() - 60 * 60 * 1000).toISOString();
    }

    it('stops calling it Building, and says why', () => {
      renderPage({ deployments: [row({ state: 'building', finished_at: null, updated_at: longAgo() })] });

      expect(table().getByText('Unknown')).toBeInTheDocument();
      expect(table().queryByText('Building')).not.toBeInTheDocument();
      expect(table().getByTitle(/nothing has been reported since/)).toBeInTheDocument();
      // We did not learn it failed, we learnt we stopped hearing about it.
      expect(table().queryByText('Failed')).not.toBeInTheDocument();
    });

    // The threshold must never overtake a slow but healthy build.
    it('leaves a build that is still being reported alone', () => {
      renderPage({
        deployments: [row({ state: 'building', finished_at: null, updated_at: new Date().toISOString() })],
      });

      expect(table().getByText('Building')).toBeInTheDocument();
    });
  });

  it('surfaces a read failure rather than showing an empty history', () => {
    renderPage({ error: 'Deploy status requires a signed-in session', loaded: false });

    expect(screen.getByRole('alert')).toHaveTextContent(/requires a signed-in session/);
  });

  it('has a label for every state the table can show', () => {
    for (const state of ['pending', 'building', 'live', 'deployed', 'failed', 'canceled', 'stalled']) {
      expect(typeof (en.ui.deploys.state as Record<string, string>)[state]).toBe('string');
    }
  });
});
