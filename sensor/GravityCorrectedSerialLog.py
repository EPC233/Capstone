import serial
import serial.tools.list_ports
import time
import argparse

def find_arduino_port():
    """Auto-detect the first available Arduino serial port."""
    for port in serial.tools.list_ports.comports():
        if 'Arduino' in (port.manufacturer or '') or 'ttyACM' in port.device:
            return port.device
    return '/dev/ttyACM0'  # fallback default

parser = argparse.ArgumentParser(description='Log gravity-corrected accelerometer data from Arduino')
parser.add_argument('--port', type=str, default=None,
                    help='Serial port (auto-detected if not specified)')
parser.add_argument('--baud', type=int, default=115200,
                    help='Baud rate (default: 115200)')
parser.add_argument('--output', type=str, default='accel_log.csv',
                    help='Output CSV filename (default: accel_log.csv)')
parser.add_argument('--header', action='store_true',
                    help='Write CSV header row')
args = parser.parse_args()

# Auto-detect port if not specified
if args.port is None:
    args.port = find_arduino_port()
    print(f"Auto-detected port: {args.port}")

# Columns from the Arduino sketch:
# ax, ay, az       - raw accelerometer (g)
# gx, gy, gz       - gyroscope (rad/s)
# qw, qx, qy, qz  - quaternion orientation
# ax_world, ay_world, az_world - world-frame acceleration (m/s²)
HEADER = "ax,ay,az,gx,gy,gz,qw,qx,qy,qz,ax_world,ay_world,az_world"
EXPECTED_COLS = 13

ser = serial.Serial(args.port, args.baud)
ser.reset_input_buffer()
time.sleep(2)

# Discard lines until we see the Arduino's CSV header or valid 13-column data
print("Waiting for Arduino header...")
max_startup_lines = 50
for _ in range(max_startup_lines):
    line = ser.readline().decode(errors='replace').strip()
    if "ax" in line and "az_world" in line:
        print(f"Arduino header: {line}")
        break
    parts = line.split(",")
    if len(parts) == EXPECTED_COLS:
        # We missed the header but got valid data — that's fine
        print(f"Header not found, but valid data detected. Starting log.")
        break
    print(f"Skipped startup line: {line}")
else:
    print(f"Warning: no header or valid data found after {max_startup_lines} lines. Logging anyway.")

with open(args.output, "w") as f:
    if args.header:
        f.write(HEADER + "\n")

    print(f"Logging to {args.output}... Press Ctrl+C to stop.")
    line_count = 0
    skip_count = 0
    try:
        while True:
            raw = ser.readline()
            try:
                line = raw.decode().strip()
            except UnicodeDecodeError:
                skip_count += 1
                continue

            parts = line.split(",")
            if len(parts) == EXPECTED_COLS:
                # Verify all parts are numeric
                try:
                    [float(p) for p in parts]
                    f.write(line + "\n")
                    line_count += 1
                    if line_count % 100 == 0:
                        f.flush()
                        print(f"  {line_count} lines logged ({skip_count} skipped)")
                except ValueError:
                    skip_count += 1
                    print(f"Skipped non-numeric line: {line}")
            else:
                skip_count += 1
                print(f"Skipped line ({len(parts)} cols, expected {EXPECTED_COLS}): {line[:80]}")
    except KeyboardInterrupt:
        f.flush()
        print(f"\nLogging stopped. {line_count} lines saved, {skip_count} skipped.")
