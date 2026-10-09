import express from 'express';
import { getMineWeather } from '../controllers/weatherController.js';

const router = express.Router();

// Both URL forms are intentionally supported by the same controller:
//   GET /api/weather              → no mineId, falls back to default coords
//   GET /api/weather?mineId=X     → query-string form (primary frontend call)
//   GET /api/weather/:mineId      → path-param form (alternative / direct links)
router.get('/', getMineWeather);
router.get('/:mineId', getMineWeather);

export default router;
