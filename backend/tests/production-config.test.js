import assert from 'node:assert/strict';
import test from 'node:test';
import { validateProductionEnv } from '../config/runtimeConfig.js';

test('production requires an explicit MongoDB URI and JWT secret', () => {
  assert.throws(
    () => validateProductionEnv({ NODE_ENV: 'production', MONGODB_URI: '', JWT_SECRET: '' }),
    /MONGODB_URI.*JWT_SECRET|JWT_SECRET.*MONGODB_URI/
  );
});

test('production configuration validation does not disclose supplied values', () => {
  const privateMarker = 'must-not-appear-in-error-output';
  assert.throws(
    () => validateProductionEnv({ NODE_ENV: 'production', MONGODB_URI: privateMarker, JWT_SECRET: '' }),
    error => !error.message.includes(privateMarker) && error.message.includes('JWT_SECRET')
  );
});

test('development can still use local demo configuration', () => {
  assert.doesNotThrow(() => validateProductionEnv({ NODE_ENV: 'development' }));
});

test('production accepts a remote MongoDB URI and high-entropy JWT secret', () => {
  assert.doesNotThrow(() => validateProductionEnv({
    NODE_ENV: 'production',
    MONGODB_URI: 'mongodb+srv://cluster.example.test/mineguard',
    JWT_SECRET: 'a-high-entropy-secret-value-with-more-than-32-characters'
  }));
});

test('production rejects the example JWT placeholder and local MongoDB default', () => {
  assert.throws(
    () => validateProductionEnv({
      NODE_ENV: 'production',
      MONGODB_URI: 'mongodb://localhost:27017/mineguard_db',
      JWT_SECRET: 'change-this-to-a-strong-random-secret'
    }),
    /MONGODB_URI.*JWT_SECRET|JWT_SECRET.*MONGODB_URI/
  );
});
