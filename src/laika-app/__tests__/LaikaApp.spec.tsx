import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// Capture the props that DefaultApp receives so we can verify the
// slot/render-prop merging logic without mounting the entire CMS.
const capturedProps: { current: any } = { current: null };

vi.mock('../../core/index', () => ({
  App: function DefaultApp(props: any) {
    capturedProps.current = props;
    return null;
  },
}));

// Stub all the laika components LaikaApp imports — they'd otherwise
// pull in their own dependency graphs which fight with the core mock.
vi.mock('../LaikaHeader', () => ({ default: () => null }));
vi.mock('../LaikaLayout', () => ({ default: () => null }));
vi.mock('../LaikaAuthenticationPage', () => ({ default: () => null }));
vi.mock('../LaikaDashboard', () => ({ default: () => null }));
vi.mock('../LaikaCollectionTop', () => ({ default: () => null }));
vi.mock('../LaikaEntryCard', () => ({ default: () => null }));
vi.mock('../LaikaEmptyEntryList', () => ({ default: () => null }));
vi.mock('../LaikaLoader', () => ({ default: () => null }));
vi.mock('../LaikaWorkflowCard', () => ({ default: () => null }));
vi.mock('../LaikaNotifications', () => ({ default: () => null }));
vi.mock('../LaikaCollectionControls', () => ({ default: () => null }));
vi.mock('../LaikaEditorToolbar', () => ({ default: () => null }));
vi.mock('../LaikaEditorViewControls', () => ({ default: () => null }));
vi.mock('../LaikaMediaLibraryCard', () => ({ default: () => null }));
vi.mock('../LaikaMediaLibraryTop', () => ({ default: () => null }));
vi.mock('../LaikaNotFoundPage', () => ({ default: () => null }));
vi.mock('../LaikaFooter', () => ({ default: () => null }));
vi.mock('../LaikaSettingsPage', () => ({ default: () => null }));
vi.mock('../LaikaBootstrapScreens', () => ({
  LaikaConfigLoading: () => null,
  LaikaConfigError: () => null,
}));
vi.mock('../LaikaErrorScreen', () => ({ default: () => null }));

import LaikaApp from '../LaikaApp';

describe('LaikaApp', () => {
  it('wires every laika slot through to DefaultApp by default', () => {
    capturedProps.current = null;
    render(<LaikaApp />);

    const p = capturedProps.current;
    expect(typeof p.renderHeader).toBe('function');
    expect(typeof p.renderLayout).toBe('function');
    expect(typeof p.renderAuth).toBe('function');
    expect(typeof p.renderRoot).toBe('function');
    expect(typeof p.renderNotifications).toBe('function');
    expect(typeof p.renderNotFound).toBe('function');
    expect(typeof p.renderFooter).toBe('function');
    expect(typeof p.renderConfigLoading).toBe('function');
    expect(typeof p.renderConfigError).toBe('function');
    expect(typeof p.renderError).toBe('function');
    expect(p.extraRoutes).toBeTruthy();

    // CmsSlots — every laika-provided slot should be present
    const s = p.slots;
    expect(typeof s.renderCollectionTop).toBe('function');
    expect(typeof s.renderCollectionControls).toBe('function');
    expect(typeof s.renderEntryCard).toBe('function');
    expect(typeof s.renderEntryListEmpty).toBe('function');
    expect(typeof s.renderLoader).toBe('function');
    expect(typeof s.renderWorkflowCard).toBe('function');
    expect(typeof s.renderEditorToolbar).toBe('function');
    expect(typeof s.renderEditorViewControls).toBe('function');
    expect(typeof s.renderMediaLibraryCard).toBe('function');
    expect(typeof s.renderMediaLibraryTop).toBe('function');
    expect(typeof s.renderCollectionSidebar).toBe('function');
  });

  it('honors a top-level render-prop override', () => {
    capturedProps.current = null;
    const customHeader = () => null;
    render(<LaikaApp renderHeader={customHeader} />);
    expect(capturedProps.current.renderHeader).toBe(customHeader);
  });

  it('merges a slots override on top of the laika defaults', () => {
    capturedProps.current = null;
    const customEntryCard = () => null;
    render(<LaikaApp slots={{ renderEntryCard: customEntryCard }} />);

    const s = capturedProps.current.slots;
    // The override replaces just the one slot…
    expect(s.renderEntryCard).toBe(customEntryCard);
    // …while leaving every other laika default intact.
    expect(typeof s.renderCollectionTop).toBe('function');
    expect(typeof s.renderWorkflowCard).toBe('function');
    expect(typeof s.renderCollectionSidebar).toBe('function');
  });

  it('appends extra routes to the laika default settings route', () => {
    capturedProps.current = null;
    render(<LaikaApp />);
    const defaultRoutes = capturedProps.current.extraRoutes;

    capturedProps.current = null;
    const customRoute = <span data-testid="custom-route" />;
    render(<LaikaApp extraRoutes={customRoute} />);
    const merged = capturedProps.current.extraRoutes;

    // Default branch returns the bare laika `<Route />` element; the
    // override branch wraps it in a fragment alongside the custom node.
    expect(merged).not.toBe(defaultRoutes);
    expect(merged.type).toBe(React.Fragment);
    // React.Children.toArray clones each child with a synthetic key, so
    // reference equality won't match — assert on length + types instead.
    const children = React.Children.toArray(merged.props.children);
    expect(children).toHaveLength(2);
    expect((children[1] as React.ReactElement).type).toBe('span');
    expect(
      ((children[1] as React.ReactElement).props as { 'data-testid': string })['data-testid'],
    ).toBe('custom-route');
  });
});
