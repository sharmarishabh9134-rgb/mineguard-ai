import { fetchWeatherForMine } from '../services/weatherService.js';
import MineMap from '../models/MineMap.js';

export const getMineWeather = async (req, res) => {
  try {
    const { mineId } = req.params;
    let lat = 23.7512; // default Jharia latitude
    let lng = 86.4215; // default Jharia longitude
    
    // Optionally fetch actual lat/lng from MineMap configuration
    const mine = await MineMap.findOne({ mineId });
    if (mine && mine.coordinates) {
      lat = mine.coordinates.lat || lat;
      lng = mine.coordinates.lng || lng;
    }

    const weatherData = await fetchWeatherForMine(lat, lng);
    return res.status(200).json({ success: true, data: weatherData });
  } catch (err) {
    console.error('Weather error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch weather', error: err.message });
  }
};
