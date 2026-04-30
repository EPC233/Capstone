"""
Used to format output of ccsv_analyzer
"""

from dataclasses import dataclass, field

COLUMNS = [
    "ax", "ay", "az",
    "gx", "gy", "gz",
    "qw", "qx", "qy", "qz",
    "ax_world", "ay_world", "az_world",
]
COLUMNS_WITH_TS = ["timestamp_us"] + COLUMNS
EXPECTED_COLS = len(COLUMNS)


@dataclass
class PhaseInfo:
    start_sample: int
    end_sample: int
    duration_seconds: float
    peak_velocity: float
    avg_velocity: float
    peak_accel: float
    avg_accel: float
    avg_watts: float | None = None


@dataclass
class RepInfo:
    rep_number: int
    start_sample: int
    end_sample: int
    duration_seconds: float
    rom_meters: float
    rom_cm: float
    peak_velocity: float
    avg_velocity: float
    peak_accel: float
    concentric: PhaseInfo | None = None
    eccentric: PhaseInfo | None = None
    avg_watts: float | None = None
    rest_at_top_seconds: float | None = None
    rest_at_bottom_seconds: float | None = None


@dataclass
class AnalysisResult:
    total_samples: int
    sample_rate: int
    duration_seconds: float
    rep_count: int
    reps: list[RepInfo]
    time_samples: list[int]
    z_accel: list[float]         # smoothed Z acceleration (g)
    velocity: list[float]        # Z velocity (m/s)
    position: list[float]        # Z position (m)
    ax_world: list[float]        # X acceleration (m/s²)
    ay_world: list[float]        # Y acceleration (m/s²)
    az_world: list[float]        # Z acceleration (m/s²)
    rep_boundaries: list[dict]   # [{start, end}] for shading

from services.csv_analyzer import analyze_csv  # noqa: F401