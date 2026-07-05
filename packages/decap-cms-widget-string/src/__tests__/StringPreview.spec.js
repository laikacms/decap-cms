import React from 'react';
import { render, screen } from '@testing-library/react';
import { fromJS } from 'immutable';

import StringPreview from '../StringPreview';

describe('StringPreview', () => {
  it('renders value inside WidgetPreviewContainer when no tagname is set', () => {
    const field = fromJS({ name: 'title', widget: 'string' });
    const { container } = render(<StringPreview value="Hello World" field={field} />);
    expect(container.textContent).toBe('Hello World');
  });

  it('renders value inside the specified tagname when tagname is set', () => {
    const field = fromJS({ name: 'title', widget: 'string', tagname: 'h1' });
    render(<StringPreview value="Hello World" field={field} />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading.textContent).toBe('Hello World');
  });

  it('renders value inside h2 when tagname is h2', () => {
    const field = fromJS({ name: 'title', widget: 'string', tagname: 'h2' });
    render(<StringPreview value="Sub heading" field={field} />);
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading.textContent).toBe('Sub heading');
  });

  it('renders value inside span when tagname is span', () => {
    const field = fromJS({ name: 'title', widget: 'string', tagname: 'span' });
    const { container } = render(<StringPreview value="inline text" field={field} />);
    const span = container.querySelector('span');
    expect(span).toBeInTheDocument();
    expect(span.textContent).toBe('inline text');
  });

  it('falls back to WidgetPreviewContainer when field is undefined', () => {
    const { container } = render(<StringPreview value="fallback" />);
    expect(container.textContent).toBe('fallback');
  });

  // DCMS-345: an inferred `title` field (see selectInferredField/INFERABLE_FIELDS
  // in decap-cms-core) wraps the raw value in its own `<h1>` before it reaches
  // this widget. Combined with a field-level `tagname: h1`, this used to
  // double-wrap the value as `<h1><h1>…</h1></h1>`, which is invalid HTML and
  // triggers a React hydration error. Exactly one `<h1>` should be rendered.
  it('does not double-wrap when value is already a rendered element (DCMS-345)', () => {
    const field = fromJS({ name: 'title', widget: 'string', tagname: 'h1' });
    const alreadyWrappedValue = <h1>Sample Title</h1>;
    const { container } = render(<StringPreview value={alreadyWrappedValue} field={field} />);

    const headings = container.querySelectorAll('h1');
    expect(headings).toHaveLength(1);
    expect(container.querySelector('h1 h1')).toBeNull();
    expect(headings[0].textContent).toBe('Sample Title');
  });
});
