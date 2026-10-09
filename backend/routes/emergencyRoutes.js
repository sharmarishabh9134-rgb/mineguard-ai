import express from 'express';
import { createSOSIncident, resolveSOSIncident, getActiveSOSIncidents } from '../controllers/emergencyController.js';
import { verifyToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleCheck.js';

const router = express.Router();

router.get('/active', verifyToken, getActiveSOSIncidents);

// POST /api/emergency/sos
router.post('/sos', verifyToken, requireRole(['labour']), createSOSIncident);

// PUT /api/emergency/sos/:id/resolve
router.put('/sos/:id/resolve', verifyToken, requireRole(['supervisor','medical','admin']), resolveSOSIncident);

export default router;
