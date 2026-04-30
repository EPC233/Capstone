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
    serial = None
    PYSERIAL_AVAILABLE = False


COLUMNS_WITH_TS = [
    "timestamp_us",
    "ax", "ay", "az",
    "gx", "gy", "gz",
    "qw", "qx", "qy", "qz",
    "ax_world", "ay_world", "az_world",
]
COLUMNS_NO_TS = [
    "ax", "ay", "az",
    "gx", "gy", "gz",
    "qw", "qx", "qy", "qz",
    "ax_world", "ay_world", "az_world",
]
EXPECTED_COLS_NO_TS = len(COLUMNS_NO_TS)
EXPECTED_COLS_WITH_TS = len(COLUMNS_WITH_TS)


def find_arduino_port() -> Optional[str]:
    if not PYSERIAL_AVAILABLE:
        return None
    for port in serial.tools.list_ports.comports():
        if "Arduino" in (port.manufacturer or "") or "ttyACM" in port.device:
            return port.device
    return None


def list_serial_ports() -> list[dict]:
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


def parse_data_line(line: str) -> Optional[tuple[list[str], list[float]]]:
    parts = line.split(",")
    if len(parts) not in (EXPECTED_COLS_NO_TS, EXPECTED_COLS_WITH_TS):
        return None
    try:
        values = [float(p) for p in parts]
    except ValueError:
        return None
    cols = COLUMNS_WITH_TS if len(parts) == EXPECTED_COLS_WITH_TS else COLUMNS_NO_TS
    return cols, values


def is_header_line(line: str) -> bool:
    return "ax" in line and "az_world" in line


def build_data_message(cols: list[str], values: list[float], sample_index: int) -> str:
    data_point = dict(zip(cols, values))
    data_point["index"] = sample_index
    data_point["timestamp"] = time.time()
    return json.dumps(data_point)


def build_csv_content(lines: list[str]) -> str:
    has_timestamps = False
    if lines:
        first_parts = lines[0].split(",")
        has_timestamps = len(first_parts) == EXPECTED_COLS_WITH_TS

    cols = COLUMNS_WITH_TS if has_timestamps else COLUMNS_NO_TS
    csv_header = ",".join(cols)
    csv_body = "\n".join(lines)
    return csv_header + "\n" + csv_body + "\n"


def push_to_queue(queue: asyncio.Queue, message: str) -> bool:
    try:
        queue.put_nowait(message)
        return True
    except asyncio.QueueFull:
        try:
            queue.get_nowait()
            queue.put_nowait(message)
            return True
        except asyncio.QueueEmpty:
            return False


@dataclass
class RecordingBuffer:
    lines: list[str] = field(default_factory=list)
    start_time: float = 0.0
    sample_count: int = 0


class SerialService:
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
        if not PYSERIAL_AVAILABLE:
            return {
                "status": "error",
                "detail": "pyserial is not installed on this server. Install it with: pip install pyserial",
            }

        async with self._lock:
            if self.is_connected:
                return {"status": "already_connected", "port": self._port}

            target_port = port or find_arduino_port()
            if target_port is None:
                return {"status": "error", "detail": "No Arduino port found. Is the device connected?"}

            return await self._open_serial(target_port, baud)

    async def _open_serial(self, target_port: str, baud: int) -> dict:
        try:
            self._serial = serial.Serial(target_port, baud, timeout=0.1)
            self._serial.reset_input_buffer()
            self._port = target_port
            self._baud = baud
            self._connected = True
            self._running = True

            await asyncio.sleep(2)
            await self._skip_header()

            self._read_task = asyncio.create_task(self._read_loop())
            return {"status": "connected", "port": target_port}
        except serial.SerialException as exc:
            self._connected = False
            return {"status": "error", "detail": str(exc)}

    async def disconnect(self) -> dict:
        async with self._lock:
            if self._recording:
                self._recording = False

            await self._stop_read_task()
            self._close_serial()

            port = self._port
            self._port = None
            return {"status": "disconnected", "port": port}

    async def _stop_read_task(self) -> None:
        self._running = False
        if self._read_task:
            self._read_task.cancel()
            try:
                await self._read_task
            except asyncio.CancelledError:
                pass
            self._read_task = None

    def _close_serial(self) -> None:
        if self._serial and self._serial.is_open:
            self._serial.close()
        self._serial = None
        self._connected = False

    async def start_recording(self) -> dict:
        if not self.is_connected:
            return {"status": "error", "detail": "Not connected to Arduino"}
        if self._recording:
            return {"status": "error", "detail": "Already recording"}

        self._begin_recording()
        return {"status": "recording_started"}

    def _begin_recording(self) -> None:
        self._recording_buffer = RecordingBuffer(start_time=time.time())
        self._recording = True

    def _end_recording(self) -> Optional[RecordingBuffer]:
        if self._recording_buffer is None:
            return None
        self._recording = False
        buffer = self._recording_buffer
        self._recording_buffer = None
        return buffer

    async def stop_recording(self) -> dict:
        if not self._recording or self._recording_buffer is None:
            return {"status": "error", "detail": "Not recording"}

        buffer = self._end_recording()
        if buffer is None:
            return {"status": "error", "detail": "Not recording"}

        duration = time.time() - buffer.start_time
        csv_content = build_csv_content(buffer.lines)

        return {
            "status": "recording_stopped",
            "sample_count": buffer.sample_count,
            "duration_seconds": round(duration, 2),
            "csv": csv_content,
        }

    def subscribe(self) -> asyncio.Queue:
        queue: asyncio.Queue = asyncio.Queue(maxsize=200)
        self._subscribers.add(queue)
        return queue

    def unsubscribe(self, queue: asyncio.Queue) -> None:
        self._subscribers.discard(queue)

    def _broadcast(self, message: str) -> None:
        dead_queues = []
        for queue in self._subscribers:
            if not push_to_queue(queue, message):
                dead_queues.append(queue)
        for q in dead_queues:
            self._subscribers.discard(q)

    def _broadcast_control(self, event: str) -> None:
        self._broadcast(json.dumps({"type": "control", "event": event}))

    def _handle_control_line(self, line: str) -> bool:
        if line == "RECORD_START":
            if not self._recording:
                self._begin_recording()
            self._broadcast_control("record_start")
            return True
        if line == "RECORD_STOP":
            if self._recording:
                self._recording = False
            self._broadcast_control("record_stop")
            return True
        if line == "TARE":
            self._broadcast_control("tare")
            return True
        return False

    def _record_line(self, line: str) -> None:
        if self._recording and self._recording_buffer is not None:
            self._recording_buffer.lines.append(line)
            self._recording_buffer.sample_count += 1

    async def _skip_header(self) -> None:
        if not self._serial:
            return
        loop = asyncio.get_event_loop()
        for _ in range(50):
            raw = await loop.run_in_executor(None, self._serial.readline)
            line = raw.decode(errors="replace").strip()
            if parse_data_line(line) is not None:
                return
            if is_header_line(line):
                return

    async def _read_serial_line(self) -> Optional[str]:
        if not self._serial:
            return None
        loop = asyncio.get_event_loop()
        raw = await loop.run_in_executor(None, self._serial.readline)
        if not raw:
            return None
        return raw.decode(errors="replace").strip()

    async def _read_loop(self) -> None:
        sample_index = 0

        while self._running and self._serial and self._serial.is_open:
            try:
                line = await self._read_serial_line()
                if line is None:
                    continue

                if self._handle_control_line(line):
                    continue

                parsed = parse_data_line(line)
                if parsed is None:
                    continue

                cols, values = parsed
                message = build_data_message(cols, values, sample_index)
                sample_index += 1

                self._record_line(line)
                self._broadcast(message)

            except asyncio.CancelledError:
                break
            except Exception as exc:
                if PYSERIAL_AVAILABLE and isinstance(exc, serial.SerialException):
                    self._connected = False
                    self._running = False
                    break
                print(f"Serial read error: {exc}")
                await asyncio.sleep(0.1)


serial_service = SerialService()
