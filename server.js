import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// ─────────────────────────────────────────────
// ROUTE: GENERATE SCHEDULE
// ─────────────────────────────────────────────
app.post("/generate-schedule", (req, res) => {
  try {
    console.log("🔥 API HIT");
    console.log("📥 Incoming:", req.body);

    const {
      soil = 0,
      humidity = 0,
      salinity = 0,
      weather = {},
      crop = "Generic",
      soilType = "Normal"
    } = req.body;

    let water_after_sec = 600;
    let duration_sec = 120;
    let reason = [];

    // ───── SOIL LOGIC ─────
    if (soil < 30) {
      water_after_sec = 60;
      duration_sec = 180;
      reason.push("Soil is dry → water soon");
    } else if (soil > 70) {
      water_after_sec = 3600;
      duration_sec = 60;
      reason.push("Soil is wet → delay watering");
    } else {
      water_after_sec = 600;
      duration_sec = 120;
      reason.push("Soil is moderate");
    }

    // ───── WEATHER LOGIC ─────
    if (weather?.rain === true) {
      water_after_sec += 3600;
      reason.push("Rain expected → delaying irrigation");
    }

    if (weather?.temperature > 35) {
      duration_sec += 60;
      reason.push("High temperature → increase watering");
    }

    // ───── SALINITY LOGIC ─────
    if (salinity > 5) {
      duration_sec = Math.max(60, duration_sec / 2);
      reason.push("High salinity → reduce watering duration");
    }

    // ───── HUMIDITY LOGIC ─────
    if (humidity > 80) {
      water_after_sec += 600;
      reason.push("High humidity → delay watering");
    }

    // ───── CROP BASED LOGIC ─────
    if (crop.toLowerCase() === "rice") {
      duration_sec += 60;
      reason.push("Rice needs more water");
    }

    if (crop.toLowerCase() === "wheat") {
      duration_sec += 20;
      reason.push("Wheat moderate water need");
    }

    // ───── FINAL RESULT ─────
    const result = {
      water_after_sec: Math.floor(water_after_sec),
      duration_sec: Math.floor(duration_sec),
      reason: reason.join(" | "),
      source: "logic-engine",
      generated_at: Date.now()
    };

    console.log("✅ RESULT:", result);

    res.json(result);

  } catch (error) {
    console.error("❌ ERROR:", error);

    res.json({
      water_after_sec: 600,
      duration_sec: 120,
      source: "fallback",
      reason: "Server error fallback"
    });
  }
});

// ─────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────
app.listen(3001, () => {
  console.log("🚀 Server running on http://localhost:3001");
});