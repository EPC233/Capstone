"""
Arduino serial connection service.

Manages the serial connection to the Arduino, reads accelerometer data,
and broadcasts it to connected WebSocket clients.
"""

import asyncio
import json
import time
from dataclasses import dataclass, field
from typing import Optional

try:
    import serial
    import serial.tools.list_ports
    PYSERIAL_AVAILABLE = True
except ImportError:
    serial = None  # type: ignore[assignment]
    PYSERIAL_AVAILABLE = False


# Column names from the GravityCorrectedAccel sketch
COLUMNS = [
    "ax", "ay", "az",
    "gx", "gy", "gz",
    "qw", "qx", "qy", "qz",
    "ax_world", "ay_world", "az_world",
]
EXPECTED_COLS = len(COLUMNS)


def find_arduino_port() -> Optional[str]:
    """Auto-detect the first available Arduino serial port."""
    if not PYSERIAL_AVAILABLE:
        return None
    for port in serial.tools.list_ports.comports():
        if "Arduino" in (port.manufacturer or "") or "ttyACM" in port.device:
            return port.device
    return None


def list_serial_ports() -> list[dict]:
    """Return a list of available serial ports with metadata."""
    if not PYSERIAL_AVAILABLE:
        return []
    ports = []
    for port in serial.tools.list_ports.comports():
        ports.append({
            "device": port.device,
            "description": port.description,
            "manufacturer": port.manufacturer or "",
            "is_arduino": (
                "Arduino" in (port.manufacturer or "")
                or "ttyACM" in port.device
            ),
        })
    return ports


@dataclass
class RecordingBuffer:
    """Holds data collected during a recording session."""
    lines: list[str] = field(default_factory=list)
    start_time: float = 0.0
    sample_count: int = 0


class SerialService:
    """Singleton service managing the Arduino serial connection."""

    def __init__(self) -> None:
        self._serial: Optional[serial.Serial] = None
        self._connected = False
        self._port: Optional[str] = None
        self._baud = 115200
        self._read_task: Optional[asyncio.Task] = None
        self._subscribers: set[asyncio.Queue] = set()
        self._recording = False
        self._recording_buffer: Optional[RecordingBuffer] = None
        self._lock = asyncio.Lock()
        self._running = False

    # ------------------------------------------------------------------
    # Connection management
    # ------------------------------------------------------------------

    @property
    def is_connected(self) -> bool:
        return self._connected and self._serial is not None and self._serial.is_open

    @property
    def is_recording(self) -> bool:
        return self._recording

    @property
    def port(self) -> Optional[str]:
        return self._port

    @property
    def recording_samples(self) -> int:
        if self._recording_buffer:
            return self._recording_buffer.sample_count
        return 0

    async def connect(self, port: Optional[str] = None, baud: int = 115200) -> dict:
        """Open a serial connection to the Arduino."""
        if not PYSERIAL_AVAILABLE:
            return {"status": "error", "detail": "pyserial is not installed on this server. Install it with: pip install pyserial"}

        async with self._lock:
            if self.is_connected:
                return {"status": "already_connected", "port": self._port}

            target_port = port or find_arduino_port()
            if target_port is None:
                return {"status": "error", "detail": "No Arduino port found. Is the device connected?"}

            try:
                self._serial = serial.Serial(target_port, baud, timeout=0.1)
                self._serial.reset_input_buffer()
                self._port = target_port
                self._baud = baud
                self._connected = True
                self._running = True

                # Wait a moment for the Arduino to reset
                await asyncio.sleep(2)

                # Skip the header line if present
                await self._skip_header()

                # Start the background reader
                self._read_task = asyncio.create_task(self._read_loop())

                return {"status": "connected", "port": target_port}
            except serial.SerialException as exc:
                self._connected = False
                return {"status": "error", "detail": str(exc)}

    async def disconnect(self) -> dict:
        """Close the serial connection."""
        async with self._lock:
            if self._recording:
                self._recording = False

            self._running = False
            if self._read_task:
                self._read_task.cancel()
                try:
                    await self._read_task
                except asyncio.CancelledError:
                    pass
                self._read_task = None

            if self._serial and self._serial.is_open:
                self._serial.close()

            self._serial = None
            self._connected = False
            port = self._port
            self._port = None
            return {"status": "disconnected", "port": port}

    # ------------------------------------------------------------------
    # Recording
    # ------------------------------------------------------------------

    async def start_recording(self) -> dict:
        if not self.is_connected:
            return {"status": "error", "detail": "Not connected to Arduino"}
        if self._recording:
            return {"status": "error", "detail": "Already recording"}

        self._recording_buffer = RecordingBuffer(start_time=time.time())
        self._recording = True
        return {"status": "recording_started"}

    async def stop_recording(self) -> dict:
        if not self._recording or self._recording_buffer is None:
            return {"status": "error", "detail": "Not recording"}

        self._recording = False
        buffer = self._recording_buffer
        self._recording_buffer = None

        duration = time.time() - buffer.start_time
        csv_header = ",".join(COLUMNS)
        csv_body = "\n".join(buffer.lines)
        csv_content = csv_header + "\n" + csv_body + "\n"

        return {
            "status": "recording_stopped",
            "sample_count": buffer.sample_count,
            "duration_seconds": round(duration, 2),
            "csv": csv_content,
        }

    # ------------------------------------------------------------------
    # WebSocket subscriber management
    # ------------------------------------------------------------------

    def subscribe(self) -> asyncio.Queue:
        """Create a new subscriber queue for live data."""
        queue: asyncio.Queue = asyncio.Queue(maxsize=200)
        self._subscribers.add(queue)
        return queue

    def unsubscribe(self, queue: asyncio.Queue) -> None:
        self._subscribers.discard(queue)

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    async def _skip_header(self) -> None:
        """Read and discard lines until we get valid 13-column numeric data."""
        if not self._serial:
            return
        loop = asyncio.get_event_loop()
        for _ in range(50):
            raw = await loop.run_in_executor(None, self._serial.readline)
            line = raw.decode(errors="replace").strip()
            parts = line.split(",")
            if len(parts) == EXPECTED_COLS:
                try:
                    [float(p) for p in parts]
                    return  # Got valid data, header is past
                except ValueError:
                    continue
            if "ax" in line and "az_world" in line:
                return  # Found the header line itself

    async def _read_loop(self) -> None:
        """Continuously read from serial and broadcast to subscribers."""
        loop = asyncio.get_event_loop()
        sample_index = 0

        while self._running and self._serial and self._serial.is_open:
            try:
                raw = await loop.run_in_executor(None, self._serial.readline)
                if not raw:
                    continue

                line = raw.decode(errors="replace").strip()
                parts = line.split(",")

                if len(parts) != EXPECTED_COLS:
                    continue

                try:
                    values = [float(p) for p in parts]
                except ValueError:
                    continue

                # Build a JSON message
                data_point = dict(zip(COLUMNS, values))
                data_point["index"] = sample_index
                data_point["timestamp"] = time.time()
                sample_index += 1

                message = json.dumps(data_point)

                # Record if active
                if self._recording and self._recording_buffer is not None:
                    self._recording_buffer.lines.append(line)
                    self._recording_buffer.sample_count += 1

                # Broadcast to all WebSocket subscribers
                dead_queues = []
                for queue in self._subscribers:
                    try:
                        queue.put_nowait(message)
                    except asyncio.QueueFull:
                        # Drop oldest item and add new one
                        try:
                            queue.get_nowait()
                            queue.put_nowait(message)
                        except asyncio.QueueEmpty:
                            dead_queues.append(queue)

                for q in dead_queues:
                    self._subscribers.discard(q)

            except asyncio.CancelledError:
                break
            except Exception as exc:
                if PYSERIAL_AVAILABLE and isinstance(exc, serial.SerialException):
                    # Device disconnected
                    self._connected = False
                    self._running = False
                    break
                print(f"Serial read error: {exc}")
                await asyncio.sleep(0.1)


# Module-level singleton
serial_service = SerialService()
