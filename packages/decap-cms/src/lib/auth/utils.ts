import { randomUUID } from '@/lib/util/index';

interface AuthStorage {
  nonce: string;
}

export function createNonce(): string {
  const nonce: string = randomUUID();
  window.sessionStorage.setItem('decap-cms-auth', JSON.stringify({ nonce }));
  return nonce;
}

export function validateNonce(check: string): boolean {
  const auth: string | null = window.sessionStorage.getItem('decap-cms-auth');
  const valid: string | null = auth && (JSON.parse(auth) as AuthStorage).nonce;
  // The nonce lives in sessionStorage (see createNonce), so clearing only
  // localStorage left the real entry in place and a replayed callback URL kept
  // validating. Clear both: sessionStorage makes the nonce genuinely
  // single-use, localStorage stays for the legacy key older versions wrote.
  window.sessionStorage.removeItem('decap-cms-auth');
  window.localStorage.removeItem('decap-cms-auth');
  return check === valid;
}

export function isInsecureProtocol(): boolean {
  return (
    document.location.protocol !== 'https:'
    // TODO: Is insecure localhost a bad idea as well? I don't think it is, since you are not actually
    //       sending the token over the internet in this case, assuming the auth URL is secure.
    && document.location.hostname !== 'localhost'
    && document.location.hostname !== '127.0.0.1'
  );
}
