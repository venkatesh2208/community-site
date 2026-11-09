'use client';
import { useEffect, useRef, useState } from 'react';

const LAT = process.env.NEXT_PUBLIC_LAT || '18.656379';
const LON = process.env.NEXT_PUBLIC_LON || '84.386872';
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

// WMO weather codes -> [icon, description]
function sky(code) {
  if (code === 0) return ['☀️', 'Clear'];
  if (code === 1) return ['🌤️', 'Mostly clear'];
  if (code === 2) return ['⛅', 'Partly cloudy'];
  if (code === 3) return ['☁️', 'Overcast'];
  if (code === 45 || code === 48) return ['🌫️', 'Fog'];
  if (code >= 51 && code <= 57) return ['🌦️', 'Drizzle'];
  if (code >= 61 && code <= 67) return ['🌧️', 'Rain'];
  if (code >= 71 && code <= 77) return ['❄️', 'Snow'];
  if (code >= 80 && code <= 82) return ['🌦️', 'Showers'];
  if (code >= 95) return ['⛈️', 'Thunderstorm'];
  return ['🌡️', 'Weather'];
}

function dayLabel(iso, i) {
  if (i === 0) return 'Today';
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short',
  });
}

export default function Weather() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    async function load() {
      try {
        const [w, a] = await Promise.all([
          fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}` +
            `&current=temperature_2m,relative_humidity_2m` +
            `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
            `&forecast_days=7&timezone=auto`
          ).then((r) => r.json()),
          fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${LAT}&longitude=${LON}&current=us_aqi,pm2_5`).then((r) => r.json()),
        ]);
        setData({
          temp: w.current.temperature_2m,
          humidity: w.current.relative_humidity_2m,
          aqi: a.current.us_aqi,
          pm25: a.current.pm2_5,
          days: w.daily.time.map((t, i) => ({
            date: t,
            code: w.daily.weather_code[i],
            max: w.daily.temperature_2m_max[i],
            min: w.daily.temperature_2m_min[i],
            rain: w.daily.precipitation_probability_max[i],
          })),
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

  // Close the forecast on outside click or Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (error) return <div className="weather">Weather unavailable</div>;
  if (!data) return <div className="weather">Loading weather…</div>;

  const aqi = aqiLabel(data.aqi);
  return (
    <div className="weather-wrap" ref={wrapRef}>
      <button
        type="button"
        className="weather weather-btn"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`Current conditions in ${PLACE}. Show 7-day forecast`}
      >
        <div className="weather-place">{PLACE}</div>
        <div className="weather-row">
          <span title="Temperature">{Math.round(data.temp)}°C</span>
          <span title="Humidity">{data.humidity}% humidity</span>
          <span title={`PM2.5: ${data.pm25} µg/m³`}>
            <i className="dot" style={{ background: aqi.color }} />
            AQI {data.aqi} · {aqi.text}
          </span>
        </div>
        <div className="weather-hint">{open ? 'Hide' : 'Tap for'} 7-day forecast {open ? '▴' : '▾'}</div>
      </button>

      {open && (
        <div className="forecast" role="dialog" aria-label="7-day forecast">
          <div className="forecast-title">7-day forecast · {PLACE}</div>
          <ul>
            {data.days.map((d, i) => {
              const [icon, label] = sky(d.code);
              return (
                <li key={d.date}>
                  <span className="f-day">{dayLabel(d.date, i)}</span>
                  <span className="f-sky">
                    <span aria-hidden="true">{icon}</span> {label}
                    {d.rain != null && <small> · {d.rain}% rain</small>}
                  </span>
                  <span className="f-temp">
                    <b>{Math.round(d.max)}°</b> / {Math.round(d.min)}°
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <style>{`
        .weather-wrap { position: relative; }
        .weather-btn { background: none; border: 0; font: inherit; color: inherit; cursor: pointer; padding: 4px 8px; border-radius: 8px; text-align: right; }
        .weather-btn:hover { background: var(--paper); }
        .weather-hint { font-size: .75rem; color: var(--muted); font-weight: 400; }
        .forecast {
          position: absolute; right: 0; top: calc(100% + 8px); z-index: 30;
          width: min(380px, calc(100vw - 40px));
          background: var(--card); border: 1px solid var(--line); border-radius: 10px;
          box-shadow: 0 10px 30px rgba(0,0,0,.18); padding: 12px 14px; text-align: left;
        }
        .forecast-title { font-weight: 700; margin-bottom: 6px; }
        .forecast ul { list-style: none; margin: 0; padding: 0; }
        .forecast li {
          display: grid; grid-template-columns: 82px 1fr auto; gap: 8px; align-items: center;
          padding: 8px 0; border-top: 1px solid var(--line); font-size: .9rem;
        }
        .f-day { font-weight: 600; }
        .f-sky small { color: var(--muted); }
        .f-temp { white-space: nowrap; color: var(--muted); }
        .f-temp b { color: var(--ink); }
        @media (max-width: 520px) {
          .weather-btn { text-align: left; padding-left: 0; }
          .forecast { right: auto; left: 0; }
          .forecast li { grid-template-columns: 70px 1fr auto; }
        }
      `}</style>
    </div>
  );
}