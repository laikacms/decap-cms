import { render } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

// Capture the props that DefaultApp receives so we can verify the
// slot/render-prop merging logic without mounting the entire CMS.
const capturedProps: { current: any } = { current: null };

vi.mock('../../app/components/index', () => ({
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

import LaikaApp from '@/laika-app/LaikaApp';

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

    // The laika default is a single `/settings` route entry.
    expect(Array.isArray(defaultRoutes)).toBe(true);
    expect(defaultRoutes).toHaveLength(1);
    expect(defaultRoutes[0].path).toBe('/settings');

    capturedProps.current = null;
    const customRoute = { path: '/custom', element: <span data-testid="custom-route" /> };
    render(<LaikaApp extraRoutes={[customRoute]} />);
    const merged = capturedProps.current.extraRoutes;

    // The override is appended after the laika `/settings` route.
    expect(merged).toHaveLength(2);
    expect(merged[0].path).toBe('/settings');
    expect(merged[1]).toBe(customRoute);
  });
});
