import NetlifyAuthenticationPage from './NetlifyAuthenticationPage';
import PKCEAuthenticationPage, { usePkceAuth } from './PKCEAuthenticationPage';

export const DecapCmsUiAuth = {
  NetlifyAuthenticationPage,
  PKCEAuthenticationPage,
};
export { NetlifyAuthenticationPage, PKCEAuthenticationPage, usePkceAuth };
export * from './types/index';
