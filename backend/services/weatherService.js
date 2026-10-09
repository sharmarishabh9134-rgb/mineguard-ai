let weatherCache = {};

export const fetchWeatherForMine = async (lat, lng) => {
  const cacheKey = `${lat},${lng}`;
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,precipitation,wind_speed_10m&timezone=auto&forecast_days=7`;
    const response = await fetch(url, { timeout: 5000 });
    
    if (!response.ok) {
      throw new Error(`Weather API returned ${response.status}`);
    }
    
    const data = await response.json();
    weatherCache[cacheKey] = {
      data,
      timestamp: new Date().toISOString()
    };
    return weatherCache[cacheKey];
  } catch (error) {
    console.warn('[weather] operation failed.');
    if (weatherCache[cacheKey]) {
      return { ...weatherCache[cacheKey], cached: true };
    }
    throw new Error('Weather API unavailable and no cache exists.');
  }
};
