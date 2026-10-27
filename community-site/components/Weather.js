'use client';
import { useEffect, useState } from 'react';

const LAT = process.env.NEXT_PUBLIC_LAT || '18.4667';
const LON = process.env.NEXT_PUBLIC_LON || '83.65';
const PLACE = process.env.NEXT_PUBLIC_PLACE || 'Peddamuraharipuram, Andhra Pradesh';

// US AQI categories
function aqiLabel(aqi) {
  if (aqi == null) return { text: '–', color: '#888' };
  if (aqi <= 50) return { text: 'Good', color: '#2e9e5b' };
  if (aqi <= 100) return { text: 'Moderate', color: '#c9a400' };
  if (aqi <= 150) return { text: 'Unhealthy for sensitive', color: '#e0802b' };
  if (aqi <= 200) return { text: 'Unhealthy', color: '#d64545' };
  if (aqi <= 300) return { text: 'Very unhealthy', color: '#8e44ad' };
  return { text: 'Hazardous', color: '#7a1f1f' };
}

export default function Weather() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [w, a] = await Promise.all([
          fetch(`https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,relative_humidity_2m`).then((r) => r.json()),
          fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${LAT}&longitude=${LON}&current=us_aqi,pm2_5`).then((r) => r.json()),
        ]);
        setData({
          temp: w.current.temperature_2m,
          humidity: w.current.relative_humidity_2m,
          aqi: a.current.us_aqi,
          pm25: a.current.pm2_5,
        });
        setError(false);
      } catch {
        setError(true);
      }
    }
    load();
    const t = setInterval(load, 15 * 60 * 1000); // refresh every 15 min
    return () => clearInterval(t);
  }, []);

  if (error) return <div className="weather">Weather unavailable</div>;
  if (!data) return <div className="weather">Loading weather…</div>;

  const aqi = aqiLabel(data.aqi);
  return (
    <div className="weather" aria-label={`Current conditions in ${PLACE}`}>
      <div className="weather-place">{PLACE}</div>
      <div className="weather-row">
        <span title="Temperature">{Math.round(data.temp)}°C</span>
        <span title="Humidity">{data.humidity}% humidity</span>
        <span title={`PM2.5: ${data.pm25} µg/m³`}>
          <i className="dot" style={{ background: aqi.color }} />
          AQI {data.aqi} · {aqi.text}
        </span>
      </div>
    </div>
  );
}
