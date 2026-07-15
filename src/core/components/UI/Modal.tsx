/** @jsxImportSource @emotion/react */
import React from 'react';
import { css } from '@emotion/react';
import { Dialog } from '@base-ui/react/dialog';

import { transitions, shadows, lengths, zIndex } from '@/ui/default/index';

/**
 * Core modal, backed by Base UI's Dialog: focus trap, Escape/outside-click
 * dismissal, and body scroll lock come from Base UI. Visuals match the old
 * react-modal implementation (centered white panel over a fading dark
 * overlay); the fade in/out is driven by Base UI's `data-starting-style` /
 * `data-ending-style` transition hooks.
 *
 * Portals into `#nc-root` if present (the classic app mount point),
 * otherwise Base UI falls back to `document.body`.
 */

const ROOT_ID = 'nc-root';

const backdropStyles = css`
  position: fixed;
  inset: 0;
  z-index: ${zIndex.zIndex99999};
  background-color: rgba(0, 0, 0, 0.6);
  opacity: 1;
  transition: background-color ${transitions.main}, opacity ${transitions.main};

  &[data-starting-style],
  &[data-ending-style] {
    background-color: rgba(0, 0, 0, 0);
    opacity: 0;
  }
`;

const viewportStyles = css`
  position: fixed;
  inset: 0;
  z-index: ${zIndex.zIndex99999};
  display: flex;
  justify-content: center;
  align-items: center;
`;

const popupStyles = css`
  ${shadows.dropDeep};
  background-color: #fff;
  border-radius: ${lengths.borderRadius};
  height: 80%;
  text-align: center;
  max-width: 2200px;
  padding: 20px;

  &:focus {
    outline: none;
  }
`;

interface ModalProps {
  children: React.ReactNode;
  isOpen: boolean;
  className?: string;
  onClose: () => void;
}

export function Modal({ isOpen, children, className, onClose }: ModalProps) {
  const container =
    typeof document !== 'undefined' ? (document.getElementById(ROOT_ID) ?? undefined) : undefined;

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
          <Dialog.Popup css={popupStyles} className={className}>
            {children}
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
