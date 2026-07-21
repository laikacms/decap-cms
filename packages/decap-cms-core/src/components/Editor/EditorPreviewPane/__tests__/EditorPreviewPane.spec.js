import { fromJS, Map } from 'immutable';

import { PreviewPane, PREVIEW_FRAME_INITIAL_CONTENT } from '../EditorPreviewPane';
import { registerWidget } from '../../../../lib/registry';

jest.mock('@emotion/styled', () => {
  // eslint-disable-next-line react/display-name, func-style
  const mockStyled = tag => props => require('react').createElement(tag, props);
  mockStyled.div = mockStyled('div');
  return mockStyled;
});

function NoopPreview() {
  return null;
}

function NoopControl() {
  return null;
}

describe('PreviewPane.getWidget (DCMS-301)', () => {
  beforeAll(() => {
    // A widget preview is only ever invoked for widgets that are actually
    // registered; register a benign one so we can assert `getWidget` never
    // even gets far enough to resolve it for a `hidden` field.
    registerWidget('string', NoopControl, NoopPreview);
  });

  function makeInstance() {
    return new PreviewPane({
      getAsset: jest.fn(),
      entry: fromJS({ data: {} }),
    });
  }

  it('returns null for a hidden field instead of resolving a fallback preview', () => {
    const instance = makeInstance();
    const field = fromJS({ name: 'secret', widget: 'hidden' });

    const result = instance.getWidget(field, 'some-value', Map(), instance.props);

    expect(result).toBeNull();
  });

  it('still resolves a preview component for a visible field', () => {
    const instance = makeInstance();
    const field = fromJS({ name: 'title', widget: 'string' });

    const result = instance.getWidget(field, 'hello', Map(), instance.props);

    expect(result).not.toBeNull();
  });
});

describe('PreviewPane.widgetsForNestedFields (DCMS-538)', () => {
  beforeAll(() => {
    registerWidget('string', NoopControl, NoopPreview);
  });

  function makeInstance() {
    return new PreviewPane({
      getAsset: jest.fn(),
      entry: fromJS({ data: {} }),
    });
  }

  it('never resolves a fallback preview for a hidden field reached via nested recursion', () => {
    // Mirrors the `list -> object -> list -> hidden` repro from the issue:
    // a hidden field nested inside sibling fields must be skipped by the
    // same recursive resolver (`widgetFor` via `widgetsForNestedFields`)
    // that resolves its visible siblings, not just by the top-level filter.
    const instance = makeInstance();
    const fields = fromJS([
      { name: 'secret', widget: 'hidden' },
      { name: 'title', widget: 'string' },
    ]);
    const values = fromJS({ secret: 'hidden', title: 'hello' });

    const results = instance.widgetsForNestedFields(fields, values, Map());

    expect(results.get(0)).toBeNull();
    expect(results.get(1)).not.toBeNull();
  });
});

describe('PreviewPane preview iframe wrap CSS (DCMS-1289)', () => {
  // The preview iframe is a fresh document (via react-frame-component's
  // `initialContent`), so page-level CSS never reaches it — any wrap rule
  // has to be injected directly into this HTML string's <style> block.
  // A long unbroken string (API token, hex digest) pasted into a widget
  // otherwise overflows the iframe's initial containing block instead of
  // wrapping, same defect PR #982 fixed on the v4.beta component layout.
  it('injects overflow-wrap/word-break rules into the iframe head', () => {
    expect(PREVIEW_FRAME_INITIAL_CONTENT).toContain('overflow-wrap: anywhere');
    expect(PREVIEW_FRAME_INITIAL_CONTENT).toContain('word-break: break-word');
    expect(PREVIEW_FRAME_INITIAL_CONTENT).toContain('max-width: 100%');
  });

  it('preserves the base target="_blank" tag used for outbound preview links', () => {
    expect(PREVIEW_FRAME_INITIAL_CONTENT).toContain('<base target="_blank"/>');
  });
});
