/** @jsxImportSource @emotion/react */
import React from 'react';
import ReactModal from 'react-modal';
import { ClassNames } from '@emotion/react';
import styled from '@emotion/styled';

import { Icon, colors, lengths, zIndex } from '../../ui/default/index';
import LaikaIconButton from './LaikaIconButton';

/**
 * Laika-flavored modal dialog. Wraps `react-modal` so focus trapping,
 * scroll lock, and close-on-escape behave correctly, with a laika-styled
 * surface on top: rounded corners, soft overlay, optional Header / Body
 * / Footer composition for consistent dialogs across the app.
 *
 * Mounts to `#nc-root` if present (matching core's Modal) — otherwise
 * react-modal falls back to `document.body`.
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

const Title = styled.h2`
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: ${colors.textLead};
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

const baseClass = `
  background-color: ${colors.foreground};
  border-radius: ${lengths.borderRadius};
  border: 1px solid ${colors.textFieldBorder};
  box-shadow: var(--laika-shadow-strong, 0 24px 64px rgba(15, 23, 42, 0.2));
  outline: none;
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 80px);
  overflow: hidden;
`;

const overlayBase = `
  position: fixed;
  inset: 0;
  z-index: ${zIndex.zIndex99999};
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  background-color: var(--laika-shadow-overlay, rgba(15, 23, 42, 0.5));
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
  React.useEffect(() => {
    if (typeof document !== 'undefined' && document.getElementById(ROOT_ID)) {
      ReactModal.setAppElement('#' + ROOT_ID);
    }
  }, []);

  return (
    <ClassNames>
      {({ css, cx }) => (
        <ReactModal
          isOpen={isOpen}
          onRequestClose={onClose}
          closeTimeoutMS={150}
          ariaHideApp={typeof document !== 'undefined' && !!document.getElementById(ROOT_ID)}
          aria={
            title
              ? { labelledby: 'laika-dialog-title' }
              : ariaLabel
                ? ({ label: ariaLabel } as ReactModal.Props['aria'])
                : undefined
          }
          className={{
            base: cx(
              css`
                ${baseClass};
                width: 100%;
                max-width: ${width};
              `,
              className,
            ),
            afterOpen: '',
            beforeClose: '',
          }}
          overlayClassName={{
            base: css`
              ${overlayBase};
            `,
            afterOpen: '',
            beforeClose: '',
          }}
        >
          {title || showCloseButton ? (
            <Header>
              {title ? <Title id="laika-dialog-title">{title}</Title> : <span />}
              {showCloseButton ? (
                <LaikaIconButton aria-label="Close dialog" size="sm" onClick={onClose}>
                  <Icon type="close" />
                </LaikaIconButton>
              ) : null}
            </Header>
          ) : null}
          {children}
        </ReactModal>
      )}
    </ClassNames>
  );
}

LaikaDialog.Header = Header;
LaikaDialog.Title = Title;
LaikaDialog.Body = Body;
LaikaDialog.Footer = Footer;

export default LaikaDialog;
