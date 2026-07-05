import React from 'react';
import { render } from '@testing-library/react';
import { fromJS, Map } from 'immutable';

import CodePreview from '../CodePreview';

describe('CodePreview', () => {
  it('renders a string value verbatim inside <pre><code>', () => {
    const field = fromJS({ name: 'body', widget: 'code' });
    const { container } = render(<CodePreview value="const x = 1;" field={field} />);

    const code = container.querySelector('pre > code');
    expect(code).toBeInTheDocument();
    expect(code.textContent).toBe('const x = 1;');
  });

  it('reads the default "code" key from an Immutable Map value', () => {
    const field = fromJS({ name: 'body', widget: 'code' });
    const value = Map({ code: 'console.log("hi");', lang: 'js' });
    const { container } = render(<CodePreview value={value} field={field} />);

    const code = container.querySelector('pre > code');
    expect(code.textContent).toBe('console.log("hi");');
  });

  it('honors a custom field.keys.code override for an Immutable Map value', () => {
    const field = fromJS({ name: 'body', widget: 'code', keys: { code: 'source' } });
    const value = Map({ source: 'print("hi")', code: 'not this one' });
    const { container } = render(<CodePreview value={value} field={field} />);

    const code = container.querySelector('pre > code');
    expect(code.textContent).toBe('print("hi")');
  });

  it('renders empty content for a non-string, non-Map value', () => {
    const field = fromJS({ name: 'body', widget: 'code' });
    const { container } = render(<CodePreview value={undefined} field={field} />);

    const code = container.querySelector('pre > code');
    expect(code).toBeInTheDocument();
    expect(code.textContent).toBe('');
  });
});
