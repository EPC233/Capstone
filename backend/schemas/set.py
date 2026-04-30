"""
Schemas for set data and responses. Important file!

Schemas:
    __________ Request schemas __________
    SetCreate - Create a new set
    SetUpdate - Update a set

    __________ Response schemas __________
    AccelerometerDataInSet - The actual data file info nested inside a set response
    PhaseDetail - Eccentric/concentric phase metrics for a rep
    RepDetailResponse - Single rep with nested per-phase details
    GraphImageInSet - Graph image nested inside a Set response
    SetResponse - Full set response with all of the stuff above nested inside
"""

from datetime import datetime
from typing import Any, List, Optional

from pydantic import BaseModel, model_validator


class SetCreate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    weight_kg: Optional[float] = None


class SetUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    weight_kg: Optional[float] = None
    status: Optional[str] = None


class AccelerometerDataInSet(BaseModel):
    id: int
    set_id: int
    file_name: str
    file_path: str
    file_size: Optional[int] = None
    description: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class PhaseDetail(BaseModel):
    start_sample: int
    end_sample: int
    duration_seconds: float
    peak_velocity: float
    avg_velocity: float
    peak_accel: float
    avg_accel: float
    avg_watts: Optional[float] = None

class RepDetailResponse(BaseModel):
    id: int
    set_id: int
    rep_number: int
    start_sample: int
    end_sample: int
    duration_seconds: float
    rom_meters: float
    rom_cm: float
    peak_velocity: float
    avg_velocity: float
    peak_accel: float
    avg_watts: Optional[float] = None
    rest_at_top_seconds: Optional[float] = None
    rest_at_bottom_seconds: Optional[float] = None
    eccentric: Optional[PhaseDetail] = None
    concentric: Optional[PhaseDetail] = None

    class Config:
        from_attributes = True

    """ 
    This converts the ORM model to the response model, including nested phase details - cleans up session.py.
    """
    @classmethod
    def from_orm_model(cls, obj: "RepDetailResponse") -> "RepDetailResponse":
        ecc = None
        if obj.ecc_start_sample is not None:
            ecc = PhaseDetail(
                start_sample=obj.ecc_start_sample,
                end_sample=obj.ecc_end_sample,
                duration_seconds=obj.ecc_duration_seconds,
                peak_velocity=obj.ecc_peak_velocity,
                avg_velocity=obj.ecc_avg_velocity,
                peak_accel=obj.ecc_peak_accel,
                avg_accel=obj.ecc_avg_accel,
                avg_watts=obj.ecc_avg_watts,
            )
        con = None
        if obj.con_start_sample is not None:
            con = PhaseDetail(
                start_sample=obj.con_start_sample,
                end_sample=obj.con_end_sample,
                duration_seconds=obj.con_duration_seconds,
                peak_velocity=obj.con_peak_velocity,
                avg_velocity=obj.con_avg_velocity,
                peak_accel=obj.con_peak_accel,
                avg_accel=obj.con_avg_accel,
                avg_watts=obj.con_avg_watts,
            )
        return cls(
            id=obj.id,
            set_id=obj.set_id,
            rep_number=obj.rep_number,
            start_sample=obj.start_sample,
            end_sample=obj.end_sample,
            duration_seconds=obj.duration_seconds,
            rom_meters=obj.rom_meters,
            rom_cm=obj.rom_cm,
            peak_velocity=obj.peak_velocity,
            avg_velocity=obj.avg_velocity,
            peak_accel=obj.peak_accel,
            avg_watts=obj.avg_watts,
            rest_at_top_seconds=obj.rest_at_top_seconds,
            rest_at_bottom_seconds=obj.rest_at_bottom_seconds,
            eccentric=ecc,
            concentric=con,
        )


class GraphImageInSet(BaseModel):
    id: int
    session_id: int
    set_id: Optional[int] = None
    file_name: str
    file_path: str
    file_size: Optional[int] = None
    image_type: Optional[str] = None
    description: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class SetResponse(BaseModel):
    id: int
    session_id: int
    set_number: int
    name: Optional[str] = None
    description: Optional[str] = None
    weight_kg: Optional[float] = None
    status: str
    accelerometer_data: Optional[AccelerometerDataInSet] = None
    rep_details: List[RepDetailResponse] = []
    graph_images: List[GraphImageInSet] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

    @model_validator(mode="before")
    @classmethod
    def convert_rep_details(cls, data: Any) -> Any:
        if hasattr(data, "rep_details"):
            raw = data.rep_details
            if raw and len(raw) > 0 and hasattr(raw[0], "ecc_start_sample"):
                data.__dict__["rep_details"] = [
                    RepDetailResponse.from_orm_model(rd) for rd in raw
                ]
        return data
