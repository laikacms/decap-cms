import PropTypes from 'prop-types';
import React from 'react';
import ReactDOM from 'react-dom';
import styled from '@emotion/styled';

import { buttons, colors, colorsRaw, lengths, shadows, transitions, zIndex } from './styles';

/**
 * Accessible replacement for `window.alert`/`window.confirm`/`window.prompt`
 * (DCMS-658, backported from v4.beta's Base UI `AlertDialog` primitive to
 * main's package layout, DCMS-1446). Native dialogs can be silenced by the
 * browser's "Prevent this page from creating additional dialogs" checkbox
 * and never receive CMS theming; this module renders a themed, in-DOM
 * dialog instead, exposing the same async request/response shape so call
 * sites just swap `window.confirm(msg)` for `await confirmDialog(msg)`.
 *
 * Each of `showAlert`/`confirmDialog`/`promptDialog` queues a request on a
 * module-level store and resolves once a mounted `*DialogHost` renders it
 * and the user responds. If no host is mounted (e.g. a unit test that
 * exercises an action creator directly), the native dialog is used as a
 * fallback so callers keep working unmodified.
 */

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: ${zIndex.zIndex99999};
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
`;

const Panel = styled.div`
  ${shadows.dropDeep};
  background-color: ${colorsRaw.white};
  border-radius: ${lengths.borderRadius};
  max-width: 480px;
  width: calc(100% - 2rem);
  padding: 20px;
  box-sizing: border-box;

  &:focus {
    outline: none;
  }
`;

const Title = styled.h2`
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 600;
  color: ${colors.textLead};
`;

const Message = styled.p`
  margin: 0 0 20px;
  font-size: 14px;
  line-height: 1.5;
  color: ${colors.text};
  white-space: pre-wrap;
`;

const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
`;

const DialogButton = styled.button`
  ${buttons.button};
  height: 36px;
  line-height: 36px;
  padding: 0 15px;
  font-weight: 500;
  font-size: 14px;
  transition: background-color ${transitions.main};
  background-color: ${props =>
    props.destructive
      ? colorsRaw.red
      : props.variant === 'primary'
      ? colors.active
      : colorsRaw.grayLight};
  color: ${props =>
    props.variant === 'primary' || props.destructive ? colorsRaw.white : colors.textLead};
`;

const TextInput = styled.input`
  width: 100%;
  box-sizing: border-box;
  margin-bottom: 20px;
  padding: 8px 10px;
  font-size: 14px;
  border: 1px solid ${colors.textFieldBorder};
  border-radius: ${lengths.borderRadius};

  &:focus {
    outline: 2px solid ${colors.active};
    outline-offset: 1px;
  }
`;

/**
 * Captures the currently focused element so it can be restored once the
 * dialog is dismissed, mirroring native `window.confirm`/`alert`/`prompt`
 * behavior of returning focus to the triggering control.
 */
function captureTriggerElement() {
  return document.activeElement instanceof HTMLElement ? document.activeElement : null;
}

function restoreTriggerFocus(triggerElement) {
  if (triggerElement && triggerElement.isConnected) {
    triggerElement.focus();
  }
}

function DialogFrame({ titleId, descriptionId, onDismiss, children, initialFocusRef }) {
  const panelRef = React.useRef(null);

  React.useEffect(() => {
    const target = (initialFocusRef && initialFocusRef.current) || panelRef.current;
    if (target) {
      target.focus();
    }
  }, [initialFocusRef]);

  function handleKeyDown(event) {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onDismiss();
    }
  }

  return ReactDOM.createPortal(
    <Backdrop
      onMouseDown={event => {
        if (event.target === event.currentTarget) {
          onDismiss();
        }
      }}
    >
      <Panel
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        {children}
      </Panel>
    </Backdrop>,
    document.body,
  );
}

let dialogIdCounter = 0;
function useDialogIds() {
  return React.useMemo(() => {
    dialogIdCounter += 1;
    return {
      titleId: `cms-dialog-title-${dialogIdCounter}`,
      descriptionId: `cms-dialog-description-${dialogIdCounter}`,
    };
  }, []);
}

/**
 * Alert queue (`window.alert` replacement).
 */
let pendingAlerts = [];
let nextAlertId = 1;
const alertListeners = new Set();

function subscribeToAlerts(listener) {
  alertListeners.add(listener);
  return () => alertListeners.delete(listener);
}
function getPendingAlerts() {
  return pendingAlerts;
}
function emitAlertsChanged() {
  alertListeners.forEach(listener => listener());
}

export function showAlert(message, options = {}) {
  if (alertListeners.size === 0) {
    window.alert(message);
    return Promise.resolve();
  }
  const triggerElement = captureTriggerElement();
  return new Promise(resolve => {
    pendingAlerts = [
      ...pendingAlerts,
      { id: nextAlertId++, message, resolve, triggerElement, ...options },
    ];
    emitAlertsChanged();
  });
}

export function AlertDialogHost() {
  const [queue, setQueue] = React.useState(getPendingAlerts);
  React.useEffect(() => subscribeToAlerts(() => setQueue(getPendingAlerts())), []);
  const { titleId, descriptionId } = useDialogIds();
  const current = queue[0];

  if (!current) return null;

  function dismiss() {
    restoreTriggerFocus(current.triggerElement);
    pendingAlerts = pendingAlerts.filter(pending => pending.id !== current.id);
    emitAlertsChanged();
    current.resolve();
  }

  return (
    <DialogFrame
      key={current.id}
      titleId={titleId}
      descriptionId={descriptionId}
      onDismiss={dismiss}
    >
      <Title id={titleId}>{current.title || 'Alert'}</Title>
      <Message id={descriptionId}>{current.message}</Message>
      <Footer>
        <DialogButton type="button" variant="primary" onClick={dismiss} autoFocus>
          {current.okLabel || 'OK'}
        </DialogButton>
      </Footer>
    </DialogFrame>
  );
}

/**
 * Confirm queue (`window.confirm` replacement).
 */
let pendingConfirms = [];
let nextConfirmId = 1;
const confirmListeners = new Set();

function subscribeToConfirms(listener) {
  confirmListeners.add(listener);
  return () => confirmListeners.delete(listener);
}
function getPendingConfirms() {
  return pendingConfirms;
}
function emitConfirmsChanged() {
  confirmListeners.forEach(listener => listener());
}

/**
 * Accepts an optional `signal` so callers that fire a confirm from an
 * effect can pass the same `AbortController` they abort on unmount; a
 * prompt whose caller has since unmounted auto-settles as `false` instead
 * of leaving a dangling dialog mounted at the app root.
 */
export function confirmDialog(message, options = {}, signal) {
  if (confirmListeners.size === 0) {
    return Promise.resolve(window.confirm(message));
  }
  if (signal && signal.aborted) {
    return Promise.resolve(false);
  }
  const triggerElement = captureTriggerElement();
  return new Promise(resolve => {
    const id = nextConfirmId++;
    function settle(confirmed) {
      pendingConfirms = pendingConfirms.filter(pending => pending.id !== id);
      emitConfirmsChanged();
      resolve(confirmed);
    }
    if (signal) {
      signal.addEventListener('abort', () => settle(false), { once: true });
    }
    pendingConfirms = [
      ...pendingConfirms,
      { id, message, resolve: settle, triggerElement, ...options },
    ];
    emitConfirmsChanged();
  });
}

export function useConfirm() {
  return React.useCallback(
    (message, options, signal) => confirmDialog(message, options, signal),
    [],
  );
}

export function ConfirmDialogHost() {
  const [queue, setQueue] = React.useState(getPendingConfirms);
  React.useEffect(() => subscribeToConfirms(() => setQueue(getPendingConfirms())), []);
  const { titleId, descriptionId } = useDialogIds();
  const current = queue[0];

  if (!current) return null;

  function settle(confirmed) {
    restoreTriggerFocus(current.triggerElement);
    pendingConfirms = pendingConfirms.filter(pending => pending.id !== current.id);
    emitConfirmsChanged();
    current.resolve(confirmed);
  }

  return (
    <DialogFrame
      key={current.id}
      titleId={titleId}
      descriptionId={descriptionId}
      onDismiss={() => settle(false)}
    >
      <Title id={titleId}>{current.title || 'Confirm'}</Title>
      <Message id={descriptionId}>{current.message}</Message>
      <Footer>
        <DialogButton type="button" onClick={() => settle(false)}>
          {current.cancelLabel || 'Cancel'}
        </DialogButton>
        <DialogButton
          type="button"
          variant="primary"
          destructive={current.destructive}
          onClick={() => settle(true)}
          autoFocus
        >
          {current.confirmLabel || 'OK'}
        </DialogButton>
      </Footer>
    </DialogFrame>
  );
}

/**
 * Prompt queue (`window.prompt` replacement).
 */
let pendingPrompts = [];
let nextPromptId = 1;
const promptListeners = new Set();

function subscribeToPrompts(listener) {
  promptListeners.add(listener);
  return () => promptListeners.delete(listener);
}
function getPendingPrompts() {
  return pendingPrompts;
}
function emitPromptsChanged() {
  promptListeners.forEach(listener => listener());
}

export function promptDialog(message, options = {}) {
  if (promptListeners.size === 0) {
    return Promise.resolve(window.prompt(message, options.defaultValue));
  }
  const triggerElement = captureTriggerElement();
  return new Promise(resolve => {
    pendingPrompts = [
      ...pendingPrompts,
      { id: nextPromptId++, message, resolve, triggerElement, ...options },
    ];
    emitPromptsChanged();
  });
}

export function PromptDialogHost() {
  const [queue, setQueue] = React.useState(getPendingPrompts);
  React.useEffect(() => subscribeToPrompts(() => setQueue(getPendingPrompts())), []);
  const { titleId, descriptionId } = useDialogIds();
  const current = queue[0];
  const [value, setValue] = React.useState(current ? current.defaultValue || '' : '');
  const inputRef = React.useRef(null);
  const currentId = current && current.id;

  React.useEffect(() => {
    setValue(current ? current.defaultValue || '' : '');
    // Reset only when a new prompt is queued, not on every keystroke; `current`
    // is intentionally omitted from the dependency array.
  }, [currentId]);

  if (!current) return null;

  function settle(result) {
    restoreTriggerFocus(current.triggerElement);
    pendingPrompts = pendingPrompts.filter(pending => pending.id !== current.id);
    emitPromptsChanged();
    current.resolve(result);
  }

  return (
    <DialogFrame
      key={current.id}
      titleId={titleId}
      descriptionId={descriptionId}
      onDismiss={() => settle(null)}
      initialFocusRef={inputRef}
    >
      <Title id={titleId}>{current.title || 'Prompt'}</Title>
      <Message id={descriptionId}>{current.message}</Message>
      <TextInput
        ref={inputRef}
        type="text"
        value={value}
        placeholder={current.placeholder}
        aria-labelledby={descriptionId}
        onChange={event => setValue(event.target.value)}
        onKeyDown={event => {
          if (event.key === 'Enter') settle(value);
        }}
      />
      <Footer>
        <DialogButton type="button" onClick={() => settle(null)}>
          {current.cancelLabel || 'Cancel'}
        </DialogButton>
        <DialogButton type="button" variant="primary" onClick={() => settle(value)}>
          {current.confirmLabel || 'OK'}
        </DialogButton>
      </Footer>
    </DialogFrame>
  );
}

DialogFrame.propTypes = {
  titleId: PropTypes.string.isRequired,
  descriptionId: PropTypes.string.isRequired,
  onDismiss: PropTypes.func.isRequired,
  children: PropTypes.node,
  initialFocusRef: PropTypes.shape({ current: PropTypes.any }),
};
