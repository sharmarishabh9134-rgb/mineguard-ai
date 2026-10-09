import express from 'express';
import { getWorkerProfile, updateWorkerLocation, syncWorkerLocations } from '../controllers/authController.js';
import { getOwnDocuments, uploadOwnDocument } from '../controllers/workerDocumentController.js';
import { submitSafetyReport } from '../controllers/complianceController.js';
import { verifyToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleCheck.js';

const router = express.Router();

router.use(verifyToken);
router.use(requireRole(['labour']));

// GET /api/labour/profile/:workerId
router.get('/profile/:workerId', getWorkerProfile);

// PUT /api/labour/update-location
router.put('/update-location', updateWorkerLocation);

// POST /api/labour/sync-locations
router.post('/sync-locations', syncWorkerLocations);

// GET /api/labour/documents - View own permitted certificates
router.get('/documents', getOwnDocuments);
router.post('/documents', uploadOwnDocument);

// POST /api/labour/report - Submit safety observation / problem report
router.post('/report', submitSafetyReport);

// POST /api/labour/complaint - Submit complaint to supervisor
import { submitComplaint } from '../controllers/complianceController.js';
router.post('/complaint', submitComplaint);
import { createLabourConcern, listMyLabourConcerns } from '../controllers/labourConcernController.js';
router.post('/concerns', createLabourConcern);
router.get('/concerns', listMyLabourConcerns);
import { getLabourAIStatus, inspectSafetyImage, askLabourAssistant } from '../controllers/labourAssistantController.js';
router.get('/ai/status', getLabourAIStatus);
router.post('/ai/inspect', inspectSafetyImage);
router.post('/ai/ask', askLabourAssistant);

export default router;
