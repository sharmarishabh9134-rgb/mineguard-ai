import 'dotenv/config';

// Retain the existing local/demo fallback. Production startup validates that
// an explicit JWT_SECRET is configured before the HTTP server can start.
export const JWT_SECRET = process.env.JWT_SECRET || 'mineguard_jwt_secret_key_2026';
