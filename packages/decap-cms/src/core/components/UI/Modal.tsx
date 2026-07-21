import { css } from '@emotion/react';
import React from 'react';

import { lengths, shadows, transitions, zIndex } from '@/ui/default/index';
import { DialogPrimitive as Dialog } from '@/ui/Dialog';

import type { DialogRoot } from '@base-ui/react/dialog';

/**
 * Core modal, backed by Base UI's Dialog (via the `src/ui/Dialog.tsx`
 * wrapper, DCMS-542): focus trap, Escape/outside-click dismissal, and body
 * scroll lock come from Base UI. Visuals match the old react-modal
 * implementation (centered white panel over a fading dark overlay); the
 * fade in/out is driven by Base UI's `data-starting-style` /
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
  max-width: min(2200px, 100vw);
  box-sizing: border-box;
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
  /**
   * DCMS-1278: Base UI's `Dialog.Popup` gets `role="dialog"` automatically
   * but doesn't derive an accessible name from its subtree, so callers must
   * provide one via `ariaLabel` or `ariaLabelledby` (id of a heading already
   * rendered inside `children`) — otherwise screen readers announce a
   * nameless dialog.
   */
  ariaLabel?: string;
  ariaLabelledby?: string;
}

/**
 * DCMS-1241: Base UI's modal Dialog is `modal` by default, so the backdrop
 * sits above (and absorbs clicks meant for) whatever is visually underneath
 * it — e.g. a sidebar collection link. Dismissing on that click closes the
 * dialog but the click never reaches the link, so navigation only happens on
 * a second click.
 *
 * When the dialog closes because of an outside press, replay the click at
 * the same viewport coordinates once the backdrop has been removed from the
 * DOM, so a single click both dismisses the modal and completes the
 * navigation/action underneath it.
 *
 * DCMS-1251: a single `requestAnimationFrame` is not sufficient — React's
 * portal unmount is not guaranteed to have committed to the DOM by the next
 * animation frame, so `elementFromPoint` can still hit the (soon-to-be
 * removed) Base UI portal wrapper instead of the element underneath it.
 * React guarantees the unmount commits before the *next* frame is requested
 * from within a frame callback, so wait two animation frames instead of one.
 */
export function replayOutsidePress(eventDetails: DialogRoot.ChangeEventDetails) {
  if (eventDetails.reason !== 'outside-press' || typeof document === 'undefined') {
    return;
  }

  const nativeEvent = eventDetails.event;
  if (!('clientX' in nativeEvent) || !('clientY' in nativeEvent)) {
    return;
  }
  const { clientX, clientY } = nativeEvent;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const target = document.elementFromPoint(clientX, clientY);
      const link = target?.closest('a[href]');
      if (link instanceof HTMLElement) {
        link.click();
      }
    });
  });
}

export function Modal({ isOpen, children, className, onClose, ariaLabel, ariaLabelledby }: ModalProps) {
  const container = typeof document !== 'undefined' ? (document.getElementById(ROOT_ID) ?? undefined) : undefined;

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(open, eventDetails) => {
        if (!open) {
          onClose();
          replayOutsidePress(eventDetails);
        }
      }}
    >
      <Dialog.Portal container={container}>
        <Dialog.Backdrop css={backdropStyles} data-testid="modal-backdrop" />
        <Dialog.Viewport css={viewportStyles}>
          <Dialog.Popup
            css={popupStyles}
            className={className}
            aria-label={ariaLabel}
            aria-labelledby={ariaLabelledby}
          >
            {children}
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
