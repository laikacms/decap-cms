import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import WorkflowCard from '@/core/components/Workflow/WorkflowCard';
import { I18n } from '@/core/i18n';
import { RouterProvider } from '@/core/routing/context';
import en from '@/locales/en';

import type { Router } from '@/core/routing/router';

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

const phrases = en.workflow.workflowCard;

type CardProps = React.ComponentProps<typeof WorkflowCard>;

function renderCard(overrides: Partial<CardProps> = {}, router: Router = createTestRouter()) {
  const props: CardProps = {
    collectionLabel: 'Posts',
    title: 'Hello world',
    body: 'Body text',
    editLink: '/collections/posts/entries/hello-world',
    timestamp: '',
    isModification: false,
    onDelete: vi.fn(),
    canDelete: true,
    allowPublish: true,
    canPublish: true,
    onPublish: vi.fn(),
    ...overrides,
  };
  render(
    <I18n locale="en" messages={en}>
      <RouterProvider router={router}>
        <WorkflowCard {...props} />
      </RouterProvider>
    </I18n>,
  );
  return props;
}

describe('WorkflowCard', () => {
  it('renders collection label, title and body', () => {
    renderCard();
    expect(screen.getByText('Posts')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Hello world' })).toBeInTheDocument();
    expect(screen.getByText('Body text')).toBeInTheDocument();
  });

  it('links to editLink and pushes it through the router on click', () => {
    const router = createTestRouter();
    renderCard({}, router);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '#/collections/posts/entries/hello-world');
    fireEvent.click(link);
    expect(router.push).toHaveBeenCalledWith('/collections/posts/entries/hello-world');
  });

  describe('delete button', () => {
    it('is rendered when canDelete is true', () => {
      renderCard({ canDelete: true });
      expect(screen.getByRole('button', { name: phrases.deleteNewEntry, hidden: true })).toBeInTheDocument();
    });

    it('is omitted when canDelete is false', () => {
      renderCard({ canDelete: false });
      expect(screen.queryByRole('button', { name: phrases.deleteNewEntry, hidden: true })).toBeNull();
      expect(screen.queryByRole('button', { name: phrases.deleteChanges, hidden: true })).toBeNull();
    });

    it('uses deleteNewEntry label when not a modification', () => {
      renderCard({ isModification: false });
      expect(screen.getByRole('button', { name: phrases.deleteNewEntry, hidden: true })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: phrases.deleteChanges, hidden: true })).toBeNull();
    });

    it('uses deleteChanges label when a modification', () => {
      renderCard({ isModification: true });
      expect(screen.getByRole('button', { name: phrases.deleteChanges, hidden: true })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: phrases.deleteNewEntry, hidden: true })).toBeNull();
    });

    it('calls onDelete on click', () => {
      const { onDelete, onPublish } = renderCard();
      fireEvent.click(screen.getByRole('button', { name: phrases.deleteNewEntry, hidden: true }));
      expect(onDelete).toHaveBeenCalledTimes(1);
      expect(onPublish).not.toHaveBeenCalled();
    });
  });

  describe('publish button', () => {
    it('is rendered when allowPublish is true', () => {
      renderCard({ allowPublish: true });
      expect(screen.getByRole('button', { name: phrases.publishNewEntry, hidden: true })).toBeInTheDocument();
    });

    it('is omitted when allowPublish is false', () => {
      renderCard({ allowPublish: false });
      expect(screen.queryByRole('button', { name: phrases.publishNewEntry, hidden: true })).toBeNull();
      expect(screen.queryByRole('button', { name: phrases.publishChanges, hidden: true })).toBeNull();
    });

    it('is enabled when canPublish is true', () => {
      renderCard({ canPublish: true });
      expect(screen.getByRole('button', { name: phrases.publishNewEntry, hidden: true })).toBeEnabled();
    });

    it('is disabled when canPublish is false and does not fire onPublish', () => {
      const { onPublish } = renderCard({ canPublish: false });
      const button = screen.getByRole('button', { name: phrases.publishNewEntry, hidden: true });
      expect(button).toBeDisabled();
      fireEvent.click(button);
      expect(onPublish).not.toHaveBeenCalled();
    });

    it('uses publishNewEntry label when not a modification', () => {
      renderCard({ isModification: false });
      expect(screen.getByRole('button', { name: phrases.publishNewEntry, hidden: true })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: phrases.publishChanges, hidden: true })).toBeNull();
    });

    it('uses publishChanges label when a modification', () => {
      renderCard({ isModification: true });
      expect(screen.getByRole('button', { name: phrases.publishChanges, hidden: true })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: phrases.publishNewEntry, hidden: true })).toBeNull();
    });

    it('calls onPublish on click', () => {
      const { onDelete, onPublish } = renderCard();
      fireEvent.click(screen.getByRole('button', { name: phrases.publishNewEntry, hidden: true }));
      expect(onPublish).toHaveBeenCalledTimes(1);
      expect(onDelete).not.toHaveBeenCalled();
    });
  });

  describe('date line', () => {
    it('omits the line when neither timestamp nor authorLastChange is set', () => {
      renderCard({ timestamp: '', authorLastChange: undefined });
      expect(screen.queryByText(/by /)).toBeNull();
      expect(screen.queryByText('yesterday')).toBeNull();
    });

    it('renders "date by author" when both are set (lastChange)', () => {
      renderCard({ timestamp: 'yesterday', authorLastChange: 'Alice' });
      expect(screen.getByText('yesterday by Alice')).toBeInTheDocument();
    });

    it('renders only the date when author is missing (lastChangeNoAuthor)', () => {
      renderCard({ timestamp: 'yesterday', authorLastChange: undefined });
      expect(screen.getByText('yesterday')).toBeInTheDocument();
    });

    it('renders "by author" when date is missing (lastChangeNoDate)', () => {
      renderCard({ timestamp: '', authorLastChange: 'Alice' });
      expect(screen.getByText('by Alice')).toBeInTheDocument();
    });
  });
});
