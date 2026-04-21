# 🌿 AgroSense — Smart Irrigation Dashboard

A production-ready, real-time smart irrigation dashboard built with **React + Firebase Realtime Database + Chart.js**.

---

## 📸 Features

| Section          | What it does                                                                          |
| ---------------- | ------------------------------------------------------------------------------------- |
| **Monitoring**   | Live gauges for soil moisture, humidity, salinity; weather panel with OWM integration |
| **Control**      | Toggle AUTO/MANUAL mode, start/stop pump, configure crop & soil type                  |
| **Intelligence** | Displays AI-generated irrigation schedule (water_after_sec, duration_sec)             |
| **Analytics**    | Chart.js line charts for soil moisture and humidity trends                            |
| **History**      | Rolling table of last 20 sensor readings                                              |

---

## 🚀 Quick Start

### 1. Clone & install

```bash
git clone <your-repo>
cd smart-irrigation-dashboard
npm install
```

### 2. Configure Firebase

Open `src/App.jsx` and replace the `firebaseConfig` object at the top:

```js
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  databaseURL: "YOUR_DATABASE_URL", // e.g. https://your-project-default-rtdb.firebaseio.com
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
};
```

You can find these values in your Firebase Console → Project Settings → General → Your apps.

### 3. Configure OpenWeatherMap (optional)

Also in `src/App.jsx`, replace:

```js
const OWM_API_KEY = "YOUR_OPENWEATHERMAP_API_KEY";
```

Get a free key at https://openweathermap.org/api. Weather data is fetched for **Belgaum, IN** and written back to Firebase every 3 hours.

### 4. Set Firebase Database Rules

In the Firebase Console → Realtime Database → Rules, paste the contents of `firebase-rules.json`. For production, tighten these rules with authentication.

### 5. Run locally

```bash
npm run dev
```

Open http://localhost:5173

---

## 🗂️ Firebase Data Structure

```
smart_irrigation/
  device_1/
    sensors/
      soil: number          # 0–100 (%)
      humidity: number      # 0–100 (%)
      salinity: number      # 0–10 (dS/m)
    control/
      mode: "AUTO" | "MANUAL"
      pump: "ON" | "OFF"
    schedule/
      water_after_sec: number
      duration_sec: number
    farm/
      crop: string
      soilType: string
    weather/
      temperature: number
      humidity: number
      rain: boolean
      forecast: array       # OpenWeatherMap forecast list
    alerts/
      type: string
      message: string
    status/
      wifi: boolean
      firebase: boolean
```

---

## 🧱 Project Structure

```
smart-irrigation-dashboard/
├── index.html
├── package.json
├── vite.config.js
├── firebase-rules.json
└── src/
    ├── main.jsx            # React entry point
    └── App.jsx             # All components (self-contained single file)
```

All components are co-located in `App.jsx` for simplicity. Expand into separate files as the project grows.

---

## 🛠️ Build for Production

```bash
npm run build
# Output in dist/
```

Deploy `dist/` to Firebase Hosting, Vercel, or Netlify.

---

## 🔧 Customization

- **Add more crops/soil types**: edit the `<option>` lists in the Farm Configuration section of `App.jsx`
- **Change chart history length**: adjust `MAX_HISTORY` constant (currently 20)
- **Change OWM city**: update `OWM_CITY` constant
- **Add authentication**: wrap Firebase reads/writes with Firebase Auth

---

## 📦 Dependencies

| Package   | Version | Purpose           |
| --------- | ------- | ----------------- |
| react     | 18      | UI framework      |
| react-dom | 18      | DOM rendering     |
| firebase  | 10      | Realtime Database |
| chart.js  | 4       | Analytics charts  |
| vite      | 5       | Build tool        |
