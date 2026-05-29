export const AuthorizationHeaderBearerRegex = /^Bearer\s+([A-Za-z0-9\-._~+/]+={0,2})$/;
export const AuthorizationHeaderApiKeyRegex = /^ApiKey\s+([A-Za-z0-9\-._~+/]+={0,2})$/;
export const ExtractAuthorizationBearerToken = (
  header: string | null | undefined,
): string | undefined => {
  if (!header) return undefined;
  const match = header.match(AuthorizationHeaderBearerRegex);
  return match ? match[1] : undefined;
};
export const ExtractAuthorizationApiKey = (
  header: string | null | undefined,
): string | undefined => {
  if (!header) return undefined;
  const match = header.match(AuthorizationHeaderApiKeyRegex);
  return match ? match[1] : undefined;
};
