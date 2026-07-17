import { fireEvent, render } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { focusSiblingNavItem, handleNavItemKeyDown, moveFocusWithinContainer, navItemProps } from '@/laika-app/listNav';

function Card({ id }: { id: string }) {
  return (
    <button data-testid={id} {...navItemProps} onKeyDown={handleNavItemKeyDown}>
      {id}
    </button>
  );
}

describe('focusSiblingNavItem', () => {
  it('enters the list at the first item when nothing is focused', () => {
    const { getByTestId } = render(
      <>
        <Card id="one" />
        <Card id="two" />
      </>,
    );
    expect(focusSiblingNavItem(1)).toBe(true);
    expect(document.activeElement).toBe(getByTestId('one'));
  });

  it('walks forward and backward from the focused item', () => {
    const { getByTestId } = render(
      <>
        <Card id="one" />
        <Card id="two" />
        <Card id="three" />
      </>,
    );
    getByTestId('one').focus();
    focusSiblingNavItem(1);
    expect(document.activeElement).toBe(getByTestId('two'));
    focusSiblingNavItem(-1);
    expect(document.activeElement).toBe(getByTestId('one'));
  });

  it('stops at the ends', () => {
    const { getByTestId } = render(<Card id="only" />);
    getByTestId('only').focus();
    expect(focusSiblingNavItem(1)).toBe(false);
    expect(document.activeElement).toBe(getByTestId('only'));
  });

  it('stays inside the containing modal', () => {
    const { getByTestId } = render(
      <>
        <Card id="outside" />
        <div role="dialog">
          <Card id="inside-a" />
          <Card id="inside-b" />
        </div>
      </>,
    );
    getByTestId('inside-b').focus();
    // Forward from the last in-dialog item must not escape to page items.
    expect(focusSiblingNavItem(1)).toBe(false);
    focusSiblingNavItem(-1);
    expect(document.activeElement).toBe(getByTestId('inside-a'));
  });
});

describe('handleNavItemKeyDown', () => {
  it('moves with ArrowRight/ArrowLeft and jumps with Home/End', () => {
    const { getByTestId } = render(
      <>
        <Card id="one" />
        <Card id="two" />
        <Card id="three" />
      </>,
    );
    const one = getByTestId('one');
    one.focus();
    fireEvent.keyDown(one, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(getByTestId('two'));
    fireEvent.keyDown(getByTestId('two'), { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(one);
    fireEvent.keyDown(one, { key: 'End' });
    expect(document.activeElement).toBe(getByTestId('three'));
    fireEvent.keyDown(getByTestId('three'), { key: 'Home' });
    expect(document.activeElement).toBe(one);
  });

  it('falls back to DOM order for ArrowDown/ArrowUp without layout', () => {
    // jsdom reports zero rects for everything, so the geometric row logic
    // finds no candidate and the handler steps in DOM order instead.
    const { getByTestId } = render(
      <>
        <Card id="one" />
        <Card id="two" />
      </>,
    );
    const one = getByTestId('one');
    one.focus();
    fireEvent.keyDown(one, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(getByTestId('two'));
    fireEvent.keyDown(getByTestId('two'), { key: 'ArrowUp' });
    expect(document.activeElement).toBe(one);
  });

  it('ignores unrelated keys', () => {
    const { getByTestId } = render(
      <>
        <Card id="one" />
        <Card id="two" />
      </>,
    );
    const one = getByTestId('one');
    one.focus();
    fireEvent.keyDown(one, { key: 'Enter' });
    expect(document.activeElement).toBe(one);
  });
});

describe('moveFocusWithinContainer', () => {
  it('cycles focus over the matching elements inside the container only', () => {
    const { getByTestId } = render(
      <>
        <div data-testid="container">
          <a data-testid="link-a" href="#a">
            a
          </a>
          <a data-testid="link-b" href="#b">
            b
          </a>
        </div>
        <a data-testid="outside" href="#c">
          c
        </a>
      </>,
    );
    const container = getByTestId('container');
    expect(moveFocusWithinContainer(container, 'a[href]', 1)).toBe(true);
    expect(document.activeElement).toBe(getByTestId('link-a'));
    moveFocusWithinContainer(container, 'a[href]', 1);
    expect(document.activeElement).toBe(getByTestId('link-b'));
    expect(moveFocusWithinContainer(container, 'a[href]', 1)).toBe(false);
  });
});
