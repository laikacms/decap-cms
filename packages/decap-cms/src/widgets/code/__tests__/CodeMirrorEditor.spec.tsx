import { render } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import CodeMirrorEditor from '@/widgets/code/CodeMirrorEditor';

// DCMS-1086: PR #1085 wired aria-invalid/aria-required/aria-errormessage
// into string/text/number/colorstring/datetime/select/richtext, but missed
// the code widget: CodeMirror mounts its own editable `.cm-content` element
// rather than accepting a plain DOM prop, so the aria state has to be pushed
// through a facet reconfigure (`EditorView.contentAttributes`) instead of a
// direct JSX prop.
describe('CodeMirrorEditor aria validation wiring (DCMS-1086)', () => {
  function setup(props: Partial<React.ComponentProps<typeof CodeMirrorEditor>> = {}) {
    const utils = render(
      <CodeMirrorEditor value="" onChange={vi.fn()} {...props} />,
    );
    const content = utils.container.querySelector('.cm-content');
    return { ...utils, content };
  }

  it('applies id from the id prop to the editable content element', () => {
    const { content } = setup({ id: 'snippet-field-1' });
    expect(content).toHaveAttribute('id', 'snippet-field-1');
  });

  it('marks a required field as aria-required by default', () => {
    const { content } = setup({ ariaRequired: true });
    expect(content).toHaveAttribute('aria-required', 'true');
  });

  it('has no aria-invalid when the field has no errors', () => {
    const { content } = setup({ ariaRequired: true });
    expect(content).not.toHaveAttribute('aria-invalid');
  });

  it('sets aria-invalid and aria-errormessage when the field has errors', () => {
    const { content } = setup({ ariaInvalid: true, ariaErrorMessage: 'snippet-field-1-errors' });
    expect(content).toHaveAttribute('aria-invalid', 'true');
    expect(content).toHaveAttribute('aria-errormessage', 'snippet-field-1-errors');
  });

  it('reconfigures the aria attributes when props change after mount', () => {
    const { rerender, container } = render(
      <CodeMirrorEditor value="" onChange={vi.fn()} id="snippet-field-1" ariaInvalid={false} />,
    );
    expect(container.querySelector('.cm-content')).not.toHaveAttribute('aria-invalid');

    rerender(
      <CodeMirrorEditor
        value=""
        onChange={vi.fn()}
        id="snippet-field-1"
        ariaInvalid
        ariaErrorMessage="snippet-field-1-errors"
      />,
    );

    const content = container.querySelector('.cm-content');
    expect(content).toHaveAttribute('aria-invalid', 'true');
    expect(content).toHaveAttribute('aria-errormessage', 'snippet-field-1-errors');
  });
});
