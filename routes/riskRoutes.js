import express from 'express';
import { recalculateMineRisk } from '../controllers/riskController.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// POST /api/risk/recalculate
router.post('/recalculate', verifyToken, recalculateMineRisk);

export default router;
