import PKCEAuthenticationPage from './AuthenticationPage.js';
import DevAuthenticationPage from './DevAuthenticationPage.js';
import createLaikaBackend from './laika-backend.js';

// Re-export types separately to avoid runtime re-export warnings (interface erased at compile time)
export type { PKCEAuthPageProps } from './AuthenticationPage.js';
export type { DevAuthPageProps } from './DevAuthenticationPage.js';
export type {
  CreateLaikaBackendOptions,
  GetAssetsRepositoryOptions,
  GetDocumentsRepositoryOptions,
  LaikaBackendConfig,
} from './laika-backend.js';
export type {
  LaikaBackendModuleConfig,
  LocalLaikaBackendOptions,
  ResolveLaikaBackendOptions,
} from './resolve-laika-backend.js';
export {
  DEFAULT_LOCAL_BACKEND_BASE_PATH,
  DEFAULT_LOCAL_BACKEND_DEV_TOKEN,
  resolveLaikaBackend,
} from './resolve-laika-backend.js';

// Laika CMS backend with dependency injection
export const DecapCmsBackendLaika: {
  createLaikaBackend: typeof createLaikaBackend,
  PKCEAuthenticationPage: typeof PKCEAuthenticationPage,
  DevAuthenticationPage: typeof DevAuthenticationPage,
} = {
  createLaikaBackend,
  PKCEAuthenticationPage,
  DevAuthenticationPage,
};

// Named exports
export { createLaikaBackend, DevAuthenticationPage, PKCEAuthenticationPage };
// Default export
export default createLaikaBackend;
