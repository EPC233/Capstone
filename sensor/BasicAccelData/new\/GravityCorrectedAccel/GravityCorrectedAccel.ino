#include <Arduino_BMI270_BMM150.h>
#include <MadgwickAHRS.h>
#include <ArduinoBLE.h>

Madgwick filter;   // Initialize Madgwick filter (defaults: beta=0.1, sampleFreq=100 Hz)
unsigned long lastUpdate = 0;
float deltat = 0.0f;  // Refresh rate in seconds

// Gravity
const float G = 9.80665;

// Button ________________________________________________________________________
#define BUTTON_PIN 2
bool isRecording = false;
bool lastButtonState = HIGH;           // INPUT_PULLUP → idle HIGH
unsigned long lastDebounceTime = 0;
const unsigned long DEBOUNCE_MS = 50;

// Tare (zero) reference quaternion — stores orientation at button press
float refQw = 1.0f, refQx = 0.0f, refQy = 0.0f, refQz = 0.0f;
bool needsTare = false;

// Bluetooth _____________________________________________________________________
#define IMU_SERVICE_UUID        "12345678-1234-5678-1234-56789abcdef0"
#define IMU_CHARACTERISTIC_UUID "12345678-1234-5678-1234-56789abcdef1"

BLEService imuService(IMU_SERVICE_UUID);

// Binary packet: 1 uint32 (timestamp) + 13 floats = 4 + 52 = 56 bytes
// Fields: timestamp_us | ax ay az | gx gy gz | qw qx qy qz             | ax_w ay_w az_w
//                      | accel    | gyro     | orientation quaternion  | gravity-corrected accel in world frame
const int PACKET_SIZE = sizeof(uint32_t) + 13 * sizeof(float); // 56 bytes
BLECharacteristic imuCharacteristic(
  IMU_CHARACTERISTIC_UUID,
  BLERead | BLENotify,
  PACKET_SIZE
);

void setup() {
  Serial.begin(115200);
  unsigned long serialWait = millis();
  while (!Serial && (millis() - serialWait < 3000));

  // Button & LED
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, LOW);

  if (!IMU.begin()) {
    Serial.println("Failed to initialize IMU!");
    while (1);
  }

  // ── Initialize BLE ──────────────────────────────────────────
  if (!BLE.begin()) {
    Serial.println("Failed to initialize BLE!");
    while (1);
  }

  BLE.setLocalName("IMU-Sensor");
  BLE.setAdvertisedService(imuService);
  imuService.addCharacteristic(imuCharacteristic);
  BLE.addService(imuService);

  BLE.advertise();

  Serial.println("BLE advertising as \"IMU-Sensor\"");
  Serial.println("timestamp_us,ax,ay,az,gx,gy,gz,qw,qx,qy,qz,ax_world,ay_world,az_world");
  filter.begin(100); // Actual sample rate ~100 Hz
}

void loop() {
  // Keep BLE stack alive (handles connections, disconnections, etc.)
  BLE.poll();

  // ── Button debounce & toggle ─────────────────────────────────
  bool reading = digitalRead(BUTTON_PIN);
  if (reading != lastButtonState) {
    lastDebounceTime = millis();
  }
  if ((millis() - lastDebounceTime) > DEBOUNCE_MS) {
    static bool stableState = HIGH;
    if (reading != stableState) {
      stableState = reading;
      if (stableState == LOW) {  // Pressed (active LOW with pullup)
        isRecording = !isRecording;
        digitalWrite(LED_BUILTIN, isRecording ? HIGH : LOW);
        // Tare orientation on the next IMU sample
        needsTare = true;
        // Send 1-byte marker over BLE so the web app knows
        if (BLE.connected()) {
          uint8_t marker = isRecording ? 1 : 0;
          imuCharacteristic.writeValue(&marker, 1);
        }
        Serial.println(isRecording ? "RECORD_START" : "RECORD_STOP");
      }
    }
  }
  lastButtonState = reading;

  float ax, ay, az;
  float gx, gy, gz;
  unsigned long now = micros();
  static unsigned long last = now;

  // Compute time delta in seconds
  deltat = (now - last) / 1.0e6f;
  last = now;

  if (IMU.accelerationAvailable() && IMU.gyroscopeAvailable()) {
    IMU.readAcceleration(ax, ay, az);
    IMU.readGyroscope(gx, gy, gz);

    // Convert gyro from deg/s to rad/s
    gx *= DEG_TO_RAD;
    gy *= DEG_TO_RAD;
    gz *= DEG_TO_RAD;

    // Update filter (magnetometer disabled)
    filter.updateIMU(gx, gy, gz, ax, ay, az);

    // Reconstruct quaternion from Euler angles (ZYX convention)
    float rollR  = filter.getRollRadians();
    float pitchR = filter.getPitchRadians();
    float yawR   = filter.getYawRadians();

    float cr = cos(rollR * 0.5f),  sr = sin(rollR * 0.5f);
    float cp = cos(pitchR * 0.5f), sp = sin(pitchR * 0.5f);
    float cy = cos(yawR * 0.5f),   sy = sin(yawR * 0.5f);

    float qw = cr * cp * cy + sr * sp * sy;
    float qx = sr * cp * cy - cr * sp * sy;
    float qy = cr * sp * cy + sr * cp * sy;
    float qz = cr * cp * sy - sr * sp * cy;

    // Capture tare reference if requested (button was just pressed)
    if (needsTare) {
      // Store conjugate of current quaternion as reference
      refQw =  qw;
      refQx = -qx;
      refQy = -qy;
      refQz = -qz;
      needsTare = false;
      Serial.println("TARE");
    }

    // Apply tare: q_rel = q_ref_inv * q_current
    float rw = refQw*qw - refQx*qx - refQy*qy - refQz*qz;
    float rx = refQw*qx + refQx*qw + refQy*qz - refQz*qy;
    float ry = refQw*qy - refQx*qz + refQy*qw + refQz*qx;
    float rz = refQw*qz + refQx*qy - refQy*qx + refQz*qw;
    qw = rw; qx = rx; qy = ry; qz = rz;

    // Rotate accel into world frame
    float ax_w = ax, ay_w = ay, az_w = az;
    rotateVectorByQuaternion(ax, ay, az, qw, qx, qy, qz, ax_w, ay_w, az_w);

    // Subtract gravity (assume gravity = (0,0,1g))
    az_w -= 1.0f;
    // Convert to m/s²
    ax_w *= G;
    ay_w *= G;
    az_w *= G;

    // ── Send data over BLE ──────────────────────────────────
    if (BLE.connected()) {
      uint8_t packet[PACKET_SIZE];
      int offset = 0;

      uint32_t ts = (uint32_t)now;
      memcpy(packet + offset, &ts,   sizeof(ts));   offset += sizeof(ts);
      memcpy(packet + offset, &ax,   sizeof(float)); offset += sizeof(float);
      memcpy(packet + offset, &ay,   sizeof(float)); offset += sizeof(float);
      memcpy(packet + offset, &az,   sizeof(float)); offset += sizeof(float);
      memcpy(packet + offset, &gx,   sizeof(float)); offset += sizeof(float);
      memcpy(packet + offset, &gy,   sizeof(float)); offset += sizeof(float);
      memcpy(packet + offset, &gz,   sizeof(float)); offset += sizeof(float);
      memcpy(packet + offset, &qw,   sizeof(float)); offset += sizeof(float);
      memcpy(packet + offset, &qx,   sizeof(float)); offset += sizeof(float);
      memcpy(packet + offset, &qy,   sizeof(float)); offset += sizeof(float);
      memcpy(packet + offset, &qz,   sizeof(float)); offset += sizeof(float);
      memcpy(packet + offset, &ax_w, sizeof(float)); offset += sizeof(float);
      memcpy(packet + offset, &ay_w, sizeof(float)); offset += sizeof(float);
      memcpy(packet + offset, &az_w, sizeof(float));

      imuCharacteristic.writeValue(packet, PACKET_SIZE);
    }

    // Print as CSV (still available over USB serial for debugging)
    Serial.print(now); Serial.print(",");
    Serial.print(ax, 4); Serial.print(",");
    Serial.print(ay, 4); Serial.print(",");
    Serial.print(az, 4); Serial.print(",");
    Serial.print(gx, 4); Serial.print(",");
    Serial.print(gy, 4); Serial.print(",");
    Serial.print(gz, 4); Serial.print(",");
    Serial.print(qw, 6); Serial.print(",");
    Serial.print(qx, 6); Serial.print(",");
    Serial.print(qy, 6); Serial.print(",");
    Serial.print(qz, 6); Serial.print(",");
    Serial.print(ax_w, 4); Serial.print(",");
    Serial.print(ay_w, 4); Serial.print(",");
    Serial.println(az_w, 4);
  }
}

/**
 * Rotate a 3D vector (x, y, z) by a quaternion (qw, qx, qy, qz)
 * Result is stored in (rx, ry, rz)
 */
void rotateVectorByQuaternion(float x, float y, float z,
                              float qw, float qx, float qy, float qz,
                              float &rx, float &ry, float &rz) {
  // Quaternion-vector multiplication: v' = q * v * q⁻¹
  float ix =  qw * x + qy * z - qz * y;
  float iy =  qw * y + qz * x - qx * z;
  float iz =  qw * z + qx * y - qy * x;
  float iw = -qx * x - qy * y - qz * z;

  rx = ix * qw + iw * -qx + iy * -qz - iz * -qy;
  ry = iy * qw + iw * -qy + iz * -qx - ix * -qz;
  rz = iz * qw + iw * -qz + ix * -qy - iy * -qx;
}

