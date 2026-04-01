"""
Session API endpoints
"""

import os
from typing import List
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import joinedload

from auth import get_current_active_user
from database import get_db
from models.user import User
from models.session import Session
from models.set import Set
from models.accelerometer_data import AccelerometerData
from models.graph_image import GraphImage
from models.rep_detail import RepDetail
from schemas.session import (
    SessionCreate,
    SessionResponse,
    SessionUpdate,
    GraphImageResponse,
)
from schemas.set import SetCreate, SetUpdate, SetResponse
from services.analysis_service import analyze_csv

router = APIRouter(prefix="/sessions", tags=["sessions"])

# Upload directory for files
UPLOAD_DIR = os.environ.get("UPLOAD_DIR", os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads"))
os.makedirs(UPLOAD_DIR, exist_ok=True)


def _session_query_options():
    """Common joinedload options for session queries."""
    return [
        joinedload(Session.sets).joinedload(Set.accelerometer_data),
        joinedload(Session.sets).joinedload(Set.rep_details),
        joinedload(Session.graph_images),
    ]


@router.post("", response_model=SessionResponse, status_code=201)
async def create_session(
    session_data: SessionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new session for the current user."""
    session = Session(
        user_id=current_user.id,
        name=session_data.name,
        description=session_data.description,
        session_type=session_data.session_type,
    )
    db.add(session)
    await db.commit()

    result = await db.execute(
        select(Session)
        .where(Session.id == session.id)
        .options(*_session_query_options())
    )
    return result.scalars().unique().one()


@router.get("", response_model=List[SessionResponse])
async def get_user_sessions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get all sessions for the current user."""
    result = await db.execute(
        select(Session)
        .where(Session.user_id == current_user.id)
        .options(*_session_query_options())
        .order_by(Session.created_at.desc())
    )
    return result.scalars().unique().all()


@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get a specific session by ID."""
    result = await db.execute(
        select(Session)
        .where(Session.id == session_id, Session.user_id == current_user.id)
        .options(*_session_query_options())
    )
    session = result.scalars().first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.put("/{session_id}", response_model=SessionResponse)
async def update_session(
    session_id: int,
    session_data: SessionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update a session."""
    result = await db.execute(
        select(Session)
        .where(Session.id == session_id, Session.user_id == current_user.id)
    )
    session = result.scalars().first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session_data.name is not None:
        session.name = session_data.name
    if session_data.description is not None:
        session.description = session_data.description
    if session_data.session_type is not None:
        session.session_type = session_data.session_type
    session.updated_at = datetime.utcnow()

    await db.commit()

    result = await db.execute(
        select(Session)
        .where(Session.id == session_id)
        .options(*_session_query_options())
    )
    return result.scalars().unique().one()


@router.delete("/{session_id}", status_code=204)
async def delete_session(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Delete a session and all associated data."""
    result = await db.execute(
        select(Session)
        .where(Session.id == session_id, Session.user_id == current_user.id)
    )
    session = result.scalars().first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    await db.delete(session)
    await db.commit()
    return None



@router.post("/{session_id}/sets", response_model=SetResponse, status_code=201)
async def create_set(
    session_id: int,
    set_data: SetCreate = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new empty set for a session."""
    result = await db.execute(
        select(Session)
        .where(Session.id == session_id, Session.user_id == current_user.id)
    )
    session = result.scalars().first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    count_result = await db.execute(
        select(Set).where(Set.session_id == session_id)
    )
    existing_count = len(count_result.scalars().all())

    new_set = Set(
        session_id=session_id,
        set_number=existing_count + 1,
        name=set_data.name if set_data else None,
        description=set_data.description if set_data else None,
        weight_kg=set_data.weight_kg if set_data else None,
        status="empty",
    )
    db.add(new_set)
    await db.commit()

    result = await db.execute(
        select(Set)
        .where(Set.id == new_set.id)
        .options(
            joinedload(Set.accelerometer_data),
            joinedload(Set.rep_details),
        )
    )
    return result.scalars().unique().one()


@router.patch("/sets/{set_id}", response_model=SetResponse)
async def update_set(
    set_id: int,
    update_data: SetUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update a set's name, description, weight, or status."""
    result = await db.execute(
        select(Set)
        .join(Session)
        .where(Set.id == set_id, Session.user_id == current_user.id)
        .options(joinedload(Set.accelerometer_data))
    )
    s = result.scalars().first()
    if not s:
        raise HTTPException(status_code=404, detail="Set not found")

    update_fields = update_data.model_dump(exclude_unset=True)
    for field, value in update_fields.items():
        setattr(s, field, value)

    await db.commit()
    await db.refresh(s)

    result = await db.execute(
        select(Set)
        .where(Set.id == set_id)
        .options(
            joinedload(Set.accelerometer_data),
            joinedload(Set.rep_details),
        )
    )
    return result.scalars().unique().one()


@router.delete("/sets/{set_id}", status_code=204)
async def delete_set(
    set_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Delete a set and its accelerometer data."""
    result = await db.execute(
        select(Set)
        .join(Session)
        .where(Set.id == set_id, Session.user_id == current_user.id)
        .options(joinedload(Set.accelerometer_data))
    )
    s = result.scalars().first()
    if not s:
        raise HTTPException(status_code=404, detail="Set not found")

    # Remove file from disk if present
    if s.accelerometer_data and os.path.exists(s.accelerometer_data.file_path):
        os.remove(s.accelerometer_data.file_path)

    await db.delete(s)
    await db.commit()
    return None



@router.post("/sets/{set_id}/accelerometer", response_model=SetResponse, status_code=201)
async def upload_accelerometer_data(
    set_id: int,
    file: UploadFile = File(...),
    description: str = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Upload accelerometer CSV data for a set."""
    result = await db.execute(
        select(Set)
        .join(Session)
        .where(Set.id == set_id, Session.user_id == current_user.id)
        .options(joinedload(Set.accelerometer_data))
    )
    s = result.scalars().first()
    if not s:
        raise HTTPException(status_code=404, detail="Set not found")

    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")

    if s.accelerometer_data:
        if os.path.exists(s.accelerometer_data.file_path):
            os.remove(s.accelerometer_data.file_path)
        await db.delete(s.accelerometer_data)
        await db.flush()

    file_path = os.path.join(
        UPLOAD_DIR,
        f"accel_{s.session_id}_{datetime.utcnow().timestamp()}_{file.filename}",
    )
    contents = await file.read()
    with open(file_path, "wb") as f:
        f.write(contents)

    accel_data = AccelerometerData(
        set_id=set_id,
        file_name=file.filename,
        file_path=file_path,
        file_size=len(contents),
        description=description,
    )
    db.add(accel_data)
    s.status = "complete"
    s.updated_at = datetime.utcnow()
    await db.commit()

    result = await db.execute(
        select(Set)
        .where(Set.id == set_id)
        .options(
            joinedload(Set.accelerometer_data),
            joinedload(Set.rep_details),
        )
    )
    return result.scalars().unique().one()


@router.get("/accelerometer/{data_id}/analyze")
async def analyze_accelerometer_data(
    data_id: int,
    sample_rate: int = 100,
    threshold: float = 0.05,
    smooth_window: int = 11,
    min_rep_samples: int = 20,
    min_rom_cm: float = 3.0,
    rest_sensitivity: float = 1.2,
    weight_kg: float = 0.0,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Analyse an accelerometer CSV file and return rep-detection results."""
    result = await db.execute(
        select(AccelerometerData)
        .join(Set)
        .join(Session)
        .where(
            AccelerometerData.id == data_id,
            Session.user_id == current_user.id,
        )
    )
    data = result.scalars().first()
    if not data:
        raise HTTPException(status_code=404, detail="Accelerometer data not found")
    file_path = data.file_path
    if not os.path.exists(file_path):
        # Stored path may be an absolute host path; try resolving via UPLOAD_DIR
        file_path = os.path.join(UPLOAD_DIR, os.path.basename(file_path))
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="CSV file not found on disk")

    recording_duration: float | None = None
    if data.description:
        import re

        m = re.search(r"([\d.]+)s\s*$", data.description)
        if m:
            try:
                recording_duration = float(m.group(1))
            except ValueError:
                pass

    with open(file_path, "r") as f:
        csv_content = f.read()

    try:
        analysis = analyze_csv(
            csv_content,
            sample_rate=sample_rate,
            threshold=threshold,
            smooth_window=smooth_window,
            min_rep_samples=min_rep_samples,
            min_rom_cm=min_rom_cm,
            rest_sensitivity=rest_sensitivity,
            weight_kg=weight_kg,
            recording_duration_seconds=recording_duration,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    set_id = data.set_id

    await db.execute(
        select(RepDetail).where(RepDetail.set_id == set_id)
    )
    existing = (await db.execute(
        select(RepDetail).where(RepDetail.set_id == set_id)
    )).scalars().all()
    for rd in existing:
        await db.delete(rd)

    # Insert new rep details
    for rep in analysis.get("reps", []):
        ecc = rep.get("eccentric")
        con = rep.get("concentric")
        new_rd = RepDetail(
            set_id=set_id,
            rep_number=rep["rep_number"],
            start_sample=rep["start_sample"],
            end_sample=rep["end_sample"],
            duration_seconds=rep["duration_seconds"],
            rom_meters=rep["rom_meters"],
            rom_cm=rep["rom_cm"],
            peak_velocity=rep["peak_velocity"],
            avg_velocity=rep["avg_velocity"],
            peak_accel=rep["peak_accel"],
            avg_watts=rep.get("avg_watts"),
            rest_at_top_seconds=rep.get("rest_at_top_seconds"),
            rest_at_bottom_seconds=rep.get("rest_at_bottom_seconds"),
            ecc_start_sample=ecc["start_sample"] if ecc else None,
            ecc_end_sample=ecc["end_sample"] if ecc else None,
            ecc_duration_seconds=ecc["duration_seconds"] if ecc else None,
            ecc_peak_velocity=ecc["peak_velocity"] if ecc else None,
            ecc_avg_velocity=ecc["avg_velocity"] if ecc else None,
            ecc_peak_accel=ecc["peak_accel"] if ecc else None,
            ecc_avg_accel=ecc["avg_accel"] if ecc else None,
            ecc_avg_watts=ecc.get("avg_watts") if ecc else None,
            con_start_sample=con["start_sample"] if con else None,
            con_end_sample=con["end_sample"] if con else None,
            con_duration_seconds=con["duration_seconds"] if con else None,
            con_peak_velocity=con["peak_velocity"] if con else None,
            con_avg_velocity=con["avg_velocity"] if con else None,
            con_peak_accel=con["peak_accel"] if con else None,
            con_avg_accel=con["avg_accel"] if con else None,
            con_avg_watts=con.get("avg_watts") if con else None,
        )
        db.add(new_rd)

    await db.commit()

    return analysis


@router.delete("/accelerometer/{data_id}", status_code=204)
async def delete_accelerometer_data(
    data_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Delete accelerometer data file."""
    result = await db.execute(
        select(AccelerometerData)
        .join(Set)
        .join(Session)
        .where(
            AccelerometerData.id == data_id,
            Session.user_id == current_user.id,
        )
    )
    data = result.scalars().first()
    if not data:
        raise HTTPException(status_code=404, detail="Accelerometer data not found")

    # Also mark the parent set back to empty
    set_result = await db.execute(
        select(Set).where(Set.id == data.set_id)
    )
    parent_set = set_result.scalars().first()
    if parent_set:
        parent_set.status = "empty"
        parent_set.updated_at = datetime.utcnow()

    if os.path.exists(data.file_path):
        os.remove(data.file_path)

    await db.delete(data)
    await db.commit()
    return None


@router.post("/{session_id}/graph", response_model=GraphImageResponse, status_code=201)
async def upload_graph_image(
    session_id: int,
    file: UploadFile = File(...),
    description: str = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Upload a graph image for a session."""
    result = await db.execute(
        select(Session)
        .where(Session.id == session_id, Session.user_id == current_user.id)
    )
    session = result.scalars().first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    allowed_extensions = [".png", ".jpg", ".jpeg", ".svg", ".gif"]
    if not any(file.filename.lower().endswith(ext) for ext in allowed_extensions):
        raise HTTPException(
            status_code=400,
            detail="Only image files (png, jpg, jpeg, svg, gif) are allowed",
        )

    image_type = file.filename.split(".")[-1].lower()
    file_path = os.path.join(
        UPLOAD_DIR,
        f"graph_{session_id}_{datetime.utcnow().timestamp()}_{file.filename}",
    )
    contents = await file.read()
    with open(file_path, "wb") as f:
        f.write(contents)

    graph_image = GraphImage(
        session_id=session_id,
        file_name=file.filename,
        file_path=file_path,
        file_size=len(contents),
        image_type=image_type,
        description=description,
    )
    db.add(graph_image)
    await db.commit()
    await db.refresh(graph_image)
    return graph_image


@router.delete("/graph/{image_id}", status_code=204)
async def delete_graph_image(
    image_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Delete graph image file."""
    result = await db.execute(
        select(GraphImage)
        .join(Session)
        .where(GraphImage.id == image_id, Session.user_id == current_user.id)
    )
    image = result.scalars().first()
    if not image:
        raise HTTPException(status_code=404, detail="Graph image not found")

    if os.path.exists(image.file_path):
        os.remove(image.file_path)

    await db.delete(image)
    await db.commit()
    return None
