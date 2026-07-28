import styled from '@emotion/styled';
import QRCode from 'qrcode';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { buildQrLoginDeepLink } from '@/backends/laika/qrLogin';
import { currentBackend } from '@/core/index';
import { useAppSelector } from '@/core/hooks/useRedux';
import { colors } from '@/ui/default/index';
import { LaikaButton, LaikaCard } from './ui';

import type { QrTransferCode } from '@/backends/laika/qrLogin';
import type { CmsConfig } from '@/lib/util/index';

/**
 * "Quick mobile access" (DCMS-1401): from an already-authenticated session,
 * mint a short-lived, single-use QR login transfer code and render it as a
 * scannable QR code. A second device that scans it lands on the same app
 * shell with the code in the URL, which `LaikaAuthenticationPage` redeems
 * automatically — no PKCE re-login on a small screen.
 *
 * Backend-gated: only the `laika` backend implements `createQrLoginTransfer`
 * (see backends/laika/laika-backend.ts + backends/laika/qrLogin.ts). This
 * card renders nothing for any other backend.
 */

/** Laika backend's optional QR-transfer surface, checked structurally so this
 * component doesn't need a hard dependency on the concrete backend class. */
interface QrCapableImplementation {
  createQrLoginTransfer?: () => Promise<QrTransferCode>;
}

const QrArea = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 8px 0 4px;
`;

const QrImage = styled.img`
  width: 176px;
  height: 176px;
  border-radius: 8px;
  border: 1px solid ${colors.textFieldBorder};
  background-color: #fff;
`;

const QrPlaceholder = styled.div`
  width: 176px;
  height: 176px;
  border-radius: 8px;
  border: 1px dashed ${colors.textFieldBorder};
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 12px;
  font-size: 13px;
  color: ${colors.controlLabel};
`;

const StatusText = styled.p`
  margin: 0;
  font-size: 13px;
  color: ${colors.controlLabel};
  text-align: center;
`;

const ErrorText = styled.p`
  margin: 0;
  font-size: 13px;
  color: ${colors.errorText};
  text-align: center;
`;

type QrCardState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready', transfer: QrTransferCode, qrDataUrl: string }
  | { status: 'expired' }
  | { status: 'error', message: string };

/** Countdown tick — cosmetic only; the server is the authority on expiry. */
const COUNTDOWN_INTERVAL_MS = 1000;

function LaikaQrLoginCard() {
  const config = useAppSelector(state => state.config) as CmsConfig | null | undefined;
  const [state, setState] = useState<QrCardState>({ status: 'idle' });
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const requestIdRef = useRef(0);

  const backendName = (config as unknown as { backend?: { name?: string } } | undefined)?.backend?.name;

  const generate = useCallback(async () => {
    if (!config) return;
    const requestId = ++requestIdRef.current;
    setState({ status: 'loading' });

    try {
      const implementation = currentBackend(config).implementation as unknown as QrCapableImplementation;
      if (typeof implementation.createQrLoginTransfer !== 'function') {
        if (requestId === requestIdRef.current) {
          setState({
            status: 'error',
            message: 'This backend does not support QR login yet.',
          });
        }
        return;
      }

      const transfer = await implementation.createQrLoginTransfer();
      const qrDataUrl = await QRCode.toDataURL(buildQrLoginDeepLink(transfer.code), {
        width: 352,
        margin: 1,
      });
      if (requestId !== requestIdRef.current) return;
      setState({ status: 'ready', transfer, qrDataUrl });
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setState({
        status: 'error',
        message: err instanceof Error ? err.message : 'Failed to generate a QR login code.',
      });
    }
  }, [config]);

  // Cosmetic countdown + auto-expiry so a stale (already unusable) QR code
  // doesn't sit on screen looking valid. The server independently enforces
  // the real TTL and single-use redemption.
  useEffect(() => {
    if (state.status !== 'ready') return;

    const tick = () => {
      const secondsLeft = Math.max(0, Math.round((state.transfer.expiresAt - Date.now()) / 1000));
      setRemainingSeconds(secondsLeft);
      if (secondsLeft <= 0) {
        setState({ status: 'expired' });
      }
    };

    tick();
    const interval = setInterval(tick, COUNTDOWN_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [state]);

  if (backendName !== 'laika') return null;

  return (
    <LaikaCard padding="20px">
      <LaikaCard.Header>
        <LaikaCard.Title>Quick mobile access</LaikaCard.Title>
      </LaikaCard.Header>
      <LaikaCard.Body>
        Scan this code with a phone or tablet that has laika-app installed to sign in instantly,
        no need to retype credentials or repeat the login flow.
      </LaikaCard.Body>
      <QrArea>
        {state.status === 'ready'
          ? (
            <>
              <QrImage src={state.qrDataUrl} alt="Scan to sign in on another device" />
              <StatusText>Expires in {remainingSeconds}s · single use</StatusText>
              <LaikaButton variant="secondary" onClick={generate}>Generate new code</LaikaButton>
            </>
          )
          : state.status === 'loading'
          ? (
            <>
              <QrPlaceholder>Generating...</QrPlaceholder>
              <LaikaButton variant="secondary" disabled>Generate new code</LaikaButton>
            </>
          )
          : (
            <>
              <QrPlaceholder>
                {state.status === 'expired' ? 'Code expired' : 'No active code'}
              </QrPlaceholder>
              {state.status === 'error' ? <ErrorText>{state.message}</ErrorText> : null}
              <LaikaButton variant="primary" onClick={generate}>Show QR code</LaikaButton>
            </>
          )}
      </QrArea>
    </LaikaCard>
  );
}

export default LaikaQrLoginCard;
