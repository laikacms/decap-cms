import React, { useEffect, useRef } from 'react';
// import { translate } from 'react-polyglot';
import { injectStyle } from 'react-toastify/dist/inject-style';
import { toast, ToastContainer } from 'react-toastify';
import { connect, useDispatch } from 'react-redux';
import { useTranslate } from 'react-polyglot';

import { dismissNotification } from '../../actions/notifications';

import type { Id, ToastItem } from 'react-toastify';
import type { State } from '../../types/redux';
import type { Notification } from '../../reducers/notifications';

injectStyle();

interface Props {
  notifications: Notification[];
}

type IdMap = {
  [id: string]: Id;
};

export function Notifications({ notifications }: Props) {
  const t = useTranslate();
  const dispatch = useDispatch();
  // Bookkeeping only, never rendered - a ref avoids re-render churn and, more
  // importantly, avoids this value being captured in the toast.onChange
  // effect's dependency list (see below).
  const idMapRef = useRef<IdMap>({});

  useEffect(() => {
    const idMap = idMapRef.current;

    notifications
      .filter(notification => !idMap[notification.id])
      .forEach(notification => {
        const toastId = toast(
          typeof notification.message == 'string'
            ? notification.message
            : t(notification.message.key, { ...notification.message }),
          {
            autoClose: notification.dismissAfter,
            type: notification.type,
          },
        );

        idMap[notification.id] = toastId;

        if (notification.dismissAfter) {
          setTimeout(() => {
            dispatch(dismissNotification(notification.id));
          }, notification.dismissAfter);
        }
      });

    Object.keys(idMap).forEach(id => {
      if (!notifications.find(notification => notification.id === id)) {
        toast.dismiss(idMap[id]);
        delete idMap[id];
      }
    });
  }, [notifications, t, dispatch]);

  // `toast.onChange` returns an unsubscribe function and must be registered
  // exactly once. Previously this call sat directly in the render body, so
  // every re-render (each toast created/dismissed during a create -> save ->
  // navigate session) registered another listener without ever releasing the
  // previous one. Each accumulated listener re-dispatched `dismissNotification`
  // on the next toast removal, so the listener count - and the resulting
  // synchronous dispatch/render fan-out - grew without bound across a session,
  // eventually tripping React's "Maximum update depth exceeded" (#185) via the
  // store subscription's onStateChange. Registering it once in an effect with
  // a cleanup keeps exactly one listener alive at a time.
  useEffect(() => {
    return toast.onChange((payload: ToastItem) => {
      if (payload.status == 'removed') {
        const idMap = idMapRef.current;
        const id = Object.entries(idMap).find(([, toastId]) => toastId === payload.id)?.[0];
        if (id) {
          delete idMap[id];
          dispatch(dismissNotification(id));
        }
      }
    });
  }, [dispatch]);

  return (
    <>
      <ToastContainer position="top-right" theme="colored" className="notif__container" />
    </>
  );
}

function mapStateToProps({ notifications }: State): Props {
  return { notifications: notifications.notifications };
}

export default connect(mapStateToProps)(Notifications);
