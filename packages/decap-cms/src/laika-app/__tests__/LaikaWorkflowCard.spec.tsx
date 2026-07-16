import { fireEvent, render } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/core/i18n', () => ({
  translate: () => (Component: React.ComponentType<any>) => {
    return function Translated(props: any) {
      return <Component {...props} t={(key: string) => key} />;
    };
  },
}));

import LaikaWorkflowCard from '@/laika-app/LaikaWorkflowCard';

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="route">{location.pathname}</div>;
}

const baseProps = {
  collectionLabel: 'Posts',
  title: 'Hello world',
  body: 'Some body text…',
  authorLastChange: 'Alice',
  timestamp: 'just now',
  editLink: '/collections/posts/entries/hello-world',
  isModification: false,
  onDelete: vi.fn(),
  allowPublish: true,
  canPublish: true,
  onPublish: vi.fn(),
};

describe('LaikaWorkflowCard', () => {
  it('renders the title, collection label and body', () => {
    const { getByText } = render(
      <MemoryRouter>
        <LaikaWorkflowCard {...baseProps} />
      </MemoryRouter>,
    );
    expect(getByText('Hello world')).toBeInTheDocument();
    expect(getByText('Posts')).toBeInTheDocument();
    expect(getByText('Some body text…')).toBeInTheDocument();
  });

  it('navigates to editLink when the clickable surface is clicked', () => {
    const { getByText, getByTestId } = render(
      <MemoryRouter initialEntries={['/workflow']}>
        <Routes>
          <Route path="/workflow" element={<LaikaWorkflowCard {...baseProps} />} />
          <Route path="*" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.click(getByText('Hello world'));
    expect(getByTestId('route').textContent).toBe('/collections/posts/entries/hello-world');
  });

  it('fires onDelete when delete is clicked', () => {
    const onDelete = vi.fn();
    const { getByText } = render(
      <MemoryRouter>
        <LaikaWorkflowCard {...baseProps} onDelete={onDelete} />
      </MemoryRouter>,
    );
    fireEvent.click(getByText('workflow.workflowCard.deleteNewEntry'));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('fires onPublish when publish is clicked + publish allowed', () => {
    const onPublish = vi.fn();
    const { getByText } = render(
      <MemoryRouter>
        <LaikaWorkflowCard {...baseProps} onPublish={onPublish} />
      </MemoryRouter>,
    );
    fireEvent.click(getByText('workflow.workflowCard.publishNewEntry'));
    expect(onPublish).toHaveBeenCalledTimes(1);
  });

  it('hides publish when allowPublish is false', () => {
    const { queryByText } = render(
      <MemoryRouter>
        <LaikaWorkflowCard {...baseProps} allowPublish={false} />
      </MemoryRouter>,
    );
    expect(queryByText('workflow.workflowCard.publishNewEntry')).toBeNull();
  });
});
