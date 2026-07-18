/** @jsxImportSource @emotion/react */
import { ContentEditable as LexicalContentEditable } from '@lexical/react/LexicalContentEditable';

import { css, cx } from '@/ui/styled';

import type { ReactNode } from 'react';

interface Props {
  placeholder: string;
  className?: string;
  placeholderClassName?: string;
  /**
   * Reserve a left gutter wide enough for the draggable-block handle
   * (+ and grip buttons, ~52px). Without it the handle overlays the first
   * characters of every hovered line and swallows clicks aimed at the text.
   * The gutter is part of these emotion styles rather than a utility class:
   * a `.pl-14` on `className` ties with `padding` here on specificity, so
   * which one wins depends on style-injection order.
   */
  hasDragGutter?: boolean;
  /** Applied to the editable `role="textbox"` element so failed-validation
   * state is programmatically discoverable (WCAG 2.1 3.3.1 / 3.3.3). */
  ariaRequired?: boolean;
  ariaInvalid?: boolean;
  ariaErrorMessage?: string;
}

const rootClass = css`
  position: relative;
  display: block;
  min-height: 18rem;
  overflow: auto;
  padding: 0.5rem 1rem;
  cursor: text;
  &:focus {
    outline: none;
  }
`;

const placeholderClass = css`
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  color: var(--muted-foreground);
  padding: 0.5rem 1rem;
  overflow: hidden;
  text-overflow: ellipsis;
  user-select: none;
`;

const dragGutterClass = css`
  padding-left: 3.5rem;
`;

export function ContentEditable({
  placeholder,
  className,
  placeholderClassName,
  hasDragGutter = false,
  ariaRequired,
  ariaInvalid,
  ariaErrorMessage,
}: Props): ReactNode {
  return (
    <LexicalContentEditable
      css={[rootClass, hasDragGutter && dragGutterClass]}
      className={cx('ContentEditable__root', className)}
      aria-placeholder={placeholder}
      aria-required={ariaRequired}
      aria-invalid={ariaInvalid || undefined}
      aria-errormessage={ariaInvalid ? ariaErrorMessage : undefined}
      placeholder={
        <div
          css={[placeholderClass, hasDragGutter && dragGutterClass]}
          className={placeholderClassName}
        >
          {placeholder}
        </div>
      }
    />
  );
}
