"""
Serial port routes for Arduino and data mangement.

Routes:
    ---- Serial connection routes ----
    GET /serial/ports - List serial ports
    GET /serial/status - Get current connection and recording status
    POST /serial/connect - Connect to Arduino
    POST /serial/disconnect - Disconnect from Arduino
    
    ---- Serial recording routes ----
    POST /serial/record/start - Start recording serial data
    POST /serial/record/stop - Stop recording (if session_id save to session, set_id to overwrite specific set)
    POST /serial/record/upload - Upload csv to session - deprecated as of now
    WebSocket /serial/ws - Stream live serial data
"""

import os
from datetime import datetime

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import joinedload

from auth import get_current_active_user
from database import get_db
from models.user import User
from models.session import Session
from models.set import Set
from models.accelerometer_data import AccelerometerData
from services.serial_service import serial_service, list_serial_ports

router = APIRouter(prefix="/serial", tags=["serial"])

UPLOAD_DIR = os.environ.get("UPLOAD_DIR", os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads"))
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.get("/ports")
async def get_ports(
    current_user: User = Depends(get_current_active_user),
):
    return list_serial_ports()


@router.get("/status")
async def get_status(
    current_user: User = Depends(get_current_active_user),
):
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
    result = await serial_service.connect(port=port, baud=baud)
    return result


@router.post("/disconnect")
async def disconnect(
    current_user: User = Depends(get_current_active_user),
):
    result = await serial_service.disconnect()
    return result


@router.post("/record/start")
async def start_recording(
    current_user: User = Depends(get_current_active_user),
):
    result = await serial_service.start_recording()
    return result


@router.post("/record/stop")
async def stop_recording(
    session_id: int = Query(None, description="Session ID to save recording to"),
    set_id: int = Query(None, description="Existing set ID to overwrite with new recording data"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    result = await serial_service.stop_recording()

    if result.get("status") != "recording_stopped":
        return result

    csv_content: str = result.pop("csv", "")

    if session_id is not None and csv_content:
        stmt = select(Session).where(
            Session.id == session_id, Session.user_id == current_user.id
        )
        session_result = await db.execute(stmt)
        session = session_result.scalars().first()

        if session is None:
            result["save_error"] = "Session not found or not owned by user"
        else:
            if set_id is not None:
                set_stmt = select(Set).where(
                    Set.id == set_id, Set.session_id == session_id
                )
                set_result = await db.execute(set_stmt)
                target_set = set_result.scalars().first()
                if target_set is None:
                    result["save_error"] = "Set not found or does not belong to this session"
                    return result
                new_set = target_set
            else:
                count_stmt = select(Set).where(Set.session_id == session_id)
                count_result = await db.execute(count_stmt)
                existing_sets = count_result.scalars().all()

                last_empty = None
                for s in sorted(existing_sets, key=lambda x: x.set_number, reverse=True):
                    if s.status == "empty":
                        last_empty = s
                        break

                if last_empty:
                    new_set = last_empty
                else:
                    new_set = Set(
                        session_id=session_id,
                        set_number=len(existing_sets) + 1,
                        status="recording",
                    )
                    db.add(new_set)
                    await db.flush()

            timestamp = datetime.utcnow().timestamp()
            file_name = f"recording_{session_id}_{timestamp:.0f}.csv"
            file_path = os.path.join(UPLOAD_DIR, file_name)

            with open(file_path, "w") as f:
                f.write(csv_content)

            if new_set.id:
                old_accel = await db.execute(
                    select(AccelerometerData).where(
                        AccelerometerData.set_id == new_set.id
                    )
                )
                old = old_accel.scalars().first()
                if old:
                    if os.path.exists(old.file_path):
                        os.remove(old.file_path)
                    await db.delete(old)
                    await db.flush()

            accel_data = AccelerometerData(
                set_id=new_set.id,
                file_name=file_name,
                file_path=file_path,
                file_size=len(csv_content.encode()),
                description=f"Set {new_set.set_number} — {result.get('sample_count', 0)} samples, {result.get('duration_seconds', 0)}s",
            )
            
            db.add(accel_data)
            new_set.status = "complete"
            new_set.updated_at = datetime.utcnow()
            await db.commit()
            await db.refresh(accel_data)

            result["saved_to_session"] = session_id
            result["set_id"] = new_set.id
            result["accelerometer_data_id"] = accel_data.id

    return result



@router.post("/record/upload")
async def upload_recording(
    request: Request,
    session_id: int = Query(..., description="Session ID to save recording to"),
    set_id: int = Query(None, description="Existing set ID to overwrite"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    csv_content = (await request.body()).decode("utf-8")
    if not csv_content.strip():
        return {"error": "Empty CSV body"}

    lines = [l for l in csv_content.strip().split("\n") if l.strip()]
    sample_count = max(len(lines) - 1, 0)

    stmt = select(Session).where(
        Session.id == session_id, Session.user_id == current_user.id
    )
    session_result = await db.execute(stmt)
    session = session_result.scalars().first()

    if session is None:
        return {"error": "Session not found or not owned by user"}

    if set_id is not None:
        set_stmt = select(Set).where(
            Set.id == set_id, Set.session_id == session_id
        )
        set_result = await db.execute(set_stmt)
        target_set = set_result.scalars().first()
        if target_set is None:
            return {"error": "Set not found or does not belong to this session"}
        new_set = target_set
    else:
        count_stmt = select(Set).where(Set.session_id == session_id)
        count_result = await db.execute(count_stmt)
        existing_sets = count_result.scalars().all()

        last_empty = None
        for s in sorted(existing_sets, key=lambda x: x.set_number, reverse=True):
            if s.status == "empty":
                last_empty = s
                break

        if last_empty:
            new_set = last_empty
        else:
            new_set = Set(
                session_id=session_id,
                set_number=len(existing_sets) + 1,
                status="recording",
            )
            db.add(new_set)
            await db.flush()

    timestamp = datetime.utcnow().timestamp()
    file_name = f"recording_{session_id}_{timestamp:.0f}.csv"
    file_path = os.path.join(UPLOAD_DIR, file_name)

    with open(file_path, "w") as f:
        f.write(csv_content)

    if new_set.id:
        old_accel = await db.execute(
            select(AccelerometerData).where(
                AccelerometerData.set_id == new_set.id
            )
        )
        old = old_accel.scalars().first()
        if old:
            if os.path.exists(old.file_path):
                os.remove(old.file_path)
            await db.delete(old)
            await db.flush()

    accel_data = AccelerometerData(
        set_id=new_set.id,
        file_name=file_name,
        file_path=file_path,
        file_size=len(csv_content.encode()),
        description=f"Set {new_set.set_number} — {sample_count} samples (BLE)",
    )
    db.add(accel_data)
    new_set.status = "complete"
    new_set.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(accel_data)

    return {
        "saved_to_session": session_id,
        "set_id": new_set.id,
        "accelerometer_data_id": accel_data.id,
        "sample_count": sample_count,
    }



@router.websocket("/ws")
async def websocket_live_data(websocket: WebSocket):
    await websocket.accept()

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
