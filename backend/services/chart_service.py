"""
Graph maker
"""

import os

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

_REP_SHADE_COLORS = [
    "#FF6B6B26",
    "#51CF6626",
    "#339AF026",
    "#FF922B26",
    "#CC5DE826",
    "#845EF726",
    "#22B8CF26",
    "#ADB5BD26",
]


def generate_chart_image(analysis: dict, output_path: str) -> str:
    chart = analysis["chart"]
    boundaries = analysis["rep_boundaries"]
    total_samples = analysis["total_samples"]
    duration = analysis["duration_seconds"]
    rep_count = analysis["rep_count"]

    indices = np.array(chart["time_samples"])
    z_accel = np.array(chart["z_accel"])
    velocity = np.array(chart["velocity"])
    position = np.array(chart["position"])

    fig, axes = plt.subplots(3, 1, figsize=(12, 8), dpi=150, facecolor="#1A1B1E")
    fig.suptitle(
        f"{total_samples} samples  |  {duration}s duration  |  "
        f"{rep_count} rep{'s' if rep_count != 1 else ''} detected",
        color="#C1C2C5",
        fontsize=11,
        y=0.98,
    )

    panels = [
        ("Smoothed Z-Axis Acceleration", z_accel, "Acceleration (g)", "#51CF66"),
        ("Estimated Z-Axis Velocity", velocity, "Velocity (m/s)", "#339AF0"),
        ("Estimated Z-Axis Position", position, "Position (m)", "#FF6B6B"),
    ]

    for ax, (title, data, ylabel, color) in zip(axes, panels):
        ax.set_facecolor("#1A1B1E")

        for ri, rep in enumerate(boundaries):
            shade = _REP_SHADE_COLORS[ri % len(_REP_SHADE_COLORS)]
            ax.axvspan(rep["start"], rep["end"], color=shade)

        ax.plot(indices, data, color=color, linewidth=0.8)
        ax.set_title(title, color="#C1C2C5", fontsize=9, loc="left", pad=4)
        ax.set_ylabel(ylabel, color="#909296", fontsize=8)
        ax.set_xlim(0, total_samples)
        ax.tick_params(colors="#909296", labelsize=7)
        for spine in ax.spines.values():
            spine.set_color("#373A40")
        ax.grid(True, color="#373A40", linewidth=0.3)

        ymin, ymax = ax.get_ylim()
        if ymin < 0 < ymax:
            ax.axhline(0, color="#909296", linewidth=0.5)

    axes[-1].set_xlabel("Sample", color="#909296", fontsize=8)
    fig.tight_layout(rect=[0, 0, 1, 0.96])

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    fig.savefig(output_path, dpi=150, bbox_inches="tight", facecolor=fig.get_facecolor())
    plt.close(fig)

    return output_path
