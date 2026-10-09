import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleCheck.js';
import { getProblemOptions, listProblems, getProblem, createProblem, updateProblem, changeProblemStatus, assignProblem, updateCorrectiveAction, verifyProblem, listProblemMap } from '../controllers/problemController.js';

const router = express.Router();
router.use(verifyToken, requireRole(['supervisor','admin']));
router.get('/options', getProblemOptions);
router.get('/map', listProblemMap);
router.get('/', listProblems);
router.post('/', createProblem);
router.get('/:id', getProblem);
router.patch('/:id', updateProblem);
router.patch('/:id/status', changeProblemStatus);
router.patch('/:id/assign', assignProblem);
router.patch('/:id/corrective-action', updateCorrectiveAction);
router.patch('/:id/verify', verifyProblem);
export default router;
