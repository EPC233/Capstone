# Bar Brain: Real-Time Barbell Rep Analysis Using Accelerometer Signal Processing

**Ethan Chou**, advised by **Kenneth Bogert**
University of North Carolina Asheville, Department of Computer Science

📧 echou@unca.edu

---

## Abstract

Weightlifting is one of the most popular forms of exercise worldwide, yet lifters at every level lack affordable, reliable tools to objectively measure their performance. Most rely on a training partner's input, a phone propped against a wall, or simply how a set "felt" to judge the quality of their repetitions. These solutions lack the quantifiable data needed to track progress or catch form breakdowns before they lead to injury.

Metrics such as range of motion, pause time at the top and bottom of reps, and barbell speed have significant implications for both the effectiveness and safety of barbell training. **Bar Brain** is a sensor and software suite designed to bridge this gap by collecting accelerometer data directly from the barbell and transforming it into reviewable performance metrics.

The suite uses an **Arduino Nano 33 BLE Rev2** housed in a 3D-printable enclosure that affixes onto any standard barbell, streaming motion data over Bluetooth to a companion web application where each set is automatically broken into individual reps and analyzed for range of motion, velocity, acceleration, and duration. Bar Brain eliminates reliance on camera-based estimation or demanding price tags with a low-cost, sensor-driven solution that gives weightlifting enthusiasts the objective feedback they need to train smarter and safer.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│ Sensor Layer (C++)                                      │
│  Arduino Nano 33 BLE Rev2 + BMI270 IMU                  │
│  Madgwick filter → world-frame acceleration             │
│  USB Serial / Bluetooth data streaming                  │
└─────────────────────────────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────┐
│ Backend API (Python)                                    │
│  FastAPI / Uvicorn — RESTful endpoints                  │
│  Signal processing & rep analysis pipeline              │
│  CSV processing and metric extraction                   │
└─────────────────────────────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────┐
│ Database (PostgreSQL)                                   │
│  Persistent storage — users, sessions, sets             │
│  Raw CSV data + computed per-rep metrics + graph images │
└─────────────────────────────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────┐
│ Frontend (TypeScript/React)                             │
│  Mantine UI — responsive dashboard                      │
│  Real-time kinematic graphing & session history         │
└─────────────────────────────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────┐
│ Deployment (Docker)                                     │
│  Docker Compose — 4 containers                          │
│  Health checks, volume persistence                      │
│  One-command portable deployment                        │
└─────────────────────────────────────────────────────────┘
```

---

## Signal Processing Pipeline

### 1. Madgwick Orientation Filter — Orientation
On-device firmware fuses accelerometer and gyroscope data into a unit quaternion (4-tuple representation of 3D rotation) using the Madgwick algorithm. This quaternion rotates the raw acceleration vector from the sensor's local frame into world-frame and subtracts gravity, isolating the user's z-axis movement.

### 2. Smoothing & Dead-Zone Filter — Noise Reduction
A centered rolling average suppresses high-frequency output noise from the sensor. A dead-zone filter then zeroes out any remaining small accelerations (~ 0.6 m/s² by default) that represent sensor noise during pauses, preventing this noise from accumulating through the integration steps that follow.

### 3. RMS Active Region Detection — Motion Detection
A rolling Root Mean Square (RMS) aggregates the magnitude of a set of data points. When applied to the collected acceleration data, it identifies which portion of the recording contains actual barbell movement versus idle time. Only the "active" regions are processed further.

### 4. Double Integration + Drift Correction — Graphing and Recording
Acceleration (m/s²) is integrated over identified "active" regions to obtain velocity (m/s), then velocity is integrated again to obtain position (m). Because sensor bias causes each integration to drift, linear endpoint correction is applied — velocity is corrected such that it returns to zero at the end of the set, and position is corrected per-rep so the start and end positions match.

### 5. Peak-Based Rep Segmentation — Movement Delineation
To detect individual repetitions, the newly produced position curve is then searched for prominent position value peaks. The valleys between consecutive peaks define natural rep boundaries, while pauses simply widen the peak without creating a false boundary.

### 6. Phase Decomposition & Metrics — Final Data Processing
Finally, each rep is then split at its position peak into an **eccentric phase** (lowering, where muscles lengthen under load) and a **concentric phase** (lifting, where muscles shorten). The per-phase metrics are then calculated and stored in the database: ROM (cm), peak/avg velocity (m/s), peak/avg acceleration (m/s²), rep/rest duration (s), and average power in watts (W = mass × g × ROM / duration).

---

## Key Metrics & Why They Matter

### Range of Motion (ROM) — *cm*
Partial reps reduce muscle activation and increase injury risk. ROM measurement ensures each rep reaches full depth, providing objective proof of consistency across a set.

### Barbell Velocity — *m/s*
Rep speed is the most reliable indicator of neuromuscular fatigue. When velocity drops significantly between reps, the lifter is approaching failure — a foundational principle of velocity-based training (Jovanović & Flanagan, 2014).

### Rest Duration — *seconds*
Time paused at the top and bottom of reps is crucial for increasing muscular "time under tension," which has been shown to increase rates of muscle protein synthesis (Burd et al., 2012).

### Average Power — *watts*
Power (W = mass × g × ROM / time) combines load, range of motion, and speed into one number — this is the best overall measure of training intensity, used in athletic performance testing and evaluation.

---

## Features

### 🔄 Automated Rep Segmentation
Sets are automatically broken into individual reps with per-rep and per-phase metrics.

### 📊 Set-to-Set Comparison
Active set view highlights changes in ROM, velocity, and rest duration versus the previous set.

### 📈 Kinematic Signal Charts
Smoothed acceleration, velocity, and position traces with per-rep colored segmentation.

---

## Getting Started

The application is deployed as four Docker containers managed by Docker Compose.

```bash
# Build and start all services
docker compose up --build

# Frontend:  http://localhost:5173
# Backend:   http://localhost:8000
# Database:  localhost:5433
```

To populate the database with sample data:

```bash
docker compose --profile tools run --rm populate
```

### Repository Layout

| Path | Description |
| --- | --- |
| `sensor/` | Arduino firmware (C++) and Python data-logging utilities |
| `backend/` | FastAPI server, signal processing pipeline, and SQLAlchemy models |
| `frontend/` | React + TypeScript + Mantine web dashboard |
| `database/` | PostgreSQL container configuration |
| `mobile/` | Mobile companion app |
| `docker-compose.yaml` | Multi-container orchestration |

---

## References

1. Madgwick, S.O.H., Harrison, A.J.L., & Vaidyanathan, R. (2011). Estimation of IMU and MARG orientation using a gradient descent algorithm. *IEEE International Conference on Rehabilitation Robotics.* doi:10.1109/ICORR.2011.5975346
2. Jovanović, M. & Flanagan, E.P. (2014). Researched applications of velocity based strength training. *Journal of Australian Strength and Conditioning,* 22(2), 58–69.
3. Burd, N.A. et al. (2012). Muscle time under tension during resistance exercise stimulates differential muscle protein sub-fractional synthetic responses in men. *Journal of Physiology,* 590(2), 351–362. doi:10.1113/jphysiol.2011.221200
4. Schoenfeld, B.J. (2010). The mechanisms of muscle hypertrophy and their application to resistance training. *Journal of Strength and Conditioning Research,* 24(10), 2857–2872.
5. Prestes, J. et al. (2019). Strength and muscular adaptations after 6 weeks of rest-pause vs. traditional multiple-sets resistance training in trained subjects. *Journal of Strength and Conditioning Research,* 33(7S), S113–S121.

---

*UNC Asheville Undergraduate Research Symposium • 2026*
