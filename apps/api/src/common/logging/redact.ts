export const CREDENTIAL_URL_PATTERN = /(\w+:\/\/)([^@/\s]+)@/g;

export function redactSecrets(input: string): string {
  if (!input) return input;
  return input
    .replace(CREDENTIAL_URL_PATTERN, '$1[REDACTED]@')
    .replace(/(JWT_ACCESS_SECRET|JWT_REFRESH_SECRET|MONGODB_URI)=\S+/gi, '$1=[REDACTED]');
}