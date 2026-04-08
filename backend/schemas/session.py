"""
Schemas for session-related data stuffs.

Schemas:
    ---- Graph image schemas ----
    GraphImageBase - Base graph image fields
    GraphImageResponse - Graph image response

    ---- Session schemas ----
    SessionBase - Base session fields
    SessionCreate - Create a new session
    SessionUpdate - Update a session
    SessionResponse - Full session response including sets and graph images
"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field

from .set import SetResponse


class GraphImageBase(BaseModel):
    description: Optional[str] = None


class GraphImageResponse(GraphImageBase):
    id: int
    session_id: int
    set_id: Optional[int] = None
    file_name: str
    file_path: str
    file_size: Optional[int] = None
    image_type: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class SessionBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    session_type: Optional[str] = Field(None, max_length=100)


class SessionCreate(SessionBase):
    pass


class SessionUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    session_type: Optional[str] = Field(None, max_length=100)


class SessionResponse(SessionBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime
    sets: List[SetResponse] = []
    graph_images: List[GraphImageResponse] = []

    class Config:
        from_attributes = True
