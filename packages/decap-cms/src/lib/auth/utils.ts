import { v4 as uuid } from 'uuid';

interface AuthStorage {
  nonce: string;
}

export function createNonce(): string {
  const nonce: string = uuid();
  window.sessionStorage.setItem('decap-cms-auth', JSON.stringify({ nonce }));
  return nonce;
}

export function validateNonce(check: string): boolean {
  const auth: string | null = window.sessionStorage.getItem('decap-cms-auth');
  const valid: string | null = auth && (JSON.parse(auth) as AuthStorage).nonce;
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
