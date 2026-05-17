import { useState, useEffect, useRef, useCallback } from "react";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, set, off } from "firebase/database";
import { Chart, registerables } from "chart.js";
Chart.register(...registerables);

─── FIREBASE CONFIG ───────────────────────────────────────────────────────────
Replace with your Firebase project config
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  databaseURL: "YOUR_DATABASE_URL",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
};



const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ─── OPENWEATHERMAP CONFIG ─────────────────────────────────────────────────────
const OWM_API_KEY = "Api Key";
const OWM_CITY = "Belgaum,IN";

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const dbRef = (path) => ref(db, `smart_irrigation/device_1/${path}`);

const fmtSec = (s) => {
  if (!s && s !== 0) return "—";
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem ? `${m}m ${rem}s` : `${m}m`;
};

const now = () => new Date().toLocaleTimeString("en-IN", { hour12: false });

// ─── ICONS (inline SVG) ───────────────────────────────────────────────────────
const Icons = {
  Droplet: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
    </svg>
  ),
  Wind: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2" />
    </svg>
  ),
  Zap: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  Thermometer: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
    </svg>
  ),
  Cloud: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
    </svg>
  ),
  CloudRain: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="16" y1="13" x2="16" y2="21" /><line x1="8" y1="13" x2="8" y2="21" />
      <line x1="12" y1="15" x2="12" y2="23" />
      <path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25" />
    </svg>
  ),
  Sun: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  ),
  Bell: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),
  Wifi: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 12.55a11 11 0 0 1 14.08 0" /><path d="M1.42 9a16 16 0 0 1 21.16 0" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" /><line x1="12" y1="20" x2="12.01" y2="20" />
    </svg>
  ),
  Settings: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  Clock: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  BarChart: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" /><line x1="2" y1="20" x2="22" y2="20" />
    </svg>
  ),
  History: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-4.95" />
    </svg>
  ),
  Leaf: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
    </svg>
  ),
};

// ─── GAUGE COMPONENT ──────────────────────────────────────────────────────────
function Gauge({ value, max, label, unit, color, icon: Icon }) {
  // ✅ percentage (simple, no weird scaling)
  const pct = Math.min(100, Math.max(0, value || 0));

  // ✅ semicircle angles
  const startAngle = -180;
  const endAngle = 0;
  const totalAngle = 180;

  const angle = startAngle + (pct / 100) * totalAngle;

  // ✅ circle geometry
  const r = 50;
  const cx = 70;
  const cy = 70;

  const arc = (a) => {
    const rad = (a * Math.PI) / 180;
    return [
      cx + r * Math.cos(rad),
      cy + r * Math.sin(rad)
    ];
  };

  const [sx, sy] = arc(startAngle);
  const [ex, ey] = arc(endAngle);
  const [nx, ny] = arc(angle);

  return (
    <div className="gauge-card">
      <div className="gauge-icon"><Icon /></div>

      <svg viewBox="0 0 140 100" className="gauge-svg">
        {/* 🔹 Background arc */}
        <path
          d={`M ${sx} ${sy} A ${r} ${r} 0 0 1 ${ex} ${ey}`}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="8"
          strokeLinecap="round"
        />

        <path
  d={`M ${sx} ${sy} A ${r} ${r} 0 0 1 ${nx} ${ny}`}
  fill="none"
  stroke={color}
  strokeWidth="8"
  strokeLinecap="round"
  style={{ filter: `drop-shadow(0 0 6px ${color})` }}
/>

        {/* 🔹 Needle dot */}
        <circle
          cx={nx}
          cy={ny}
          r="5"
          fill={color}
          style={{ filter: `drop-shadow(0 0 4px ${color})` }}
        />

        {/* 🔹 Value */}
        <text
          x="70"
          y="60"
          textAnchor="middle"
          fill="white"
          fontSize="18"
          fontWeight="700"
          fontFamily="'JetBrains Mono', monospace"
        >
          {value !== undefined && value !== null ? Math.round(value) : "—"}
        </text>

        {/* 🔹 Unit */}
        <text
          x="70"
          y="74"
          textAnchor="middle"
          fill="rgba(255,255,255,0.5)"
          fontSize="8"
          fontFamily="'JetBrains Mono', monospace"
        >
          {unit}
        </text>
      </svg>

      <div className="gauge-label">{label}</div>

      {/* 🔹 Bottom bar */}
      <div className="gauge-bar-wrap">
        <div
          className="gauge-bar"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

// ─── CHART COMPONENT ──────────────────────────────────────────────────────────
function LineChart({ data, label, color, id }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    if (chartRef.current) chartRef.current.destroy();
    const ctx = canvasRef.current.getContext("2d");
    const gradient = ctx.createLinearGradient(0, 0, 0, 200);
    gradient.addColorStop(0, color + "55");
    gradient.addColorStop(1, color + "00");

    chartRef.current = new Chart(ctx, {
      type: "line",
      data: {
        labels: data.map((d) => d.time),
        datasets: [{
          label,
          data: data.map((d) => d.value),
          borderColor: color,
          backgroundColor: gradient,
          borderWidth: 2,
          pointRadius: 3,
          pointBackgroundColor: color,
          fill: true,
          tension: 0.4,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#1a2a1a",
            borderColor: color,
            borderWidth: 1,
            titleColor: "#fff",
            bodyColor: "rgba(255,255,255,0.7)",
          },
        },
        scales: {
          x: { ticks: { color: "rgba(255,255,255,0.4)", font: { family: "JetBrains Mono", size: 10 } }, grid: { color: "rgba(255,255,255,0.05)" } },
          y: { ticks: { color: "rgba(255,255,255,0.4)", font: { family: "JetBrains Mono", size: 10 } }, grid: { color: "rgba(255,255,255,0.05)" } },
        },
      },
    });
    return () => chartRef.current?.destroy();
  }, [data, color, label]);

  return <canvas ref={canvasRef} id={id} />;
}

// ─── STATUS BADGE ─────────────────────────────────────────────────────────────
function StatusBadge({ on, label }) {
  return (
    <div className={`status-badge ${on ? "online" : "offline"}`}>
      <span className="pulse-dot" />
      {label}: {on ? "Connected" : "Disconnected"}
    </div>
  );
}

// ─── FORECAST CARD ────────────────────────────────────────────────────────────
function ForecastCard({ item }) {
  if (!item) return null;
  const time = item.dt_txt ? item.dt_txt.slice(11, 16) : "";
  const date = item.dt_txt ? item.dt_txt.slice(5, 10) : "";
  const rain = item.weather?.[0]?.main?.toLowerCase().includes("rain");
  const temp = item.main?.temp ? Math.round(item.main.temp) : "—";
  return (
    <div className="forecast-chip">
      <div className="fc-date">{date}</div>
      <div className="fc-time">{time}</div>
      <div className="fc-icon">{rain ? <Icons.CloudRain /> : <Icons.Sun />}</div>
      <div className="fc-temp">{temp}°C</div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [activeTab, setActiveTab] = useState("monitor");
  const [sensors, setSensors] = useState({});
  const [control, setControl] = useState({ mode: "AUTO", pump: "OFF" });
  const [schedule, setSchedule] = useState({});
  const [farm, setFarm] = useState({ crop: "", soilType: "" });
  const [weather, setWeather] = useState({});
  const [alerts, setAlerts] = useState({});
  const [status, setStatus] = useState({});
  const [history, setHistory] = useState([]);
  const [soilHistory, setSoilHistory] = useState([]);
  const [humidHistory, setHumidHistory] = useState([]);
  const [owmWeather, setOwmWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [farmForm, setFarmForm] = useState({ crop: "", soilType: "" });
  const [lastOwmFetch, setLastOwmFetch] = useState(0);
  const generateSchedule = async () => {
  try {
    console.log("⚡ Calling backend logic...");

    const res = await fetch("http://localhost:3001/generate-schedule", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        soil: sensors.soil ?? 0,
        humidity: sensors.humidity ?? 0,
        salinity: sensors.salinity ?? 0,
        weather: (owmWeather || weather) || {},
        crop: farm.crop || "Wheat",
        soilType: farm.soilType || "Loamy"
      })
    });

    const data = await res.json();

    console.log("🤖 LOGIC RESULT:", data);

    // ✅ WRITE TO FIREBASE
    await set(dbRef("schedule"), {
      ...data,
      generated_at: Date.now()
    });

  } catch (err) {
    console.error("❌ Backend error:", err);
  }
};

  const MAX_HISTORY = 20;

  // ── Firebase listeners ──────────────────────────────────────────────────────
  useEffect(() => {
    const paths = ["sensors", "control", "schedule", "farm", "weather", "alerts", "status"];
    const unsubs = [];

    const setters = { sensors: setSensors, control: setControl, schedule: setSchedule, farm: setFarm, weather: setWeather, alerts: setAlerts, status: setStatus };

    paths.forEach((path) => {
      const r = dbRef(path);
      const handler = onValue(r, (snap) => {
        const val = snap.val() || {};
        setters[path](val);
        if (path === "farm") setFarmForm(val);
        setLoading(false);
      }, (err) => { console.error(path, err); setLoading(false); });
      unsubs.push(() => off(r, "value", handler));
    });

    return () => unsubs.forEach((u) => u());
  }, []);
useEffect(() => {
  if (
    sensors.soil === undefined ||
    sensors.humidity === undefined ||
    sensors.salinity === undefined
  ) return;

  // run once immediately
  generateSchedule();

  const interval = setInterval(() => {
    generateSchedule();
  }, 10000);

  return () => clearInterval(interval);

}, [sensors]);
useEffect(() => {
  if (
    sensors.soil === undefined ||
    sensors.humidity === undefined ||
    sensors.salinity === undefined
  ) return;

  const entry = {
    time: new Date().toLocaleTimeString(),
    soil: sensors.soil,
    humidity: sensors.humidity,
    salinity: sensors.salinity
  };

  // ✅ Update table history (latest on top)
  setHistory(prev => [entry, ...prev.slice(0, 19)]);

  // ✅ Update soil chart
  setSoilHistory(prev => [
    ...prev.slice(-19),
    { time: entry.time, value: sensors.soil }
  ]);

  // ✅ Update humidity chart
  setHumidHistory(prev => [
    ...prev.slice(-19),
    { time: entry.time, value: sensors.humidity }
  ]);

}, [sensors]);

  // ── OpenWeatherMap fetch ────────────────────────────────────────────────────
  const fetchOwm = useCallback(async () => {
    if (!OWM_API_KEY || OWM_API_KEY === "YOUR_OPENWEATHERMAP_API_KEY") return;
    try {
      const [cur, fore] = await Promise.all([
        fetch(`https://api.openweathermap.org/data/2.5/weather?q=${OWM_CITY}&appid=${OWM_API_KEY}&units=metric`).then(r => r.json()),
        fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${OWM_CITY}&appid=${OWM_API_KEY}&units=metric`).then(r => r.json()),
      ]);
      const payload = {
        temperature: cur.main?.temp,
        humidity: cur.main?.humidity,
        rain: cur.weather?.[0]?.main?.toLowerCase().includes("rain"),
        forecast: fore.list?.slice(0, 8) || [],
      };
      setOwmWeather(payload);
      // Write to Firebase
      await set(dbRef("weather"), payload);
      setLastOwmFetch(Date.now());
    } catch (e) { console.error("OWM fetch failed", e); }
  }, []);

  useEffect(() => {
    fetchOwm();
    const interval = setInterval(fetchOwm, 3 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchOwm]);

  // ── Control writes ──────────────────────────────────────────────────────────
  const setMode = async (mode) => {
    try { await set(dbRef("control/mode"), mode); } catch (e) { console.error(e); }
  };
  const setPump = async (pump) => {
    try { await set(dbRef("control/pump"), pump); } catch (e) { console.error(e); }
  };
  const saveFarm = async () => {
    try {
      await set(dbRef("farm/crop"), farmForm.crop);
      await set(dbRef("farm/soilType"), farmForm.soilType);
    } catch (e) { console.error(e); }
  };

  const displayWeather = owmWeather || weather;

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{CSS}</style>
      <div className="app">
        {/* ── HEADER ── */}
        <header className="header">
          <div className="header-left">
            <div className="logo-mark"><Icons.Leaf /></div>
            <div>
              <h1 className="brand">AgroSense</h1>
              <p className="brand-sub">Smart Irrigation Dashboard</p>
            </div>
          </div>
          <div className="header-right">
            <StatusBadge on={status.firebase !== false} label="Firebase" />
            <StatusBadge on={status.wifi !== false} label="Device" />
            <div className="time-badge"><Icons.Clock />{new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}</div>
          </div>
        </header>

        {/* ── ALERTS BANNER ── */}
        {alerts.message && (
          <div className="alert-banner">
            <Icons.Bell />
            <strong>{alerts.type}:</strong>&nbsp;{alerts.message}
          </div>
        )}

        {/* ── NAV TABS ── */}
        <nav className="nav-tabs">
          {[
            { id: "monitor", label: "Monitoring", icon: Icons.Droplet },
            { id: "control", label: "Control", icon: Icons.Settings },
            { id: "intelligence", label: "Intelligence", icon: Icons.Clock },
            { id: "analytics", label: "Analytics", icon: Icons.BarChart },
            { id: "history", label: "History", icon: Icons.History },
          ].map(({ id, label, icon: Icon }) => (
            <button key={id} className={`nav-tab ${activeTab === id ? "active" : ""}`} onClick={() => setActiveTab(id)}>
              <Icon />{label}
            </button>
          ))}
        </nav>

        {/* ── MAIN ── */}
        <main className="main">
          {loading && <div className="loading-screen"><div className="spinner" /><p>Connecting to field sensors…</p></div>}

          {/* ══ MONITORING ══ */}
          {!loading && activeTab === "monitor" && (
            <div className="tab-content">
              <SectionTitle icon={<Icons.Droplet />} title="Soil Sensors" subtitle="Real-time field readings" />
              <div className="gauges-grid">
                <Gauge value={sensors.soil} max={100} label="Soil Moisture" unit="%" color="#4ade80" icon={Icons.Droplet} />
                <Gauge value={sensors.humidity} max={100} label="Air Humidity" unit="%" color="#60a5fa" icon={Icons.Wind} />
                <Gauge value={sensors.salinity} max={10} label="Salinity" unit="dS/m" color="#f59e0b" icon={Icons.Zap} />
              </div>

              <SectionTitle icon={<Icons.Cloud />} title="Weather Station" subtitle={`Belgaum, IN${owmWeather ? " · Live OWM" : ""}`} />
              <div className="weather-grid">
                <WeatherStat icon={<Icons.Thermometer />} label="Temperature" value={`${Math.round(displayWeather.temperature ?? 0)}°C`} color="#f87171" />
                <WeatherStat icon={<Icons.Wind />} label="Humidity" value={`${displayWeather.humidity ?? 0}%`} color="#60a5fa" />
                <WeatherStat icon={<Icons.CloudRain />} label="Rain" value={displayWeather.rain ? "Yes" : "No"} color={displayWeather.rain ? "#818cf8" : "#6b7280"} />
              </div>

              {displayWeather.forecast?.length > 0 && (
                <>
                  <SectionTitle icon={<Icons.Sun />} title="Forecast" subtitle="Next 24 hours" />
                  <div className="forecast-grid">
  {displayWeather.forecast.map((f, i) => (
    <ForecastCard key={i} item={f} />
  ))}
</div>
                </>
              )}
            </div>
          )}

          {/* ══ CONTROL ══ */}
          {!loading && activeTab === "control" && (
            <div className="tab-content">
              <SectionTitle icon={<Icons.Settings />} title="Pump & Mode" subtitle="Manual device control" />
              <div className="control-grid">
                <div className="control-card">
                  <h3 className="card-title">Operation Mode</h3>
                  <div className="mode-toggle">
                    <button className={`mode-btn ${control.mode === "AUTO" ? "active-auto" : ""}`} onClick={() => setMode("AUTO")}>AUTO</button>
                    <button className={`mode-btn ${control.mode === "MANUAL" ? "active-manual" : ""}`} onClick={() => setMode("MANUAL")}>MANUAL</button>
                  </div>
                  <p className="card-hint">{control.mode === "AUTO" ? "AI schedule controls the pump automatically." : "You have full manual control of the pump."}</p>
                </div>

                <div className="control-card">
                  <h3 className="card-title">Pump Control</h3>
                  <div className={`pump-indicator ${control.pump === "ON" ? "pump-on" : "pump-off"}`}>
                    <div className="pump-ring" />
                    <Icons.Droplet />
                    <span>{control.pump || "OFF"}</span>
                  </div>
                  <div className="pump-btns">
                    <button className="btn btn-on" onClick={() => setPump("ON")} disabled={control.mode === "AUTO"}>Start Pump</button>
                    <button className="btn btn-off" onClick={() => setPump("OFF")} disabled={control.mode === "AUTO"}>Stop Pump</button>
                  </div>
                  {control.mode === "AUTO" && <p className="card-hint warn">Switch to MANUAL to control pump manually.</p>}
                </div>
              </div>

              <SectionTitle icon={<Icons.Leaf />} title="Farm Configuration" subtitle="Crop & soil settings" />
              <div className="farm-card">
                <div className="farm-field">
                  <label>Crop Type</label>
                  <select value={farmForm.crop} onChange={(e) => setFarmForm((p) => ({ ...p, crop: e.target.value }))}>
                    <option value="">Select crop…</option>
                    {["Wheat", "Rice", "Maize", "Cotton", "Sugarcane", "Soybean", "Tomato", "Potato", "Onion", "Other"].map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="farm-field">
                  <label>Soil Type</label>
                  <select value={farmForm.soilType} onChange={(e) => setFarmForm((p) => ({ ...p, soilType: e.target.value }))}>
                    <option value="">Select soil…</option>
                    {["Clay", "Sandy", "Loamy", "Silt", "Peat", "Chalky", "Red Laterite", "Black Cotton"].map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <button className="btn btn-save" onClick={saveFarm}>Save Configuration</button>
                {farm.crop && <p className="card-hint">Current: <b>{farm.crop}</b> on <b>{farm.soilType}</b> soil</p>}
              </div>
            </div>
          )}

          {/* ══ INTELLIGENCE ══ */}
          {!loading && activeTab === "intelligence" && (
            <div className="tab-content">
              <SectionTitle icon={<Icons.Clock />} title="AI Irrigation Schedule" subtitle="ML-generated watering plan" />
              <div className="sched-grid">
                <button
  className="btn btn-save"
  onClick={generateSchedule}
  style={{ marginTop: "1rem" }}
>
  🔄 Generate Schedule
</button>
                <div className="sched-card">
                  <div className="sched-icon" style={{ color: "#4ade80" }}><Icons.Clock /></div>
                  <div className="sched-label">Next Watering In</div>
                  <div className="sched-value">{fmtSec(schedule.water_after_sec)}</div>
                  <div className="sched-raw">{schedule.water_after_sec ?? "—"} seconds</div>
                </div>
                <div className="sched-card">
                  <div className="sched-icon" style={{ color: "#60a5fa" }}><Icons.Droplet /></div>
                  <div className="sched-label">Duration</div>
                  <div className="sched-value">{fmtSec(schedule.duration_sec)}</div>
                  <div className="sched-raw">{schedule.duration_sec ?? "—"} seconds</div>
                </div>
              </div>
              {schedule.reason && (
  <div className="ai-reason">
    <span>🧠 Reason</span>
    <p>{schedule.reason}</p>
  </div>
)}
              <div className="intel-info">
                <h4>How the AI Schedule Works</h4>
                <p>The schedule is generated by an on-device ML model that considers soil moisture levels, weather forecasts, crop water requirements, and salinity thresholds. The model updates every cycle and writes to <code>schedule/</code> in Firebase.</p>
                <div className="intel-stats">
                  <div><span>Mode</span><strong>{control.mode}</strong></div>
                  <div>
  <span>Pump</span>
  <strong className={status.pump === "ON" ? "text-green" : "text-red"}>
    {status.pump || "—"}
  </strong>
</div>
                  <div><span>Crop</span><strong>{farm.crop || "—"}</strong></div>
                  <div><span>Soil</span><strong>{farm.soilType || "—"}</strong></div>
                </div>
              </div>
            </div>
          )}
          
          {/* ══ ANALYTICS ══ */}
          {!loading && activeTab === "analytics" && (
            <div className="tab-content">
              <SectionTitle icon={<Icons.BarChart />} title="Analytics" subtitle="Sensor trend charts" />
              <div className="chart-card">
                <h3>Soil Moisture Over Time</h3>
                <div className="chart-wrap">
                  <LineChart data={soilHistory} label="Soil Moisture %" color="#4ade80" id="soilChart" />
                </div>
              </div>
              <div className="chart-card">
                <h3>Humidity Trend</h3>
                <div className="chart-wrap">
                  <LineChart data={humidHistory} label="Humidity %" color="#60a5fa" id="humidChart" />
                </div>
              </div>
            </div>
          )}

          {/* ══ HISTORY ══ */}
          {!loading && activeTab === "history" && (
            <div className="tab-content">
              <SectionTitle icon={<Icons.History />} title="Sensor History" subtitle={`Last ${history.length} readings`} />
              <div className="history-card">
                <table className="history-table">
                  <thead>
                    <tr><th>Time</th><th>Soil %</th><th>Humidity %</th><th>Salinity dS/m</th></tr>
                  </thead>
                  <tbody>
                    {history.length === 0 && <tr><td colSpan={4} className="empty">No readings yet…</td></tr>}
                    {history.map((h, i) => (
                      <tr key={i} className={i === 0 ? "latest-row" : ""}>
                        <td className="mono">{h.time}</td>
                        <td className="mono green">{typeof h.soil === "number" ? h.soil.toFixed(1) : h.soil}</td>
                        <td className="mono blue">{typeof h.humidity === "number" ? h.humidity.toFixed(1) : h.humidity}</td>
                        <td className="mono amber">{typeof h.salinity === "number" ? h.salinity.toFixed(2) : h.salinity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}

// ─── SMALL COMPONENTS ─────────────────────────────────────────────────────────
function SectionTitle({ icon, title, subtitle }) {
  return (
    <div className="section-title">
      <span className="section-icon">{icon}</span>
      <div><h2>{title}</h2><p>{subtitle}</p></div>
    </div>
  );
}
function WeatherStat({ icon, label, value, color }) {
  return (
    <div className="weather-stat" style={{ borderColor: color + "33" }}>
      <div className="ws-icon" style={{ color }}>{icon}</div>
      <div className="ws-label">{label}</div>
      <div className="ws-value" style={{ color }}>{value}</div>
    </div>
  );
}

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Syne:wght@400;600;700;800&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg: #0d1a0f;
  --bg2: #111f13;
  --bg3: #162019;
  --card: #1a2a1c;
  --card2: #1f3122;
  --border: rgba(74,222,128,0.12);
  --border2: rgba(255,255,255,0.06);
  --green: #4ade80;
  --green-d: #22c55e;
  --blue: #60a5fa;
  --amber: #f59e0b;
  --red: #f87171;
  --purple: #a78bfa;
  --text: #e8f5ea;
  --text2: rgba(232,245,234,0.55);
  --text3: rgba(232,245,234,0.3);
  --font-display: 'Syne', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  --radius: 14px;
  --radius-sm: 8px;
  --shadow: 0 4px 24px rgba(0,0,0,0.4);
}

html, body { height: 100%; background: var(--bg); color: var(--text); font-family: var(--font-display); }

/* ── SCROLLBAR ── */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: var(--bg2); }
::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }

/* ── APP ── */
.app { min-height: 100vh; display: flex; flex-direction: column; background: radial-gradient(ellipse at 20% 10%, rgba(74,222,128,0.05) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(96,165,250,0.04) 0%, transparent 60%), var(--bg); }

/* ── HEADER ── */
.header { display: flex; align-items: center; justify-content: space-between; padding: 1.2rem 2rem; background: rgba(26,42,28,0.8); backdrop-filter: blur(16px); border-bottom: 1px solid var(--border); position: sticky; top: 0; z-index: 100; flex-wrap: wrap; gap: 1rem; }
.header-left { display: flex; align-items: center; gap: 1rem; }
.logo-mark { width: 44px; height: 44px; background: linear-gradient(135deg, var(--green), #166534); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #0d1a0f; flex-shrink: 0; box-shadow: 0 0 20px rgba(74,222,128,0.3); }
.logo-mark svg { width: 22px; height: 22px; stroke-width: 2.5; }
.brand { font-size: 1.5rem; font-weight: 800; color: var(--green); letter-spacing: -0.5px; }
.brand-sub { font-size: 0.72rem; color: var(--text2); font-family: var(--font-mono); letter-spacing: 0.05em; }
.header-right { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }

/* ── STATUS BADGE ── */
.status-badge { display: flex; align-items: center; gap: 0.5rem; font-size: 0.72rem; font-family: var(--font-mono); padding: 0.35rem 0.75rem; border-radius: 100px; background: var(--card); border: 1px solid var(--border2); color: var(--text2); }
.status-badge.online .pulse-dot { background: var(--green); animation: pulse 2s infinite; }
.status-badge.offline .pulse-dot { background: var(--red); }
.pulse-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
@keyframes pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(74,222,128,0.5); } 50% { box-shadow: 0 0 0 5px rgba(74,222,128,0); } }
.time-badge { display: flex; align-items: center; gap: 0.4rem; font-size: 0.72rem; font-family: var(--font-mono); color: var(--text2); }
.time-badge svg { width: 14px; height: 14px; }

/* ── ALERT BANNER ── */
.alert-banner { display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 2rem; background: rgba(248,113,113,0.12); border-bottom: 1px solid rgba(248,113,113,0.25); color: var(--red); font-size: 0.85rem; animation: slideDown 0.3s ease; }
.alert-banner svg { width: 16px; height: 16px; flex-shrink: 0; }
@keyframes slideDown { from { transform: translateY(-100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

/* ── NAV TABS ── */
.nav-tabs { display: flex; gap: 0.25rem; padding: 0.75rem 2rem; background: var(--bg2); border-bottom: 1px solid var(--border2); overflow-x: auto; }
.nav-tab { display: flex; align-items: center; gap: 0.5rem; padding: 0.55rem 1.1rem; border-radius: var(--radius-sm); border: none; background: transparent; color: var(--text2); font-family: var(--font-display); font-size: 0.82rem; font-weight: 600; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
.nav-tab svg { width: 15px; height: 15px; }
.nav-tab:hover { background: var(--card); color: var(--text); }
.nav-tab.active { background: linear-gradient(135deg, rgba(74,222,128,0.2), rgba(74,222,128,0.05)); color: var(--green); border: 1px solid rgba(74,222,128,0.2); }

/* ── MAIN ── */
.main { flex: 1; padding: 1.5rem 2rem 3rem; max-width: 1400px; width: 100%; margin: 0 auto; }
.tab-content { animation: fadeIn 0.3s ease; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

/* ── LOADING ── */
.loading-screen { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 60vh; gap: 1.5rem; color: var(--text2); font-family: var(--font-mono); font-size: 0.85rem; }
.spinner { width: 44px; height: 44px; border: 3px solid var(--border); border-top-color: var(--green); border-radius: 50%; animation: spin 0.9s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ── SECTION TITLE ── */
.section-title { display: flex; align-items: center; gap: 0.75rem; margin: 1.75rem 0 1rem; }
.section-icon { width: 32px; height: 32px; color: var(--green); }
.section-icon svg { width: 100%; height: 100%; }
.section-title h2 { font-size: 1.1rem; font-weight: 700; color: var(--text); }
.section-title p { font-size: 0.75rem; color: var(--text2); font-family: var(--font-mono); }

/* ── GAUGES ── */
.gauges-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; }
.gauge-card { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: 1.25rem 1rem; display: flex; flex-direction: column; align-items: center; gap: 0.5rem; transition: border-color 0.2s; }
.gauge-card:hover { border-color: rgba(74,222,128,0.25); }
.gauge-icon { width: 20px; height: 20px; color: var(--text2); }
.gauge-icon svg { width: 100%; height: 100%; }
.gauge-svg { width: 128px; }
.gauge-label { font-size: 0.78rem; font-weight: 600; color: var(--text2); letter-spacing: 0.06em; text-transform: uppercase; font-family: var(--font-mono); }
.gauge-bar-wrap { width: 100%; height: 3px; background: rgba(255,255,255,0.07); border-radius: 2px; overflow: visible; }
.gauge-bar { height: 100%; border-radius: 2px; transition: width 0.6s ease; }

/* ── WEATHER ── */
.weather-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 1rem; }
.weather-stat { background: var(--card); border: 1px solid; border-radius: var(--radius); padding: 1.25rem; display: flex; flex-direction: column; align-items: center; gap: 0.5rem; }
.ws-icon { width: 28px; height: 28px; }
.ws-icon svg { width: 100%; height: 100%; }
.ws-label { font-size: 0.72rem; color: var(--text2); font-family: var(--font-mono); text-transform: uppercase; letter-spacing: 0.06em; }
.ws-value { font-size: 1.6rem; font-weight: 700; font-family: var(--font-mono); }

/* ── FORECAST ── */
.forecast-scroll { display: flex; gap: 0.75rem; overflow-x: auto; padding-bottom: 0.5rem; }
.forecast-chip { background: var(--card); border: 1px solid var(--border2); border-radius: var(--radius-sm); padding: 0.75rem 1rem; display: flex; flex-direction: column; align-items: center; gap: 0.3rem; min-width: 80px; flex-shrink: 0; }
.fc-date { font-size: 0.65rem; color: var(--text3); font-family: var(--font-mono); }
.fc-time { font-size: 0.7rem; color: var(--text2); font-family: var(--font-mono); }
.fc-icon { width: 22px; height: 22px; color: var(--blue); }
.fc-icon svg { width: 100%; height: 100%; }
.fc-temp { font-size: 0.85rem; font-weight: 700; font-family: var(--font-mono); color: var(--amber); }

/* ── FORECAST GRID ── */
.forecast-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 1rem;
  width: 100%;
}
/* ── CONTROL ── */
.control-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem; }
.control-card { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
.card-title { font-size: 0.85rem; font-weight: 700; color: var(--text2); text-transform: uppercase; letter-spacing: 0.08em; font-family: var(--font-mono); }
.card-hint { font-size: 0.75rem; color: var(--text3); font-family: var(--font-mono); line-height: 1.5; }
.card-hint.warn { color: var(--amber); }

.mode-toggle { display: flex; gap: 0.5rem; }
.mode-btn { flex: 1; padding: 0.75rem; border-radius: var(--radius-sm); border: 1px solid var(--border2); background: var(--bg3); color: var(--text2); font-family: var(--font-mono); font-size: 0.85rem; font-weight: 700; cursor: pointer; transition: all 0.2s; letter-spacing: 0.1em; }
.mode-btn.active-auto { background: rgba(74,222,128,0.15); border-color: var(--green); color: var(--green); box-shadow: 0 0 12px rgba(74,222,128,0.15); }
.mode-btn.active-manual { background: rgba(248,113,113,0.15); border-color: var(--red); color: var(--red); }

.pump-indicator { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; padding: 1.25rem; border-radius: var(--radius); border: 2px solid; position: relative; overflow: hidden; }
.pump-indicator svg { width: 32px; height: 32px; }
.pump-indicator span { font-family: var(--font-mono); font-weight: 700; font-size: 1.1rem; letter-spacing: 0.15em; }
.pump-ring { position: absolute; inset: 0; border-radius: var(--radius); animation: none; }
.pump-on { border-color: var(--green); color: var(--green); background: rgba(74,222,128,0.08); }
.pump-on .pump-ring { animation: glow-green 2s infinite; }
.pump-off { border-color: var(--border2); color: var(--text3); background: var(--bg3); }
@keyframes glow-green { 0%,100% { box-shadow: inset 0 0 0px rgba(74,222,128,0); } 50% { box-shadow: inset 0 0 20px rgba(74,222,128,0.12); } }

.pump-btns { display: flex; gap: 0.5rem; }
.btn { flex: 1; padding: 0.65rem 1rem; border-radius: var(--radius-sm); border: 1px solid; font-family: var(--font-mono); font-size: 0.8rem; font-weight: 700; cursor: pointer; transition: all 0.2s; letter-spacing: 0.08em; }
.btn:disabled { opacity: 0.35; cursor: not-allowed; }
.btn-on { background: rgba(74,222,128,0.1); border-color: var(--green); color: var(--green); }
.btn-on:not(:disabled):hover { background: rgba(74,222,128,0.2); }
.btn-off { background: rgba(248,113,113,0.1); border-color: var(--red); color: var(--red); }
.btn-off:not(:disabled):hover { background: rgba(248,113,113,0.2); }
.btn-save { background: linear-gradient(135deg, rgba(74,222,128,0.2), rgba(74,222,128,0.05)); border-color: var(--green); color: var(--green); padding: 0.75rem 1.5rem; font-family: var(--font-mono); font-size: 0.82rem; font-weight: 700; border-radius: var(--radius-sm); cursor: pointer; transition: all 0.2s; letter-spacing: 0.08em; }
.btn-save:hover { background: rgba(74,222,128,0.25); }

.farm-card { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; max-width: 520px; }
.farm-field { display: flex; flex-direction: column; gap: 0.4rem; }
.farm-field label { font-size: 0.72rem; font-family: var(--font-mono); color: var(--text2); text-transform: uppercase; letter-spacing: 0.08em; }
.farm-field select { background: var(--bg3); border: 1px solid var(--border2); color: var(--text); border-radius: var(--radius-sm); padding: 0.65rem 0.85rem; font-family: var(--font-mono); font-size: 0.85rem; appearance: none; cursor: pointer; outline: none; transition: border-color 0.2s; }
.farm-field select:focus { border-color: var(--green); }

/* ── INTELLIGENCE ── */
.sched-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; }
.sched-card { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: 2rem; display: flex; flex-direction: column; align-items: center; gap: 0.6rem; text-align: center; }
.sched-icon { width: 36px; height: 36px; }
.sched-icon svg { width: 100%; height: 100%; }
.sched-label { font-size: 0.72rem; color: var(--text2); font-family: var(--font-mono); text-transform: uppercase; letter-spacing: 0.08em; }
.sched-value { font-size: 2.2rem; font-weight: 800; color: var(--text); font-family: var(--font-mono); letter-spacing: -1px; }
.sched-raw { font-size: 0.7rem; color: var(--text3); font-family: var(--font-mono); }

.intel-info { background: var(--card); border: 1px solid var(--border2); border-radius: var(--radius); padding: 1.5rem; margin-top: 1rem; }
.intel-info h4 { font-size: 0.85rem; font-weight: 700; color: var(--green); margin-bottom: 0.5rem; }
.intel-info p { font-size: 0.82rem; color: var(--text2); line-height: 1.6; margin-bottom: 1rem; }
.intel-info code { font-family: var(--font-mono); background: var(--bg3); padding: 0.1em 0.4em; border-radius: 4px; font-size: 0.78rem; color: var(--amber); }
.intel-stats { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 0.75rem; }
.intel-stats > div { background: var(--bg3); border-radius: var(--radius-sm); padding: 0.75rem; display: flex; flex-direction: column; gap: 0.25rem; }
.intel-stats span { font-size: 0.65rem; color: var(--text3); font-family: var(--font-mono); text-transform: uppercase; }
.intel-stats strong { font-size: 0.9rem; font-family: var(--font-mono); color: var(--text); }
.text-green { color: var(--green) !important; }
.text-red { color: var(--red) !important; }

.ai-reason {
  margin-top: 1rem;
  padding: 0.75rem;
  background: rgba(74,222,128,0.08);
  border: 1px solid rgba(74,222,128,0.2);
  border-radius: var(--radius-sm);
}

.ai-reason span {
  font-size: 0.65rem;
  color: var(--green);
  font-family: var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.ai-reason p {
  margin-top: 0.3rem;
  font-size: 0.8rem;
  color: var(--text);
  line-height: 1.5;
}

/* ── CHARTS ── */
.chart-card { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: 1.5rem; margin-bottom: 1rem; }
.chart-card h3 { font-size: 0.85rem; font-weight: 700; color: var(--text2); font-family: var(--font-mono); margin-bottom: 1rem; text-transform: uppercase; letter-spacing: 0.06em; }
.chart-wrap { height: 220px; }

/* ── HISTORY ── */
.history-card { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); overflow: auto; }
.history-table { width: 100%; border-collapse: collapse; font-family: var(--font-mono); font-size: 0.8rem; }
.history-table th { background: var(--bg3); padding: 0.75rem 1.25rem; text-align: left; color: var(--text2); font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.08em; border-bottom: 1px solid var(--border2); font-weight: 600; }
.history-table td { padding: 0.65rem 1.25rem; border-bottom: 1px solid var(--border2); color: var(--text); }
.history-table tr:last-child td { border-bottom: none; }
.history-table tr:hover td { background: rgba(255,255,255,0.02); }
.latest-row td { background: rgba(74,222,128,0.04); }
.mono { font-family: var(--font-mono); }
.green { color: var(--green); }
.blue { color: var(--blue); }
.amber { color: var(--amber); }
.empty { text-align: center; color: var(--text3); padding: 2rem !important; }

/* ── RESPONSIVE ── */
@media (max-width: 768px) {
  .header { padding: 1rem 1.25rem; }
  .nav-tabs { padding: 0.5rem 1rem; }
  .main { padding: 1rem 1.25rem 2rem; }
  .brand { font-size: 1.2rem; }
  .nav-tab { padding: 0.45rem 0.75rem; font-size: 0.75rem; }
  .gauges-grid { grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); }
  .sched-value { font-size: 1.6rem; }
}
@media (max-width: 480px) {
  .header-right { gap: 0.4rem; }
  .status-badge { font-size: 0.65rem; padding: 0.3rem 0.55rem; }
  .time-badge { display: none; }
  .control-grid { grid-template-columns: 1fr; }
}
`;
