import assert from 'node:assert/strict';
import test from 'node:test';
import mongoose from 'mongoose';
import Complaint from '../models/Complaint.js';
import Worker from '../models/Worker.js';
import { createLabourConcern } from '../controllers/labourConcernController.js';

const invoke = async body => {
  const result = { statusCode: 200, body: null };
  const req = { body, user: { workerId: 'TEST-WORKER', role: 'labour', assignedMineLocation: 'Test Mine' } };
  const res = {
    status(code) { result.statusCode = code; return this; },
    json(payload) { result.body = payload; return this; }
  };
  await createLabourConcern(req, res);
  return result;
};

test('labour concern accepts the frontend JSON fields, optional GPS and photo', async () => {
  const priorState = mongoose.connection.readyState;
  mongoose.connection.readyState = 0;
  try {
    const response = await invoke({
      type: 'SAFETY_ISSUE',
      title: 'Test concern',
      message: 'Synthetic integration-test concern.',
      location: { latitude: 12.5, longitude: 76.5, accuracy: 8, source: 'gps' },
      photo: { name: 'test.webp', mimeType: 'image/webp', data: 'c3ludGhldGlj' }
    });
    assert.equal(response.statusCode, 201);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.type, 'SAFETY_ISSUE');
    assert.equal(response.body.data.location.latitude, 12.5);
    assert.equal(response.body.data.photo.mimeType, 'image/webp');
    assert.equal(response.body.persisted, false);
  } finally {
    mongoose.connection.readyState = priorState;
  }
});

test('invalid concern payload returns a useful 400 response', async () => {
  const response = await invoke({ type: 'NOT_A_TYPE', title: '', message: '' });
  assert.equal(response.statusCode, 400);
  assert.equal(response.body.success, false);
  assert.match(response.body.message, /title and message/);
});

test('database write errors return 503 without leaking error contents', async () => {
  const priorState = mongoose.connection.readyState;
  const originalCreate = Complaint.create;
  const originalFindOne = Worker.findOne;
  const originalConsoleError = console.error;
  const privateMarker = 'private-worker-and-credential-marker';
  let logOutput = '';
  mongoose.connection.readyState = 1;
  Worker.findOne = () => ({ lean: async () => null });
  Complaint.create = async () => {
    const error = new Error(privateMarker);
    error.name = 'MongoServerSelectionError';
    throw error;
  };
  console.error = (...args) => { logOutput += args.map(String).join(' '); };

  try {
    const response = await invoke({ type: 'COMPLAINT', title: 'Test', message: 'Synthetic test.' });
    assert.equal(response.statusCode, 503);
    assert.match(response.body.message, /not saved/);
    assert.equal(logOutput.includes(privateMarker), false);
  } finally {
    Complaint.create = originalCreate;
    Worker.findOne = originalFindOne;
    console.error = originalConsoleError;
    mongoose.connection.readyState = priorState;
  }
});
