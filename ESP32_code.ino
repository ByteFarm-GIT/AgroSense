#include <WiFi.h>
#include <Firebase_ESP_Client.h>

// ---------------- WIFI ----------------
#define WIFI_SSID "wifi_name"
#define WIFI_PASSWORD "wifi_password"

// ---------------- FIREBASE ----------------
#define API_KEY "your_DB_API"
#define DATABASE_URL "your_DB_URL"

// Firebase objects
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

// ---------------- PINS ----------------
#define PUMP_PIN 5
#define SOIL_PIN 34   // not used yet, random data for now

// ---------------- CONSTANTS ----------------
const int FALLBACK_MOISTURE_THRESHOLD = 75;

// ---------------- GLOBAL STATE ----------------
int soilMoisture = 0;
int airHumidity = 0;
int salinity = 0;

String mode = "AUTO";
String pumpCmd = "OFF";

unsigned long scheduleDuration = 0;
unsigned long scheduleWaterAfter = 0;

enum AutoState { AUTO_IDLE, AUTO_PUMPING, AUTO_WAITING };
AutoState autoState = AUTO_IDLE;
unsigned long pumpStartTime = 0;
unsigned long waitStartTime = 0;

const unsigned long SENSOR_READ_INTERVAL = 15000;
const unsigned long CONTROL_READ_INTERVAL = 2000;
const unsigned long SCHEDULE_READ_INTERVAL = 30000;

unsigned long lastSensorSend = 0;
unsigned long lastControlRead = 0;
unsigned long lastScheduleRead = 0;

unsigned long lastControlPrint = 0;
String lastPrintedMode = "";
String lastPrintedPumpCmd = "";

bool wifiConnected = false;
bool firebaseReady = false;

unsigned long lastWifiAttempt = 0;
const unsigned long WIFI_RETRY_INTERVAL = 10000;

bool actualPumpState = false;

// ---------------- FUNCTION PROTOTYPES ----------------
void handleWiFi();
void readSensors();
bool sendSensorData();
bool readControl();
bool readSchedule();
void applyManualControl();
void runAutoStateMachine();
void fallbackControl();
void setPump(bool on);

// ---------------- SETUP ----------------
void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n🚀 Smart Irrigation System Starting...");

  pinMode(PUMP_PIN, OUTPUT);
  setPump(false);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    delay(500);
  }
  Serial.println("\n✅ WiFi Connected");
  Serial.println(WiFi.localIP());
  wifiConnected = true;

  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;
  config.timeout.serverResponse = 10000;

  if (Firebase.signUp(&config, &auth, "", "")) {
    Serial.println("✅ Firebase Auth Success");
  } else {
    Serial.print("❌ Auth Failed: ");
    Serial.println(config.signer.signupError.message.c_str());
  }

  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
}

// ---------------- MAIN LOOP ----------------
void loop() {
  handleWiFi();
  if (!wifiConnected) {
    if (mode == "AUTO") {
      fallbackControl();
    }
    delay(1000);
    return;
  }

  if (auth.token.uid == "") {
    Serial.println("⏳ Waiting for Firebase auth...");
    delay(1000);
    return;
  }
  firebaseReady = true;

  unsigned long now = millis();
  if (now - lastSensorSend >= SENSOR_READ_INTERVAL) {
    lastSensorSend = now;
    readSensors();
    sendSensorData(); // ignore return, error already printed
  }

  if (now - lastControlRead >= CONTROL_READ_INTERVAL) {
    lastControlRead = now;
    if (!readControl()) {
      firebaseReady = false;
    } else {
      firebaseReady = true;
    }
  }

  if (mode == "MANUAL") {
    applyManualControl();
    autoState = AUTO_IDLE;
  } else { // AUTO
    if (firebaseReady) {
      if (now - lastScheduleRead >= SCHEDULE_READ_INTERVAL) {
        lastScheduleRead = now;
        readSchedule(); // error handled inside
      }
      runAutoStateMachine();
    } else {
      fallbackControl();
    }
  }

  delay(50);
}

// ---------------- WIFI MANAGEMENT ----------------
void handleWiFi() {
  if (WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    return;
  }
  wifiConnected = false;
  firebaseReady = false;
  unsigned long now = millis();
  if (now - lastWifiAttempt > WIFI_RETRY_INTERVAL) {
    lastWifiAttempt = now;
    Serial.println("🔄 Reconnecting WiFi...");
    WiFi.disconnect();
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  }
}

// ---------------- SENSOR SIMULATION ----------------
void readSensors() {
  soilMoisture = random(30, 100);
  airHumidity = random(40, 80);
  salinity = random(200, 500);
  Serial.printf("📊 Sensors: Soil=%d%%, Humidity=%d%%, Salinity=%d ppm\n", 
                soilMoisture, airHumidity, salinity);
}

// ---------------- FIREBASE SEND ----------------
bool sendSensorData() {
  if (!Firebase.ready()) return false;
  bool ok = true;
  ok &= Firebase.RTDB.setInt(&fbdo, "/smart_irrigation/device_1/sensors/soil", soilMoisture);
  ok &= Firebase.RTDB.setInt(&fbdo, "/smart_irrigation/device_1/sensors/humidity", airHumidity);
  ok &= Firebase.RTDB.setInt(&fbdo, "/smart_irrigation/device_1/sensors/salinity", salinity);
  if (!ok) {
    Serial.print("❌ Send failed: ");
    Serial.println(fbdo.errorReason());
    return false;
  }
  Serial.println("📡 Sensor data sent to Firebase");
  return true;
}

// ---------------- FIREBASE READ: CONTROL ----------------
bool readControl() {
  if (!Firebase.ready()) return false;
  bool ok = true;
  String newMode, newPump;
  if (Firebase.RTDB.getString(&fbdo, "/smart_irrigation/device_1/control/mode")) {
    newMode = fbdo.stringData();
  } else ok = false;
  if (Firebase.RTDB.getString(&fbdo, "/smart_irrigation/device_1/control/pump")) {
    newPump = fbdo.stringData();
  } else ok = false;
  if (!ok) {
    Serial.print("❌ Control read error: ");
    Serial.println(fbdo.errorReason());
    return false;
  }

  mode = newMode;
  pumpCmd = newPump;

  // Print only when changed or every 30 seconds
  unsigned long now = millis();
  if (mode != lastPrintedMode || pumpCmd != lastPrintedPumpCmd || (now - lastControlPrint) > 30000) {
    lastPrintedMode = mode;
    lastPrintedPumpCmd = pumpCmd;
    lastControlPrint = now;
    Serial.printf("🎮 [Cmd] Mode=%s, Pump=%s", mode.c_str(), pumpCmd.c_str());
    if (mode == "AUTO") {
      Serial.print(" (ignored in AUTO)");
    }
    Serial.println();
    // Do NOT print actual pump state here; it will be printed when changed by setPump()
  }
  return true;
}

// ---------------- FIREBASE READ: SCHEDULE ----------------
bool readSchedule() {
  if (!Firebase.ready()) return false;
  bool ok = true;
  int dur = 0, after = 0;
  if (Firebase.RTDB.getInt(&fbdo, "/smart_irrigation/device_1/schedule/duration_sec")) {
    dur = fbdo.intData();
  } else ok = false;
  if (Firebase.RTDB.getInt(&fbdo, "/smart_irrigation/device_1/schedule/water_after_sec")) {
    after = fbdo.intData();
  } else ok = false;
  if (!ok) {
    Serial.print("❌ Schedule read error: ");
    Serial.println(fbdo.errorReason());
    return false;
  }
  scheduleDuration = dur;
  scheduleWaterAfter = after;
  Serial.printf("📅 Schedule updated: Duration=%lus, Wait=%lus\n", 
                scheduleDuration, scheduleWaterAfter);
  return true;
}

// ---------------- PUMP CONTROL HELPER ----------------
void setPump(bool on) {
  if (actualPumpState == on) return; // no change, avoid redundant prints
  actualPumpState = on;
  digitalWrite(PUMP_PIN, on ? LOW : HIGH);
  Serial.printf("💧 Pump %s\n", on ? "ON" : "OFF");
  if (Firebase.ready()) {
    Firebase.RTDB.setString(&fbdo, "/smart_irrigation/device_1/status/pump", on ? "ON" : "OFF");
  }
}

// ---------------- MANUAL MODE ----------------
void applyManualControl() {
  // Only change pump when command differs from actual state
  bool desiredState = (pumpCmd == "ON");
  setPump(desiredState);
}

// ---------------- AUTO MODE STATE MACHINE ----------------
void runAutoStateMachine() {
  unsigned long now = millis();
  switch (autoState) {
    case AUTO_IDLE:
      if (scheduleDuration > 0) {
        Serial.println("🔄 AUTO: Starting irrigation cycle");
        setPump(true);
        pumpStartTime = now;
        autoState = AUTO_PUMPING;
      }
      break;
    case AUTO_PUMPING:
      if (now - pumpStartTime >= scheduleDuration * 1000UL) {
        setPump(false);
        waitStartTime = now;
        autoState = AUTO_WAITING;
        Serial.printf("⏳ AUTO: Waiting %lu seconds before next schedule read\n", 
                      scheduleWaterAfter);
      }
      break;
    case AUTO_WAITING:
      if (now - waitStartTime >= scheduleWaterAfter * 1000UL) {
        autoState = AUTO_IDLE;
        lastScheduleRead = 0; // force schedule read
        Serial.println("🔄 AUTO: Wait period ended, will fetch new schedule");
      }
      break;
  }
}

// ---------------- FALLBACK (OFFLINE) CONTROL ----------------
void fallbackControl() {
  bool shouldPump = (soilMoisture < FALLBACK_MOISTURE_THRESHOLD);
  if (shouldPump != actualPumpState) {
    setPump(shouldPump);
    Serial.printf("⚠️ FALLBACK: Soil moisture %d%% %s threshold %d%%\n",
                  soilMoisture, shouldPump ? "below" : "above",
                  FALLBACK_MOISTURE_THRESHOLD);
  }
}
