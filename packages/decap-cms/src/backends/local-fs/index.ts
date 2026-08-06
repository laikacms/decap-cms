import AuthenticationPage from './AuthenticationPage';
import LocalFsBackend, { isLocalFsSupported } from './implementation';

export const DecapCmsBackendLocalFs = {
  LocalFsBackend,
  AuthenticationPage,
  isLocalFsSupported,
};
export { AuthenticationPage, isLocalFsSupported, LocalFsBackend };
