let weatherCache = {};

/**
 * Fetch current weather conditions from Open-Meteo (no API key required).
 * Uses AbortController for a 5-second timeout (Node.js fetch does not accept
 * a `timeout` option directly — passing it is silently ignored).
 *
 * Return shape (preserved for WeatherWidget compatibility):
 *   { data: { current: { temperature_2m, relative_humidity_2m, precipitation, wind_speed_10m, ... } }, timestamp }
 * On failure: cached variant above with `cached: true`, or simulated fallback with `simulated: true`.
 */
export const fetchWeatherForMine = async (lat, lng) => {
  const cacheKey = `${lat},${lng}`;
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${lat}&longitude=${lng}` +
      `&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m` +
      `&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,precipitation,wind_speed_10m` +
      `&timezone=auto&forecast_days=7`;

    // AbortController-based timeout — the `signal` option IS supported in Node.js fetch
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

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
    console.warn(`[Weather] API error: ${error.message}. Using cache/simulated fallback.`);

    // Return cached data if available
    if (weatherCache[cacheKey]) {
      return { ...weatherCache[cacheKey], cached: true };
    }

    // Return realistic simulated mine weather — never throw so the widget stays functional
    return {
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
    };
  }
};
