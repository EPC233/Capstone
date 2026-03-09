import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

# === CONFIG ===
FILENAME = "accel_log.csv"     # your logged data
SAMPLE_RATE = 200.0            # Hz — must match Arduino filter.begin() rate
ZUPT_ACCEL_STD = 0.02 * 9.80665  # stationary accel variance threshold (~0.02g)
ZUPT_GYRO_STD = 3.0 * np.pi / 180  # stationary gyro threshold (rad/s)
ZUPT_WINDOW = 20               # samples (≈0.1 s @200Hz)

# === LOAD & CLEAN ===
# Expected columns: ax,ay,az,gx,gy,gz,qw,qx,qy,qz,ax_world,ay_world,az_world
df = pd.read_csv(FILENAME)
df.columns = [c.strip() for c in df.columns]

# If your logger added timestamps, keep them; otherwise make synthetic time.
if "time" in df.columns[0].lower():
    t = df.iloc[:, 0].values
else:
    t = np.arange(len(df)) / SAMPLE_RATE

axw = df["ax_world"].to_numpy()
ayw = df["ay_world"].to_numpy()
azw = df["az_world"].to_numpy()

gx = np.deg2rad(df["gx"].to_numpy())  # deg/s → rad/s for thresholds
gy = np.deg2rad(df["gy"].to_numpy())
gz = np.deg2rad(df["gz"].to_numpy())

dt = 1.0 / SAMPLE_RATE

# === ZUPT detection ===
# Windowed standard deviation of accel magnitude and gyro norm
accel_mag = np.sqrt(axw**2 + ayw**2 + azw**2)
gyro_mag = np.sqrt(gx**2 + gy**2 + gz**2)

def rolling_std(a, n):
    return np.sqrt(pd.Series(a).rolling(n, center=True).var().to_numpy())

accel_std = rolling_std(accel_mag, ZUPT_WINDOW)
gyro_std = rolling_std(gyro_mag, ZUPT_WINDOW)

is_stationary = (accel_std < ZUPT_ACCEL_STD) & (gyro_std < ZUPT_GYRO_STD)

# === Integrate acceleration to velocity & position ===
vel = np.zeros_like(axw)
pos = np.zeros_like(axw)

for i in range(1, len(axw)):
    vel[i] = vel[i-1] + azw[i] * dt
    pos[i] = pos[i-1] + vel[i] * dt

    # Apply ZUPT: if stationary, zero velocity and correct drift
    if is_stationary[i]:
        vel[i] = 0.0

# Optional: high-pass filter to remove any residual offset
vel -= np.mean(vel[is_stationary])
pos -= np.mean(pos[is_stationary])

# === PLOTS ===
plt.figure(figsize=(10, 8))

plt.subplot(3, 1, 1)
plt.plot(t, azw, label="World-frame Accel (Z)")
plt.ylabel("m/s²")
plt.title("Barbell Motion Tracking (Vertical Axis)")
plt.legend()
plt.grid(True)

plt.subplot(3, 1, 2)
plt.plot(t, vel, label="Velocity (Z)")
plt.ylabel("m/s")
plt.legend()
plt.grid(True)

plt.subplot(3, 1, 3)
plt.plot(t, pos, label="Position (Z)")
plt.xlabel("Time (s)")
plt.ylabel("m")
plt.legend()
plt.grid(True)

plt.tight_layout()
plt.show()

# === OUTPUT METRICS ===
disp = pos.max() - pos.min()
print(f"Estimated vertical displacement: {disp:.3f} m")

