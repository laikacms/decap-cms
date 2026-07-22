/**
 * Unit tests for the map widget's MapPreview component (DCMS-1366).
 *
 * MapPreview had zero test coverage. These tests lock down its rendering:
 * an undefined/empty value renders an empty container, and a GeoJSON string
 * value (Point, LineString, or Polygon) is rendered verbatim as text.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import MapPreview from '@/widgets/map/MapPreview';

describe('MapPreview (map)', () => {
  it('renders an empty container when value is undefined', () => {
    const { container } = render(React.createElement(MapPreview, { value: undefined }));

    expect(container.firstElementChild).not.toBeNull();
    expect(container.firstElementChild?.textContent).toBe('');
  });

  it('renders an empty container when value is an empty string', () => {
    const { container } = render(React.createElement(MapPreview, { value: '' }));

    expect(container.firstElementChild?.textContent).toBe('');
  });

  it('renders a Point GeoJSON value', () => {
    const value = JSON.stringify({
      type: 'Point',
      coordinates: [-73.9857, 40.7484],
    });

    const { container } = render(React.createElement(MapPreview, { value }));

    expect(container.textContent).toBe(value);
  });

  it('renders a LineString GeoJSON value', () => {
    const value = JSON.stringify({
      type: 'LineString',
      coordinates: [
        [-73.9857, 40.7484],
        [-73.9787, 40.7527],
      ],
    });

    const { container } = render(React.createElement(MapPreview, { value }));

    expect(container.textContent).toBe(value);
  });

  it('renders a Polygon GeoJSON value', () => {
    const value = JSON.stringify({
      type: 'Polygon',
      coordinates: [
        [
          [-73.9857, 40.7484],
          [-73.9787, 40.7527],
          [-73.98, 40.75],
          [-73.9857, 40.7484],
        ],
      ],
    });

    const { container } = render(React.createElement(MapPreview, { value }));

    expect(container.textContent).toBe(value);
  });
});
