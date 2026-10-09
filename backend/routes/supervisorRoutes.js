import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleCheck.js';
import { registerNewWorker, getAllWorkers } from '../controllers/authController.js';
import {
  logDailyProduction,
  getProductionHistory,
  getMonthlyProductionSummary,
  generateDailyReport,
  generateMonthlyReport
} from '../controllers/productionController.js';
import { listMineDocuments, verifyMineDocument } from '../controllers/workerDocumentController.js';
import { getMineIncidentAnalysis } from '../controllers/mineIncidentAnalysisController.js';
import { listSupervisorMaps, saveSupervisorMap } from '../controllers/mineMapController.js';
import {
  getDailyMineReport,
  closeViolation,
  getComplaints
} from '../controllers/complianceController.js';
import {
  createLabour,
  getLabours,
  updateLabour,
  updateLabourStatus,
  resetLabourPassword
} from '../controllers/supervisorLabourController.js';
import { listLabourConcerns, updateLabourConcern } from '../controllers/labourConcernController.js';

const router = express.Router();

router.use(verifyToken);
router.use(requireRole(['supervisor', 'admin']));

// Supervisor Register New Labour Worker (Legacy, kept for backward compatibility)
router.post('/register-worker', registerNewWorker);

// Get All Workers (Legacy view)
router.get('/workers', getAllWorkers);

// Labour Management Endpoints
router.post('/labour', createLabour);
router.get('/labour', getLabours);
router.put('/labour/:id', updateLabour);
router.patch('/labour/:id/status', updateLabourStatus);
router.post('/labour/:id/reset-password', resetLabourPassword);

// Acknowledge SOS
router.post('/sos-acknowledge', (req, res) => {
  // In a real app, update the SOS status in DB
  return res.status(200).json({ success: true, message: 'SOS Acknowledged' });
});

// Production Management Endpoints
router.post('/production', logDailyProduction);
router.get('/production', getProductionHistory);
router.get('/production/monthly', getMonthlyProductionSummary);
router.get('/production/report/daily', generateDailyReport);
router.get('/production/report/monthly', generateMonthlyReport);


// Worker Document Verification Endpoints
router.get('/documents', listMineDocuments);
router.patch('/documents/:id/review', verifyMineDocument);
router.get('/labour-ai/incidents', getMineIncidentAnalysis);
router.get('/maps', listSupervisorMaps);
router.post('/maps', saveSupervisorMap);
router.put('/maps/:id', saveSupervisorMap);

// Daily Mine Summary & Compliance Endpoints
router.get('/daily-report', getDailyMineReport);
router.put('/violations/:id/close', closeViolation);
router.get('/complaints', getComplaints);
router.get('/labour-concerns', listLabourConcerns);
router.patch('/labour-concerns/:id', updateLabourConcern);

export default router;
