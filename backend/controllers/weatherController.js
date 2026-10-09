import { fetchWeatherForMine } from '../services/weatherService.js';
import MineMap from '../models/MineMap.js';
import mongoose from 'mongoose';

/**
 * GET /api/weather              → no mineId, uses Jharia default coords
 * GET /api/weather?mineId=X    → query-string form (primary frontend call)
 * GET /api/weather/:mineId     → path-param form (alternative)
 *
 * All forms share this controller. Missing or 'default' mineId skips
 * the DB lookup and uses Jharia Coalfields as the fallback location.
 *
 * Always returns HTTP 200 — the widget uses live/cached/simulated status
 * in the response body rather than HTTP error codes.
 */
export const getMineWeather = async (req, res) => {
  try {
    // Support both URL forms: /api/weather?mineId=X  and  /api/weather/X
    const mineId = req.params.mineId || req.query.mineId || null;

    // Default coordinates — Jharia Coalfields, Jharkhand
    let lat = 23.7512;
    let lng = 86.4215;

    // Look up mine-specific coordinates from MineMap when DB is connected
    // and a real mineId was supplied (skip null / 'default' — neither exists)
    if (mineId && mineId !== 'default' && mongoose.connection.readyState === 1) {
      const mine = await MineMap.findOne({ mineId });
      if (mine && mine.coordinates) {
        lat = mine.coordinates.lat ?? lat;
        lng = mine.coordinates.lng ?? lng;
      }
    }

    const weatherData = await fetchWeatherForMine(lat, lng);
    return res.status(200).json({ success: true, data: weatherData });
  } catch (err) {
    console.warn('[Weather] Fallback activated:', err.message);
    // Always return 200 with simulated data so the widget stays functional
    return res.status(200).json({
      success: true,
      data: {
        data: {
          current: {
            time: new Date().toISOString(),
            temperature_2m: 29.4,
            relative_humidity_2m: 62,
            precipitation: 0.0,
            wind_speed_10m: 11.2
          },
          current_units: {
            temperature_2m: '°C',
            relative_humidity_2m: '%',
            precipitation: 'mm',
            wind_speed_10m: 'km/h'
          }
        },
        cached: true,
        simulated: true,
        timestamp: new Date().toISOString()
      }
    });
  }
};
