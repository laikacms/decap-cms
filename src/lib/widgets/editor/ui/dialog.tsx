import { XIcon } from 'lucide-react';
import * as React from 'react';
import ReactModal from 'react-modal';

import { css, cx } from './_styled';
import { Button } from './button';

const ROOT_ID = 'nc-root';

const DialogContext = React.createContext<{
  descriptionId: string;
  open: boolean;
  setOpen: (open: boolean) => void;
  titleId: string;
} | null>(null);

function useDialogContext() {
  const context = React.useContext(DialogContext);
  if (!context) throw new Error('Dialog components must be rendered inside Dialog');
  return context;
}

export function Dialog({
  open,
  defaultOpen = false,
  onOpenChange,
  children,
}: {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
}): React.ReactNode {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
  const generatedId = React.useId();
  const isOpen = open ?? internalOpen;
  const setOpen = (nextOpen: boolean) => {
    if (open === undefined) setInternalOpen(nextOpen);
    onOpenChange?.(nextOpen);
  };

  return (
    <DialogContext.Provider
      value={{
        descriptionId: `${generatedId}-description`,
        open: isOpen,
        setOpen,
        titleId: `${generatedId}-title`,
      }}
    >
      {children}
    </DialogContext.Provider>
  );
}

type ComposedButtonProps = React.ComponentProps<'button'> & {
  asChild?: boolean;
};

function renderComposedButton(
  props: ComposedButtonProps,
  ref: React.ForwardedRef<HTMLButtonElement>,
  action: () => void,
): React.ReactNode {
  const { asChild = false, children, onClick, ...buttonProps } = props;
  const handleClick: React.MouseEventHandler<HTMLButtonElement> = event => {
    onClick?.(event);
    if (!event.defaultPrevented) action();
  };

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<{
      onClick?: React.MouseEventHandler<HTMLButtonElement>;
      ref?: React.Ref<HTMLButtonElement>;
    }>;
    return React.cloneElement(child, {
      ...buttonProps,
      onClick: event => {
        child.props.onClick?.(event);
        handleClick(event);
      },
      ref,
    });
  }

  return (
    <button ref={ref} type="button" onClick={handleClick} {...buttonProps}>
      {children}
    </button>
  );
}

export const DialogTrigger = React.forwardRef<HTMLButtonElement, ComposedButtonProps>(
  function DialogTrigger(props, ref) {
    const { setOpen } = useDialogContext();
    return renderComposedButton(props, ref, () => setOpen(true));
  },
);

export function DialogPortal({ children }: { children?: React.ReactNode }): React.ReactNode {
  return children;
}

export const DialogClose = React.forwardRef<HTMLButtonElement, ComposedButtonProps>(
  function DialogClose(props, ref) {
    const { setOpen } = useDialogContext();
    return renderComposedButton(props, ref, () => setOpen(false));
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
  return <div data-slot="dialog-overlay" className={cx(overlayClass, className)} {...props} />;
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
}: React.ComponentProps<'div'> & {
  showCloseButton?: boolean;
}): React.ReactNode {
  const { descriptionId, open, setOpen, titleId } = useDialogContext();
  const hasAppRoot = typeof document !== 'undefined' && !!document.getElementById(ROOT_ID);

  React.useEffect(() => {
    if (hasAppRoot) ReactModal.setAppElement(`#${ROOT_ID}`);
  }, [hasAppRoot]);

  return (
    <ReactModal
      isOpen={open}
      onRequestClose={() => setOpen(false)}
      ariaHideApp={hasAppRoot}
      aria={{ labelledby: titleId, describedby: descriptionId }}
      className={cx(contentClass, className)}
      overlayClassName={overlayClass}
      closeTimeoutMS={0}
    >
      {children}
      {showCloseButton && (
        <DialogClose asChild>
          <Button variant="ghost" size="icon-sm" className={closeButtonClass}>
            <XIcon />
            <span className={srOnly}>Close</span>
          </Button>
        </DialogClose>
      )}
    </ReactModal>
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
  return <div data-slot="dialog-header" className={cx(headerClass, className)} {...props} />;
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
    <div data-slot="dialog-footer" className={cx(footerClass, className)} {...props}>
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
  const { titleId } = useDialogContext();
  return (
    <h2 id={titleId} data-slot="dialog-title" className={cx(titleClass, className)} {...props} />
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
  const { descriptionId } = useDialogContext();
  return (
    <p
      id={descriptionId}
      data-slot="dialog-description"
      className={cx(descriptionClass, className)}
      {...props}
    />
  );
}
