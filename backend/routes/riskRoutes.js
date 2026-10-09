import express from 'express';
import { recalculateMineRisk } from '../controllers/riskController.js';
import { proxyMlRequest } from '../controllers/mlProxyController.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// POST /api/risk/recalculate
router.post('/recalculate', verifyToken, recalculateMineRisk);
router.post('/predict', verifyToken, proxyMlRequest('/api/risk/predict'));
router.get('/evaluate', verifyToken, proxyMlRequest('/api/risk/evaluate'));

export default router;
