"""
Set Pydantic schemas for request/response validation
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


# ---- Request schemas --------------------------------------------------------


class SetCreate(BaseModel):
    weight_kg: Optional[float] = None


class SetUpdate(BaseModel):
    weight_kg: Optional[float] = None
    status: Optional[str] = None


# ---- Response schemas -------------------------------------------------------


class AccelerometerDataInSet(BaseModel):
    """Accelerometer data nested inside a Set response."""

    id: int
    set_id: int
    file_name: str
    file_path: str
    file_size: Optional[int] = None
    description: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class SetResponse(BaseModel):
    id: int
    session_id: int
    set_number: int
    weight_kg: Optional[float] = None
    status: str
    accelerometer_data: Optional[AccelerometerDataInSet] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
