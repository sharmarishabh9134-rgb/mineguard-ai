import React, { useState, useEffect } from 'react';
import { CloudRain, Wind, Thermometer, Droplets } from 'lucide-react';

export default function WeatherWidget({ mineId, simplified }) {
  const [weather, setWeather] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        // Try to load cached data first
        const cached = localStorage.getItem('mine_weather_cache');
        if (cached) {
          setWeather(JSON.parse(cached));
        }

        if (!navigator.onLine) {
          setLoading(false);
          return;
        }

        const token = localStorage.getItem('mineguard_jwt_token') || '';
        const url = mineId
          ? `/api/weather?mineId=${encodeURIComponent(mineId)}`
          : '/api/weather';

        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!res.ok) throw new Error('Weather API Error: ' + res.status);
        const data = await res.json();

        if (data.success && data.data) {
          setWeather(data.data);
          localStorage.setItem('mine_weather_cache', JSON.stringify(data.data));
        }
      } catch (err) {
        console.warn('Weather fetch failed, using cache:', err.message);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchWeather();
  }, [mineId]);

  if (loading && !weather) {
    return (
      <div className="p-4 bg-slate-900 rounded-xl animate-pulse text-slate-400 text-sm">
        Loading Weather...
      </div>
    );
  }

  if (error && !weather) {
    return (
      <div className="p-4 bg-red-900/50 rounded-xl text-red-300 text-sm">
        ⚠ Weather Offline
      </div>
    );
  }

  if (!weather) return null;

  // Support both nested and flat weather data shapes
  const current = weather?.data?.current || weather?.current || {};

  if (simplified) {
    return (
      <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex flex-wrap justify-between items-center text-xs gap-2">
        <div className="flex items-center gap-2">
          <Thermometer size={14} className="text-amber-400" />
          {current.temperature_2m ?? '--'}°C
        </div>
        <div className="flex items-center gap-2">
          <Droplets size={14} className="text-sky-400" />
          {current.relative_humidity_2m ?? '--'}%
        </div>
        <div className="flex items-center gap-2">
          <CloudRain size={14} className="text-indigo-400" />
          {current.precipitation ?? '--'}mm
        </div>
        <div className="flex items-center gap-2">
          <Wind size={14} className="text-slate-400" />
          {current.wind_speed_10m ?? '--'}km/h
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold">Mine Weather Conditions</h3>
        <span className="text-xs text-slate-400">
          {weather.cached ? 'Offline (Cached)' : 'Live'}
          {weather.timestamp
            ? ' – ' + new Date(weather.timestamp).toLocaleTimeString()
            : ''}
        </span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div className="p-3 bg-slate-800 rounded-lg">
          <div className="text-slate-400 text-xs mb-1">Temperature</div>
          <div className="text-xl font-bold">{current.temperature_2m ?? '--'}°C</div>
        </div>
        <div className="p-3 bg-slate-800 rounded-lg">
          <div className="text-slate-400 text-xs mb-1">Humidity</div>
          <div className="text-xl font-bold">{current.relative_humidity_2m ?? '--'}%</div>
        </div>
        <div className="p-3 bg-slate-800 rounded-lg">
          <div className="text-slate-400 text-xs mb-1">Precipitation</div>
          <div className="text-xl font-bold">{current.precipitation ?? '--'} mm</div>
        </div>
        <div className="p-3 bg-slate-800 rounded-lg">
          <div className="text-slate-400 text-xs mb-1">Wind Speed</div>
          <div className="text-xl font-bold">{current.wind_speed_10m ?? '--'} km/h</div>
        </div>
      </div>
    </div>
  );
}
