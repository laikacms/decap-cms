/** @jsxImportSource @emotion/react */
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { XIcon } from 'lucide-react';
import * as React from 'react';

import { Button } from './Button';
import { css } from './styled';

const ROOT_ID = 'nc-root';

/**
 * Raw Base UI dialog parts, re-exported so every dialog implementation in the
 * app imports Base UI through this one wrapper (DCMS-542) instead of pulling
 * `@base-ui/react/dialog` directly. Use this when a consumer needs a custom
 * layout/portal-container (see `core/components/UI/Modal.tsx` and
 * `laika-app/ui/LaikaDialog.tsx`) rather than the composed `DialogContent`
 * above.
 */
export { DialogPrimitive };

export function Dialog({
  open,
  defaultOpen = false,
  onOpenChange,
  children,
}: {
  open?: boolean,
  defaultOpen?: boolean,
  onOpenChange?: (open: boolean) => void,
  children?: React.ReactNode,
}): React.ReactNode {
  return (
    <DialogPrimitive.Root
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={nextOpen => onOpenChange?.(nextOpen)}
    >
      {children}
    </DialogPrimitive.Root>
  );
}

type ComposedButtonProps = React.ComponentProps<'button'> & {
  asChild?: boolean,
};

type RenderElement = React.ReactElement<Record<string, unknown>>;

export const DialogTrigger = React.forwardRef<HTMLButtonElement, ComposedButtonProps>(
  function DialogTrigger({ asChild = false, children, ...props }, ref) {
    if (asChild && React.isValidElement(children)) {
      return <DialogPrimitive.Trigger ref={ref} render={children as RenderElement} {...props} />;
    }
    return (
      <DialogPrimitive.Trigger ref={ref} {...props}>
        {children}
      </DialogPrimitive.Trigger>
    );
  },
);

export function DialogPortal({ children }: { children?: React.ReactNode }): React.ReactNode {
  return children;
}

export const DialogClose = React.forwardRef<HTMLButtonElement, ComposedButtonProps>(
  function DialogClose({ asChild = false, children, ...props }, ref) {
    if (asChild && React.isValidElement(children)) {
      return <DialogPrimitive.Close ref={ref} render={children as RenderElement} {...props} />;
    }
    return (
      <DialogPrimitive.Close ref={ref} {...props}>
        {children}
      </DialogPrimitive.Close>
    );
  },
);

const overlayClass = css`
  position: fixed;
  inset: 0;
  z-index: 50;
  background-color: rgb(0 0 0 / 0.1);
`;

export function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<'div'>): React.ReactNode {
  return <div data-slot="dialog-overlay" css={overlayClass} className={className} {...props} />;
}

const contentClass = css`
  position: fixed;
  top: 50%;
  left: 50%;
  z-index: 50;
  display: grid;
  width: 100%;
  max-width: calc(100% - 2rem);
  transform: translate(-50%, -50%);
  gap: 1.5rem;
  border-radius: 0.75rem;
  background-color: var(--popover);
  padding: 1.5rem;
  font-size: 0.875rem;
  color: var(--popover-foreground);
  outline: 1px solid color-mix(in srgb, var(--foreground), transparent 90%);
  @media (min-width: 640px) {
    max-width: 28rem;
  }
`;

const closeButtonClass = css`
  position: absolute;
  top: 1rem;
  right: 1rem;
`;

const srOnly = css`
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
`;

export function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<'div'> & {
  showCloseButton?: boolean,
}): React.ReactNode {
  const container = typeof document !== 'undefined' ? (document.getElementById(ROOT_ID) ?? undefined) : undefined;

  return (
    <DialogPrimitive.Portal container={container}>
      <DialogPrimitive.Backdrop data-slot="dialog-overlay" css={overlayClass} />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        css={contentClass}
        className={className}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogClose asChild>
            <Button variant="ghost" size="icon-sm" css={closeButtonClass}>
              <XIcon />
              <span css={srOnly}>Close</span>
            </Button>
          </DialogClose>
        )}
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  );
}

const headerClass = css`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

export function DialogHeader({
  className,
  ...props
}: React.ComponentProps<'div'>): React.ReactNode {
  return <div data-slot="dialog-header" css={headerClass} className={className} {...props} />;
}

const footerClass = css`
  display: flex;
  flex-direction: column-reverse;
  gap: 0.5rem;
  @media (min-width: 640px) {
    flex-direction: row;
    justify-content: flex-end;
  }
`;

export function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<'div'> & { showCloseButton?: boolean }): React.ReactNode {
  return (
    <div data-slot="dialog-footer" css={footerClass} className={className} {...props}>
      {children}
      {showCloseButton && (
        <DialogClose asChild>
          <Button variant="outline">Close</Button>
        </DialogClose>
      )}
    </div>
  );
}

const titleClass = css`
  line-height: 1;
  font-weight: 500;
`;

export function DialogTitle({ className, ...props }: React.ComponentProps<'h2'>): React.ReactNode {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      css={titleClass}
      className={className}
      {...props}
    />
  );
}

const descriptionClass = css`
  font-size: 0.875rem;
  color: var(--muted-foreground);
`;

export function DialogDescription({
  className,
  ...props
}: React.ComponentProps<'p'>): React.ReactNode {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      css={descriptionClass}
      className={className}
      {...props}
    />
  );
}
