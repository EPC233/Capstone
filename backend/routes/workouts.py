"""
Workout Session API endpoints
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
from models.workout_session import WorkoutSession
from models.accelerometer_data import AccelerometerData
from models.graph_image import GraphImage
from schemas.workout import (
    WorkoutSessionCreate,
    WorkoutSessionResponse,
    WorkoutSessionUpdate,
    AccelerometerDataResponse,
    GraphImageResponse,
)

router = APIRouter(prefix="/workouts", tags=["workouts"])

# Upload directory for files
UPLOAD_DIR = "/home/ethan/Desktop/Capstone Application v2/backend/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/", response_model=WorkoutSessionResponse, status_code=201)
async def create_workout_session(
    workout_data: WorkoutSessionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Create a new workout session for the current user.
    """
    workout = WorkoutSession(
        user_id=current_user.id,
        name=workout_data.name,
        description=workout_data.description,
        workout_type=workout_data.workout_type,
    )
    db.add(workout)
    await db.commit()
    await db.refresh(workout)
    return workout


@router.get("/", response_model=List[WorkoutSessionResponse])
async def get_user_workouts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Get all workout sessions for the current user.
    """
    result = await db.execute(
        select(WorkoutSession)
        .where(WorkoutSession.user_id == current_user.id)
        .options(
            joinedload(WorkoutSession.accelerometer_data),
            joinedload(WorkoutSession.graph_images)
        )
        .order_by(WorkoutSession.created_at.desc())
    )
    workouts = result.scalars().unique().all()
    return workouts


@router.get("/{workout_id}", response_model=WorkoutSessionResponse)
async def get_workout_session(
    workout_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Get a specific workout session by ID.
    """
    result = await db.execute(
        select(WorkoutSession)
        .where(WorkoutSession.id == workout_id, WorkoutSession.user_id == current_user.id)
        .options(
            joinedload(WorkoutSession.accelerometer_data),
            joinedload(WorkoutSession.graph_images)
        )
    )
    workout = result.scalars().first()
    
    if not workout:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout session not found"
        )
    
    return workout


@router.put("/{workout_id}", response_model=WorkoutSessionResponse)
async def update_workout_session(
    workout_id: int,
    workout_data: WorkoutSessionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Update a workout session.
    """
    result = await db.execute(
        select(WorkoutSession)
        .where(WorkoutSession.id == workout_id, WorkoutSession.user_id == current_user.id)
    )
    workout = result.scalars().first()
    
    if not workout:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout session not found"
        )
    
    # Update fields
    if workout_data.name is not None:
        workout.name = workout_data.name
    if workout_data.description is not None:
        workout.description = workout_data.description
    if workout_data.workout_type is not None:
        workout.workout_type = workout_data.workout_type
    
    workout.updated_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(workout)
    return workout


@router.delete("/{workout_id}", status_code=204)
async def delete_workout_session(
    workout_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Delete a workout session and all associated data.
    """
    result = await db.execute(
        select(WorkoutSession)
        .where(WorkoutSession.id == workout_id, WorkoutSession.user_id == current_user.id)
    )
    workout = result.scalars().first()
    
    if not workout:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout session not found"
        )
    
    await db.delete(workout)
    await db.commit()
    return None


@router.post("/{workout_id}/accelerometer", response_model=AccelerometerDataResponse, status_code=201)
async def upload_accelerometer_data(
    workout_id: int,
    file: UploadFile = File(...),
    description: str = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Upload accelerometer CSV data for a workout session.
    """
    # Verify workout exists and belongs to user
    result = await db.execute(
        select(WorkoutSession)
        .where(WorkoutSession.id == workout_id, WorkoutSession.user_id == current_user.id)
    )
    workout = result.scalars().first()
    
    if not workout:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout session not found"
        )
    
    # Validate file type
    if not file.filename.endswith('.csv'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only CSV files are allowed"
        )
    
    # Save file
    file_path = os.path.join(UPLOAD_DIR, f"accel_{workout_id}_{datetime.utcnow().timestamp()}_{file.filename}")
    contents = await file.read()
    
    with open(file_path, "wb") as f:
        f.write(contents)
    
    # Create database record
    accel_data = AccelerometerData(
        workout_session_id=workout_id,
        file_name=file.filename,
        file_path=file_path,
        file_size=len(contents),
        description=description,
    )
    
    db.add(accel_data)
    await db.commit()
    await db.refresh(accel_data)
    
    return accel_data


@router.post("/{workout_id}/graph", response_model=GraphImageResponse, status_code=201)
async def upload_graph_image(
    workout_id: int,
    file: UploadFile = File(...),
    description: str = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Upload a graph image for a workout session.
    """
    # Verify workout exists and belongs to user
    result = await db.execute(
        select(WorkoutSession)
        .where(WorkoutSession.id == workout_id, WorkoutSession.user_id == current_user.id)
    )
    workout = result.scalars().first()
    
    if not workout:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout session not found"
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
    file_path = os.path.join(UPLOAD_DIR, f"graph_{workout_id}_{datetime.utcnow().timestamp()}_{file.filename}")
    contents = await file.read()
    
    with open(file_path, "wb") as f:
        f.write(contents)
    
    # Create database record
    graph_image = GraphImage(
        workout_session_id=workout_id,
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
        .join(WorkoutSession)
        .where(
            AccelerometerData.id == data_id,
            WorkoutSession.user_id == current_user.id
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
        .join(WorkoutSession)
        .where(
            GraphImage.id == image_id,
            WorkoutSession.user_id == current_user.id
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
