"""
Serial / live-data API routes.

Provides:
  - GET  /serial/ports          — list available serial ports
  - POST /serial/connect        — connect to the Arduino
  - POST /serial/disconnect     — disconnect
  - GET  /serial/status         — connection & recording status
  - POST /serial/record/start   — begin recording data
  - POST /serial/record/stop    — stop recording, return CSV + save to session
  - WS   /serial/ws             — WebSocket stream of live accelerometer data
"""

import os
from datetime import datetime

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import joinedload

from auth import get_current_active_user
from database import get_db
from models.user import User
from models.session import Session
from models.accelerometer_data import AccelerometerData
from services.serial_service import serial_service, list_serial_ports

router = APIRouter(prefix="/serial", tags=["serial"])

UPLOAD_DIR = os.environ.get("UPLOAD_DIR", os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads"))
os.makedirs(UPLOAD_DIR, exist_ok=True)


# ------------------------------------------------------------------
# REST endpoints
# ------------------------------------------------------------------

@router.get("/ports")
async def get_ports(
    current_user: User = Depends(get_current_active_user),
):
    """List available serial ports."""
    return list_serial_ports()


@router.get("/status")
async def get_status(
    current_user: User = Depends(get_current_active_user),
):
    """Get current connection and recording status."""
    return {
        "connected": serial_service.is_connected,
        "port": serial_service.port,
        "recording": serial_service.is_recording,
        "recording_samples": serial_service.recording_samples,
    }


@router.post("/connect")
async def connect(
    port: str = Query(None, description="Serial port device path (auto-detect if omitted)"),
    baud: int = Query(115200, description="Baud rate"),
    current_user: User = Depends(get_current_active_user),
):
    """Connect to the Arduino serial port."""
    result = await serial_service.connect(port=port, baud=baud)
    return result


@router.post("/disconnect")
async def disconnect(
    current_user: User = Depends(get_current_active_user),
):
    """Disconnect from the Arduino."""
    result = await serial_service.disconnect()
    return result


@router.post("/record/start")
async def start_recording(
    current_user: User = Depends(get_current_active_user),
):
    """Start recording accelerometer data."""
    result = await serial_service.start_recording()
    return result


@router.post("/record/stop")
async def stop_recording(
    session_id: int = Query(None, description="Session ID to save recording to"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Stop recording and optionally save the CSV to a session.
    If session_id is provided, the CSV is saved as accelerometer data on that session.
    """
    result = await serial_service.stop_recording()

    if result.get("status") != "recording_stopped":
        return result

    csv_content: str = result.pop("csv", "")

    # If a session_id was provided, persist the CSV
    if session_id is not None and csv_content:
        # Verify session ownership
        stmt = select(Session).where(
            Session.id == session_id, Session.user_id == current_user.id
        )
        session_result = await db.execute(stmt)
        session = session_result.scalars().first()

        if session is None:
            result["save_error"] = "Session not found or not owned by user"
        else:
            # Determine set number based on existing accelerometer data in this session
            count_stmt = select(AccelerometerData).where(
                AccelerometerData.session_id == session_id
            )
            count_result = await db.execute(count_stmt)
            existing_count = len(count_result.scalars().all())
            set_number = existing_count + 1

            timestamp = datetime.utcnow().timestamp()
            file_name = f"recording_{session_id}_{timestamp:.0f}.csv"
            file_path = os.path.join(UPLOAD_DIR, file_name)

            with open(file_path, "w") as f:
                f.write(csv_content)

            accel_data = AccelerometerData(
                session_id=session_id,
                file_name=file_name,
                file_path=file_path,
                file_size=len(csv_content.encode()),
                description=f"Set {set_number} — {result.get('sample_count', 0)} samples, {result.get('duration_seconds', 0)}s",
            )
            db.add(accel_data)
            await db.commit()
            await db.refresh(accel_data)

            result["saved_to_session"] = session_id
            result["accelerometer_data_id"] = accel_data.id

    return result


# ------------------------------------------------------------------
# WebSocket endpoint for live data streaming
# ------------------------------------------------------------------

@router.websocket("/ws")
async def websocket_live_data(websocket: WebSocket):
    """
    Stream live accelerometer data to the client.

    The client should send a valid auth token as a query parameter:
        ws://host/api/serial/ws?token=<jwt>

    Each message is a JSON object with the 13 accelerometer columns
    plus ``index`` and ``timestamp``.
    """
    await websocket.accept()

    # Subscribe to data
    queue = serial_service.subscribe()

    try:
        while True:
            message = await queue.get()
            await websocket.send_text(message)
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        serial_service.unsubscribe(queue)
