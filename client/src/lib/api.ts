export function getApiBaseUrl(): string {
  const rawBase =
    process.env.NEXT_PUBLIC_API_BASE ??
    process.env.NEXT_PUBLIC_API_URL ??
    'http://localhost:3001';
  return rawBase.endsWith('/api/v1') ? rawBase : `${rawBase}/api/v1`;
}
