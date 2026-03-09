import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import matplotlib
import argparse
from scipy.signal import find_peaks, butter, filtfilt
matplotlib.use("Agg")

# Parse command line arguments
parser = argparse.ArgumentParser(description='Analyze barbell repetition accelerometer data')
parser.add_argument('--threshold', type=float, default=0.05, 
                    help='Acceleration threshold for motion detection (default: 0.05)')
parser.add_argument('--motion-window', type=int, default=20,
                    help='Min samples between reps (default: 20)')
parser.add_argument('--rest-window', type=int, default=15,
                    help='(unused, kept for compatibility)')
parser.add_argument('--sample-rate', type=int, default=100,
                    help='Sampling rate in Hz (default: 100)')
parser.add_argument('--smooth-window', type=int, default=11,
                    help='Rolling average window size (default: 11)')
parser.add_argument('--input', type=str, default='accel_log.csv',
                    help='Input CSV file (default: accel_log.csv)')
args = parser.parse_args()

# Load accelerometer data (13-column gravity-corrected CSV)
COLUMNS = ["ax","ay","az","gx","gy","gz","qw","qx","qy","qz","ax_world","ay_world","az_world"]
df = pd.read_csv(args.input, names=COLUMNS)

# Use world-frame Z acceleration (already gravity-subtracted, in m/s²)
# Convert to g for analysis
df["z_adjusted"] = df["az_world"] / 9.80665

# Smooth Z axis with a rolling average
df["z_smooth"] = df["z_adjusted"].rolling(window=args.smooth_window, center=True).mean().fillna(0)

threshold = args.threshold
sample_rate = args.sample_rate
dt = 1.0 / sample_rate
accel = df["z_smooth"].values

# --- Step 1: Find active region (where significant motion occurs) ---
# Use a rolling RMS to find where the barbell is actually moving
rms_window = 30
rms = pd.Series(accel).rolling(window=rms_window, center=True).apply(
    lambda x: np.sqrt(np.mean(x**2)), raw=True
).fillna(0).values
active_mask = rms > threshold
# Find first and last active index with some padding
active_indices = np.where(active_mask)[0]
if len(active_indices) > 0:
    active_start = max(0, active_indices[0] - 10)
    active_end = min(len(accel) - 1, active_indices[-1] + 10)
else:
    active_start, active_end = 0, len(accel) - 1

print(f"Active region: samples {active_start} to {active_end}")

# --- Step 2: Integrate acceleration to get velocity ---
raw_velocity = np.zeros(len(accel))
for i in range(1, len(accel)):
    if active_start <= i <= active_end:
        raw_velocity[i] = raw_velocity[i-1] + accel[i] * dt
    else:
        raw_velocity[i] = 0.0

# --- Step 3: Remove velocity drift using linear detrend within active region ---
# The assumption is that net velocity over the entire set should be ~0
active_slice = slice(active_start, active_end + 1)
active_len = active_end - active_start + 1
# Linear drift correction: subtract a line from start to end velocity
if active_len > 1:
    drift_rate = raw_velocity[active_end] / active_len
    for i in range(active_start, active_end + 1):
        raw_velocity[i] -= drift_rate * (i - active_start)

# --- Step 4: Detect reps via velocity zero-crossings ---
# Each time velocity crosses zero within the active region = a turning point (top or bottom of rep)
zero_crossings = []
for i in range(active_start + 1, active_end + 1):
    if raw_velocity[i-1] * raw_velocity[i] < 0:  # sign change
        zero_crossings.append(i)

# Filter out crossings that are too close together (noise)
min_rep_samples = args.motion_window
filtered_crossings = []
for zc in zero_crossings:
    if len(filtered_crossings) == 0 or (zc - filtered_crossings[-1]) >= min_rep_samples:
        filtered_crossings.append(zc)

# Each pair of consecutive zero-crossings is a half-rep (up or down)
# Group into full reps: [start, mid, end] where mid is the turnaround
reps = []
# A full rep goes: zero-crossing -> zero-crossing -> zero-crossing (up then down, or vice versa)
# So pair them up as (crossing[0], crossing[2]), (crossing[2], crossing[4]), etc.
if len(filtered_crossings) >= 2:
    # Include the active_start as the first boundary if the first crossing is far from it
    boundaries = [active_start] + filtered_crossings + [active_end]
    
    # Each rep spans two half-reps: boundary[i] to boundary[i+2]
    i = 0
    while i + 2 < len(boundaries):
        rep_start = boundaries[i]
        rep_end = boundaries[i + 2]
        reps.append((rep_start, rep_end))
        i += 2  # advance by a full rep

print(f"Detected {len(reps)} reps")
print(f"Zero-crossings: {filtered_crossings}")
print(f"Reps: {reps}")

# --- Step 5: Per-rep integration with drift correction ---
velocity = np.zeros(len(accel))
position = np.zeros(len(accel))

for rep_start, rep_end in reps:
    # Integrate acceleration -> velocity for this rep
    v = 0.0
    rep_velocities = [0.0]
    for i in range(rep_start + 1, rep_end + 1):
        v += accel[i] * dt
        rep_velocities.append(v)
    
    # Linear drift correction: velocity should be ~0 at start and end of each rep
    rep_len = rep_end - rep_start + 1
    if rep_len > 1:
        drift = rep_velocities[-1] / (rep_len - 1)
        for j in range(len(rep_velocities)):
            rep_velocities[j] -= drift * j
    
    # Write corrected velocity
    for j, idx in enumerate(range(rep_start, rep_end + 1)):
        velocity[idx] = rep_velocities[j]
    
    # Integrate velocity -> position for this rep
    p = 0.0
    rep_positions = [0.0]
    for j in range(1, len(rep_velocities)):
        p += rep_velocities[j] * dt
        rep_positions.append(p)
    
    # Position drift correction: should return to ~0 at end of rep
    if len(rep_positions) > 1:
        drift = rep_positions[-1] / (len(rep_positions) - 1)
        for j in range(len(rep_positions)):
            rep_positions[j] -= drift * j
    
    for j, idx in enumerate(range(rep_start, rep_end + 1)):
        position[idx] = rep_positions[j]

df["velocity_z"] = velocity
df["position_z"] = position

# Convert position from g*s^2 to approximate meters: multiply by 9.81
df["position_m"] = position * 9.80665

# Print rep summary
for i, (rs, re) in enumerate(reps):
    peak_pos = df["position_m"].iloc[rs:re+1].max()
    min_pos = df["position_m"].iloc[rs:re+1].min()
    rom = peak_pos - min_pos
    duration = (re - rs) / sample_rate
    print(f"  Rep {i+1}: samples {rs}-{re}, duration {duration:.2f}s, ROM ~{rom:.3f}m ({rom*100:.1f}cm)")

# --- Plotting ---
fig, axes = plt.subplots(3, 1, figsize=(14, 12), sharex=True)

# Plot 1: Smoothed acceleration
ax1 = axes[0]
ax1.plot(df["z_smooth"], label="Z-axis Acceleration", linewidth=0.8)
ax1.set_title("Smoothed Z-Axis Acceleration (World Frame, Gravity Removed)")
ax1.set_ylabel("Acceleration (g)")
ax1.axhline(y=threshold, color='r', linestyle='--', alpha=0.5, label="Threshold")
ax1.axhline(y=-threshold, color='r', linestyle='--', alpha=0.5)
for i, (rs, re) in enumerate(reps):
    color = plt.cm.tab10(i % 10)
    ax1.axvspan(rs, re, alpha=0.15, color=color, label=f"Rep {i+1}" if i < 10 else "")
ax1.grid(True, alpha=0.3)
ax1.legend(loc='upper right', fontsize=8)

# Plot 2: Velocity
ax2 = axes[1]
ax2.plot(velocity, label="Z-axis Velocity (per-rep corrected)", linewidth=0.8)
ax2.set_title("Estimated Z-Axis Velocity (Drift-Corrected per Rep)")
ax2.set_ylabel("Velocity (m/s)")
for i, (rs, re) in enumerate(reps):
    color = plt.cm.tab10(i % 10)
    ax2.axvspan(rs, re, alpha=0.15, color=color)
ax2.axhline(y=0, color='k', linewidth=0.5)
ax2.grid(True, alpha=0.3)
ax2.legend(loc='upper right', fontsize=8)

# Plot 3: Position
ax3 = axes[2]
ax3.plot(df["position_m"], label="Z-axis Position (per-rep corrected)", linewidth=0.8, color='tab:green')
ax3.set_title("Estimated Z-Axis Position (Drift-Corrected per Rep)")
ax3.set_xlabel("Time (samples)")
ax3.set_ylabel("Position (m)")
for i, (rs, re) in enumerate(reps):
    color = plt.cm.tab10(i % 10)
    ax3.axvspan(rs, re, alpha=0.15, color=color)
ax3.axhline(y=0, color='k', linewidth=0.5)
ax3.grid(True, alpha=0.3)
ax3.legend(loc='upper right', fontsize=8)

plt.tight_layout()
plt.savefig("rep_analysis.png", dpi=150)
print("Saved combined plot to rep_analysis.png")

# Also save individual plots for compatibility
plt.figure(figsize=(12, 5))
plt.plot(df["z_smooth"], label="Z-axis Acceleration")
plt.title("Smoothed Z-Axis Acceleration")
plt.xlabel("Time (samples)")
plt.ylabel("Acceleration (g)")
plt.axhline(y=threshold, color='r', linestyle='--', label="Threshold")
plt.axhline(y=-threshold, color='r', linestyle='--')
for i, (rs, re) in enumerate(reps):
    plt.axvline(x=rs, color='g', linestyle='--', label="Rep Start" if i == 0 else "")
    plt.axvline(x=re, color='b', linestyle='--', label="Rep End" if i == 0 else "")
plt.grid(True)
plt.legend()
plt.tight_layout()
plt.savefig("smoothed_z_plot.png")
print("Saved plot to smoothed_z_plot.png")

plt.figure(figsize=(12, 5))
plt.plot(velocity, label="Z-axis Velocity")
plt.title("Estimated Z-Axis Velocity")
plt.xlabel("Time (samples)")
plt.ylabel("Velocity (m/s)")
for i, (rs, re) in enumerate(reps):
    plt.axvline(x=rs, color='g', linestyle='--', label="Rep Start" if i == 0 else "")
    plt.axvline(x=re, color='b', linestyle='--', label="Rep End" if i == 0 else "")
plt.grid(True)
plt.legend()
plt.tight_layout()
plt.savefig("velocity_z_plot.png")
print("Saved plot to velocity_z_plot.png")

plt.figure(figsize=(12, 5))
plt.plot(df["position_m"], label="Z-axis Position", color='tab:green')
plt.title("Estimated Z-Axis Position")
plt.xlabel("Time (samples)")
plt.ylabel("Position (m)")
for i, (rs, re) in enumerate(reps):
    plt.axvline(x=rs, color='g', linestyle='--', label="Rep Start" if i == 0 else "")
    plt.axvline(x=re, color='b', linestyle='--', label="Rep End" if i == 0 else "")
plt.grid(True)
plt.legend()
plt.tight_layout()
plt.savefig("position_z_plot.png")
print("Saved plot to position_z_plot.png")