import serial
import time

port = "COM4"  # Replace with the correct COM port!
baud = 9600
filename = "accel_log.csv"

ser = serial.Serial(port, baud)
time.sleep(2)

with open(filename, "w") as f:
    print(f"Logging to {filename}... Press Ctrl+C to stop.")
    try:
        while True:
            line = ser.readline().decode().strip()
            f.write(line + "\n")
    except KeyboardInterrupt:
        print("Logging stopped.")
