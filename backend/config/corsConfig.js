export const VERCEL_FRONTEND_ORIGIN = 'https://mineguard-h53mcy92a-rishabh-sharma3.vercel.app';

export function createAllowedOrigins({ isProduction = false, configuredOrigins = [] } = {}) {
  const defaults = isProduction
    ? [VERCEL_FRONTEND_ORIGIN]
    : ['http://localhost:5173', 'http://127.0.0.1:5173'];
  return [...new Set([...defaults, ...configuredOrigins])];
}
