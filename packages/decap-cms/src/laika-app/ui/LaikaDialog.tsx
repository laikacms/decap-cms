import { css } from '@emotion/react';
import styled from '@emotion/styled';
import React from 'react';

import { useSuspendShortcuts } from '@/core/hooks/useShortcut';
import { colors, Icon, lengths, zIndex } from '@/ui/default/index';
import { DialogPrimitive as Dialog } from '@/ui/Dialog';
import LaikaIconButton from './LaikaIconButton';

/**
 * Laika-flavored modal dialog. Wraps Base UI's Dialog (via the
 * `src/ui/Dialog.tsx` wrapper, DCMS-542) so focus trapping, scroll lock, and
 * close-on-escape behave correctly, with a laika-styled surface on top:
 * rounded corners, soft overlay, optional Header / Body / Footer
 * composition for consistent dialogs across the app.
 *
 * While open, the dialog suspends the global shortcut engine so bare-key
 * shortcuts ('n', 'j', 'g' chords) can't fire behind the modal; shortcuts
 * flagged `allowWhileSuspended` (the palette toggle) still work.
 *
 * Portals into `#nc-root` if present (matching core's Modal), otherwise
 * Base UI falls back to `document.body`.
 */

const ROOT_ID = 'nc-root';

const Header = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid ${colors.textFieldBorder};
`;

const titleStyles = css`
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: ${colors.textLead};
`;

const Title = styled.h2`
  ${titleStyles};
`;

const Body = styled.div`
  padding: 20px;
`;

const Footer = styled.footer`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 20px;
  border-top: 1px solid ${colors.textFieldBorder};
`;

export interface LaikaDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** Accessible label / heading for the dialog. */
  title?: string;
  /**
   * Accessible label when the dialog has no visible heading (e.g. a command
   * palette whose UI is a search input). Ignored if `title` is also set.
   */
  ariaLabel?: string;
  /** Show the built-in close icon button in the header. Default `true`. */
  showCloseButton?: boolean;
  /** Max-width of the dialog body. Default `520px`. */
  width?: string;
  children?: React.ReactNode;
  className?: string;
}

const backdropStyles = css`
  position: fixed;
  inset: 0;
  z-index: ${zIndex.zIndex99999};
  background-color: var(--laika-shadow-overlay, rgba(15, 23, 42, 0.5));
`;

const viewportStyles = css`
  position: fixed;
  inset: 0;
  z-index: ${zIndex.zIndex99999};
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
`;

const popupStyles = css`
  background-color: ${colors.foreground};
  border-radius: ${lengths.borderRadius};
  border: 1px solid ${colors.textFieldBorder};
  box-shadow: var(--laika-shadow-strong, 0 24px 64px rgba(15, 23, 42, 0.2));
  outline: none;
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 80px);
  overflow: hidden;
  width: 100%;
`;

function LaikaDialog({
  isOpen,
  onClose,
  title,
  ariaLabel,
  showCloseButton = true,
  width = '520px',
  children,
  className,
}: LaikaDialogProps) {
  const container = typeof document !== 'undefined' ? (document.getElementById(ROOT_ID) ?? undefined) : undefined;

  useSuspendShortcuts(isOpen);

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={open => {
        if (!open) {
          onClose();
        }
      }}
    >
      <Dialog.Portal container={container}>
        <Dialog.Backdrop css={backdropStyles} />
        <Dialog.Viewport css={viewportStyles}>
          <Dialog.Popup
            css={[popupStyles, { maxWidth: width }]}
            className={className}
            aria-label={!title && ariaLabel ? ariaLabel : undefined}
            aria-modal="true"
          >
            {title || showCloseButton
              ? (
                <Header>
                  {title
                    ? (
                      <Dialog.Title id="laika-dialog-title" css={titleStyles}>
                        {title}
                      </Dialog.Title>
                    )
                    : <span />}
                  {showCloseButton
                    ? (
                      <LaikaIconButton aria-label="Close dialog" size="sm" onClick={onClose}>
                        <Icon type="close" />
                      </LaikaIconButton>
                    )
                    : null}
                </Header>
              )
              : null}
            {children}
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

LaikaDialog.Header = Header;
LaikaDialog.Title = Title;
LaikaDialog.Body = Body;
LaikaDialog.Footer = Footer;

export default LaikaDialog;
