import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")

# Load accelerometer data
df = pd.read_csv("accel_log.csv", names=["x", "y", "z"])

# Adjust Z values by removing 1g gravity offset
df["z_adjusted"] = df["z"] - 1.0

# Smooth Z axis with a rolling average
df["z_smooth"] = df["z_adjusted"].rolling(window=5).mean()

# Apply threshold: ignore small fluctuations in acceleration
threshold = 0.05
df["z_filtered"] = df["z_smooth"]

# Sampling rate (Hz)
sample_rate = 100
dt = 1.0 / sample_rate

# Integrate to get velocity and position with thresholding applied
velocity = []
position = []
current_velocity = 0.0
current_position = 0.0

# Parameters for detecting rest

motion_count = 0
motion_window = 20  # number of consecutive samples to consider motion

reps = []
rep_start = 0
rep_end = 0

in_rep = False
return_count = 0

for i, accel in enumerate(df["z_filtered"]):
    if abs(accel) >= threshold and not in_rep:
        motion_count += 1
    elif motion_count > 0:
        motion_count -= 1

    # valid motion detected
    if motion_count >= motion_window and not in_rep:
        rep_start = i - motion_window - 10  # mark index of start of rep
        rep_end = 0

        for j, accel in enumerate(df["z_filtered"][rep_start:]):
            if return_count >= motion_window:
                rep_end = j + rep_start
                break
            if abs(accel) < threshold:
                return_count += 1
            elif return_count > 0:
                return_count -= 1

        if rep_end != 0:
            reps.append((rep_start, rep_end))
            return_count = 0
            motion_count = 0
            rep_start = 0
            rep_end = 0
            in_rep = True  # <-- now we're inside a rep

    if in_rep and i >= reps[-1][1]:  # <-- exit "in_rep" mode once past rep_end
        in_rep = False

for i, accel in enumerate(df["z_filtered"]):
    in_rep = any(rep_start <= i <= rep_end for rep_start, rep_end in reps)
    if in_rep:
        current_velocity += accel * dt
        current_position += current_velocity * dt
    else:
        current_velocity = 0.0
    velocity.append(current_velocity)
    position.append(current_position)

df["velocity_z"] = velocity
df["position_z"] = position

print(reps)

# Plot smoothed Z-axis acceleration
plt.figure(figsize=(12, 5))
plt.plot(df["z_filtered"],
         label="Z-axis Acceleration")
plt.title("Smoothed Z-Axis Acceleration")
plt.xlabel("Time (samples)")
plt.ylabel("Acceleration (g)")
plt.axhline(y=threshold, color='r', linestyle='--', label="Threshold")
plt.axhline(y=-0.05, color='r', linestyle='--')
for rep_start, rep_end in reps:
    plt.axvline(x=rep_start, color='g', linestyle='--', label="Rep Start" if 'Rep Start' not in plt.gca().get_legend_handles_labels()[1] else "")
    plt.axvline(x=rep_end, color='b', linestyle='--', label="Rep End" if 'Rep End' not in plt.gca().get_legend_handles_labels()[1] else "")
plt.grid(True)
plt.legend()
plt.tight_layout()
plt.savefig("smoothed_z_plot.png")
print("Saved plot to smoothed_z_plot.png")

# Plot velocity
plt.figure(figsize=(12, 5))
plt.plot(df["velocity_z"], label="Z-axis Velocity (Thresholded)")
plt.title("Estimated Z-Axis Velocity (Thresholded)")
plt.xlabel("Time (samples)")
plt.ylabel("Velocity (g * s)")
for rep_start, rep_end in reps:
    plt.axvline(x=rep_start, color='g', linestyle='--', label="Rep Start" if 'Rep Start' not in plt.gca().get_legend_handles_labels()[1] else "")
    plt.axvline(x=rep_end, color='b', linestyle='--', label="Rep End" if 'Rep End' not in plt.gca().get_legend_handles_labels()[1] else "")
plt.grid(True)
plt.legend()
plt.tight_layout()
plt.savefig("velocity_z_plot.png")
print("Saved plot to velocity_z_plot.png")

# Plot position
plt.figure(figsize=(12, 5))
plt.plot(df["position_z"], label="Z-axis Position (Thresholded)")
plt.title("Estimated Z-Axis Position")
plt.xlabel("Time (samples)")
plt.ylabel("Position (g * s^2)")
plt.grid(True)
plt.legend()
plt.tight_layout()
plt.savefig("position_z_plot.png")
print("Saved plot to position_z_plot.png")

# Parameters for detecting rest
rest_window = 15  # number of consecutive samples to consider a rest
rest_count = 0

for i, accel in enumerate(df["z_filtered"]):
    if abs(accel) >= threshold:
        current_velocity += accel * dt
        current_position += current_velocity * dt
        rest_count = 0
    else:
        rest_count += 1
        if rest_count >= rest_window:
            current_velocity = 0.0  # Snap to zero at rest

    velocity.append(current_velocity)
    position.append(current_position)