import { render } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import LaikaCard from '@/laika-app/ui/LaikaCard';

describe('LaikaCard', () => {
  it('renders children', () => {
    const { getByText } = render(<LaikaCard>body text</LaikaCard>);
    expect(getByText('body text')).toBeInTheDocument();
  });

  it('composes Header / Title / Body / Footer subcomponents', () => {
    const { getByText } = render(
      <LaikaCard>
        <LaikaCard.Header>
          <LaikaCard.Title>Posts</LaikaCard.Title>
        </LaikaCard.Header>
        <LaikaCard.Body>5 entries</LaikaCard.Body>
        <LaikaCard.Footer>browse</LaikaCard.Footer>
      </LaikaCard>,
    );
    expect(getByText('Posts')).toBeInTheDocument();
    expect(getByText('5 entries')).toBeInTheDocument();
    expect(getByText('browse')).toBeInTheDocument();
  });

  it('respects the interactive=false flag without throwing', () => {
    const { getByText } = render(<LaikaCard interactive={false}>static panel</LaikaCard>);
    expect(getByText('static panel')).toBeInTheDocument();
  });
});
