import express from 'express';
import { getMineWeather } from '../controllers/weatherController.js';

const router = express.Router();

router.get('/:mineId', getMineWeather);

export default router;
