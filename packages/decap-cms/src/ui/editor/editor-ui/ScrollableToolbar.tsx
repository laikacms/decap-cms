import { useRef } from 'react';

import { Button } from '@/ui/Button';
import { ChevronRightIcon } from '@/ui/icons/index';
import { useScrollOverflow } from '@/ui/hooks';
import { css, cx } from '@/ui/styled';

import type { ReactNode } from 'react';

interface Props {
  /** `aria-label` on the `role="toolbar"` element. */
  ariaLabel: string;
  /** Label for the trailing "scroll right" button, shown only while more
   * content is hidden past the right edge (DCMS-1512 acceptance criteria). */
  overflowLabel: string;
  /** Label for the leading "scroll left" button, shown only once scrolled
   * away from the start. */
  underflowLabel: string;
  /** Classes for the scrollable `role="toolbar"` element itself. */
  className?: string;
  /** Classes for the outer positioning wrapper (e.g. `sticky top-0 z-10`).
   * Kept separate from `className` so sticky positioning stays in sync with
   * the overflow arrow buttons, which are absolutely positioned against this
   * wrapper rather than the scrollable toolbar. */
  wrapperClassName?: string;
  children: ReactNode;
}

const wrapperClass = css`
  position: relative;
  min-width: 0;
`;

// Edge-fade mask: a cheap, always-visible cue that content continues past
// the edge, layered on top of the arrow buttons below (which give a
// mouse-only user an actual way to reach it without swipe-scrolling).
const toolbarClass = css`
  &[data-overflow='left'],
  &[data-overflow='right'],
  &[data-overflow='both'] {
    mask-image: linear-gradient(to right, transparent, black);
    -webkit-mask-image: linear-gradient(to right, transparent, black);
  }
  &[data-overflow='right'] {
    mask-image: linear-gradient(to right, black calc(100% - 24px), transparent);
    -webkit-mask-image: linear-gradient(to right, black calc(100% - 24px), transparent);
  }
  &[data-overflow='both'] {
    mask-image: linear-gradient(to right, transparent, black 24px, black calc(100% - 24px), transparent);
    -webkit-mask-image: linear-gradient(
      to right,
      transparent,
      black 24px,
      black calc(100% - 24px),
      transparent
    );
  }
`;

const scrollButtonBaseClass = css`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 20;
  box-shadow:
    0 1px 3px 0 rgb(0 0 0 / 0.1),
    0 1px 2px -1px rgb(0 0 0 / 0.1);
`;

const scrollButtonLeftClass = css`
  left: 0;
`;

const scrollButtonRightClass = css`
  right: 0;
`;

const chevronLeftClass = css`
  display: inline-flex;
  transform: rotate(180deg);
`;

export function ScrollableToolbar(
  { ariaLabel, overflowLabel, underflowLabel, className, wrapperClassName, children }: Props,
) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const { canScrollLeft, canScrollRight } = useScrollOverflow(scrollRef);

  const overflow = canScrollLeft && canScrollRight
    ? 'both'
    : canScrollRight
    ? 'right'
    : canScrollLeft
    ? 'left'
    : undefined;

  const scrollByDirection = (direction: 1 | -1) => {
    const element = scrollRef.current;
    if (!element) return;
    element.scrollBy({ left: direction * element.clientWidth * 0.8, behavior: 'smooth' });
  };

  return (
    <div css={wrapperClass} className={wrapperClassName}>
      <div
        ref={scrollRef}
        role="toolbar"
        aria-label={ariaLabel}
        aria-orientation="horizontal"
        data-overflow={overflow}
        css={toolbarClass}
        className={cx('overflow-auto', className)}
      >
        {children}
      </div>
      {canScrollLeft && (
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label={underflowLabel}
          css={[scrollButtonBaseClass, scrollButtonLeftClass]}
          onClick={() => scrollByDirection(-1)}
        >
          <span css={chevronLeftClass}>
            <ChevronRightIcon className="size-4" />
          </span>
        </Button>
      )}
      {canScrollRight && (
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label={overflowLabel}
          css={[scrollButtonBaseClass, scrollButtonRightClass]}
          onClick={() => scrollByDirection(1)}
        >
          <ChevronRightIcon className="size-4" />
        </Button>
      )}
    </div>
  );
}
