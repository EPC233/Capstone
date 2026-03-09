import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import matplotlib
import argparse
matplotlib.use("Agg")

# Parse command line arguments
parser = argparse.ArgumentParser(description='Analyze barbell repetition accelerometer data')
parser.add_argument('--threshold', type=float, default=0.05, 
                    help='Acceleration threshold for motion detection (default: 0.05)')
parser.add_argument('--motion-window', type=int, default=20,
                    help='Number of consecutive samples to consider motion start (default: 20)')
parser.add_argument('--rest-window', type=int, default=15,
                    help='Number of consecutive samples to consider rest (default: 15)')
parser.add_argument('--sample-rate', type=int, default=100,
                    help='Sampling rate in Hz (default: 100)')
parser.add_argument('--smooth-window', type=int, default=5,
                    help='Rolling average window size (default: 5)')
parser.add_argument('--input', type=str, default='accel_log.csv',
                    help='Input CSV file (default: accel_log.csv)')
args = parser.parse_args()

# Load accelerometer data
df = pd.read_csv(args.input, names=["x", "y", "z"])

# Adjust Z values by removing 1g gravity offset
df["z_adjusted"] = df["z"] - 1.0

# Smooth Z axis with a rolling average
df["z_smooth"] = df["z_adjusted"].rolling(window=args.smooth_window).mean()

# Apply threshold: ignore small fluctuations in acceleration
threshold = args.threshold
df["z_filtered"] = df["z_smooth"]

# Sampling rate (Hz)
sample_rate = args.sample_rate
dt = 1.0 / sample_rate

# Integrate to get velocity and position with thresholding applied
velocity = []
position = []
current_velocity = 0.0
current_position = 0.0

# Parameters for detecting rest
motion_count = 0
motion_window = args.motion_window  # number of consecutive samples to consider motion

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
    # Find which rep (if any) we're currently in
    current_rep_idx = None
    for rep_idx, (rep_start, rep_end) in enumerate(reps):
        if rep_start <= i <= rep_end:
            current_rep_idx = rep_idx
            break
    
    in_rep = current_rep_idx is not None
    
    if in_rep:
        current_velocity += accel * dt
        current_position += current_velocity * dt
    else:
        # Reset velocity when not in a rep
        current_velocity = 0.0
        
        # Reset position only after odd-indexed reps (1, 3, 5, etc.)
        # This is after each rep PAIR (up+down motion)
        if i > 0:
            # Check if we just finished an odd-indexed rep
            for rep_idx, (rep_start, rep_end) in enumerate(reps):
                if i == rep_end + 1 and rep_idx % 2 == 1:  # Odd index (1, 3, 5...)
                    current_position = 0.0
                    break
    
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
plt.plot(df["position_z"], label="Z-axis Position (Reset per Rep)")
plt.title("Estimated Z-Axis Position (Reset per Rep)")
plt.xlabel("Time (samples)")
plt.ylabel("Position (g * s^2)")
for rep_start, rep_end in reps:
    plt.axvline(x=rep_start, color='g', linestyle='--', label="Rep Start" if 'Rep Start' not in plt.gca().get_legend_handles_labels()[1] else "")
    plt.axvline(x=rep_end, color='b', linestyle='--', label="Rep End" if 'Rep End' not in plt.gca().get_legend_handles_labels()[1] else "")
plt.grid(True)
plt.legend()
plt.tight_layout()
plt.savefig("position_z_plot.png")
print("Saved plot to position_z_plot.png")

# Parameters for detecting rest
rest_window = args.rest_window  # number of consecutive samples to consider a rest
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