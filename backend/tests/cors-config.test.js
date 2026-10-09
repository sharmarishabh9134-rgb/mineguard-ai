import assert from 'node:assert/strict';
import test from 'node:test';
import { createAllowedOrigins, VERCEL_FRONTEND_ORIGIN } from '../config/corsConfig.js';

test('production CORS allows the supplied Vercel origin and configured additions', () => {
  const allowed = createAllowedOrigins({ isProduction: true, configuredOrigins: ['https://other.example.test'] });
  assert.deepEqual(allowed, [VERCEL_FRONTEND_ORIGIN, 'https://other.example.test']);
  assert.equal(allowed.includes('*'), false);
});

test('development CORS keeps the existing local Vite origins', () => {
  assert.deepEqual(createAllowedOrigins(), ['http://localhost:5173', 'http://127.0.0.1:5173']);
});
