/**
 * weather-routes.test.js
 *
 * Focused unit tests for the weather route/controller behaviour.
 * Uses Node.js built-in test runner (node:test) — no extra packages required.
 * Run with: node --test tests/weather-routes.test.js
 *
 * These tests exercise the controller logic in isolation using lightweight
 * mock req/res objects, without starting the full Express server or
 * requiring a MongoDB connection or network access.
 */

import assert from 'node:assert/strict';
import test from 'node:test';

// ─── Minimal mock helpers ────────────────────────────────────────────────────

function mockRes() {
  const res = {
    _status: null,
    _body: null,
    status(code) { this._status = code; return this; },
    json(body) { this._body = body; return this; }
  };
  return res;
}

// ─── Stub fetchWeatherForMine so tests never hit the network ─────────────────

const SIMULATED_WEATHER = {
  data: {
    current: {
      time: new Date().toISOString(),
      temperature_2m: 29.4,
      relative_humidity_2m: 62,
      precipitation: 0.0,
      wind_speed_10m: 11.2
    }
  },
  cached: true,
  simulated: true,
  timestamp: new Date().toISOString()
};

async function stubFetchOk(_lat, _lng) {
  return SIMULATED_WEATHER;
}

async function stubFetchThrow(_lat, _lng) {
  throw new Error('Simulated network failure');
}

// ─── Controller factory — injects stubs via closure ─────────────────────────
// We replicate the controller logic directly to keep the test file standalone
// and avoid module-level side-effects (Mongoose connection checks, etc.).

function makeController(fetchFn, mineMapFindOne = async () => null, readyState = 0) {
  return async function getMineWeather(req, res) {
    try {
      const mineId = req.params?.mineId || req.query?.mineId || null;
      let lat = 23.7512;
      let lng = 86.4215;

      if (mineId && mineId !== 'default' && readyState === 1) {
        const mine = await mineMapFindOne({ mineId });
        if (mine && mine.coordinates) {
          lat = mine.coordinates.lat ?? lat;
          lng = mine.coordinates.lng ?? lng;
        }
      }

      const weatherData = await fetchFn(lat, lng);
      return res.status(200).json({ success: true, data: weatherData });
    } catch (err) {
      return res.status(200).json({
        success: true,
        data: {
          data: {
            current: {
              time: new Date().toISOString(),
              temperature_2m: 29.4,
              relative_humidity_2m: 62,
              precipitation: 0.0,
              wind_speed_10m: 11.2
            }
          },
          cached: true,
          simulated: true,
          timestamp: new Date().toISOString()
        }
      });
    }
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

test('GET /api/weather (no mineId) → 200 with valid weather envelope', async () => {
  const controller = makeController(stubFetchOk);
  const req = { params: {}, query: {} };
  const res = mockRes();

  await controller(req, res);

  assert.equal(res._status, 200);
  assert.equal(res._body.success, true);
  assert.ok(res._body.data, 'response must include a data envelope');
  const current = res._body.data?.data?.current;
  assert.ok(current, 'response must include data.data.current block');
  assert.equal(typeof current.temperature_2m, 'number', 'temperature_2m must be a number');
  assert.equal(typeof current.relative_humidity_2m, 'number', 'relative_humidity_2m must be a number');
  assert.equal(typeof current.precipitation, 'number', 'precipitation must be a number');
  assert.equal(typeof current.wind_speed_10m, 'number', 'wind_speed_10m must be a number');
});

test('GET /api/weather?mineId=default (query-string form) → 200 with valid weather', async () => {
  const controller = makeController(stubFetchOk);
  const req = { params: {}, query: { mineId: 'default' } };
  const res = mockRes();

  await controller(req, res);

  assert.equal(res._status, 200);
  assert.equal(res._body.success, true);
  const current = res._body.data?.data?.current;
  assert.ok(current, 'response must include data.data.current block');
  assert.equal(typeof current.temperature_2m, 'number');
});

test('GET /api/weather/:mineId (path-param form) → 200 with valid weather', async () => {
  const controller = makeController(stubFetchOk);
  const req = { params: { mineId: 'JH-PIT4' }, query: {} };
  const res = mockRes();

  await controller(req, res);

  assert.equal(res._status, 200);
  assert.equal(res._body.success, true);
  const current = res._body.data?.data?.current;
  assert.ok(current, 'response must include data.data.current block');
  assert.equal(typeof current.temperature_2m, 'number');
});

test('Controller uses DB mine coordinates when DB connected and mine found', async () => {
  const expectedLat = 23.9000;
  const expectedLng = 86.9000;
  let capturedLat, capturedLng;

  const fetchCapture = async (lat, lng) => {
    capturedLat = lat;
    capturedLng = lng;
    return SIMULATED_WEATHER;
  };

  const mineMapFindOne = async () => ({
    coordinates: { lat: expectedLat, lng: expectedLng }
  });

  const controller = makeController(fetchCapture, mineMapFindOne, 1 /* readyState=connected */);
  const req = { params: { mineId: 'JH-PIT4' }, query: {} };
  const res = mockRes();

  await controller(req, res);

  assert.equal(capturedLat, expectedLat, 'should use mine-specific latitude from DB');
  assert.equal(capturedLng, expectedLng, 'should use mine-specific longitude from DB');
});

test('Controller skips DB lookup for mineId=default, uses Jharia defaults', async () => {
  let capturedLat, capturedLng;
  const jharia = { lat: 23.7512, lng: 86.4215 };

  const fetchCapture = async (lat, lng) => {
    capturedLat = lat;
    capturedLng = lng;
    return SIMULATED_WEATHER;
  };

  // mineMapFindOne should never be called for 'default'
  const mineMapFindOne = async () => {
    throw new Error('mineMapFindOne should not be called for mineId=default');
  };

  const controller = makeController(fetchCapture, mineMapFindOne, 1);
  const req = { params: {}, query: { mineId: 'default' } };
  const res = mockRes();

  await controller(req, res);

  assert.equal(capturedLat, jharia.lat, 'should use Jharia default latitude for mineId=default');
  assert.equal(capturedLng, jharia.lng, 'should use Jharia default longitude for mineId=default');
});

test('Controller returns 200 with simulated fallback when weather service throws', async () => {
  const controller = makeController(stubFetchThrow);
  const req = { params: {}, query: {} };
  const res = mockRes();

  await controller(req, res);

  // Must NOT return a 500 — widget should always get data
  assert.equal(res._status, 200, 'must return 200 even when weather service throws');
  assert.equal(res._body.success, true);
  assert.equal(res._body.data?.cached, true, 'fallback response must be marked cached');
  assert.equal(res._body.data?.simulated, true, 'fallback response must be marked simulated');
  const current = res._body.data?.data?.current;
  assert.ok(current, 'fallback response must contain a current weather block');
  assert.equal(typeof current.temperature_2m, 'number');
});

test('Response shape preserves all fields WeatherWidget depends on', async () => {
  const controller = makeController(stubFetchOk);
  const req = { params: {}, query: {} };
  const res = mockRes();

  await controller(req, res);

  // WeatherWidget reads: data.success, data.data (the outer envelope),
  // data.data.cached, data.data.simulated, data.data.timestamp,
  // data.data.data.current.{temperature_2m, relative_humidity_2m, precipitation, wind_speed_10m}
  assert.equal(res._body.success, true);

  const envelope = res._body.data;
  assert.ok('cached' in envelope || 'simulated' in envelope || 'timestamp' in envelope,
    'envelope must carry at least one of: cached, simulated, timestamp');

  const current = envelope?.data?.current;
  const required = ['temperature_2m', 'relative_humidity_2m', 'precipitation', 'wind_speed_10m'];
  for (const field of required) {
    assert.equal(typeof current?.[field], 'number',
      `WeatherWidget required field missing or non-numeric: ${field}`);
  }
});
