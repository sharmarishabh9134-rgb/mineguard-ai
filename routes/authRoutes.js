import express from 'express';
import { loginWorker, getWorkerProfile } from '../controllers/authController.js';

const router = express.Router();

// POST /api/auth/login
router.post('/login', loginWorker);

// GET /api/auth/profile/:workerId
router.get('/profile/:workerId', getWorkerProfile);

export default router;
