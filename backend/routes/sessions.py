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
from models.accelerometer_data import AccelerometerData
from models.graph_image import GraphImage
from schemas.session import (
    SessionCreate,
    SessionResponse,
    SessionUpdate,
    AccelerometerDataResponse,
    GraphImageResponse,
)
from services.analysis_service import analyze_csv

router = APIRouter(prefix="/sessions", tags=["sessions"])

# Upload directory for files
UPLOAD_DIR = os.environ.get("UPLOAD_DIR", os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads"))
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("", response_model=SessionResponse, status_code=201)
async def create_session(
    session_data: SessionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Create a new session for the current user.
    """
    session = Session(
        user_id=current_user.id,
        name=session_data.name,
        description=session_data.description,
        session_type=session_data.session_type,
    )
    db.add(session)
    await db.commit()
    
    # Reload with relationships to avoid lazy loading issues
    result = await db.execute(
        select(Session)
        .where(Session.id == session.id)
        .options(
            joinedload(Session.accelerometer_data),
            joinedload(Session.graph_images)
        )
    )
    return result.scalars().unique().one()


@router.get("", response_model=List[SessionResponse])
async def get_user_sessions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Get all sessions for the current user.
    """
    result = await db.execute(
        select(Session)
        .where(Session.user_id == current_user.id)
        .options(
            joinedload(Session.accelerometer_data),
            joinedload(Session.graph_images)
        )
        .order_by(Session.created_at.desc())
    )
    sessions = result.scalars().unique().all()
    return sessions


@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Get a specific session by ID.
    """
    result = await db.execute(
        select(Session)
        .where(Session.id == session_id, Session.user_id == current_user.id)
        .options(
            joinedload(Session.accelerometer_data),
            joinedload(Session.graph_images)
        )
    )
    session = result.scalars().first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    return session


@router.put("/{session_id}", response_model=SessionResponse)
async def update_session(
    session_id: int,
    session_data: SessionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Update a session.
    """
    result = await db.execute(
        select(Session)
        .where(Session.id == session_id, Session.user_id == current_user.id)
    )
    session = result.scalars().first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Update fields
    if session_data.name is not None:
        session.name = session_data.name
    if session_data.description is not None:
        session.description = session_data.description
    if session_data.session_type is not None:
        session.session_type = session_data.session_type
    
    session.updated_at = datetime.utcnow()
    
    await db.commit()
    
    # Reload with relationships to avoid lazy loading issues
    result = await db.execute(
        select(Session)
        .where(Session.id == session_id)
        .options(
            joinedload(Session.accelerometer_data),
            joinedload(Session.graph_images)
        )
    )
    return result.scalars().unique().one()


@router.delete("/{session_id}", status_code=204)
async def delete_session(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Delete a session and all associated data.
    """
    result = await db.execute(
        select(Session)
        .where(Session.id == session_id, Session.user_id == current_user.id)
    )
    session = result.scalars().first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    await db.delete(session)
    await db.commit()
    return None


@router.post("/{session_id}/accelerometer", response_model=AccelerometerDataResponse, status_code=201)
async def upload_accelerometer_data(
    session_id: int,
    file: UploadFile = File(...),
    description: str = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Upload accelerometer CSV data for a session.
    """
    # Verify session exists and belongs to user
    result = await db.execute(
        select(Session)
        .where(Session.id == session_id, Session.user_id == current_user.id)
    )
    session = result.scalars().first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Validate file type
    if not file.filename.endswith('.csv'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only CSV files are allowed"
        )
    
    # Save file
    file_path = os.path.join(UPLOAD_DIR, f"accel_{session_id}_{datetime.utcnow().timestamp()}_{file.filename}")
    contents = await file.read()
    
    with open(file_path, "wb") as f:
        f.write(contents)
    
    # Create database record
    accel_data = AccelerometerData(
        session_id=session_id,
        file_name=file.filename,
        file_path=file_path,
        file_size=len(contents),
        description=description,
    )
    
    db.add(accel_data)
    await db.commit()
    await db.refresh(accel_data)
    
    return accel_data


@router.post("/{session_id}/graph", response_model=GraphImageResponse, status_code=201)
async def upload_graph_image(
    session_id: int,
    file: UploadFile = File(...),
    description: str = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Upload a graph image for a session.
    """
    # Verify session exists and belongs to user
    result = await db.execute(
        select(Session)
        .where(Session.id == session_id, Session.user_id == current_user.id)
    )
    session = result.scalars().first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Validate file type
    allowed_extensions = ['.png', '.jpg', '.jpeg', '.svg', '.gif']
    if not any(file.filename.lower().endswith(ext) for ext in allowed_extensions):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only image files (png, jpg, jpeg, svg, gif) are allowed"
        )
    
    # Determine image type
    image_type = file.filename.split('.')[-1].lower()
    
    # Save file
    file_path = os.path.join(UPLOAD_DIR, f"graph_{session_id}_{datetime.utcnow().timestamp()}_{file.filename}")
    contents = await file.read()
    
    with open(file_path, "wb") as f:
        f.write(contents)
    
    # Create database record
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


@router.get("/accelerometer/{data_id}/analyze")
async def analyze_accelerometer_data(
    data_id: int,
    sample_rate: int = 100,
    threshold: float = 0.05,
    smooth_window: int = 11,
    min_rep_samples: int = 20,
    min_rom_cm: float = 3.0,
    rest_sensitivity: float = 0.5,
    weight_kg: float = 0.0,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Analyse an accelerometer CSV file and return rep-detection results
    plus chart data (acceleration, velocity, position).
    """
    result = await db.execute(
        select(AccelerometerData)
        .join(Session)
        .where(
            AccelerometerData.id == data_id,
            Session.user_id == current_user.id,
        )
    )
    data = result.scalars().first()

    if not data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Accelerometer data not found",
        )

    if not os.path.exists(data.file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="CSV file not found on disk",
        )

    # Try to extract real recording duration from the description
    # e.g. "Live recording — 518 samples, 11.16s"
    recording_duration: float | None = None
    if data.description:
        import re
        m = re.search(r"([\d.]+)s\s*$", data.description)
        if m:
            try:
                recording_duration = float(m.group(1))
            except ValueError:
                pass

    with open(data.file_path, "r") as f:
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
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        )

    return analysis


@router.delete("/accelerometer/{data_id}", status_code=204)
async def delete_accelerometer_data(
    data_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Delete accelerometer data file.
    """
    result = await db.execute(
        select(AccelerometerData)
        .join(Session)
        .where(
            AccelerometerData.id == data_id,
            Session.user_id == current_user.id
        )
    )
    data = result.scalars().first()
    
    if not data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Accelerometer data not found"
        )
    
    # Delete file from filesystem
    if os.path.exists(data.file_path):
        os.remove(data.file_path)
    
    await db.delete(data)
    await db.commit()
    return None


@router.delete("/graph/{image_id}", status_code=204)
async def delete_graph_image(
    image_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Delete graph image file.
    """
    result = await db.execute(
        select(GraphImage)
        .join(Session)
        .where(
            GraphImage.id == image_id,
            Session.user_id == current_user.id
        )
    )
    image = result.scalars().first()
    
    if not image:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Graph image not found"
        )
    
    # Delete file from filesystem
    if os.path.exists(image.file_path):
        os.remove(image.file_path)
    
    await db.delete(image)
    await db.commit()
    return None
