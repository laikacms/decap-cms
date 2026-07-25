import { fireEvent, render } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/core/i18n', () => ({
  translate: () => (Component: React.ComponentType<any>) => {
    return function Translated(props: any) {
      const t = (key: string, params?: Record<string, unknown>) => {
        if (!params) return key;
        const withStatus = params.status ? `${key}(${params.status})` : key;
        return params.slug ? `${withStatus}[${params.slug}]` : withStatus;
      };
      return <Component {...props} t={t} />;
    };
  },
}));

import WorkflowList from '@/core/components/Workflow/WorkflowList';
import { RouterProvider } from '@/core/routing/context';

import type { Router } from '@/core/routing/router';
import type { CmsCollections } from '@/lib/util/index';

const collections = {
  posts: { name: 'posts', label: 'Posts', publish: true },
} as unknown as CmsCollections;

function createTestRouter(): Router {
  return {
    location: () => ({ pathname: '/workflow', search: '' }),
    push: vi.fn(),
    replace: vi.fn(),
    href: (path: string) => `#${path}`,
    subscribe: vi.fn(() => () => {}),
    block: vi.fn(() => () => {}),
  };
}

function renderWorkflowList(props: React.ComponentProps<typeof WorkflowList>) {
  return render(
    <RouterProvider router={createTestRouter()}>
      <WorkflowList {...props} />
    </RouterProvider>,
  );
}

function makeEntries(status: string) {
  return {
    draft: status === 'draft' ? [entry(status)] : [],
    pending_review: status === 'pending_review' ? [entry(status)] : [],
    pending_publish: status === 'pending_publish' ? [entry(status)] : [],
  };
}

function entry(status: string) {
  return {
    slug: 'hello-world',
    collection: 'posts',
    status,
    updatedOn: '2026-01-01T00:00:00.000Z',
    data: { body: 'Body' },
    metaData: { user: 'Alice' },
  };
}

describe('WorkflowList keyboard status change + SR announcement', () => {
  it('disables status changes and hides delete/publish without the collection edit scope', () => {
    const restrictedCollections = {
      posts: {
        name: 'posts',
        label: 'Posts',
        publish: true,
        edit_scopes: ['content:write'],
      },
    } as unknown as CmsCollections;
    const { getAllByText, queryByText } = renderWorkflowList({
      entries: makeEntries('draft'),
      handleChangeStatus: vi.fn(),
      handlePublish: vi.fn(),
      handleDelete: vi.fn(),
      collections: restrictedCollections,
      userScopes: ['content:read'],
    });

    expect(getAllByText('workflow.workflowList.moveToNextStatusShort')[0]).toBeDisabled();
    expect(queryByText('workflow.workflowCard.deleteNewEntry')).not.toBeInTheDocument();
    expect(queryByText('workflow.workflowCard.publishNewEntry')).not.toBeInTheDocument();
  });

  it('dispatches updateUnpublishedEntryStatus via the shared handleChangeStatus path when "next status" is clicked', () => {
    const handleChangeStatus = vi.fn();
    const { getAllByText } = renderWorkflowList({
      entries: makeEntries('draft'),
      handleChangeStatus,
      handlePublish: vi.fn(),
      handleDelete: vi.fn(),
      collections,
    });

    fireEvent.click(getAllByText('workflow.workflowList.moveToNextStatusShort')[0]);

    expect(handleChangeStatus).toHaveBeenCalledTimes(1);
    expect(handleChangeStatus).toHaveBeenCalledWith('posts', 'hello-world', 'draft', 'pending_review');
  });

  it('dispatches updateUnpublishedEntryStatus when "previous status" is clicked', () => {
    const handleChangeStatus = vi.fn();
    const { getAllByText } = renderWorkflowList({
      entries: makeEntries('pending_review'),
      handleChangeStatus,
      handlePublish: vi.fn(),
      handleDelete: vi.fn(),
      collections,
    });

    fireEvent.click(getAllByText('workflow.workflowList.moveToPreviousStatusShort')[0]);

    expect(handleChangeStatus).toHaveBeenCalledTimes(1);
    expect(handleChangeStatus).toHaveBeenCalledWith('posts', 'hello-world', 'pending_review', 'draft');
  });

  it('disables "previous status" in the first column', () => {
    const { getAllByText, unmount } = renderWorkflowList({
      entries: makeEntries('draft'),
      handleChangeStatus: vi.fn(),
      handlePublish: vi.fn(),
      handleDelete: vi.fn(),
      collections,
    });
    expect(getAllByText('workflow.workflowList.moveToPreviousStatusShort')[0]).toBeDisabled();
    unmount();
  });

  it('disables "next status" in the last column', () => {
    const { getAllByText, unmount } = renderWorkflowList({
      entries: makeEntries('pending_publish'),
      handleChangeStatus: vi.fn(),
      handlePublish: vi.fn(),
      handleDelete: vi.fn(),
      collections,
    });
    expect(getAllByText('workflow.workflowList.moveToNextStatusShort')[0]).toBeDisabled();
    unmount();
  });

  it('never renders empty parens in the disabled "previous status" button aria-label', () => {
    const { getAllByText, unmount } = renderWorkflowList({
      entries: makeEntries('draft'),
      handleChangeStatus: vi.fn(),
      handlePublish: vi.fn(),
      handleDelete: vi.fn(),
      collections,
    });
    const button = getAllByText('workflow.workflowList.moveToPreviousStatusShort')[0];
    expect(button).toBeDisabled();
    const ariaLabel = button.getAttribute('aria-label');
    expect(ariaLabel).not.toContain('()');
    expect(ariaLabel).toBe('workflow.workflowList.moveToPreviousStatusShort');
    unmount();
  });

  it('never renders empty parens in the disabled "next status" button aria-label', () => {
    const { getAllByText, unmount } = renderWorkflowList({
      entries: makeEntries('pending_publish'),
      handleChangeStatus: vi.fn(),
      handlePublish: vi.fn(),
      handleDelete: vi.fn(),
      collections,
    });
    const button = getAllByText('workflow.workflowList.moveToNextStatusShort')[0];
    expect(button).toBeDisabled();
    const ariaLabel = button.getAttribute('aria-label');
    expect(ariaLabel).not.toContain('()');
    expect(ariaLabel).toBe('workflow.workflowList.moveToNextStatusShort');
    unmount();
  });

  it('announces the move via the aria-live status region after a keyboard status change', () => {
    const { getAllByText, getByRole } = renderWorkflowList({
      entries: makeEntries('draft'),
      handleChangeStatus: vi.fn(),
      handlePublish: vi.fn(),
      handleDelete: vi.fn(),
      collections,
    });

    const liveRegion = getByRole('status');
    expect(liveRegion).toHaveAttribute('aria-live', 'polite');
    expect(liveRegion.textContent).toBe('');

    fireEvent.click(getAllByText('workflow.workflowList.moveToNextStatusShort')[0]);

    expect(liveRegion.textContent).toBe(
      'workflow.workflowList.movedAnnouncement(workflow.workflowList.inReviewHeader)[hello-world]',
    );
  });
});
