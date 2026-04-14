
"""
This is where all the magic happens - the CSV analyzer takes raw accelerometer data and extracts meaningful metrics.

The main function 'analyze_csv' outputs:
- Total samples, sample rate, duration, rep count
- Per-rep details: 
    - ROM                               (cm)
    - velocity                          (peak/avg, m/s)
    - acceleration                      (peak/avg, m/s²)
    - concentric/eccentric phases       (duration, s)
    - rest durations                    (top and bottom, s)
- Smoothed kinematic data: Z acceleration, velocity, position (for charting)

Input format:
    Expects a gravity-corrected accelerometer CSV either:
    
    14-column format (with timestamp):
        timestamp_us, ax, ay, az, gx, gy, gz, qw, qx, qy, qz, ax_world, ay_world, az_world
    13-column format (no timestamp):
        ax, ay, az, gx, gy, gz, qw, qx, qy, qz, ax_world, ay_world, az_world
        
    Where:
        ax/ay/az        = raw accelerometer (m/s²)
        gx/gy/gz        = gyroscope (°/s)
        qw/qx/qy/qz     = orientation quaternion (from Madgwick filter)
        ax/ay/az_world  = gravity-corrected world-frame acceleration (m/s²)
        
    The world-frame Z acceleration (az_world) is the primary signal used for analysis.

The analysis pipeline:
1. Parse CSV
2. Determine real sample rate
3. Smooth Z acceleration and apply dead-zone filter
    - Parameters: threshold and rest_sensitivity control this filtering
4. Detect active region via RMS thresholding
5. Integrate acceleration to velocity (with linear drift correction)
6. Integrate velocity to rough position for rep detection via peaks
7. Per-rep integration and metric extraction
    - Metrics: ROM, duration, peak/avg velocity, peak/avg acceleration, watts (if weight provided)
8. Rest detection
9. Downsample data for charting

Algorithmic details:
- Problem: Pause detection restricts methods of rep segmentation - previous version was velocity zero-crossing based.
    - Solution: Integrate to rough position and use the peaks for rest delineation.
    
- Problem: Major sensor noise at basically all times - made rep detection and segmentation very difficult.
    - Solution: Smoothing and dead-zone filtering on acceleration before integration - prevents noise from being integrated into final data
    
- Problem: Rest delineation - what should be counted as rest???
    - Solution: Smoothed velocity thresholding, minimum rest duration, and 'rest_sensitivity' parameter to control how aggressive rest detection is

- Problem: Cumulative integration drift - integrating noisy acceleration twice compounds small errors into large position offsets.
    - Solution: Linear endpoint drift correction after each integration pass. Velocity is corrected so it returns to zero
      at the end of the active region. Position is corrected per-rep so start and end positions match. Rest zones where
      smoothed |velocity| stays near zero for >= 0.7 s also zeroed to prevent drift during pauses.
"""

import io

import numpy as np
import pandas as pd

from services.analysis_service import (
    COLUMNS,
    COLUMNS_WITH_TS,
    EXPECTED_COLS,
    PhaseInfo,
    RepInfo,
)


def _downsample(arr: np.ndarray, max_points: int = 1500) -> tuple[list[int], list[float]]:
    n = len(arr)
    
    if n <= max_points:
        return list(range(n)), [round(float(v), 6) for v in arr]
    
    step = max(1, n // max_points)
    indices = list(range(0, n, step))
    values = [round(float(arr[i]), 6) for i in indices]
    
    return indices, values

def _parse_csv(csv_content: str) -> tuple[pd.DataFrame, bool]:
    has_timestamp_col = False
    
    try:
        df = pd.read_csv(io.StringIO(csv_content))
        if set(COLUMNS_WITH_TS).issubset(set(df.columns)):
            has_timestamp_col = True
        elif set(COLUMNS).issubset(set(df.columns)):
            pass
        else:
            df = pd.read_csv(io.StringIO(csv_content), header=None)
            if len(df.columns) == len(COLUMNS_WITH_TS):
                df.columns = COLUMNS_WITH_TS
                has_timestamp_col = True
            else:
                df.columns = COLUMNS
    except Exception:
        df = pd.read_csv(io.StringIO(csv_content), header=None)
        if len(df.columns) == len(COLUMNS_WITH_TS):
            df.columns = COLUMNS_WITH_TS
            has_timestamp_col = True
        else:
            df.columns = COLUMNS

    if len(df.columns) < EXPECTED_COLS:
        raise ValueError(
            f"Expected at least {EXPECTED_COLS} columns, got {len(df.columns)}. "
            "Is this a gravity-corrected accelerometer CSV?"
        )

    for col in COLUMNS:
        df[col] = pd.to_numeric(df[col], errors="coerce")
    df.dropna(subset=COLUMNS, inplace=True)
    df.reset_index(drop=True, inplace=True)

    if len(df) < 10:
        raise ValueError("CSV has too few data points for analysis.")

    return df, has_timestamp_col


""" Returns a JSON serializable dict with all analysis results and chart data. See docstring for details. """
def analyze_csv(csv_content: str | bytes,                                   # Raw CSV content
                sample_rate: int = 100,                                     # Nominal sample rate (Hz)
                threshold: float = 0.05,                                    # RMS threshold for active region detection                          
                smooth_window: int = 11,                                    # Rolling average window size for smoothing
                min_rep_samples: int = 20,                                  # Minimum samples between rep boundaries
                min_rom_cm: float = 3.0,                                    # Minimum range-of-motion in cm for a rep to be considered
                rest_sensitivity: float = 1.2,                              # Scales the dead-zone applied to the smoothed acceleration
                weight_kg: float = 0.0,                                     # Weight being lifted in kilograms
                recording_duration_seconds: float | None = None) -> dict:   # Duration of recording in seconds
    
    if isinstance(csv_content, bytes):
        csv_content = csv_content.decode("utf-8", errors="replace")

    df, has_timestamp_col = _parse_csv(csv_content)

    # --- Determine real sample rate ---
    # Priority: (1) timestamp_us column, (2) recording_duration_seconds, (3) sample_rate param
    if has_timestamp_col and "timestamp_us" in df.columns:
        df["timestamp_us"] = pd.to_numeric(df["timestamp_us"], errors="coerce")
        ts = df["timestamp_us"].dropna().values
        if len(ts) >= 2:
            total_us = ts[-1] - ts[0]
            if total_us > 0:
                sample_rate = round((len(ts) - 1) / (total_us / 1e6))
    elif recording_duration_seconds and recording_duration_seconds > 0 and len(df) > 1:
        sample_rate = round(len(df) / recording_duration_seconds)

    dt = 1.0 / sample_rate

    # World-frame Z acceleration in g
    df["z_adjusted"] = df["az_world"] / 9.80665
    df["z_smooth"] = (
        df["z_adjusted"]
        .rolling(window=smooth_window, center=True)
        .mean()
        .fillna(0)
    )
    accel = df["z_smooth"].values

    # Dead-zone filter: zero out small accelerations that are just
    # sensor noise during pauses.  This prevents drift from entering
    # the integrator at the source.  The smoothed signal ensures real
    # motion is well above threshold; pause noise is near zero.
    rest_dead_zone = threshold * rest_sensitivity
    accel_int = accel.copy()
    accel_int[np.abs(accel_int) < rest_dead_zone] = 0.0

    # --- Active region detection (RMS-based) ---
    rms_window = 30
    rms = (
        pd.Series(accel)
        .rolling(window=rms_window, center=True)
        .apply(lambda x: np.sqrt(np.mean(x ** 2)), raw=True)
        .fillna(0)
        .values
    )
    active_mask = rms > threshold
    active_indices = np.where(active_mask)[0]
    if len(active_indices) > 0:
        active_start = max(0, int(active_indices[0]) - 10)
        active_end = min(len(accel) - 1, int(active_indices[-1]) + 10)
    else:
        active_start, active_end = 0, len(accel) - 1

    # --- Integrate accel → velocity (global) ---
    raw_velocity = np.zeros(len(accel))
    for i in range(1, len(accel)):
        if active_start <= i <= active_end:
            raw_velocity[i] = raw_velocity[i - 1] + accel_int[i] * dt
        else:
            raw_velocity[i] = 0.0

    # Linear drift correction on active region
    active_len = active_end - active_start + 1
    if active_len > 1:
        drift_rate = raw_velocity[active_end] / active_len
        for i in range(active_start, active_end + 1):
            raw_velocity[i] -= drift_rate * (i - active_start)

    # --- Rep detection via position peaks ---
    # Instead of fragile velocity zero-crossings (which break when the
    # user pauses at the top/bottom of a rep), integrate to a rough
    # position signal and find the peak of each rep.  Valleys between
    # consecutive peaks are the natural rest-position boundaries — a
    # pause just widens the peak, it doesn't create a false boundary.

    # 1. Integrate velocity → rough position
    rough_pos = np.zeros(len(accel))
    for i in range(active_start + 1, active_end + 1):
        rough_pos[i] = rough_pos[i - 1] + raw_velocity[i] * dt

    if active_len > 1 and rough_pos[active_end] != 0:
        pos_drift = rough_pos[active_end] / active_len
        for i in range(active_start, active_end + 1):
            rough_pos[i] -= pos_drift * (i - active_start)

    rough_pos_m = rough_pos * 9.80665

    # Smooth heavily for robust peak detection
    peak_smooth_win = max(smooth_window * 2, 21)
    rough_smooth = (
        pd.Series(rough_pos_m)
        .rolling(window=peak_smooth_win, center=True)
        .mean()
        .bfill()
        .ffill()
        .values
    )

    # Handle both upward and downward exercises — flip so peaks are
    # always positive.
    active_slice = rough_smooth[active_start:active_end + 1]
    if abs(float(np.min(active_slice))) > abs(float(np.max(active_slice))):
        rough_smooth = -rough_smooth

    # 2. Find significant local maxima (top of each rep)
    min_prominence = (min_rom_cm / 100.0) * 0.4  # 40 % of min ROM, metres
    search_radius = min_rep_samples * 3
    peaks: list[int] = []
    for i in range(active_start + min_rep_samples,
                    active_end - min_rep_samples + 1):
        if rough_smooth[i] < rough_smooth[i - 1] or \
           rough_smooth[i] < rough_smooth[i + 1]:
            continue  # not a local max
        left_bound = max(active_start, i - search_radius)
        right_bound = min(active_end + 1, i + search_radius + 1)
        left_min = float(np.min(rough_smooth[left_bound:i]))
        right_min = float(np.min(rough_smooth[i + 1:right_bound]))
        prominence = rough_smooth[i] - max(left_min, right_min)
        if prominence >= min_prominence:
            peaks.append(i)

    # Merge peaks that are too close (keep the tallest)
    merged_peaks: list[int] = []
    for p in peaks:
        if merged_peaks and (p - merged_peaks[-1]) < min_rep_samples * 2:
            if rough_smooth[p] > rough_smooth[merged_peaks[-1]]:
                merged_peaks[-1] = p
        else:
            merged_peaks.append(p)

    # 3. Valleys between consecutive peaks → rep boundaries
    valley_bounds = [active_start]
    for j in range(len(merged_peaks) - 1):
        seg_s = merged_peaks[j]
        seg_e = merged_peaks[j + 1]
        valley = int(seg_s + np.argmin(rough_smooth[seg_s:seg_e + 1]))
        valley_bounds.append(valley)
    valley_bounds.append(active_end)

    # 4. Build candidate reps directly from valley-to-valley segments.
    #    No inter-rep trimming — the dead-zone filter on accel_int and
    #    the velocity zeroing pass prevent drift during pauses.  Using
    #    untrimmed boundaries ensures reps are contiguous (no unshaded
    #    gaps) and that bottom-rest pauses are fully captured.
    candidate_reps = []
    for j in range(len(valley_bounds) - 1):
        rs = valley_bounds[j]
        re = valley_bounds[j + 1]
        if re - rs < min_rep_samples:
            continue
        candidate_reps.append((rs, re))

    # --- First pass: integrate all candidates to measure ROM ---
    def _integrate_rep(rep_start: int, rep_end: int):
        """Integrate a single rep and return (velocities, positions_m, rom_cm)."""
        v = 0.0
        rep_velocities = [0.0]
        for i in range(rep_start + 1, rep_end + 1):
            v += accel_int[i] * dt
            rep_velocities.append(v)

        rep_len = rep_end - rep_start + 1
        if rep_len > 1:
            drift = rep_velocities[-1] / (rep_len - 1)
            for j in range(len(rep_velocities)):
                rep_velocities[j] -= drift * j

        p = 0.0
        rep_positions = [0.0]
        for j in range(1, len(rep_velocities)):
            p += rep_velocities[j] * dt
            rep_positions.append(p)

        if len(rep_positions) > 1:
            drift = rep_positions[-1] / (len(rep_positions) - 1)
            for j in range(len(rep_positions)):
                rep_positions[j] -= drift * j

        # Convert g·s² → metres
        positions_m = [pp * 9.80665 for pp in rep_positions]
        rom_m = max(positions_m) - min(positions_m)
        return rep_velocities, rep_positions, rom_m * 100  # rom in cm

    # Filter candidates by minimum ROM
    reps_raw = []
    for rs, re in candidate_reps:
        _, _, rom_cm = _integrate_rep(rs, re)
        if rom_cm >= min_rom_cm:
            reps_raw.append((rs, re))

    # --- Per-rep integration with drift correction (final, filtered reps only) ---
    velocity = np.zeros(len(accel))
    position = np.zeros(len(accel))

    if len(reps_raw) > 0:
        for rep_start, rep_end in reps_raw:
            rep_velocities, rep_positions, _ = _integrate_rep(rep_start, rep_end)

            for j, idx in enumerate(range(rep_start, rep_end + 1)):
                velocity[idx] = rep_velocities[j]

            for j, idx in enumerate(range(rep_start, rep_end + 1)):
                position[idx] = rep_positions[j]

        # --- Detect ALL rest zones per-rep and zero velocity there ---
        # The linear drift correction leaves tiny velocity offsets during
        # mid-rep pauses (top AND bottom).  Scan the smoothed |velocity|
        # for ALL contiguous near-zero regions >= 0.7 s and zero them,
        # then re-integrate position.
        min_rest_samples = round(0.7 * sample_rate)
        rest_zones: list[tuple[int, int]] = []
        for rep_start, rep_end in reps_raw:
            _rv_abs = np.abs(velocity[rep_start : rep_end + 1])
            _sw = max(5, sample_rate // 10)
            _sv = (
                pd.Series(_rv_abs)
                .rolling(window=_sw, center=True)
                .mean()
                .bfill()
                .ffill()
                .values
            )
            _vp = float(np.max(_sv))
            _vt = _vp * 0.10 * rest_sensitivity if _vp > 0 else 0.0

            # Find ALL contiguous below-threshold regions
            in_zone = False
            z_start = 0
            for k in range(len(_sv)):
                if _sv[k] <= _vt:
                    if not in_zone:
                        z_start = k
                        in_zone = True
                else:
                    if in_zone:
                        if (k - 1 - z_start) >= min_rest_samples:
                            zone_start = rep_start + z_start
                            zone_end = rep_start + k - 1
                            rest_zones.append((zone_start, zone_end))
                            velocity[zone_start : zone_end + 1] = 0.0
                        in_zone = False
            # Handle zone that extends to end of rep
            if in_zone and (len(_sv) - 1 - z_start) >= min_rest_samples:
                zone_start = rep_start + z_start
                zone_end = rep_start + len(_sv) - 1
                rest_zones.append((zone_start, zone_end))
                velocity[zone_start : zone_end + 1] = 0.0

        # Re-integrate position from corrected velocity for affected reps
        if rest_zones:
            position = np.zeros(len(accel))
            for rep_start, rep_end in reps_raw:
                p = 0.0
                for idx in range(rep_start, rep_end + 1):
                    if idx > rep_start:
                        p += velocity[idx] * dt
                    position[idx] = p
                # Endpoint correction
                rep_len = rep_end - rep_start + 1
                if rep_len > 1 and position[rep_end] != 0:
                    drift = position[rep_end] / (rep_len - 1)
                    for j, idx in enumerate(range(rep_start, rep_end + 1)):
                        position[idx] -= drift * j
    else:
        # No reps detected — fall back to global integration so the
        # charts still show meaningful velocity / position data.
        velocity = raw_velocity.copy()

        # Integrate velocity → position over the active region
        for i in range(active_start + 1, active_end + 1):
            position[i] = position[i - 1] + velocity[i] * dt

        # Linear drift correction on position
        if active_len > 1 and position[active_end] != 0:
            drift_rate = position[active_end] / active_len
            for i in range(active_start, active_end + 1):
                position[i] -= drift_rate * (i - active_start)

    # Convert position from g·s² → metres
    position_m = position * 9.80665

    # --- Build rep info ---
    #
    # Each rep is decomposed into five contiguous zones:
    #   [leading_rest | eccentric | top_rest | concentric | trailing_rest]
    #
    # - top_rest: walk from position peak on smoothed |velocity|
    # - leading_rest: walk forward from rep start (near-zero velocity)
    # - trailing_rest: walk backward from rep end (near-zero velocity)
    # - bottom_rest between reps = trailing(N) + leading(N+1)  (second pass)

    rest_smooth_win = max(5, sample_rate // 10)
    min_rest_width = round(0.7 * sample_rate)  # 0.7 s minimum

    reps_info: list[RepInfo] = []
    _leading_rest_samples: list[int] = []   # per-rep leading rest width
    _trailing_rest_samples: list[int] = []  # per-rep trailing rest width

    for i, (rs, re) in enumerate(reps_raw):
        peak_pos = float(np.max(position_m[rs : re + 1]))
        min_pos = float(np.min(position_m[rs : re + 1]))
        rom = peak_pos - min_pos
        peak_vel = float(np.max(np.abs(velocity[rs : re + 1])))
        duration = (re - rs) / sample_rate
        avg_vel = round(rom / duration, 4) if duration > 0 else 0.0
        peak_acc = round(float(np.max(accel[rs : re + 1])) * 9.80665, 3)

        # Smoothed |velocity| for this rep (used for all rest detection)
        rep_vel_abs = np.abs(velocity[rs : re + 1])
        smooth_abs_vel = (
            pd.Series(rep_vel_abs)
            .rolling(window=rest_smooth_win, center=True)
            .mean()
            .bfill()
            .ffill()
            .values
        )
        vel_peak = float(np.max(smooth_abs_vel))
        vel_rest_thresh = (
            vel_peak * 0.10 * rest_sensitivity if vel_peak > 0 else 0.0
        )
        rep_len_local = len(smooth_abs_vel)

        # --- Leading rest: walk forward from rep start ---
        ecc_start_local = 0
        for k in range(rep_len_local):
            if smooth_abs_vel[k] > vel_rest_thresh:
                ecc_start_local = k
                break

        # --- Trailing rest: walk backward from rep end ---
        con_end_local = rep_len_local - 1
        for k in range(rep_len_local - 1, -1, -1):
            if smooth_abs_vel[k] > vel_rest_thresh:
                con_end_local = k
                break

        _leading_rest_samples.append(ecc_start_local)
        _trailing_rest_samples.append((rep_len_local - 1) - con_end_local)

        ecc_start = rs + ecc_start_local
        con_end = rs + con_end_local

        # --- Top rest: walk from position peak ---
        peak_idx = int(rs + np.argmax(position_m[rs : re + 1]))
        peak_local = peak_idx - rs

        rest_local_start = ecc_start_local  # default: eccentric start
        for k in range(peak_local - 1, ecc_start_local - 1, -1):
            if smooth_abs_vel[k] > vel_rest_thresh:
                rest_local_start = k + 1
                break

        rest_local_end = con_end_local  # default: concentric end
        for k in range(peak_local + 1, con_end_local + 1):
            if smooth_abs_vel[k] > vel_rest_thresh:
                rest_local_end = k - 1
                break

        if (rest_local_end - rest_local_start) >= min_rest_width:
            rest_start = rs + rest_local_start
            rest_end = rs + rest_local_end
        else:
            rest_start = peak_idx
            rest_end = peak_idx

        # Clamp: top rest must not overlap leading/trailing rest
        rest_start = max(rest_start, ecc_start)
        rest_end = min(rest_end, con_end)

        rest_samples = rest_end - rest_start
        rest_at_top_secs = round(rest_samples / sample_rate, 3) if rest_samples > 1 else 0.0

        def _build_phase(p_start: int, p_end: int, phase_rom: float,
                         compute_watts: bool = False) -> PhaseInfo | None:
            if p_end <= p_start:
                return None
            p_dur = (p_end - p_start) / sample_rate
            p_vel_slice = np.abs(velocity[p_start : p_end + 1])
            p_acc_slice = np.abs(accel[p_start : p_end + 1]) * 9.80665  # m/s²
            p_peak_vel = round(float(np.max(p_vel_slice)), 4) if len(p_vel_slice) > 0 else 0.0
            p_avg_vel = round(phase_rom / p_dur, 4) if p_dur > 0 else 0.0
            p_peak_acc = round(float(np.max(p_acc_slice)), 3) if len(p_acc_slice) > 0 else 0.0
            p_avg_acc = round(float(np.mean(p_acc_slice)), 3) if len(p_acc_slice) > 0 else 0.0
            p_watts = None
            if compute_watts and weight_kg > 0 and p_dur > 0 and phase_rom > 0:
                p_watts = round(weight_kg * 9.80665 * phase_rom / p_dur, 1)
            return PhaseInfo(
                start_sample=int(p_start),
                end_sample=int(p_end),
                duration_seconds=round(p_dur, 3),
                peak_velocity=p_peak_vel,
                avg_velocity=p_avg_vel,
                peak_accel=p_peak_acc,
                avg_accel=p_avg_acc,
                avg_watts=p_watts,
            )

        # Eccentric = from motion start to top rest start
        ecc_rom = abs(float(position_m[rest_start]) - float(position_m[ecc_start]))
        eccentric = _build_phase(ecc_start, rest_start, ecc_rom, compute_watts=True)

        # Concentric = from top rest end to motion end
        con_rom = abs(float(position_m[rest_end]) - float(position_m[con_end]))
        concentric = _build_phase(rest_end, con_end, con_rom, compute_watts=False)

        reps_info.append(
            RepInfo(
                rep_number=i + 1,
                start_sample=int(rs),
                end_sample=int(re),
                duration_seconds=round(duration, 3),
                rom_meters=round(rom, 4),
                rom_cm=round(rom * 100, 1),
                peak_velocity=round(peak_vel, 4),
                avg_velocity=avg_vel,
                peak_accel=peak_acc,
                concentric=concentric,
                eccentric=eccentric,
                avg_watts=(
                    round(weight_kg * 9.80665 * rom / duration, 1)
                    if weight_kg > 0 and duration > 0 else None
                ),
                rest_at_top_seconds=rest_at_top_secs if rest_at_top_secs > 0 else None,
                rest_at_bottom_seconds=None,  # filled in second pass below
            )
        )

    # --- Second pass: bottom rest = trailing(N) + leading(N+1) ---
    # The valley boundary splits the bottom pause between adjacent reps.
    # Combining trailing rest of rep N with leading rest of rep N+1
    # recovers the full pause duration reliably.
    for i in range(len(reps_info)):
        trailing = _trailing_rest_samples[i]
        leading_next = _leading_rest_samples[i + 1] if i + 1 < len(reps_info) else 0
        total_bottom = trailing + leading_next
        if total_bottom >= min_rest_width:
            reps_info[i].rest_at_bottom_seconds = round(total_bottom / sample_rate, 3)

    # --- Downsample for charting ---
    max_pts = 1500
    time_idx, z_vals = _downsample(df["z_smooth"].values, max_pts)
    _, vel_vals = _downsample(velocity, max_pts)
    _, pos_vals = _downsample(position_m, max_pts)
    _, ax_vals = _downsample(df["ax_world"].values, max_pts)
    _, ay_vals = _downsample(df["ay_world"].values, max_pts)
    _, az_vals = _downsample(df["az_world"].values, max_pts)

    total_duration = len(df) / sample_rate

    return {
        "total_samples": len(df),
        "sample_rate": sample_rate,
        "duration_seconds": round(total_duration, 2),
        "rep_count": len(reps_info),
        "reps": [
            {
                "rep_number": r.rep_number,
                "start_sample": r.start_sample,
                "end_sample": r.end_sample,
                "duration_seconds": r.duration_seconds,
                "rom_meters": r.rom_meters,
                "rom_cm": r.rom_cm,
                "peak_velocity": r.peak_velocity,
                "avg_velocity": r.avg_velocity,
                "peak_accel": r.peak_accel,
                "avg_watts": r.avg_watts,
                "rest_at_top_seconds": r.rest_at_top_seconds,
                "rest_at_bottom_seconds": r.rest_at_bottom_seconds,
                "concentric": {
                    "start_sample": r.concentric.start_sample,
                    "end_sample": r.concentric.end_sample,
                    "duration_seconds": r.concentric.duration_seconds,
                    "peak_velocity": r.concentric.peak_velocity,
                    "avg_velocity": r.concentric.avg_velocity,
                    "peak_accel": r.concentric.peak_accel,
                    "avg_accel": r.concentric.avg_accel,
                    "avg_watts": r.concentric.avg_watts,
                } if r.concentric else None,
                "eccentric": {
                    "start_sample": r.eccentric.start_sample,
                    "end_sample": r.eccentric.end_sample,
                    "duration_seconds": r.eccentric.duration_seconds,
                    "peak_velocity": r.eccentric.peak_velocity,
                    "avg_velocity": r.eccentric.avg_velocity,
                    "peak_accel": r.eccentric.peak_accel,
                    "avg_accel": r.eccentric.avg_accel,
                    "avg_watts": r.eccentric.avg_watts,
                } if r.eccentric else None,
            }
            for r in reps_info
        ],
        "chart": {
            "time_samples": time_idx,
            "z_accel": z_vals,
            "velocity": vel_vals,
            "position": pos_vals,
            "ax_world": ax_vals,
            "ay_world": ay_vals,
            "az_world": az_vals,
        },
        "rep_boundaries": [
            {"start": rs, "end": re} for rs, re in reps_raw
        ],
    }
