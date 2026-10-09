const JWT_SECRET_PLACEHOLDER = 'change-this-to-a-strong-random-secret';

export function validateProductionEnv(env = process.env) {
  if (env.NODE_ENV !== 'production') return;

  const invalid = [];
  const mongoUri = env.MONGODB_URI?.trim();
  if (!mongoUri) {
    invalid.push('MONGODB_URI');
  } else {
    try {
      const hostname = new URL(mongoUri).hostname.toLowerCase();
      if (!hostname || ['localhost', '127.0.0.1', '::1'].includes(hostname)) {
        invalid.push('MONGODB_URI');
      }
    } catch {
      invalid.push('MONGODB_URI');
    }
  }

  const jwtSecret = env.JWT_SECRET?.trim();
  if (!jwtSecret || jwtSecret === JWT_SECRET_PLACEHOLDER || jwtSecret.length < 32) {
    invalid.push('JWT_SECRET');
  }

  if (invalid.length) {
    throw new Error(`Invalid or missing production environment variables: ${[...new Set(invalid)].join(', ')}`);
  }
}
