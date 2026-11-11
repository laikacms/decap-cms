import { fireEvent, render } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import ListControl from '@/widgets/list/ListControl';

describe('erroneous typed list items', () => {
  const field = {
    name: 'sections',
    types: [{ name: 'text', widget: 'object', fields: [{ name: 'body', widget: 'string' }] }],
  };

  function renderList(value: unknown[], overrides: Record<string, unknown> = {}) {
    const onChange = vi.fn();
    function ControlledList() {
      const [currentValue, setValue] = React.useState<unknown>(value);
      return (
        <ListControl
          {...({
            field: { ...field, ...overrides },
            value: currentValue,
            onChange: (nextValue: unknown, metadata: unknown) => {
              onChange(nextValue, metadata);
              setValue(nextValue);
            },
            onChangeObject: vi.fn(),
            validate: vi.fn(),
            mediaPaths: {},
            getAsset: vi.fn(),
            onOpenMediaLibrary: vi.fn(),
            onAddAsset: vi.fn(),
            onRemoveInsertedMedia: vi.fn(),
            classNameWrapper: 'list-control',
            setActiveStyle: vi.fn(),
            setInactiveStyle: vi.fn(),
            editorControl: vi.fn(),
            resolveWidget: vi.fn(),
            onValidateObject: vi.fn(),
            clearFieldErrors: vi.fn(),
            fieldsErrors: {},
            entry: { path: 'pages/index.md' },
            forID: 'sections',
            t: (key: string) => key,
          } as any)}
        />
      );
    }
    const result = render(<ControlledList />);
    return { ...result, onChange };
  }

  it.each([
    [{ body: 'Missing type' }, "Error: item has no 'type' property"],
    [{ type: 'unknown', body: 'Unknown type' }, "Error: item has illegal 'type' property: 'unknown'"],
  ])('allows removing an invalid item: %j', (item, message) => {
    const remaining = { body: 'Keep this item' };
    const { getAllByText, onChange } = renderList([item, remaining]);
    const row = getAllByText(message)[0].closest('.SortableListItem')!;
    const removeButton = row.querySelector('button[aria-label="Remove"]');

    expect(removeButton).toBeInTheDocument();
    fireEvent.click(removeButton!);

    expect(onChange).toHaveBeenCalledWith([remaining], undefined);
  });

  it.each([
    [{}, true, true],
    [{ allow_remove: false }, false, true],
    [{ allow_reorder: false }, true, false],
    [{ allow_remove: false, allow_reorder: false }, false, false],
  ])('respects the configured controls: %j', (overrides, allowRemove, allowReorder) => {
    const { getByText } = renderList([{ body: 'Missing type' }], overrides);
    const row = getByText("Error: item has no 'type' property").closest('.SortableListItem')!;

    expect(Boolean(row.querySelector('button[aria-label="Remove"]'))).toBe(allowRemove);
    expect(Boolean(row.querySelector('[draggable="true"]'))).toBe(allowReorder);
  });
});
