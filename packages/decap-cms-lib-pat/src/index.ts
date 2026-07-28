export {
  ADMIN_SCOPE,
  ALL_SCOPES,
  GRANULAR_SCOPES,
  expandScopes,
  hasScope,
  isScope,
} from './scopes';
export type { GranularScope, Scope } from './scopes';

export {
  TOKEN_PREFIX,
  generateToken,
  hashToken,
  hashesEqual,
  isPatToken,
  mintPersonalAccessToken,
  tokenPreview,
} from './token';
export type { MintPatDeps, MintPatInput, MintPatResult } from './token';

export { resolveBearer } from './verifyBearer';
export type { ResolveBearerDeps } from './verifyBearer';

export { InsufficientScopeError, hasRequiredScope, requireScope } from './requireScope';

export type {
  AuthContext,
  AuthUser,
  PatRecord,
  SessionVerificationResult,
  TokenType,
} from './types';
