export {
  ADMIN_SCOPE,
  ALL_SCOPES,
  GRANULAR_SCOPES,
  WILDCARD_SCOPE,
  hasScope,
  isScope,
  normalizeScopes,
} from './scopes.js';
export type { GranularScope, Scope } from './scopes.js';

export {
  TOKEN_PREFIX,
  generateToken,
  hashToken,
  hashesEqual,
  isPatToken,
  mintPersonalAccessToken,
  tokenPreview,
} from './token.js';
export type { MintPatDeps, MintPatInput, MintPatResult } from './token.js';

export { UnauthorizedError, resolveBearer } from './verifyBearer.js';
export type { ResolveBearerDeps } from './verifyBearer.js';

export { InsufficientScopeError, hasRequiredScope, requireScope } from './requireScope.js';

export type {
  AuthContext,
  AuthUser,
  PatRecord,
  SessionVerificationResult,
  TokenType,
} from './types.js';
