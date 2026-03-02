from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


# Accelerometer Data Schemas
class AccelerometerDataBase(BaseModel):
    description: Optional[str] = None


class AccelerometerDataResponse(AccelerometerDataBase):
    id: int
    workout_session_id: int
    file_name: str
    file_path: str
    file_size: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


# Graph Image Schemas
class GraphImageBase(BaseModel):
    description: Optional[str] = None


class GraphImageResponse(GraphImageBase):
    id: int
    workout_session_id: int
    file_name: str
    file_path: str
    file_size: Optional[int] = None
    image_type: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# Workout Session Schemas
class WorkoutSessionBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    workout_type: Optional[str] = Field(None, max_length=100)


class WorkoutSessionCreate(WorkoutSessionBase):
    pass


class WorkoutSessionUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    workout_type: Optional[str] = Field(None, max_length=100)


class WorkoutSessionResponse(WorkoutSessionBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime
    accelerometer_data: List[AccelerometerDataResponse] = []
    graph_images: List[GraphImageResponse] = []

    class Config:
        from_attributes = True
